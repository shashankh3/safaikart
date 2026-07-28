import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { calculateOrderTotals, PricingItem } from '../orders/pricing.logic';
import { createOrderDraftRequest } from '../contracts';
import { isPincodeServiceable } from '../utils/serviceability.logic';
import { computeEstimatedDelivery, isSlotValid } from '../utils/deliveryLogic';
import { validateCouponApplicability, CouponData } from './coupon.logic';
import { rateLimiter } from '../utils/rateLimiter';
import { shouldEnforceAppCheck } from '../utils/config';
import { logError } from '../utils/logger';

// Initialize admin app if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const createOrderDraft = onCall({ region: 'asia-south1', enforceAppCheck: shouldEnforceAppCheck }, async (request) => {
  try {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be logged in to create an order.');
    }

    await rateLimiter(uid, 'createOrderDraft', 5, 3600);

    const profileDoc = await db.collection('profiles').doc(uid).get();
    if (profileDoc.exists && profileDoc.data()?.isBlocked === true) {
      throw new HttpsError('permission-denied', 'Your account has been blocked. Please contact support.');
    }

    let addressId: string, pickupSlotId: string, couponCode: string | null = null, directItems: any[] | undefined | null, idempotencyKey: string | undefined, notes: string | null = null;

    try {
      const parsed = createOrderDraftRequest.parse(request.data);
      addressId = parsed.addressId;
      pickupSlotId = parsed.pickupSlotId;
      directItems = parsed.directItems;
      couponCode = parsed.couponCode ? parsed.couponCode.toUpperCase() : null;
      idempotencyKey = parsed.idempotencyKey;
      notes = parsed.notes ? parsed.notes.slice(0, 500) : null;
    } catch (e: any) {
      throw new HttpsError('invalid-argument', `Validation error: ${e.message}`);
    }

    // Idempotency Check
    if (idempotencyKey) {
      const existing = await db.collection('orders')
        .where('userId', '==', uid)
        .where('idempotencyKey', '==', idempotencyKey)
        .limit(1)
        .get();

      if (!existing.empty) {
        const existingOrder = existing.docs[0];
        return {
          orderId: existingOrder.id,
          finalAmountMinor: existingOrder.data().finalAmountMinor,
          priceConfirmed: existingOrder.data().priceConfirmed
        };
      }
    }

    // 1. Fetch Items
    let itemsToProcess: any[] = [];
    if (directItems && Array.isArray(directItems) && directItems.length > 0) {
      itemsToProcess = directItems;
    } else {
      const cartItemsQuery = await db.collection(`users/${uid}/cartItems`).get();
      if (cartItemsQuery.empty) {
        throw new HttpsError('failed-precondition', 'Cart is empty or not found on server.');
      }

      itemsToProcess = cartItemsQuery.docs.map(doc => doc.data());
      if (itemsToProcess.length === 0) {
        throw new HttpsError('failed-precondition', 'Cart is empty.');
      }
    }

    if (itemsToProcess.length > 50) {
      throw new HttpsError('invalid-argument', 'Too many items in cart. Maximum allowed is 50.');
    }

    // 2. Fetch Address & Validate Serviceability
    const addressDoc = await db.collection('addresses').doc(addressId).get();
    if (!addressDoc.exists || addressDoc.data()?.userId !== uid) {
      throw new HttpsError('permission-denied', 'Invalid address or unauthorized access.');
    }
    const addressData = addressDoc.data()!;

    const { isServiceable } = await isPincodeServiceable(db, addressData.pincode);
    if (!isServiceable) {
      throw new HttpsError('failed-precondition', `We don't service pincode ${addressData.pincode} yet.`);
    }

    // 3. Process Items & Calculate Price
    const pricingItems: PricingItem[] = [];

    for (const item of itemsToProcess) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 100) {
        throw new HttpsError('invalid-argument', `Invalid quantity for item ${item.name || item.serviceId}. Quantity must be between 1 and 100.`);
      }

      const serviceId = String(item.id || item.serviceId || '').trim();
      if (!serviceId) {
        throw new HttpsError('invalid-argument', `Invalid service for item ${item.name || ''}`);
      }

      const serviceDoc = await db.collection('services').doc(serviceId).get();
      if (!serviceDoc.exists) {
        throw new HttpsError('not-found', `Service not found for item ${item.name}`);
      }
      const serviceData = serviceDoc.data()!;
      if (serviceData.isActive === false) {
        throw new HttpsError('failed-precondition', `Service ${serviceData.name} is no longer active.`);
      }

      const duration = serviceData.estimatedDurationHours || (serviceData.categoryId === 'steam_press' ? 24 : serviceData.categoryId === 'household' ? 72 : 48);

      const validatedAddons: { id: string; name: string; priceMinor: number }[] = [];
      if (item.addons && Array.isArray(item.addons)) {
        for (const addon of item.addons) {
          const serverAddon = (serviceData.addons || []).find((a: any) => a.id === addon.id);
          if (serverAddon) {
            validatedAddons.push({
              id: serverAddon.id,
              name: serverAddon.name,
              priceMinor: serverAddon.priceMinor
            });
          }
        }
      }

      pricingItems.push({
        serviceId: serviceDoc.id,
        nameSnapshot: serviceData.name,
        quantity: item.quantity,
        unit: serviceData.unit || 'piece',
        unitPriceMinor: serviceData.priceMinor || 0,
        addons: validatedAddons,
        priceType: serviceData.priceType || 'fixed',
        estimatedDurationHours: duration
      });
    }

    // 4. Validate Coupon
    let couponInfo = null;
    if (couponCode) {
      const couponDoc = await db.collection('coupons').doc(couponCode).get();
      if (couponDoc.exists) {
        const coupon = couponDoc.data() as CouponData;
        const couponSubtotalMinor = pricingItems.reduce((total, item) => {
          if (item.priceType === 'variable') return total;
          const addonsTotalMinor = item.addons.reduce((sum, addon) => sum + addon.priceMinor, 0);
          return total + (item.unitPriceMinor + addonsTotalMinor) * item.quantity;
        }, 0);
        const couponResult = validateCouponApplicability(coupon, uid, couponSubtotalMinor);
        if (!couponResult.valid) {
          throw new HttpsError('failed-precondition', couponResult.message);
        }
        couponInfo = {
          type: coupon.type,
          discountValue: coupon.discountValue,
          minimumOrderAmount: coupon.minimumOrderAmount
        };
      } else {
        throw new HttpsError('not-found', 'Invalid coupon code');
      }
    }

    const {
      processedItems,
      subtotalMinor,
      discountMinor,
      deliveryFeeMinor,
      finalAmountMinor,
      priceConfirmed,
      maxDurationHours
    } = calculateOrderTotals(pricingItems, couponInfo, 4000);

    // 5. Transaction for Pickup Slot & Order Creation
    const newOrderRef = db.collection('orders').doc();
    let finalOrderId = '';

    await db.runTransaction(async (transaction) => {
      const slotRef = db.collection('pickupSlots').doc(pickupSlotId);
      const slotDoc = await transaction.get(slotRef);

      if (!slotDoc.exists) {
        throw new HttpsError('not-found', 'Pickup slot not found.');
      }
      const slotData = slotDoc.data()!;
      if (!slotData.isActive || (slotData.bookedCount >= slotData.capacity)) {
        throw new HttpsError('failed-precondition', 'Pickup slot is fully booked or inactive.');
      }

      if (!isSlotValid(slotData.date, slotData.startTime, 2)) {
        throw new HttpsError('failed-precondition', 'Pickup slot is in the past or too soon to book.');
      }

      // Check coupon usage inside transaction to prevent race conditions
      if (couponCode) {
        const couponRef = db.collection('coupons').doc(couponCode);
        const latestCouponDoc = await transaction.get(couponRef);
        if (latestCouponDoc.exists) {
          const usedBy: string[] = latestCouponDoc.data()?.usedBy || [];
          if (usedBy.includes(uid)) {
            throw new HttpsError('failed-precondition', 'You have already used this coupon code.');
          }
        }
      }

      // Increment booked count
      transaction.update(slotRef, { bookedCount: admin.firestore.FieldValue.increment(1) });

      // Calculate Estimated Delivery Date
      const estimatedDeliveryDateStr = computeEstimatedDelivery(
        slotData.date,
        slotData.startTime,
        maxDurationHours
      );

      // 3 minute edit window
      const editableUntil = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 3 * 60000));

      // Create Order
      const orderData = {
        userId: uid,
        status: 'PAYMENT_PENDING',
        paymentStatus: 'NOT_STARTED',
        priceConfirmed,
        editableUntil,
        estimatedDeliveryDate: estimatedDeliveryDateStr,
        items: processedItems,
        subtotalMinor,
        deliveryFeeMinor,
        discountMinor,
        taxMinor: 0,
        finalAmountMinor,
        currency: 'INR',
        couponCode: couponCode || null,
        notes: notes || null,
        addressId,
        addressSnapshot: {
          line1: addressData.line1 || '',
          line2: addressData.line2 || '',
          city: addressData.city || '',
          state: addressData.state || '',
          pincode: addressData.pincode || ''
        },
        pickupSlotId,
        pickupSlotSnapshot: {
          date: slotData.date || '',
          startTime: slotData.startTime || '',
          endTime: slotData.endTime || ''
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        idempotencyKey: idempotencyKey || null,
      };

      transaction.set(newOrderRef, orderData);
      finalOrderId = newOrderRef.id;

      // Clear user cart if not a direct buy
      if (!directItems) {
        const cartItemsSnapshot = await db.collection(`users/${uid}/cartItems`).get();
        for (const doc of cartItemsSnapshot.docs) {
          transaction.delete(doc.ref);
        }
      }
    });

    return {
      orderId: finalOrderId,
      finalAmountMinor,
      priceConfirmed
    };
  } catch (err: any) {
    if (err instanceof HttpsError) {
      throw err;
    }
    logError('createOrderDraft failed:', err);
    throw new HttpsError('internal', 'Failed to create order. Please try again.');
  }
});

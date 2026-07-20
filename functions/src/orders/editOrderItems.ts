import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { calculateOrderTotals, PricingItem } from './pricing.logic';
import { calculateOrderDiff } from './editOrder.logic';
import { validateCouponApplicability, CouponData } from '../checkout/coupon.logic';
import { computeEstimatedDelivery } from '../utils/deliveryLogic';
import { editOrderItemsRequest } from '../contracts';
import { getRazorpayAuthHeader, razorpayKeySecret } from '../payments/razorpayClient';
import { shouldEnforceAppCheck } from '../utils/config';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const editOrderItems = onCall({ secrets: [razorpayKeySecret], region: 'asia-south1', enforceAppCheck: shouldEnforceAppCheck }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in to edit an order.');
  }

  const { rateLimiter } = await import('../utils/rateLimiter');
  await rateLimiter(uid, 'editOrderItems', 10, 3600);

  let orderId: string, items: any[];

  try {
    const parsed = editOrderItemsRequest.parse(request.data);
    orderId = parsed.orderId;
    items = parsed.items;
  } catch (e: any) {
    throw new HttpsError('invalid-argument', `Validation error: ${e.message}`);
  }

  const orderRef = db.collection('orders').doc(orderId);

  let refundAmountMinor = 0;
  let razorpayPaymentId: string | null = null;
  let newFinalAmountMinor = 0;

  await db.runTransaction(async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      throw new HttpsError('not-found', 'Order not found.');
    }

    const orderData = orderDoc.data()!;
    if (orderData.userId !== uid) {
      throw new HttpsError('permission-denied', 'Unauthorized to edit this order.');
    }


    // Verify 3-minute window
    if (!orderData.editableUntil) {
      throw new HttpsError('failed-precondition', 'This order cannot be edited.');
    }
    const editableUntilMillis = orderData.editableUntil.toMillis();
    if (Date.now() > editableUntilMillis) {
      throw new HttpsError('failed-precondition', 'The 3-minute edit window has expired.');
    }

    // Verify status
    if (orderData.status !== 'PAYMENT_PENDING' && orderData.status !== 'CONFIRMED') {
      throw new HttpsError('failed-precondition', 'Order can only be edited while payment is pending or just confirmed.');
    }

    // Process new items and recalculate
    const pricingItems: PricingItem[] = [];

    for (const item of items) {
      const serviceDoc = await transaction.get(db.collection('services').doc(item.serviceId));
      if (!serviceDoc.exists) continue;
      
      const serviceData = serviceDoc.data()!;
      if (!serviceData.isActive) continue;

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

    if (pricingItems.length === 0) {
      throw new HttpsError('failed-precondition', 'Order must have at least one valid item.');
    }

    // Recalculate discount if coupon exists
    let couponInfo = null;
    let subtotalForCouponMinor = pricingItems.reduce((sum, item) => sum + (item.unitPriceMinor * item.quantity), 0);

    if (orderData.couponCode) {
      const couponDoc = await transaction.get(db.collection('coupons').doc(orderData.couponCode));
      if (couponDoc.exists) {
        const coupon = couponDoc.data() as CouponData;
        const couponResult = validateCouponApplicability(coupon, uid, subtotalForCouponMinor);
        if (couponResult.valid) {
          couponInfo = {
            type: coupon.type,
            discountValue: coupon.discountValue,
            minimumOrderAmount: coupon.minimumOrderAmount
          };
        }
      }
    }

    const {
      processedItems,
      subtotalMinor: newSubtotalMinor,
      discountMinor: newDiscountMinor,
      finalAmountMinor: calculatedFinal,
      priceConfirmed,
      maxDurationHours
    } = calculateOrderTotals(pricingItems, couponInfo, orderData.deliveryFeeMinor);
    
    newFinalAmountMinor = calculatedFinal;

    // Partial Refund or Additional Payment Logic
    const { amountDiff, refundAmountMinor: calcRefund, additionalPaymentRequired } = calculateOrderDiff(
      orderData.finalAmountMinor,
      newFinalAmountMinor,
      orderData.status
    );

    refundAmountMinor = calcRefund;

    if (additionalPaymentRequired || calcRefund > 0) {
      if (calcRefund > 0) {
        // We owe the customer a refund
        const paymentsSnapshot = await transaction.get(db.collection('payments')
            .where('orderId', '==', orderId)
            .where('status', '==', 'VERIFIED'));
        if (!paymentsSnapshot.empty) {
            const payment = paymentsSnapshot.docs[0].data();
            razorpayPaymentId = payment.razorpayPaymentId;
        }
      } else if (additionalPaymentRequired) {
        // Customer owes us more. Create a pending payment doc.
        const newPaymentRef = db.collection('payments').doc();
        transaction.set(newPaymentRef, {
            orderId: orderId,
            userId: uid,
            provider: 'razorpay',
            razorpayOrderId: null,
            razorpayPaymentId: null,
            amountMinor: amountDiff,
            currency: 'INR',
            method: 'upi',
            status: 'PENDING',
            webhookVerified: false,
            clientCallbackReceived: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            verifiedAt: null
        });
        transaction.update(orderRef, { paymentStatus: 'PAYMENT_PENDING' });
      }
    }

    // Recalculate Estimated Delivery Date if items changed
    let estimatedDeliveryDateStr = orderData.estimatedDeliveryDate;
    if (orderData.pickupSlotSnapshot) {
      estimatedDeliveryDateStr = computeEstimatedDelivery(
        orderData.pickupSlotSnapshot.date, 
        orderData.pickupSlotSnapshot.startTime, 
        maxDurationHours
      );
    }

    transaction.update(orderRef, {
      items: processedItems,
      subtotalMinor: newSubtotalMinor,
      discountMinor: newDiscountMinor,
      finalAmountMinor: newFinalAmountMinor,
      priceConfirmed,
      estimatedDeliveryDate: estimatedDeliveryDateStr,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  if (refundAmountMinor > 0 && razorpayPaymentId) {
      const authHeader = getRazorpayAuthHeader();
      const response = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: refundAmountMinor })
      });

      if (response.ok) {
        const refundData = await response.json();
        await orderRef.update({
          refundId: refundData.id,
          refundStatus: 'INITIATED',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        console.error('Refund failed:', await response.text());
      }
  }

  return { success: true };
});

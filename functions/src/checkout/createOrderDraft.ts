import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Initialize admin app if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const createOrderDraft = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in to create an order.');
  }

  const { addressId, pickupSlotId, couponCode } = request.data;
  if (!addressId || !pickupSlotId) {
    throw new HttpsError('invalid-argument', 'Address ID and Pickup Slot ID are required.');
  }

  // 1. Fetch Cart
  // Assuming carts are stored at carts/{uid} and cart items are an array inside.
  // In Phase 3, cart was stored locally. The spec says "Fetch cart from carts/{userId}". 
  // Wait, if it's not implemented, we might just pass cart items from client or assume the client synced it.
  // Let's assume there's a carts/{uid} document with an `items` array.
  const cartDoc = await db.collection('carts').doc(uid).get();
  if (!cartDoc.exists) {
    // For now, if cart syncing isn't built, we'll throw. In a real scenario we'd ensure it syncs.
    throw new HttpsError('failed-precondition', 'Cart is empty or not found on server.');
  }
  
  const cartData = cartDoc.data();
  const cartItems: any[] = cartData?.items || [];
  if (cartItems.length === 0) {
    throw new HttpsError('failed-precondition', 'Cart is empty.');
  }

  // 2. Fetch Address
  const addressDoc = await db.collection('addresses').doc(addressId).get();
  if (!addressDoc.exists || addressDoc.data()?.userId !== uid) {
    throw new HttpsError('permission-denied', 'Invalid address or unauthorized access.');
  }
  const addressData = addressDoc.data()!;

  // 3. Process Items & Calculate Price
  let subtotalMinor = 0;
  let priceConfirmed = true;
  const processedItems = [];

  for (const item of cartItems) {
    // Fetch actual service from DB to prevent tampering
    const serviceDoc = await db.collection('services').doc(item.id || item.serviceId).get();
    if (!serviceDoc.exists) {
      throw new HttpsError('not-found', `Service not found for item ${item.name}`);
    }
    const serviceData = serviceDoc.data()!;
    if (!serviceData.isActive) {
      throw new HttpsError('failed-precondition', `Service ${serviceData.name} is no longer active.`);
    }

    const isVariable = serviceData.priceType === 'variable';
    if (isVariable) priceConfirmed = false;

    const lineTotalMinor = isVariable ? 0 : (serviceData.priceMinor * item.quantity);
    if (!isVariable) {
      subtotalMinor += lineTotalMinor;
    }

    processedItems.push({
      serviceId: serviceDoc.id,
      nameSnapshot: serviceData.name,
      quantity: item.quantity,
      unit: serviceData.unit || 'piece',
      unitPriceMinor: serviceData.priceMinor,
      lineTotalMinor,
      priceType: serviceData.priceType || 'fixed'
    });
  }

  // 4. Validate Coupon
  let discountMinor = 0;
  if (couponCode) {
    const couponDoc = await db.collection('coupons').doc(couponCode.toUpperCase()).get();
    if (couponDoc.exists) {
      const coupon = couponDoc.data()!;
      if (coupon.isActive && subtotalMinor >= (coupon.minimumOrderAmount || 0)) {
        if (coupon.type === 'flat') {
          discountMinor = coupon.discountValue;
        } else if (coupon.type === 'percent') {
          discountMinor = Math.floor((subtotalMinor * coupon.discountValue) / 100);
        }
        // Cap discount to subtotal
        if (discountMinor > subtotalMinor) discountMinor = subtotalMinor;
      }
    }
  }

  const deliveryFeeMinor = 4000; // Flat 40 Rs
  const finalAmountMinor = subtotalMinor + deliveryFeeMinor - discountMinor;

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

    // Increment booked count
    transaction.update(slotRef, { bookedCount: admin.firestore.FieldValue.increment(1) });

    // Create Order
    const orderData = {
      userId: uid,
      status: 'PAYMENT_PENDING',
      paymentStatus: 'NOT_STARTED',
      priceConfirmed,
      items: processedItems,
      subtotalMinor,
      deliveryFeeMinor,
      discountMinor,
      taxMinor: 0,
      finalAmountMinor,
      currency: 'INR',
      couponCode: couponCode || null,
      addressId,
      addressSnapshot: {
        line1: addressData.line1,
        line2: addressData.line2,
        city: addressData.city,
        state: addressData.state,
        pincode: addressData.pincode
      },
      pickupSlotId,
      pickupSlotSnapshot: {
        date: slotData.date,
        startTime: slotData.startTime,
        endTime: slotData.endTime
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    transaction.set(newOrderRef, orderData);
    finalOrderId = newOrderRef.id;

    // Clear user cart
    const cartRef = db.collection('carts').doc(uid);
    transaction.update(cartRef, { items: [] });
  });

  return {
    orderId: finalOrderId,
    finalAmountMinor,
    priceConfirmed
  };
});

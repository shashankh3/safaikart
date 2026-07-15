import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';

const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const editOrderItems = onCall({ secrets: [razorpayKeySecret] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in to edit an order.');
  }

  const { orderId, items } = request.data;
  if (!orderId || !items || !Array.isArray(items)) {
    throw new HttpsError('invalid-argument', 'Order ID and items array are required.');
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
    let newSubtotalMinor = 0;
    let priceConfirmed = true;
    let maxDurationHours = 0;
    const processedItems: any[] = [];

    for (const item of items) {
      const serviceDoc = await transaction.get(db.collection('services').doc(item.serviceId));
      if (!serviceDoc.exists) continue;
      
      const serviceData = serviceDoc.data()!;
      if (!serviceData.isActive) continue;

      const duration = serviceData.estimatedDurationHours || (serviceData.categoryId === 'steam_press' ? 24 : serviceData.categoryId === 'household' ? 72 : 48);
      if (duration > maxDurationHours) maxDurationHours = duration;

      const isVariable = serviceData.priceType === 'variable';
      if (isVariable) priceConfirmed = false;
      
      let addonsTotalMinor = 0;
      const validatedAddons: any[] = [];
      if (item.addons && Array.isArray(item.addons)) {
        for (const addon of item.addons) {
          const serverAddon = (serviceData.addons || []).find((a: any) => a.id === addon.id);
          if (serverAddon) {
            addonsTotalMinor += serverAddon.priceMinor;
            validatedAddons.push({
              id: serverAddon.id,
              name: serverAddon.name,
              priceMinor: serverAddon.priceMinor
            });
          }
        }
      }

      const itemUnitTotalMinor = (serviceData.priceMinor || 0) + addonsTotalMinor;
      const lineTotalMinor = isVariable ? 0 : (itemUnitTotalMinor * item.quantity);
      if (!isVariable) {
        newSubtotalMinor += lineTotalMinor;
      }

      processedItems.push({
        serviceId: serviceDoc.id,
        nameSnapshot: serviceData.name,
        quantity: item.quantity,
        unit: serviceData.unit || 'piece',
        unitPriceMinor: serviceData.priceMinor,
        addons: validatedAddons,
        lineTotalMinor,
        priceType: serviceData.priceType || 'fixed'
      });
    }

    if (processedItems.length === 0) {
      throw new HttpsError('failed-precondition', 'Order must have at least one valid item.');
    }

    // Recalculate discount if coupon exists
    let newDiscountMinor = 0;
    if (orderData.couponCode) {
      const couponDoc = await transaction.get(db.collection('coupons').doc(orderData.couponCode));
      if (couponDoc.exists) {
        const coupon = couponDoc.data()!;
        if (coupon.isActive && newSubtotalMinor >= (coupon.minimumOrderAmount || 0)) {
          if (coupon.type === 'flat') newDiscountMinor = coupon.discountValue;
          else if (coupon.type === 'percent') newDiscountMinor = Math.floor((newSubtotalMinor * coupon.discountValue) / 100);
          if (newDiscountMinor > newSubtotalMinor) newDiscountMinor = newSubtotalMinor;
        }
      }
    }

    newFinalAmountMinor = newSubtotalMinor + orderData.deliveryFeeMinor - newDiscountMinor;
    
    // Partial Refund or Additional Payment Logic
    const amountDiff = newFinalAmountMinor - orderData.finalAmountMinor;
    if (orderData.status === 'CONFIRMED' && amountDiff !== 0) {
      if (amountDiff < 0) {
        // We owe the customer a refund
        refundAmountMinor = Math.abs(amountDiff);
        const paymentsSnapshot = await transaction.get(db.collection('payments')
            .where('orderId', '==', orderId)
            .where('status', '==', 'VERIFIED'));
        if (!paymentsSnapshot.empty) {
            const payment = paymentsSnapshot.docs[0].data();
            razorpayPaymentId = payment.razorpayPaymentId;
        }
      } else {
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
      try {
        const [hours, minutes] = (orderData.pickupSlotSnapshot.startTime || '10:00').split(':').map(Number);
        const pickupDate = new Date(`${orderData.pickupSlotSnapshot.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`);
        pickupDate.setHours(pickupDate.getHours() + maxDurationHours + 4);
        estimatedDeliveryDateStr = pickupDate.toISOString();
      } catch (e) {
        console.error('Error parsing date for editOrderItems', e);
      }
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
      const keySecret = razorpayKeySecret.value();
      const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${keySecret}`).toString('base64');
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
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        console.error('Refund failed:', await response.text());
      }
  }

  return { success: true };
});

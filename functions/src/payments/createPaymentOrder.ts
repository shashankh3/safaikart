import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getRazorpayAuthHeader, razorpayKeyId, razorpayKeySecret } from './razorpayClient';
import { shouldEnforceAppCheck } from '../utils/config';
import { logError } from '../utils/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const createPaymentOrder = onCall({ secrets: [razorpayKeyId, razorpayKeySecret], enforceAppCheck: shouldEnforceAppCheck }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  // const { rateLimiter } = await import('../utils/rateLimiter');
  // await rateLimiter(uid, 'createPaymentOrder', 10, 3600);

  const profileDoc = await db.collection('profiles').doc(uid).get();
  if (profileDoc.exists && profileDoc.data()?.isBlocked) {
    throw new HttpsError('permission-denied', 'Your account has been blocked.');
  }

  const { orderId } = request.data;
  if (!orderId) {
    throw new HttpsError('invalid-argument', 'Order ID is required.');
  }

  // 1. Fetch Order
  const orderRef = db.collection('orders').doc(orderId);
  const orderDoc = await orderRef.get();

  if (!orderDoc.exists) {
    throw new HttpsError('not-found', 'Order not found.');
  }
  const order = orderDoc.data()!;

  if (order.userId !== uid) {
    throw new HttpsError('permission-denied', 'Unauthorized access to order.');
  }
  if (order.status !== 'PAYMENT_PENDING' && order.status !== 'CONFIRMED') {
    throw new HttpsError('failed-precondition', 'Order cannot accept payments at this stage.');
  }
  if (
    order.paymentStatus !== 'PAYMENT_PENDING' &&
    order.paymentStatus !== 'NOT_STARTED' &&
    order.paymentStatus !== 'PAYMENT_CREATED' &&
    order.paymentStatus !== 'FAILED'
  ) {
    throw new HttpsError('failed-precondition', 'Order does not require payment at this time.');
  }

  // 2. Check for existing payment
  const paymentsQuery = await db.collection('payments')
    .where('orderId', '==', orderId)
    .where('userId', '==', uid)
    .get();

  let existingPaymentRef: admin.firestore.DocumentReference | null = null;
  let amountMinor = order.finalAmountMinor;

  for (const doc of paymentsQuery.docs) {
    const payment = doc.data();
    if (payment.status === 'VERIFIED') {
      // If we are looking for a top-up, there might be a VERIFIED payment already. We skip it and look for PENDING.
      continue;
    }
    if (payment.status === 'CREATED' || payment.status === 'PENDING') {
      if (payment.razorpayOrderId) {
        // C1: Fix double payment retry race by checking real status before returning
        try {
          const authHeader = getRazorpayAuthHeader();
          const rzpResponse = await fetch(`https://api.razorpay.com/v1/orders/${payment.razorpayOrderId}`, {
            headers: { 'Authorization': authHeader }
          });
          if (rzpResponse.ok) {
            const rzpData = await rzpResponse.json();
            if (rzpData.status === 'paid') {
              throw new HttpsError('failed-precondition', 'A payment is currently processing for this order. Please wait a few moments.');
            }
          }
        } catch (e: any) {
          if (e instanceof HttpsError) throw e;
          logError('Error checking existing razorpay order:', e);
        }

        // Return existing razorpay order to avoid duplicates if it's still valid
        const baseUrl = process.env.CHECKOUT_BASE_URL || 'https://safaikart-6c4e4.web.app';
        return {
          razorpayOrderId: payment.razorpayOrderId,
          razorpayKeyId: razorpayKeyId.value().trim(),
          amountMinor: payment.amountMinor,
          currency: payment.currency,
          checkoutUrl: `${baseUrl}/checkout/index.html?order_id=${payment.razorpayOrderId}&key_id=${razorpayKeyId.value().trim()}&amount=${payment.amountMinor}&currency=${payment.currency}`
        };
      } else {
        // It's a top-up pending payment without a razorpay order yet
        existingPaymentRef = doc.ref;
        amountMinor = payment.amountMinor;
      }
    }
  }

  // 3. Load Secret (no longer needed directly here, handled by client)

  // 4. Call Razorpay API

  const authHeader = getRazorpayAuthHeader();

  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountMinor,
        currency: 'INR',
        receipt: orderId,
        payment_capture: 1, // auto-capture
        notes: {
          internalOrderId: orderId,
          userId: uid
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      logError('Razorpay Error:', errorData);
      throw new HttpsError('internal', 'Failed to create payment order with gateway.');
    }

    const rzpOrder = await response.json();

    // 5. Create or Update Payment Document
    if (existingPaymentRef) {
      await existingPaymentRef!.update({
        provider: 'razorpay',
        razorpayOrderId: rzpOrder.id,
        status: 'CREATED',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      const newPaymentRef = db.collection('payments').doc();
      await newPaymentRef.set({
        orderId: orderId,
        userId: uid,
        provider: 'razorpay',
        razorpayOrderId: rzpOrder.id,
        razorpayPaymentId: null,
        amountMinor: amountMinor,
        currency: 'INR',
        method: null,
        status: 'CREATED',
        webhookVerified: false,
        clientCallbackReceived: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedAt: null
      });
    }

    // 6. Update Order Status
    await orderRef.update({
      paymentStatus: 'PAYMENT_CREATED',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const baseUrl = process.env.CHECKOUT_BASE_URL || 'https://safaikart-6c4e4.web.app';
    const checkoutUrl = `${baseUrl}/checkout/index.html?order_id=${rzpOrder.id}&key_id=${razorpayKeyId.value().trim()}&amount=${amountMinor}&currency=INR`;

    return {
      razorpayOrderId: rzpOrder.id,
      razorpayKeyId: razorpayKeyId.value().trim(),
      amountMinor,
      currency: 'INR',
      checkoutUrl
    };

  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logError('Payment creation error:', error);
    throw new HttpsError('internal', 'Failed to initiate payment.');
  }
});

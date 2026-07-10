import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';

// Define secrets (must be created in Google Cloud Secret Manager)
const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// We need the Razorpay Key ID (public key). It can be stored in environment variables,
// but for simplicity and security we can also define it as a secret or param.
// For now, let's assume it's passed from the client or stored in a public config document.
// Actually, the spec says "Load RAZORPAY_KEY_SECRET from Secret Manager".
// And "Return: { razorpayOrderId, razorpayKeyId: RAZORPAY_KEY_ID, amountMinor, currency }"
// Let's create a param for RAZORPAY_KEY_ID since it's public but environment specific.
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder'; // User should set this in env

export const createPaymentOrder = onCall({ secrets: [razorpayKeySecret] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
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
  if (order.status !== 'PAYMENT_PENDING') {
    throw new HttpsError('failed-precondition', 'Order is not in PAYMENT_PENDING status.');
  }

  // 2. Check for existing payment
  const paymentsQuery = await db.collection('payments')
    .where('orderId', '==', orderId)
    .where('userId', '==', uid)
    .get();

  for (const doc of paymentsQuery.docs) {
    const payment = doc.data();
    if (payment.status === 'VERIFIED') {
      throw new HttpsError('failed-precondition', 'Payment already completed for this order.');
    }
    if (payment.status === 'CREATED' || payment.status === 'PENDING') {
      // Return existing razorpay order to avoid duplicates if it's still valid
      return {
        razorpayOrderId: payment.razorpayOrderId,
        razorpayKeyId: RAZORPAY_KEY_ID,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        checkoutUrl: `https://safaikart-checkout.web.app/checkout?order_id=${payment.razorpayOrderId}` // Placeholder for WebView path
      };
    }
  }

  // 3. Load Secret
  const keySecret = razorpayKeySecret.value();

  // 4. Call Razorpay API
  const amountMinor = order.finalAmountMinor;
  
  const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${keySecret}`).toString('base64');
  
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
      console.error('Razorpay Error:', errorData);
      throw new HttpsError('internal', 'Failed to create payment order with gateway.');
    }

    const rzpOrder = await response.json();

    // 5. Create Payment Document
    const newPaymentRef = db.collection('payments').doc();
    await newPaymentRef.set({
      orderId: orderId,
      userId: uid,
      provider: 'razorpay',
      razorpayOrderId: rzpOrder.id,
      razorpayPaymentId: null,
      amountMinor: amountMinor,
      currency: 'INR',
      method: 'upi',
      status: 'CREATED',
      webhookVerified: false,
      clientCallbackReceived: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedAt: null
    });

    // 6. Update Order Status
    await orderRef.update({
      paymentStatus: 'PAYMENT_CREATED',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // We generate a simple HTML checkout page hosted on Firebase Hosting (or returned as data URI)
    // For WebView, it's often easier to just inject HTML string or use a hosted page.
    const checkoutUrl = `https://safaikart-checkout.web.app/checkout?order_id=${rzpOrder.id}`;

    return {
      razorpayOrderId: rzpOrder.id,
      razorpayKeyId: RAZORPAY_KEY_ID,
      amountMinor,
      currency: 'INR',
      checkoutUrl
    };

  } catch (error) {
    console.error('Payment creation error:', error);
    throw new HttpsError('internal', 'Failed to initiate payment.');
  }
});

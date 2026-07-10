import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';

const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const verifyPaymentStatus = onCall({ secrets: [razorpayKeySecret] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { orderId } = request.data;
  if (!orderId) {
    throw new HttpsError('invalid-argument', 'Order ID is required.');
  }

  const paymentsQuery = await db.collection('payments')
    .where('orderId', '==', orderId)
    .where('userId', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (paymentsQuery.empty) {
    throw new HttpsError('not-found', 'Payment record not found.');
  }

  const paymentDocRef = paymentsQuery.docs[0].ref;
  const paymentRecord = paymentsQuery.docs[0].data();

  // If already verified, just return
  if (paymentRecord.status === 'VERIFIED') {
    return { paymentStatus: 'VERIFIED', orderStatus: 'CONFIRMED' };
  }
  if (paymentRecord.status === 'FAILED') {
    return { paymentStatus: 'FAILED', orderStatus: 'PAYMENT_PENDING' };
  }

  // Fallback: Manually check Razorpay API
  const keySecret = razorpayKeySecret.value();
  const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${keySecret}`).toString('base64');
  const rzpOrderId = paymentRecord.razorpayOrderId;

  try {
    const response = await fetch(`https://api.razorpay.com/v1/orders/${rzpOrderId}/payments`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    if (!response.ok) {
      throw new Error('Razorpay API error');
    }

    const data = await response.json();
    const payments = data.items || [];
    
    // Find a captured payment
    const capturedPayment = payments.find((p: any) => p.status === 'captured');
    
    if (capturedPayment) {
      // Verify Amount & Currency
      if (capturedPayment.amount === paymentRecord.amountMinor && capturedPayment.currency === 'INR') {
        
        // Update Firestore
        await db.runTransaction(async (tx) => {
          const payDoc = await tx.get(paymentDocRef);
          const ordRef = db.collection('orders').doc(orderId);
          const ordDoc = await tx.get(ordRef);

          if (!payDoc.exists || !ordDoc.exists) return;
          if (payDoc.data()?.status === 'VERIFIED') return;

          tx.update(paymentDocRef, {
            status: 'VERIFIED',
            webhookVerified: false, // Verified via polling
            razorpayPaymentId: capturedPayment.id,
            verifiedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          tx.update(ordRef, {
            status: 'CONFIRMED',
            paymentStatus: 'VERIFIED',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });

        return { paymentStatus: 'VERIFIED', orderStatus: 'CONFIRMED' };
      }
    }
    
    // Check if any payment failed
    const failedPayment = payments.find((p: any) => p.status === 'failed');
    if (failedPayment) {
        // We could mark it failed, but let's wait for webhook or manual retry to be safe
        return { paymentStatus: 'PENDING', orderStatus: 'PAYMENT_PENDING' };
    }

    return { paymentStatus: paymentRecord.status, orderStatus: 'PAYMENT_PENDING' };

  } catch (error) {
    console.error('Manual verification failed:', error);
    return { paymentStatus: paymentRecord.status, orderStatus: 'PAYMENT_PENDING' };
  }
});

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { buildStatusHistoryUpdate } from '../utils/statusLogic';

import { getRazorpayAuthHeader, razorpayKeySecret } from './razorpayClient';

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
    .where('razorpayOrderId', '!=', null)
    .orderBy('razorpayOrderId', 'desc')
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
  const authHeader = getRazorpayAuthHeader();
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

          const isCancelled = ['CANCELLED', 'REFUND_PENDING', 'REFUNDED'].includes(ordDoc.data()?.status);

          tx.update(paymentDocRef, {
            status: 'VERIFIED',
            webhookVerified: false, // Verified via polling
            razorpayPaymentId: capturedPayment.id,
            requiresRefund: isCancelled ? true : false,
            verifiedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          if (!isCancelled) {
            const ordData = ordDoc.data()!;
            const statusUpdate = buildStatusHistoryUpdate(ordData, 'CONFIRMED');

            tx.update(ordRef, {
              ...statusUpdate,
              paymentStatus: 'VERIFIED',
            });

            if (ordData.couponCode) {
              const couponRef = db.collection('coupons').doc(ordData.couponCode);
              tx.set(couponRef, {
                usedCount: admin.firestore.FieldValue.increment(1),
                usedBy: admin.firestore.FieldValue.arrayUnion(ordData.userId)
              }, { merge: true });
            }
          } else {
             db.collection('auditLogs').add({
               action: 'LATE_PAYMENT_DETECTED',
               orderId: ordRef.id,
               razorpayPaymentId: capturedPayment.id,
               at: admin.firestore.FieldValue.serverTimestamp()
             });
          }
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

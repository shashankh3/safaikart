import { HttpsError } from 'firebase-functions/v2/https';
import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

import { getRazorpayAuthHeader, razorpayKeySecret } from '../payments/razorpayClient';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const cancelOrder = onCall({ secrets: [razorpayKeySecret] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const { orderId, reason } = request.data;
  if (!orderId) {
    throw new HttpsError('invalid-argument', 'Order ID is required');
  }

  const db = admin.firestore();
  const orderRef = db.collection('orders').doc(orderId);

  let newStatus = 'CANCELLED';
  let razorpayPaymentId: string | null = null;
  let amountToRefundMinor = 0;

  try {
    await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        throw new HttpsError('not-found', 'Order not found');
      }

      const orderData = orderDoc.data();
      if (orderData?.userId !== uid) {
        throw new HttpsError('permission-denied', 'Not authorized to cancel this order');
      }

      const status = orderData?.status;
      if (status !== 'CONFIRMED' && status !== 'PICKUP_SCHEDULED' && status !== 'PAYMENT_PENDING' && status !== 'DRAFT') {
        throw new HttpsError('failed-precondition', 'Order cannot be cancelled at this stage');
      }

      if (orderData?.paymentStatus === 'VERIFIED' || orderData?.paymentStatus === 'CAPTURED') {
        newStatus = 'REFUND_PENDING';
        // find payment
        const paymentsSnapshot = await transaction.get(db.collection('payments')
            .where('orderId', '==', orderId)
            .where('status', '==', 'VERIFIED'));
        if (!paymentsSnapshot.empty) {
            const payment = paymentsSnapshot.docs[0].data();
            razorpayPaymentId = payment.razorpayPaymentId;
            amountToRefundMinor = payment.amountMinor;
        }
      }

      transaction.update(orderRef, {
        status: newStatus,
        cancelReason: reason || null,
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    if (newStatus === 'REFUND_PENDING' && razorpayPaymentId && amountToRefundMinor > 0) {
      const authHeader = getRazorpayAuthHeader();
      const response = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: amountToRefundMinor })
      });

      if (response.ok) {
        const refundData = await response.json();
        await orderRef.update({
          status: 'REFUND_INITIATED',
          refundId: refundData.id,
          refundStatus: 'PROCESSED',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        newStatus = 'REFUND_INITIATED';
      } else {
        const errText = await response.text();
        console.error('Refund failed during cancelOrder:', errText);
        await orderRef.update({
          refundStatus: 'FAILED',
          refundError: errText,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    return { success: true, message: 'Order cancelled successfully', newStatus };
  } catch (error: any) {
    throw new HttpsError('internal', error.message || 'Failed to cancel order');
  }
});

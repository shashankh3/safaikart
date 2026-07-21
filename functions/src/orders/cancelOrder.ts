import { HttpsError } from 'firebase-functions/v2/https';
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { buildStatusHistoryUpdate } from '../utils/statusLogic';

import { getRazorpayAuthHeader, razorpayKeySecret } from '../payments/razorpayClient';
import { shouldEnforceAppCheck } from '../utils/config';
import { logError } from '../utils/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const cancelOrder = onCall({ secrets: [razorpayKeySecret], enforceAppCheck: shouldEnforceAppCheck }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const { rateLimiter } = await import('../utils/rateLimiter');
  await rateLimiter(uid, 'cancelOrder', 5, 3600);

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

      if (orderData?.pickupSlotId) {
        const slotRef = db.collection('pickupSlots').doc(orderData.pickupSlotId);
        const slotDoc = await transaction.get(slotRef);
        if (slotDoc.exists) {
          const currentCount = slotDoc.data()?.bookedCount || 0;
          const newCount = Math.max(0, currentCount - 1);
          transaction.update(slotRef, { bookedCount: newCount });
        }
      }

      const statusUpdate = buildStatusHistoryUpdate(orderData, newStatus);
      transaction.update(orderRef, {
        ...statusUpdate,
        cancelReason: reason || null,
        cancelledAt: FieldValue.serverTimestamp(),
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
        
        // Use a transaction to safely append REFUND_INITIATED
        await db.runTransaction(async (tx) => {
          const freshDoc = await tx.get(orderRef);
          if (!freshDoc.exists) return;
          const freshData = freshDoc.data()!;
          const refundUpdate = buildStatusHistoryUpdate(freshData, 'REFUND_INITIATED');
          
          tx.update(orderRef, {
            ...refundUpdate,
            refundId: refundData.id,
            refundStatus: 'INITIATED',
          });
        });
        
        newStatus = 'REFUND_INITIATED';
      } else {
        const errText = await response.text();
        logError('Refund failed during cancelOrder:', errText);
        await orderRef.update({
          refundStatus: 'FAILED',
          refundError: errText,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    return { success: true, message: 'Order cancelled successfully', newStatus };
  } catch (error: any) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logError('Unhandled cancelOrder error:', error);
    throw new HttpsError('internal', 'An unexpected error occurred while cancelling the order.');
  }
});

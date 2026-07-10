import { HttpsError } from 'firebase-functions/v2/https';
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const cancelOrder = onCall(async (request) => {
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

  try {
    return await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        throw new HttpsError('not-found', 'Order not found');
      }

      const orderData = orderDoc.data();
      if (orderData?.userId !== uid) {
        throw new HttpsError('permission-denied', 'Not authorized to cancel this order');
      }

      const status = orderData?.status;
      if (status !== 'CONFIRMED' && status !== 'PICKUP_SCHEDULED') {
        throw new HttpsError('failed-precondition', 'Order cannot be cancelled at this stage');
      }

      let newStatus = 'CANCELLED';
      if (orderData?.paymentStatus === 'VERIFIED' || orderData?.paymentStatus === 'CAPTURED') {
        newStatus = 'REFUND_PENDING';
      }

      transaction.update(orderRef, {
        status: newStatus,
        cancelReason: reason || null,
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      return { success: true, message: 'Order cancelled successfully', newStatus };
    });
  } catch (error: any) {
    throw new HttpsError('internal', error.message || 'Failed to cancel order');
  }
});

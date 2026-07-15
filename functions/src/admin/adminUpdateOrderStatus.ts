import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Valid status transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PAYMENT_PENDING: ['CANCELLED'], // usually updated via payment webhook to CONFIRMED
  CONFIRMED: ['PICKUP_SCHEDULED', 'CANCELLED'],
  PICKUP_SCHEDULED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['CLEANING_IN_PROGRESS', 'CANCELLED'],
  CLEANING_IN_PROGRESS: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [], // Terminal
  CANCELLED: [], // Terminal
  REFUND_PENDING: [], // Handled by other processes
  REFUNDED: [], // Terminal
};

export const adminUpdateOrderStatus = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in to call this function.');
  }

  const { orderId, newStatus } = data;
  if (!orderId || !newStatus) {
    throw new HttpsError('invalid-argument', 'orderId and newStatus are required.');
  }

  const db = admin.firestore();

  // Verify Admin
  const adminDoc = await db.collection('adminUsers').doc(auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError('permission-denied', 'You do not have permission to perform this action.');
  }

  const orderRef = db.collection('orders').doc(orderId);

  try {
    await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        throw new HttpsError('not-found', 'Order not found.');
      }

      const orderData = orderDoc.data()!;
      const currentStatus = orderData.status;

      // Allow if transitioning to same state (idempotent)
      if (currentStatus === newStatus) {
        return;
      }

      // Check transition map
      const allowedNextStates = ALLOWED_TRANSITIONS[currentStatus] || [];
      if (!allowedNextStates.includes(newStatus)) {
        throw new HttpsError(
          'failed-precondition',
          `Cannot transition order status from ${currentStatus} to ${newStatus}.`
        );
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      
      const newStatusHistoryEntry = {
        status: newStatus,
        at: now
      };

      const updatePayload: any = {
        status: newStatus,
        updatedAt: now,
      };
      
      // Keep track of status history if array exists, or initialize it
      if (orderData.statusHistory) {
        updatePayload.statusHistory = admin.firestore.FieldValue.arrayUnion(newStatusHistoryEntry);
      } else {
        updatePayload.statusHistory = [
           { status: currentStatus, at: orderData.createdAt }, // retroactively add creation status
           newStatusHistoryEntry 
        ];
      }

      transaction.update(orderRef, updatePayload);
    });

    return { success: true, message: `Order ${orderId} updated to ${newStatus}` };
  } catch (error: any) {
    console.error('Error in adminUpdateOrderStatus:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message || 'An error occurred while updating order status.');
  }
});

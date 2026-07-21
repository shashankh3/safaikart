import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { buildStatusHistoryUpdate } from '../utils/statusLogic';

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
  CANCELLED: ['REFUNDED'], // Terminal for fulfillment, but can be updated to REFUNDED if money returned
  REFUND_PENDING: ['REFUNDED'], // Handled by other processes
  REFUND_INITIATED: ['REFUNDED'],
  REFUNDED: [], // Terminal
};

import { assertAdmin } from '../utils/assertAdmin';
import { z } from 'zod';
import { logError } from '../utils/logger';

const updateSchema = z.object({
  orderId: z.string().min(1),
  newStatus: z.string().min(1)
});

export const adminUpdateOrderStatus = onCall(async (request) => {
  assertAdmin(request, ['superadmin', 'admin', 'ops']);
  const { data } = request;

  let orderId: string;
  let newStatus: string;
  
  try {
    const parsed = updateSchema.parse(data);
    orderId = parsed.orderId;
    newStatus = parsed.newStatus;
  } catch (e: any) {
    throw new HttpsError('invalid-argument', `Validation error: ${e.message}`);
  }

  const db = admin.firestore();

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
      
      // If transitioning to REFUNDED, ensure there is a refundId or the payment was never verified
      if (newStatus === 'REFUNDED') {
        if (!orderData.refundId && orderData.paymentStatus === 'VERIFIED') {
           throw new HttpsError('failed-precondition', 'Cannot mark as REFUNDED without a linked refundId for VERIFIED payments.');
        }
      }

      const updatePayload = buildStatusHistoryUpdate(orderData, newStatus);
      
      transaction.update(orderRef, updatePayload);
    });

    return { success: true, message: `Order ${orderId} updated to ${newStatus}` };
  } catch (error: any) {
    logError('Error in adminUpdateOrderStatus:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message || 'An error occurred while updating order status.');
  }
});

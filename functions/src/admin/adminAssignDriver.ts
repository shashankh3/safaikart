import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { assertAdmin } from '../utils/assertAdmin';

export const adminAssignDriver = onCall(async (request) => {
  assertAdmin(request);
  const { data, auth } = request;

  const { orderId, driverId } = data;
  if (!orderId || !driverId) {
    throw new HttpsError('invalid-argument', 'orderId and driverId are required.');
  }

  const db = admin.firestore();

  const driverDoc = await db.collection('drivers').doc(driverId).get();
  if (!driverDoc.exists) {
    throw new HttpsError('not-found', 'Driver not found.');
  }
  const driverData = driverDoc.data()!;

  const orderRef = db.collection('orders').doc(orderId);

  try {
    await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        throw new HttpsError('not-found', 'Order not found.');
      }

      const orderData = orderDoc.data()!;
      const currentStatus = orderData.status;

      const now = admin.firestore.FieldValue.serverTimestamp();
      
      const newStatusHistoryEntry = {
        status: 'DRIVER_ASSIGNED',
        at: now
      };

      const updatePayload: any = {
        driverId: driverId,
        driverName: driverData.name || 'Assigned Driver',
        driverPhone: driverData.phone || '',
        updatedAt: now,
      };
      
      // Keep track of status history
      if (orderData.statusHistory) {
        updatePayload.statusHistory = admin.firestore.FieldValue.arrayUnion(newStatusHistoryEntry);
      } else {
        updatePayload.statusHistory = [
           { status: currentStatus, at: orderData.createdAt },
           newStatusHistoryEntry 
        ];
      }

      transaction.update(orderRef, updatePayload);

      // Write Audit Log
      const auditLogRef = db.collection('auditLogs').doc();
      transaction.set(auditLogRef, {
        actorUid: auth?.uid,
        action: 'ASSIGN_DRIVER',
        orderId: orderId,
        before: { driverId: orderData.driverId || null },
        after: { driverId: driverId },
        at: now
      });
    });

    return { success: true, message: `Driver ${driverId} assigned to order ${orderId}` };
  } catch (error: any) {
    console.error('Error in adminAssignDriver:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message || 'An error occurred while assigning driver.');
  }
});

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { assertAdmin } from '../utils/assertAdmin';
import { buildStatusHistoryUpdate } from '../utils/statusLogic';
import { z } from 'zod';

const assignSchema = z.object({
  orderId: z.string().min(1),
  driverId: z.string().min(1)
});

export const adminAssignDriver = onCall(async (request) => {
  assertAdmin(request, ['superadmin', 'admin', 'ops']);
  const { data, auth } = request;

  let orderId: string;
  let driverId: string;
  try {
    const parsed = assignSchema.parse(data);
    orderId = parsed.orderId;
    driverId = parsed.driverId;
  } catch (e: any) {
    throw new HttpsError('invalid-argument', `Validation error: ${e.message}`);
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
      const statusUpdate = buildStatusHistoryUpdate(orderData, 'DRIVER_ASSIGNED');

      const updatePayload: any = {
        ...statusUpdate,
        driverId: driverId,
        driverName: driverData.name || 'Assigned Driver',
        driverPhone: driverData.phone || '',
      };

      transaction.update(orderRef, updatePayload);

      // Write Audit Log
      const auditLogRef = db.collection('auditLogs').doc();
      transaction.set(auditLogRef, {
        actorUid: auth?.uid,
        action: 'ASSIGN_DRIVER',
        orderId: orderId,
        before: { driverId: orderData.driverId || null },
        after: { driverId: driverId },
        at: admin.firestore.FieldValue.serverTimestamp()
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

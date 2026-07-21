import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { assertAdmin } from '../utils/assertAdmin';
import { z } from 'zod';
import { logError } from '../utils/logger';

const photosSchema = z.object({
  orderId: z.string().min(1),
  photos: z.array(z.string().url())
});

export const adminSetOrderPhotos = onCall(async (request) => {
  assertAdmin(request, ['superadmin', 'admin', 'ops']);
  const { data, auth } = request;

  let orderId: string;
  let photos: string[];

  try {
    const parsed = photosSchema.parse(data);
    orderId = parsed.orderId;
    photos = parsed.photos;
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
      const now = admin.firestore.FieldValue.serverTimestamp();

      transaction.update(orderRef, {
        photos: photos,
        updatedAt: now,
      });

      // Write Audit Log
      const auditLogRef = db.collection('auditLogs').doc();
      transaction.set(auditLogRef, {
        actorUid: auth?.uid,
        action: 'SET_ORDER_PHOTOS',
        orderId: orderId,
        before: { photos: orderData.photos || [] },
        after: { photos: photos },
        at: now
      });
    });

    return { success: true, message: `Photos updated for order ${orderId}` };
  } catch (error: any) {
    logError('Error in adminSetOrderPhotos:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message || 'An error occurred while setting order photos.');
  }
});

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { assertAdmin } from '../utils/assertAdmin';

export const adminSetOrderPhotos = onCall(async (request) => {
  assertAdmin(request);
  const { data, auth } = request;

  const { orderId, photos } = data;
  if (!orderId || !Array.isArray(photos)) {
    throw new HttpsError('invalid-argument', 'orderId and photos array are required.');
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
    console.error('Error in adminSetOrderPhotos:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message || 'An error occurred while setting order photos.');
  }
});

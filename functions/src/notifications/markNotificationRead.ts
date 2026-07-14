import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const markNotificationRead = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { notificationId } = request.data;
  if (!notificationId) {
    throw new HttpsError('invalid-argument', 'Notification ID is required.');
  }

  const notificationRef = db.collection('notifications').doc(notificationId);
  const doc = await notificationRef.get();

  if (!doc.exists) {
    throw new HttpsError('not-found', 'Notification not found.');
  }

  if (doc.data()?.userId !== uid) {
    throw new HttpsError('permission-denied', 'Cannot update another user\'s notification.');
  }

  await notificationRef.update({
    isRead: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true };
});

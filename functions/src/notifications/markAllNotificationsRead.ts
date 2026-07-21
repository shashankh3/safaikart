import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { rateLimiter } from '../utils/rateLimiter';
import { shouldEnforceAppCheck } from '../utils/config';
import { logError, logInfo } from '../utils/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const markAllNotificationsRead = onCall({ enforceAppCheck: shouldEnforceAppCheck }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  await rateLimiter(uid, 'markAllNotificationsRead', 20, 3600);

  try {
    const unreadQuery = await db.collection('notifications')
      .where('userId', '==', uid)
      .where('isRead', '==', false)
      .limit(500)
      .get();

    if (unreadQuery.empty) {
      return { success: true, count: 0 };
    }

    const batch = db.batch();
    unreadQuery.docs.forEach(doc => {
      batch.update(doc.ref, { 
        isRead: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();

    logInfo(`Marked ${unreadQuery.size} notifications as read for user ${uid}`, { userId: uid });
    
    return { success: true, count: unreadQuery.size };
  } catch (error: any) {
    logError('Error in markAllNotificationsRead', error, { userId: uid });
    throw new HttpsError('internal', 'An error occurred while marking notifications as read.');
  }
});

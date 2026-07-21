import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { logInfo, logError } from '../utils/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const deleteOldNotifications = onSchedule({ schedule: 'every 24 hours' }, async (event) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const snapshot = await db.collection('notifications')
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .limit(500)
      .get();

    if (snapshot.empty) {
      logInfo('No old notifications to delete.');
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    logInfo(`Deleted ${snapshot.size} old notifications.`);
  } catch (error) {
    logError('Error deleting old notifications:', error);
  }
});

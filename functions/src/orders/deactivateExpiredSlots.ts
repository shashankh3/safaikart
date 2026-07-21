import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { logError, logInfo } from '../utils/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const deactivateExpiredSlots = onSchedule({ schedule: 'every 6 hours', timeoutSeconds: 120 }, async () => {
  // We want to deactivate slots that are before today
  const today = new Date();
  
  // Format YYYY-MM-DD
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayDateStr = `${year}-${month}-${day}`;

  try {
    const expiredSlotsQuery = await db.collection('pickupSlots')
      .where('isActive', '==', true)
      .where('date', '<', todayDateStr)
      .get();

    if (expiredSlotsQuery.empty) {
      logInfo('No expired pickup slots to deactivate.');
      return;
    }

    const batch = db.batch();
    expiredSlotsQuery.docs.forEach(doc => {
      batch.update(doc.ref, { 
        isActive: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();

    logInfo(`Deactivated ${expiredSlotsQuery.size} expired pickup slots.`);
  } catch (error: any) {
    logError('Error deactivating expired pickup slots:', error);
  }
});

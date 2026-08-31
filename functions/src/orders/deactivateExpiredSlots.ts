import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { logError, logInfo } from '../utils/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const STANDARD_SLOTS = [
  { startTime: '09:00', endTime: '11:00', capacity: 10 },
  { startTime: '11:00', endTime: '13:00', capacity: 10 },
  { startTime: '14:00', endTime: '16:00', capacity: 10 },
  { startTime: '16:00', endTime: '18:00', capacity: 10 },
  { startTime: '18:00', endTime: '20:00', capacity: 10 },
];

export async function ensureUpcomingSlots() {
  const today = new Date();
  let createdCount = 0;

  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    const batch = db.batch();
    let batchHasWrites = false;

    for (const slot of STANDARD_SLOTS) {
      const slotId = `${dateStr}_${slot.startTime.replace(':', '')}`;
      const slotRef = db.collection('pickupSlots').doc(slotId);
      const slotDoc = await slotRef.get();

      if (!slotDoc.exists) {
        batch.set(slotRef, {
          date: dateStr,
          startTime: slot.startTime,
          endTime: slot.endTime,
          capacity: slot.capacity,
          bookedCount: 0,
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        batchHasWrites = true;
        createdCount++;
      }
    }

    if (batchHasWrites) {
      await batch.commit();
    }
  }

  if (createdCount > 0) {
    logInfo(`Generated ${createdCount} upcoming pickup slots.`);
  }
}

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

    if (!expiredSlotsQuery.empty) {
      const batch = db.batch();
      expiredSlotsQuery.docs.forEach(doc => {
        batch.update(doc.ref, { 
          isActive: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
      logInfo(`Deactivated ${expiredSlotsQuery.size} expired pickup slots.`);
    }

    // Auto-generate active slots for the upcoming 14 days
    await ensureUpcomingSlots();
  } catch (error: any) {
    logError('Error maintaining pickup slots:', error);
  }
});

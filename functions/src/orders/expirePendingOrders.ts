import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const expirePendingOrders = onSchedule({ schedule: 'every 30 minutes', timeoutSeconds: 300 }, async (event) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  try {
    const pendingOrdersQuery = await db.collection('orders')
      .where('status', '==', 'PAYMENT_PENDING')
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(oneHourAgo))
      .get();

    if (pendingOrdersQuery.empty) {
      console.log('No pending orders to expire.');
      return;
    }

    const batch = db.batch();
    let expiredCount = 0;

    for (const doc of pendingOrdersQuery.docs) {
      const orderData = doc.data();

      // Ensure we don't accidentally expire orders that actually have verified payments
      const paymentsSnapshot = await db.collection('payments')
        .where('orderId', '==', doc.id)
        .where('status', '==', 'VERIFIED')
        .get();

      if (!paymentsSnapshot.empty) {
        // Fix the order status discrepancy
        console.warn(`Order ${doc.id} is PAYMENT_PENDING but has a VERIFIED payment. Auto-correcting.`);
        batch.update(doc.ref, {
          status: 'CONFIRMED',
          paymentStatus: 'VERIFIED',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        continue;
      }

      // Expire order
      batch.update(doc.ref, {
        status: 'CANCELLED',
        cancelReason: 'Expired due to payment timeout',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Release pickup slot
      if (orderData.pickupSlotId) {
        const slotRef = db.collection('pickupSlots').doc(orderData.pickupSlotId);
        batch.update(slotRef, { bookedCount: admin.firestore.FieldValue.increment(-1) });
      }

      expiredCount++;
    }

    await batch.commit();
    console.log(`Expired ${expiredCount} pending orders.`);
  } catch (error) {
    console.error('Error expiring pending orders:', error);
  }
});

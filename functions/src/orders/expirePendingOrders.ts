import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { logInfo, logWarn, logError } from '../utils/logger';

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
      logInfo('No pending orders to expire.');
      return;
    }

    let expiredCount = 0;

    // Use Promise.all with transactions for idempotency and concurrency safety
    await Promise.all(
      pendingOrdersQuery.docs.map(async (doc) => {
        try {
          await db.runTransaction(async (tx) => {
            const orderDoc = await tx.get(doc.ref);
            if (!orderDoc.exists) return;
            const orderData = orderDoc.data()!;

            // Idempotency guard: verify it's still pending inside the transaction
            if (orderData.status !== 'PAYMENT_PENDING') {
              return;
            }

            // Ensure we don't accidentally expire orders that actually have verified payments
            const paymentsSnapshot = await tx.get(
              db.collection('payments')
                .where('orderId', '==', doc.id)
                .where('status', '==', 'VERIFIED')
            );

            if (!paymentsSnapshot.empty) {
              logWarn(`Order ${doc.id} is PAYMENT_PENDING but has a VERIFIED payment. Auto-correcting.`);
              tx.update(doc.ref, {
                status: 'CONFIRMED',
                paymentStatus: 'VERIFIED',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              return;
            }

            // Expire order securely
            tx.update(doc.ref, {
              status: 'CANCELLED',
              cancelReason: 'Expired due to payment timeout',
              cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Release pickup slot if present
            if (orderData.pickupSlotId) {
              const slotRef = db.collection('pickupSlots').doc(orderData.pickupSlotId);
              tx.update(slotRef, { bookedCount: admin.firestore.FieldValue.increment(-1) });
            }
          });
          
          expiredCount++;
        } catch (err) {
          logError(`Failed to process expiration for order ${doc.id}:`, err);
        }
      })
    );

    logInfo(`Expired ${expiredCount} pending orders.`);
  } catch (error) {
    logError('Error expiring pending orders:', error);
  }
});

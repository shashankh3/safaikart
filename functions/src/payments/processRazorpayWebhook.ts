import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import * as admin from 'firebase-admin';
import { buildStatusHistoryUpdate } from '../utils/statusLogic';
import { OrderRepository } from '../repositories/OrderRepository';
import { logInfo, logWarn, logError } from '../utils/logger';

const orderRepo = new OrderRepository();

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const processRazorpayWebhook = onTaskDispatched(
  {
    retryConfig: {
      maxAttempts: 5,
      minBackoffSeconds: 60,
    },
    region: 'asia-south1',
  },
  async (request) => {
    const { event, eventId } = request.data;
    
    if (!event) {
      logError('Task missing event payload');
      return;
    }

    // Idempotency check with TTL support
    if (eventId) {
      const eventDocRef = db.collection('webhookEvents').doc(eventId);
      const eventDoc = await eventDocRef.get();
      if (eventDoc.exists) {
        logInfo(`Event ${eventId} already processed. Skipping.`);
        return; // Idempotent success
      }
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days TTL

      await eventDocRef.set({
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        type: event.event,
        expiresAt: expiresAt
      });
    }

    // Log redacted summary instead of raw payload
    await db.collection('auditLogs').add({
      action: 'WEBHOOK_PROCESSING_START',
      eventType: event.event,
      accountId: event.account_id,
      eventId: eventId,
      at: admin.firestore.FieldValue.serverTimestamp()
    });

    if (event.event !== 'payment.captured' && event.event !== 'payment.failed' && event.event !== 'refund.processed') {
      return;
    }

    if (event.event === 'refund.processed') {
      const refund = event.payload.refund.entity;
      const rzpPaymentId = refund.payment_id;
      const refundId = refund.id;
      const refundAmount = refund.amount;
      
      await db.runTransaction(async (tx) => {
        const paymentsQuery = await tx.get(db.collection('payments').where('razorpayPaymentId', '==', rzpPaymentId));
        if (paymentsQuery.empty) {
          logWarn(`Payment record not found for Razorpay Payment: ${rzpPaymentId}`);
          db.collection('auditLogs').add({
            action: 'UNKNOWN_REFUND',
            razorpayPaymentId: rzpPaymentId,
            refundId: refundId,
            attention: true,
            at: admin.firestore.FieldValue.serverTimestamp()
          });
          return;
        }
        
        const paymentRecord = paymentsQuery.docs[0].data();
        const ordData = await orderRepo.findById(paymentRecord.orderId, tx);
        
        if (ordData) {
          if (ordData.status === 'REFUNDED' || ordData.refundId === refundId || (ordData.refunds && ordData.refunds.some((r: any) => r.id === refundId))) {
            return; // Idempotent check
          }
          
          const isFullRefund = refundAmount >= paymentRecord.amountMinor || ordData.status === 'REFUND_PENDING' || ordData.status === 'CANCELLED';
          
          if (isFullRefund) {
            const statusUpdate = buildStatusHistoryUpdate(ordData, 'REFUNDED');
            await orderRepo.update(paymentRecord.orderId, {
              ...statusUpdate,
              paymentStatus: 'REFUNDED',
              refundId: refundId,
            }, tx);
          } else {
            await orderRepo.update(paymentRecord.orderId, {
              refunds: admin.firestore.FieldValue.arrayUnion({
                id: refundId,
                amountMinor: refundAmount,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
              }),
              refundedTotalMinor: admin.firestore.FieldValue.increment(refundAmount),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, tx);
          }
        }
      });
      return;
    }

    const payment = event.payload.payment.entity;
    const rzpOrderId = payment.order_id;
    const rzpPaymentId = payment.id;
    const method = payment.method;

    // 6. Find payment record
    const paymentsQuery = await db.collection('payments').where('razorpayOrderId', '==', rzpOrderId).get();
    
    if (paymentsQuery.empty) {
      logWarn(`Payment record not found for Razorpay Order: ${rzpOrderId}`);
      // Return so task completes, it shouldn't retry if record genuinely lost
      return; 
    }

    const paymentDocRef = paymentsQuery.docs[0].ref;
    const paymentRecord = paymentsQuery.docs[0].data();

    // 7. Verify Data Integrity
    if (payment.amount !== paymentRecord.amountMinor) {
      logError(`Amount mismatch: expected ${paymentRecord.amountMinor}, got ${payment.amount}`);
      await paymentDocRef.update({ status: 'FAILED' });
      await db.collection('auditLogs').add({
        action: 'AMOUNT_MISMATCH',
        orderId: paymentRecord.orderId,
        expected: paymentRecord.amountMinor,
        actual: payment.amount,
        attention: true,
        at: admin.firestore.FieldValue.serverTimestamp()
      });
      return;
    }
    
    if (payment.currency !== 'INR') {
      logError(`Currency mismatch: expected INR, got ${payment.currency}`);
      await paymentDocRef.update({ status: 'FAILED' });
      return;
    }

    // 8. Firestore Transaction (Atomic Update)
    await db.runTransaction(async (tx) => {
      const payDoc = await tx.get(paymentDocRef);
      const ordData = await orderRepo.findById(paymentRecord.orderId, tx);

      if (!payDoc.exists || !ordData) return;

      // Idempotency check
      if (payDoc.data()?.status === 'VERIFIED') {
        return; // Already processed
      }

      if (event.event === 'payment.captured') {
        const isCancelled = ['CANCELLED', 'REFUND_PENDING', 'REFUNDED'].includes(ordData.status);

        tx.update(paymentDocRef, {
          status: 'VERIFIED',
          webhookVerified: true,
          razorpayPaymentId: rzpPaymentId,
          method: method,
          requiresRefund: isCancelled ? true : false,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        if (!isCancelled) {
          const statusUpdate = buildStatusHistoryUpdate(ordData, 'CONFIRMED');

          await orderRepo.update(paymentRecord.orderId, {
            ...statusUpdate,
            paymentStatus: 'VERIFIED',
          }, tx);
          
          if (ordData?.couponCode) {
            const couponRef = db.collection('coupons').doc(ordData.couponCode);
            tx.set(couponRef, {
              usedCount: admin.firestore.FieldValue.increment(1),
              usedBy: admin.firestore.FieldValue.arrayUnion(ordData.userId)
            }, { merge: true });
          }
        } else {
          // Log late payment for cancelled order
          db.collection('auditLogs').add({
            action: 'LATE_PAYMENT_DETECTED',
            orderId: paymentRecord.orderId,
            razorpayPaymentId: rzpPaymentId,
            at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      } else if (event.event === 'payment.failed') {
        tx.update(paymentDocRef, {
          status: 'FAILED',
          webhookVerified: true,
          razorpayPaymentId: rzpPaymentId,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await orderRepo.update(paymentRecord.orderId, {
          status: 'PAYMENT_PENDING',
          paymentStatus: 'FAILED',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, tx);
      }
    });

  }
);

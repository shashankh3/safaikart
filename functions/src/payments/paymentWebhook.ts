import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { verifyWebhookSignature } from './webhook.logic';
import { buildStatusHistoryUpdate } from '../utils/statusLogic';

const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const paymentWebhook = onRequest({ secrets: [razorpayWebhookSecret] }, async (request, response) => {
  try {
    // B2: Read raw body and signature
    const rawBody = request.rawBody; 
    const signature = request.headers['x-razorpay-signature'];

    if (!signature || typeof signature !== 'string') {
      console.error('Webhook missing signature header');
      response.status(400).send('Missing signature');
      return;
    }

    const webhookSecret = razorpayWebhookSecret.value();

    // Verify signature BEFORE logging or parsing
    if (!verifyWebhookSignature(rawBody, signature as string, webhookSecret)) {
      console.error('Webhook signature verification failed');
      response.status(400).send('Invalid signature');
      return;
    }

    // Parse Event safely
    const event = JSON.parse(rawBody.toString());

    // Idempotency check: x-razorpay-event-id
    const eventId = request.headers['x-razorpay-event-id'] as string;
    if (eventId) {
      const eventDoc = await db.collection('webhookEvents').doc(eventId).get();
      if (eventDoc.exists) {
        response.status(200).send('Already processed');
        return;
      }
      await db.collection('webhookEvents').doc(eventId).set({
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        type: event.event
      });
    }

    // Log redacted summary instead of raw payload
    await db.collection('auditLogs').add({
      action: 'WEBHOOK_RECEIVED',
      eventType: event.event,
      accountId: event.account_id,
      at: admin.firestore.FieldValue.serverTimestamp()
    });


    
    if (event.event !== 'payment.captured' && event.event !== 'payment.failed' && event.event !== 'refund.processed') {
      // Ignore other events
      response.status(200).send('Event ignored');
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
          console.warn(`Payment record not found for Razorpay Payment: ${rzpPaymentId}`);
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
        const ordRef = db.collection('orders').doc(paymentRecord.orderId);
        const ordDoc = await tx.get(ordRef);
        
        if (ordDoc.exists) {
          const ordData = ordDoc.data()!;
          if (ordData.status === 'REFUNDED' || ordData.refundId === refundId || (ordData.refunds && ordData.refunds.some((r: any) => r.id === refundId))) {
            return; // Idempotent check
          }
          
          const isFullRefund = refundAmount >= paymentRecord.amountMinor || ordData.status === 'REFUND_PENDING' || ordData.status === 'CANCELLED';
          
          if (isFullRefund) {
            const statusUpdate = buildStatusHistoryUpdate(ordData, 'REFUNDED');
            tx.update(ordRef, {
              ...statusUpdate,
              paymentStatus: 'REFUNDED',
              refundId: refundId,
            });
          } else {
            tx.update(ordRef, {
              refunds: admin.firestore.FieldValue.arrayUnion({
                id: refundId,
                amountMinor: refundAmount,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
              }),
              refundedTotalMinor: admin.firestore.FieldValue.increment(refundAmount),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      });
      response.status(200).send('OK');
      return;
    }

    const payment = event.payload.payment.entity;
    const rzpOrderId = payment.order_id;
    const rzpPaymentId = payment.id;
    const method = payment.method;

    // 6. Find payment record
    const paymentsQuery = await db.collection('payments').where('razorpayOrderId', '==', rzpOrderId).get();
    
    if (paymentsQuery.empty) {
      console.warn(`Payment record not found for Razorpay Order: ${rzpOrderId}`);
      // Respond 200 so Razorpay doesn't keep retrying if we genuinely lost the record
      response.status(200).send('Record not found');
      return;
    }

    const paymentDocRef = paymentsQuery.docs[0].ref;
    const paymentRecord = paymentsQuery.docs[0].data();

    // 7. Verify Data Integrity
    if (payment.amount !== paymentRecord.amountMinor) {
      console.error(`Amount mismatch: expected ${paymentRecord.amountMinor}, got ${payment.amount}`);
      await paymentDocRef.update({ status: 'FAILED' });
      await db.collection('auditLogs').add({
        action: 'AMOUNT_MISMATCH',
        orderId: paymentRecord.orderId,
        expected: paymentRecord.amountMinor,
        actual: payment.amount,
        attention: true,
        at: admin.firestore.FieldValue.serverTimestamp()
      });
      response.status(200).send('Verification failed: Amount');
      return;
    }
    
    if (payment.currency !== 'INR') {
      console.error(`Currency mismatch: expected INR, got ${payment.currency}`);
      await paymentDocRef.update({ status: 'FAILED' });
      response.status(200).send('Verification failed: Currency');
      return;
    }

    // 8. Firestore Transaction (Atomic Update)
    await db.runTransaction(async (tx) => {
      const payDoc = await tx.get(paymentDocRef);
      const ordRef = db.collection('orders').doc(paymentRecord.orderId);
      const ordDoc = await tx.get(ordRef);

      if (!payDoc.exists || !ordDoc.exists) return;

      // Idempotency check
      if (payDoc.data()?.status === 'VERIFIED') {
        return; // Already processed
      }

      if (event.event === 'payment.captured') {
        const isCancelled = ['CANCELLED', 'REFUND_PENDING', 'REFUNDED'].includes(ordDoc.data()?.status);

        tx.update(paymentDocRef, {
          status: 'VERIFIED',
          webhookVerified: true,
          razorpayPaymentId: rzpPaymentId,
          method: method,
          requiresRefund: isCancelled ? true : false,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        if (!isCancelled) {
          const ordData = ordDoc.data()!;
          const statusUpdate = buildStatusHistoryUpdate(ordData, 'CONFIRMED');

          tx.update(ordRef, {
            ...statusUpdate,
            paymentStatus: 'VERIFIED',
          });
          
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
            orderId: ordRef.id,
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

        tx.update(ordRef, {
          status: 'PAYMENT_PENDING',
          paymentStatus: 'FAILED',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    // 9. Respond 200 OK
    response.status(200).send('OK');

  } catch (error) {
    console.error('Webhook processing error:', error);
    // Don't leak error details to caller, but return 500 so Razorpay might retry
    response.status(500).send('Internal Server Error');
  }
});

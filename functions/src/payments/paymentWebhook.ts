import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { verifyWebhookSignature } from './webhook.logic';

const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const paymentWebhook = onRequest({ secrets: [razorpayWebhookSecret] }, async (request, response) => {
  try {
    // 1. Read raw body and signature
    const rawBody = request.rawBody; 
    const signature = request.headers['x-razorpay-signature'];

    if (!signature || typeof signature !== 'string') {
      console.error('Webhook missing signature header');
      response.status(400).send('Missing signature');
      return;
    }

    // D2: Log all incoming webhook payloads
    await db.collection('auditLogs').add({
      action: 'WEBHOOK_RECEIVED',
      payload: rawBody.toString(),
      signature: signature,
      at: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Load secret
    const webhookSecret = razorpayWebhookSecret.value();

    // 3. Compute expected signature and constant-time comparison
    if (!verifyWebhookSignature(rawBody, signature as string, webhookSecret)) {
      console.error('Webhook signature verification failed');
      response.status(400).send('Invalid signature');
      return;
    }

    // 5. Parse Event
    const event = JSON.parse(rawBody.toString());
    
    if (event.event !== 'payment.captured' && event.event !== 'payment.failed' && event.event !== 'refund.processed') {
      // Ignore other events
      response.status(200).send('Event ignored');
      return;
    }

    if (event.event === 'refund.processed') {
      const refund = event.payload.refund.entity;
      const rzpPaymentId = refund.payment_id;
      const refundId = refund.id;
      
      await db.runTransaction(async (tx) => {
        const paymentsQuery = await tx.get(db.collection('payments').where('razorpayPaymentId', '==', rzpPaymentId));
        if (paymentsQuery.empty) {
          console.warn(`Payment record not found for Razorpay Payment: ${rzpPaymentId}`);
          return;
        }
        
        const paymentRecord = paymentsQuery.docs[0].data();
        const ordRef = db.collection('orders').doc(paymentRecord.orderId);
        const ordDoc = await tx.get(ordRef);
        
        if (ordDoc.exists) {
          const ordData = ordDoc.data()!;
          if (ordData.status === 'REFUNDED' || ordData.refundId === refundId) {
            return; // Idempotent check
          }
          
          tx.update(ordRef, {
            status: 'REFUNDED',
            paymentStatus: 'REFUNDED',
            refundId: refundId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
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
        tx.update(paymentDocRef, {
          status: 'VERIFIED',
          webhookVerified: true,
          razorpayPaymentId: rzpPaymentId,
          method: method,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        tx.update(ordRef, {
          status: 'CONFIRMED',
          paymentStatus: 'VERIFIED',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
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

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");
const razorpayWebhookSecret = (0, params_1.defineSecret)('RAZORPAY_WEBHOOK_SECRET');
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.paymentWebhook = (0, https_1.onRequest)({ secrets: [razorpayWebhookSecret] }, async (request, response) => {
    try {
        // 1. Read raw body and signature
        const rawBody = request.rawBody;
        const signature = request.headers['x-razorpay-signature'];
        if (!signature || typeof signature !== 'string') {
            console.error('Webhook missing signature header');
            response.status(400).send('Missing signature');
            return;
        }
        // 2. Load secret
        const webhookSecret = razorpayWebhookSecret.value();
        // 3. Compute expected signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex');
        // 4. Constant-time comparison
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
            console.error('Webhook signature verification failed');
            response.status(400).send('Invalid signature');
            return;
        }
        // 5. Parse Event
        const event = JSON.parse(rawBody.toString());
        if (event.event !== 'payment.captured' && event.event !== 'payment.failed') {
            // Ignore other events
            response.status(200).send('Event ignored');
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
            var _a;
            const payDoc = await tx.get(paymentDocRef);
            const ordRef = db.collection('orders').doc(paymentRecord.orderId);
            const ordDoc = await tx.get(ordRef);
            if (!payDoc.exists || !ordDoc.exists)
                return;
            // Idempotency check
            if (((_a = payDoc.data()) === null || _a === void 0 ? void 0 : _a.status) === 'VERIFIED') {
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
            }
            else if (event.event === 'payment.failed') {
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
    }
    catch (error) {
        console.error('Webhook processing error:', error);
        // Don't leak error details to caller, but return 500 so Razorpay might retry
        response.status(500).send('Internal Server Error');
    }
});
//# sourceMappingURL=paymentWebhook.js.map
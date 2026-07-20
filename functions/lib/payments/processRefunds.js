"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRefunds = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const razorpayClient_1 = require("./razorpayClient");
const razorpayClient_2 = require("./razorpayClient");
const statusLogic_1 = require("../utils/statusLogic");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.processRefunds = (0, scheduler_1.onSchedule)({ schedule: 'every 60 minutes', secrets: [razorpayClient_2.razorpayKeySecret] }, async (event) => {
    try {
        // Look for orders that are REFUND_PENDING or have refundStatus == 'FAILED'
        const snapshot1 = await db.collection('orders').where('status', '==', 'REFUND_PENDING').get();
        const snapshot2 = await db.collection('orders').where('refundStatus', '==', 'FAILED').get();
        const ordersToRefund = new Map();
        snapshot1.docs.forEach(doc => ordersToRefund.set(doc.id, doc));
        snapshot2.docs.forEach(doc => ordersToRefund.set(doc.id, doc));
        if (ordersToRefund.size === 0) {
            console.log('No refunds to process.');
            return;
        }
        console.log(`Processing refunds for ${ordersToRefund.size} orders...`);
        const authHeader = (0, razorpayClient_1.getRazorpayAuthHeader)();
        for (const [orderId, doc] of ordersToRefund) {
            const orderData = doc.data();
            let razorpayPaymentId = null;
            let amountToRefundMinor = 0;
            // Find the verified payment for this order
            const paymentsSnapshot = await db.collection('payments')
                .where('orderId', '==', orderId)
                .where('status', '==', 'VERIFIED')
                .get();
            if (paymentsSnapshot.empty) {
                console.warn(`Cannot process refund for order ${orderId}: No VERIFIED payment found.`);
                continue;
            }
            const payment = paymentsSnapshot.docs[0].data();
            razorpayPaymentId = payment.razorpayPaymentId;
            // Calculate what to refund based on the issue
            if (orderData.status === 'REFUND_PENDING') {
                amountToRefundMinor = payment.amountMinor; // full refund
            }
            else {
                // partial refund or unknown amount, skip for automated unless we can derive it
                // Wait, partial refund from adminConfirmOrderPrice doesn't set status = REFUND_PENDING
                // If it failed there, how much was the refund? We might not know.
                // Actually, let's just stick to full refunds for automated jobs for now to be safe, 
                // or we can require that refundAmountMinor is stored on the order doc when it fails.
                console.warn(`Automated retry for partial refunds not yet implemented safely for order ${orderId}. Skipping.`);
                continue;
            }
            if (!razorpayPaymentId || amountToRefundMinor <= 0) {
                continue;
            }
            const response = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount: amountToRefundMinor })
            });
            if (response.ok) {
                const refundData = await response.json();
                const refundUpdate = (0, statusLogic_1.buildStatusHistoryUpdate)(orderData, 'REFUND_INITIATED');
                await doc.ref.update(Object.assign(Object.assign({}, refundUpdate), { refundId: refundData.id, refundStatus: 'INITIATED' }));
                console.log(`Successfully refunded order ${orderId}`);
            }
            else {
                const errText = await response.text();
                console.error(`Refund failed for order ${orderId}:`, errText);
                await doc.ref.update({
                    refundStatus: 'FAILED',
                    refundError: errText,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    }
    catch (error) {
        console.error('Error processing refunds:', error);
    }
});
//# sourceMappingURL=processRefunds.js.map
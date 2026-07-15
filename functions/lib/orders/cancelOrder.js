"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOrder = void 0;
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const razorpayKeySecret = (0, params_1.defineSecret)('RAZORPAY_KEY_SECRET');
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.cancelOrder = (0, https_2.onCall)({ secrets: [razorpayKeySecret] }, async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const { orderId, reason } = request.data;
    if (!orderId) {
        throw new https_1.HttpsError('invalid-argument', 'Order ID is required');
    }
    const db = admin.firestore();
    const orderRef = db.collection('orders').doc(orderId);
    let newStatus = 'CANCELLED';
    let razorpayPaymentId = null;
    let amountToRefundMinor = 0;
    try {
        await db.runTransaction(async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) {
                throw new https_1.HttpsError('not-found', 'Order not found');
            }
            const orderData = orderDoc.data();
            if ((orderData === null || orderData === void 0 ? void 0 : orderData.userId) !== uid) {
                throw new https_1.HttpsError('permission-denied', 'Not authorized to cancel this order');
            }
            const status = orderData === null || orderData === void 0 ? void 0 : orderData.status;
            if (status !== 'CONFIRMED' && status !== 'PICKUP_SCHEDULED' && status !== 'PAYMENT_PENDING' && status !== 'DRAFT') {
                throw new https_1.HttpsError('failed-precondition', 'Order cannot be cancelled at this stage');
            }
            if ((orderData === null || orderData === void 0 ? void 0 : orderData.paymentStatus) === 'VERIFIED' || (orderData === null || orderData === void 0 ? void 0 : orderData.paymentStatus) === 'CAPTURED') {
                newStatus = 'REFUND_PENDING';
                // find payment
                const paymentsSnapshot = await transaction.get(db.collection('payments')
                    .where('orderId', '==', orderId)
                    .where('status', '==', 'VERIFIED'));
                if (!paymentsSnapshot.empty) {
                    const payment = paymentsSnapshot.docs[0].data();
                    razorpayPaymentId = payment.razorpayPaymentId;
                    amountToRefundMinor = payment.amountMinor;
                }
            }
            transaction.update(orderRef, {
                status: newStatus,
                cancelReason: reason || null,
                cancelledAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
        });
        if (newStatus === 'REFUND_PENDING' && razorpayPaymentId && amountToRefundMinor > 0) {
            const keySecret = razorpayKeySecret.value();
            const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${keySecret}`).toString('base64');
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
                await orderRef.update({
                    status: 'REFUND_INITIATED',
                    refundId: refundData.id,
                    updatedAt: firestore_1.FieldValue.serverTimestamp()
                });
                newStatus = 'REFUND_INITIATED';
            }
            else {
                console.error('Refund failed:', await response.text());
                // Refund failed, status remains REFUND_PENDING
            }
        }
        return { success: true, message: 'Order cancelled successfully', newStatus };
    }
    catch (error) {
        throw new https_1.HttpsError('internal', error.message || 'Failed to cancel order');
    }
});
//# sourceMappingURL=cancelOrder.js.map
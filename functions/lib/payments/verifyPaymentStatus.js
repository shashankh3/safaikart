"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPaymentStatus = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const razorpayClient_1 = require("./razorpayClient");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.verifyPaymentStatus = (0, https_1.onCall)({ secrets: [razorpayClient_1.razorpayKeySecret] }, async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { orderId } = request.data;
    if (!orderId) {
        throw new https_1.HttpsError('invalid-argument', 'Order ID is required.');
    }
    const paymentsQuery = await db.collection('payments')
        .where('orderId', '==', orderId)
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    if (paymentsQuery.empty) {
        throw new https_1.HttpsError('not-found', 'Payment record not found.');
    }
    const paymentDocRef = paymentsQuery.docs[0].ref;
    const paymentRecord = paymentsQuery.docs[0].data();
    // If already verified, just return
    if (paymentRecord.status === 'VERIFIED') {
        return { paymentStatus: 'VERIFIED', orderStatus: 'CONFIRMED' };
    }
    if (paymentRecord.status === 'FAILED') {
        return { paymentStatus: 'FAILED', orderStatus: 'PAYMENT_PENDING' };
    }
    // Fallback: Manually check Razorpay API
    const authHeader = (0, razorpayClient_1.getRazorpayAuthHeader)();
    const rzpOrderId = paymentRecord.razorpayOrderId;
    try {
        const response = await fetch(`https://api.razorpay.com/v1/orders/${rzpOrderId}/payments`, {
            method: 'GET',
            headers: {
                'Authorization': authHeader
            }
        });
        if (!response.ok) {
            throw new Error('Razorpay API error');
        }
        const data = await response.json();
        const payments = data.items || [];
        // Find a captured payment
        const capturedPayment = payments.find((p) => p.status === 'captured');
        if (capturedPayment) {
            // Verify Amount & Currency
            if (capturedPayment.amount === paymentRecord.amountMinor && capturedPayment.currency === 'INR') {
                // Update Firestore
                await db.runTransaction(async (tx) => {
                    var _a;
                    const payDoc = await tx.get(paymentDocRef);
                    const ordRef = db.collection('orders').doc(orderId);
                    const ordDoc = await tx.get(ordRef);
                    if (!payDoc.exists || !ordDoc.exists)
                        return;
                    if (((_a = payDoc.data()) === null || _a === void 0 ? void 0 : _a.status) === 'VERIFIED')
                        return;
                    tx.update(paymentDocRef, {
                        status: 'VERIFIED',
                        webhookVerified: false,
                        razorpayPaymentId: capturedPayment.id,
                        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    tx.update(ordRef, {
                        status: 'CONFIRMED',
                        paymentStatus: 'VERIFIED',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                });
                return { paymentStatus: 'VERIFIED', orderStatus: 'CONFIRMED' };
            }
        }
        // Check if any payment failed
        const failedPayment = payments.find((p) => p.status === 'failed');
        if (failedPayment) {
            // We could mark it failed, but let's wait for webhook or manual retry to be safe
            return { paymentStatus: 'PENDING', orderStatus: 'PAYMENT_PENDING' };
        }
        return { paymentStatus: paymentRecord.status, orderStatus: 'PAYMENT_PENDING' };
    }
    catch (error) {
        console.error('Manual verification failed:', error);
        return { paymentStatus: paymentRecord.status, orderStatus: 'PAYMENT_PENDING' };
    }
});
//# sourceMappingURL=verifyPaymentStatus.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentOrder = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const razorpayClient_1 = require("./razorpayClient");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.createPaymentOrder = (0, https_1.onCall)({ secrets: [razorpayClient_1.razorpayKeySecret] }, async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { orderId } = request.data;
    if (!orderId) {
        throw new https_1.HttpsError('invalid-argument', 'Order ID is required.');
    }
    // 1. Fetch Order
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Order not found.');
    }
    const order = orderDoc.data();
    if (order.userId !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Unauthorized access to order.');
    }
    if (order.status !== 'PAYMENT_PENDING') {
        throw new https_1.HttpsError('failed-precondition', 'Order is not in PAYMENT_PENDING status.');
    }
    // 2. Check for existing payment
    const paymentsQuery = await db.collection('payments')
        .where('orderId', '==', orderId)
        .where('userId', '==', uid)
        .get();
    for (const doc of paymentsQuery.docs) {
        const payment = doc.data();
        if (payment.status === 'VERIFIED') {
            throw new https_1.HttpsError('failed-precondition', 'Payment already completed for this order.');
        }
        if (payment.status === 'CREATED' || payment.status === 'PENDING') {
            // Return existing razorpay order to avoid duplicates if it's still valid
            return {
                razorpayOrderId: payment.razorpayOrderId,
                razorpayKeyId: (0, razorpayClient_1.getRazorpayKeyId)(),
                amountMinor: payment.amountMinor,
                currency: payment.currency,
                checkoutUrl: `https://safaikart-6c4e4.web.app/checkout/index.html?order_id=${payment.razorpayOrderId}&key_id=${(0, razorpayClient_1.getRazorpayKeyId)()}&amount=${payment.amountMinor}&currency=${payment.currency}`
            };
        }
    }
    // 3. Load Secret (no longer needed directly here, handled by client)
    // 4. Call Razorpay API
    const amountMinor = order.finalAmountMinor;
    const authHeader = (0, razorpayClient_1.getRazorpayAuthHeader)();
    try {
        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amountMinor,
                currency: 'INR',
                receipt: orderId,
                payment_capture: 1,
                notes: {
                    internalOrderId: orderId,
                    userId: uid
                }
            })
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Razorpay Error:', errorData);
            throw new https_1.HttpsError('internal', 'Failed to create payment order with gateway.');
        }
        const rzpOrder = await response.json();
        // 5. Create Payment Document
        const newPaymentRef = db.collection('payments').doc();
        await newPaymentRef.set({
            orderId: orderId,
            userId: uid,
            provider: 'razorpay',
            razorpayOrderId: rzpOrder.id,
            razorpayPaymentId: null,
            amountMinor: amountMinor,
            currency: 'INR',
            method: 'upi',
            status: 'CREATED',
            webhookVerified: false,
            clientCallbackReceived: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            verifiedAt: null
        });
        // 6. Update Order Status
        await orderRef.update({
            paymentStatus: 'PAYMENT_CREATED',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const checkoutUrl = `https://safaikart-6c4e4.web.app/checkout/index.html?order_id=${rzpOrder.id}&key_id=${(0, razorpayClient_1.getRazorpayKeyId)()}&amount=${amountMinor}&currency=INR`;
        return {
            razorpayOrderId: rzpOrder.id,
            razorpayKeyId: (0, razorpayClient_1.getRazorpayKeyId)(),
            amountMinor,
            currency: 'INR',
            checkoutUrl
        };
    }
    catch (error) {
        console.error('Payment creation error:', error);
        throw new https_1.HttpsError('internal', 'Failed to initiate payment.');
    }
});
//# sourceMappingURL=createPaymentOrder.js.map
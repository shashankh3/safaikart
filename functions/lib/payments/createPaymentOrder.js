"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentOrder = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const razorpayClient_1 = require("./razorpayClient");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.createPaymentOrder = (0, https_1.onCall)({ secrets: [razorpayClient_1.razorpayKeySecret], enforceAppCheck: true }, async (request) => {
    var _a, _b;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { rateLimiter } = await Promise.resolve().then(() => __importStar(require('../utils/rateLimiter')));
    await rateLimiter(uid, 'createPaymentOrder', 10, 3600);
    const profileDoc = await db.collection('profiles').doc(uid).get();
    if (profileDoc.exists && ((_b = profileDoc.data()) === null || _b === void 0 ? void 0 : _b.isBlocked)) {
        throw new https_1.HttpsError('permission-denied', 'Your account has been blocked.');
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
    if (order.status !== 'PAYMENT_PENDING' && order.status !== 'CONFIRMED') {
        throw new https_1.HttpsError('failed-precondition', 'Order cannot accept payments at this stage.');
    }
    if (order.paymentStatus !== 'PAYMENT_PENDING' && order.paymentStatus !== 'NOT_STARTED' && order.paymentStatus !== 'FAILED') {
        throw new https_1.HttpsError('failed-precondition', 'Order does not require payment at this time.');
    }
    // 2. Check for existing payment
    const paymentsQuery = await db.collection('payments')
        .where('orderId', '==', orderId)
        .where('userId', '==', uid)
        .get();
    let existingPaymentRef = null;
    let amountMinor = order.finalAmountMinor;
    for (const doc of paymentsQuery.docs) {
        const payment = doc.data();
        if (payment.status === 'VERIFIED') {
            // If we are looking for a top-up, there might be a VERIFIED payment already. We skip it and look for PENDING.
            continue;
        }
        if (payment.status === 'CREATED' || payment.status === 'PENDING') {
            if (payment.razorpayOrderId) {
                // C1: Fix double payment retry race by checking real status before returning
                try {
                    const authHeader = (0, razorpayClient_1.getRazorpayAuthHeader)();
                    const rzpResponse = await fetch(`https://api.razorpay.com/v1/orders/${payment.razorpayOrderId}`, {
                        headers: { 'Authorization': authHeader }
                    });
                    if (rzpResponse.ok) {
                        const rzpData = await rzpResponse.json();
                        if (rzpData.status === 'paid' || rzpData.status === 'attempted') {
                            throw new https_1.HttpsError('failed-precondition', 'A payment is currently processing for this order. Please wait a few moments.');
                        }
                    }
                }
                catch (e) {
                    if (e instanceof https_1.HttpsError)
                        throw e;
                    console.error('Error checking existing razorpay order:', e);
                }
                // Return existing razorpay order to avoid duplicates if it's still valid
                const baseUrl = process.env.CHECKOUT_BASE_URL || 'https://safaikart-6c4e4.web.app';
                return {
                    razorpayOrderId: payment.razorpayOrderId,
                    razorpayKeyId: (0, razorpayClient_1.getRazorpayKeyId)(),
                    amountMinor: payment.amountMinor,
                    currency: payment.currency,
                    checkoutUrl: `${baseUrl}/checkout/index.html?order_id=${payment.razorpayOrderId}&key_id=${(0, razorpayClient_1.getRazorpayKeyId)()}&amount=${payment.amountMinor}&currency=${payment.currency}`
                };
            }
            else {
                // It's a top-up pending payment without a razorpay order yet
                existingPaymentRef = doc.ref;
                amountMinor = payment.amountMinor;
            }
        }
    }
    // 3. Load Secret (no longer needed directly here, handled by client)
    // 4. Call Razorpay API
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
                payment_capture: 1, // auto-capture
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
        // 5. Create or Update Payment Document
        if (existingPaymentRef) {
            await existingPaymentRef.update({
                provider: 'razorpay',
                razorpayOrderId: rzpOrder.id,
                status: 'CREATED',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        else {
            const newPaymentRef = db.collection('payments').doc();
            await newPaymentRef.set({
                orderId: orderId,
                userId: uid,
                provider: 'razorpay',
                razorpayOrderId: rzpOrder.id,
                razorpayPaymentId: null,
                amountMinor: amountMinor,
                currency: 'INR',
                method: null,
                status: 'CREATED',
                webhookVerified: false,
                clientCallbackReceived: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                verifiedAt: null
            });
        }
        // 6. Update Order Status
        await orderRef.update({
            paymentStatus: 'PAYMENT_CREATED',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const baseUrl = process.env.CHECKOUT_BASE_URL || 'https://safaikart-6c4e4.web.app';
        const checkoutUrl = `${baseUrl}/checkout/index.html?order_id=${rzpOrder.id}&key_id=${(0, razorpayClient_1.getRazorpayKeyId)()}&amount=${amountMinor}&currency=INR`;
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
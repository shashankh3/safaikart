"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryPayment = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.retryPayment = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { orderId } = request.data;
    if (!orderId) {
        throw new https_1.HttpsError('invalid-argument', 'Order ID is required.');
    }
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists || ((_b = orderDoc.data()) === null || _b === void 0 ? void 0 : _b.userId) !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Order not found or unauthorized.');
    }
    if (((_c = orderDoc.data()) === null || _c === void 0 ? void 0 : _c.status) !== 'PAYMENT_PENDING') {
        throw new https_1.HttpsError('failed-precondition', 'Order is not in PAYMENT_PENDING state.');
    }
    // Instead of re-writing the Razorpay API call logic, we can just call the createPaymentOrder 
    // implementation. The createPaymentOrder logic checks for PENDING/CREATED payments and returns 
    // them, or creates a new one. 
    // If the previous payment FAILED, createPaymentOrder will bypass the check (since it only blocks
    // VERIFIED, and only returns PENDING/CREATED) and create a new Razorpay order.
    // To use the callable locally we can just invoke its handler (though Cloud Functions v2 handlers 
    // can be invoked by passing the request object if we cast it).
    // Wait, calling another v2 HTTPS callable directly from within a v2 HTTPS callable is easiest 
    // by just isolating the core logic, or we can just duplicate the core block here to keep it 
    // simple and avoid type issues with Cloud Function Contexts.
    throw new https_1.HttpsError('unimplemented', 'Please call createPaymentOrder directly for retries.');
});
//# sourceMappingURL=retryPayment.js.map
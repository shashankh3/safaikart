"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOrder = void 0;
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.cancelOrder = (0, https_2.onCall)(async (request) => {
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
    try {
        return await db.runTransaction(async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) {
                throw new https_1.HttpsError('not-found', 'Order not found');
            }
            const orderData = orderDoc.data();
            if ((orderData === null || orderData === void 0 ? void 0 : orderData.userId) !== uid) {
                throw new https_1.HttpsError('permission-denied', 'Not authorized to cancel this order');
            }
            const status = orderData === null || orderData === void 0 ? void 0 : orderData.status;
            if (status !== 'CONFIRMED' && status !== 'PICKUP_SCHEDULED') {
                throw new https_1.HttpsError('failed-precondition', 'Order cannot be cancelled at this stage');
            }
            let newStatus = 'CANCELLED';
            if ((orderData === null || orderData === void 0 ? void 0 : orderData.paymentStatus) === 'VERIFIED' || (orderData === null || orderData === void 0 ? void 0 : orderData.paymentStatus) === 'CAPTURED') {
                newStatus = 'REFUND_PENDING';
            }
            transaction.update(orderRef, {
                status: newStatus,
                cancelReason: reason || null,
                cancelledAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
            return { success: true, message: 'Order cancelled successfully', newStatus };
        });
    }
    catch (error) {
        throw new https_1.HttpsError('internal', error.message || 'Failed to cancel order');
    }
});
//# sourceMappingURL=cancelOrder.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUpdateOrderStatus = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
// Valid status transitions
const ALLOWED_TRANSITIONS = {
    PAYMENT_PENDING: ['CANCELLED'],
    CONFIRMED: ['PICKUP_SCHEDULED', 'CANCELLED'],
    PICKUP_SCHEDULED: ['PICKED_UP', 'CANCELLED'],
    PICKED_UP: ['CLEANING_IN_PROGRESS', 'CANCELLED'],
    CLEANING_IN_PROGRESS: ['READY_FOR_DELIVERY', 'CANCELLED'],
    READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [],
    CANCELLED: ['REFUNDED'],
    REFUND_PENDING: ['REFUNDED'],
    REFUNDED: [], // Terminal
};
const assertAdmin_1 = require("../utils/assertAdmin");
exports.adminUpdateOrderStatus = (0, https_1.onCall)(async (request) => {
    (0, assertAdmin_1.assertAdmin)(request);
    const { data } = request;
    const { orderId, newStatus } = data;
    if (!orderId || !newStatus) {
        throw new https_1.HttpsError('invalid-argument', 'orderId and newStatus are required.');
    }
    const db = admin.firestore();
    const orderRef = db.collection('orders').doc(orderId);
    try {
        await db.runTransaction(async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) {
                throw new https_1.HttpsError('not-found', 'Order not found.');
            }
            const orderData = orderDoc.data();
            const currentStatus = orderData.status;
            // Allow if transitioning to same state (idempotent)
            if (currentStatus === newStatus) {
                return;
            }
            // Check transition map
            const allowedNextStates = ALLOWED_TRANSITIONS[currentStatus] || [];
            if (!allowedNextStates.includes(newStatus)) {
                throw new https_1.HttpsError('failed-precondition', `Cannot transition order status from ${currentStatus} to ${newStatus}.`);
            }
            const now = admin.firestore.FieldValue.serverTimestamp();
            const newStatusHistoryEntry = {
                status: newStatus,
                at: now
            };
            const updatePayload = {
                status: newStatus,
                updatedAt: now,
            };
            // Keep track of status history if array exists, or initialize it
            if (orderData.statusHistory) {
                updatePayload.statusHistory = admin.firestore.FieldValue.arrayUnion(newStatusHistoryEntry);
            }
            else {
                updatePayload.statusHistory = [
                    { status: currentStatus, at: orderData.createdAt },
                    newStatusHistoryEntry
                ];
            }
            transaction.update(orderRef, updatePayload);
        });
        return { success: true, message: `Order ${orderId} updated to ${newStatus}` };
    }
    catch (error) {
        console.error('Error in adminUpdateOrderStatus:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', error.message || 'An error occurred while updating order status.');
    }
});
//# sourceMappingURL=adminUpdateOrderStatus.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUpdateOrderStatus = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const statusLogic_1 = require("../utils/statusLogic");
// Valid status transitions
const ALLOWED_TRANSITIONS = {
    PAYMENT_PENDING: ['CANCELLED'], // usually updated via payment webhook to CONFIRMED
    CONFIRMED: ['PICKUP_SCHEDULED', 'CANCELLED'],
    PICKUP_SCHEDULED: ['PICKED_UP', 'CANCELLED'],
    PICKED_UP: ['CLEANING_IN_PROGRESS', 'CANCELLED'],
    CLEANING_IN_PROGRESS: ['READY_FOR_DELIVERY', 'CANCELLED'],
    READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [], // Terminal
    CANCELLED: ['REFUNDED'], // Terminal for fulfillment, but can be updated to REFUNDED if money returned
    REFUND_PENDING: ['REFUNDED'], // Handled by other processes
    REFUND_INITIATED: ['REFUNDED'],
    REFUNDED: [], // Terminal
};
const assertAdmin_1 = require("../utils/assertAdmin");
const zod_1 = require("zod");
const updateSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    newStatus: zod_1.z.string().min(1)
});
exports.adminUpdateOrderStatus = (0, https_1.onCall)(async (request) => {
    (0, assertAdmin_1.assertAdmin)(request, ['superadmin', 'admin', 'ops']);
    const { data } = request;
    let orderId;
    let newStatus;
    try {
        const parsed = updateSchema.parse(data);
        orderId = parsed.orderId;
        newStatus = parsed.newStatus;
    }
    catch (e) {
        throw new https_1.HttpsError('invalid-argument', `Validation error: ${e.message}`);
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
            // If transitioning to REFUNDED, ensure there is a refundId or the payment was never verified
            if (newStatus === 'REFUNDED') {
                if (!orderData.refundId && orderData.paymentStatus === 'VERIFIED') {
                    throw new https_1.HttpsError('failed-precondition', 'Cannot mark as REFUNDED without a linked refundId for VERIFIED payments.');
                }
            }
            const updatePayload = (0, statusLogic_1.buildStatusHistoryUpdate)(orderData, newStatus);
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
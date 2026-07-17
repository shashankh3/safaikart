"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAssignDriver = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const assertAdmin_1 = require("../utils/assertAdmin");
exports.adminAssignDriver = (0, https_1.onCall)(async (request) => {
    (0, assertAdmin_1.assertAdmin)(request);
    const { data, auth } = request;
    const { orderId, driverId } = data;
    if (!orderId || !driverId) {
        throw new https_1.HttpsError('invalid-argument', 'orderId and driverId are required.');
    }
    const db = admin.firestore();
    const driverDoc = await db.collection('drivers').doc(driverId).get();
    if (!driverDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Driver not found.');
    }
    const driverData = driverDoc.data();
    const orderRef = db.collection('orders').doc(orderId);
    try {
        await db.runTransaction(async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) {
                throw new https_1.HttpsError('not-found', 'Order not found.');
            }
            const orderData = orderDoc.data();
            const currentStatus = orderData.status;
            const now = admin.firestore.FieldValue.serverTimestamp();
            const newStatusHistoryEntry = {
                status: 'DRIVER_ASSIGNED',
                at: now
            };
            const updatePayload = {
                driverId: driverId,
                driverName: driverData.name || 'Assigned Driver',
                driverPhone: driverData.phone || '',
                updatedAt: now,
            };
            // Keep track of status history
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
            // Write Audit Log
            const auditLogRef = db.collection('auditLogs').doc();
            transaction.set(auditLogRef, {
                actorUid: auth === null || auth === void 0 ? void 0 : auth.uid,
                action: 'ASSIGN_DRIVER',
                orderId: orderId,
                before: { driverId: orderData.driverId || null },
                after: { driverId: driverId },
                at: now
            });
        });
        return { success: true, message: `Driver ${driverId} assigned to order ${orderId}` };
    }
    catch (error) {
        console.error('Error in adminAssignDriver:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', error.message || 'An error occurred while assigning driver.');
    }
});
//# sourceMappingURL=adminAssignDriver.js.map
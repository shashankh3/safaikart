"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAssignDriver = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const assertAdmin_1 = require("../utils/assertAdmin");
const statusLogic_1 = require("../utils/statusLogic");
const zod_1 = require("zod");
const assignSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    driverId: zod_1.z.string().min(1)
});
exports.adminAssignDriver = (0, https_1.onCall)(async (request) => {
    (0, assertAdmin_1.assertAdmin)(request, ['superadmin', 'admin', 'ops']);
    const { data, auth } = request;
    let orderId;
    let driverId;
    try {
        const parsed = assignSchema.parse(data);
        orderId = parsed.orderId;
        driverId = parsed.driverId;
    }
    catch (e) {
        throw new https_1.HttpsError('invalid-argument', `Validation error: ${e.message}`);
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
            const statusUpdate = (0, statusLogic_1.buildStatusHistoryUpdate)(orderData, 'DRIVER_ASSIGNED');
            const updatePayload = Object.assign(Object.assign({}, statusUpdate), { driverId: driverId, driverName: driverData.name || 'Assigned Driver', driverPhone: driverData.phone || '' });
            transaction.update(orderRef, updatePayload);
            // Write Audit Log
            const auditLogRef = db.collection('auditLogs').doc();
            transaction.set(auditLogRef, {
                actorUid: auth === null || auth === void 0 ? void 0 : auth.uid,
                action: 'ASSIGN_DRIVER',
                orderId: orderId,
                before: { driverId: orderData.driverId || null },
                after: { driverId: driverId },
                at: admin.firestore.FieldValue.serverTimestamp()
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
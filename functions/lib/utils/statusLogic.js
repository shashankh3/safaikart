"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStatusHistoryUpdate = buildStatusHistoryUpdate;
const admin = require("firebase-admin");
function buildStatusHistoryUpdate(orderData, newStatus, timestamp = admin.firestore.Timestamp.now()) {
    const newStatusHistoryEntry = {
        status: newStatus,
        at: timestamp
    };
    const updatePayload = {
        status: newStatus,
        updatedAt: timestamp,
        statusHistory: null
    };
    if (orderData.statusHistory && Array.isArray(orderData.statusHistory)) {
        updatePayload.statusHistory = admin.firestore.FieldValue.arrayUnion(newStatusHistoryEntry);
    }
    else {
        // Retroactively add the creation status if history doesn't exist
        let createdAt = orderData.createdAt;
        if (!createdAt) {
            createdAt = admin.firestore.Timestamp.now();
        }
        updatePayload.statusHistory = [
            { status: orderData.status || 'PAYMENT_PENDING', at: createdAt },
            newStatusHistoryEntry
        ];
    }
    return updatePayload;
}
//# sourceMappingURL=statusLogic.js.map
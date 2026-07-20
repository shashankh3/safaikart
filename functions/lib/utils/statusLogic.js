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
exports.buildStatusHistoryUpdate = buildStatusHistoryUpdate;
const admin = __importStar(require("firebase-admin"));
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
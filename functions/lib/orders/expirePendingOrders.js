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
exports.expirePendingOrders = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.expirePendingOrders = (0, scheduler_1.onSchedule)({ schedule: 'every 30 minutes', timeoutSeconds: 300 }, async (event) => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    try {
        const pendingOrdersQuery = await db.collection('orders')
            .where('status', '==', 'PAYMENT_PENDING')
            .where('createdAt', '<', admin.firestore.Timestamp.fromDate(oneHourAgo))
            .get();
        if (pendingOrdersQuery.empty) {
            (0, logger_1.logInfo)('No pending orders to expire.');
            return;
        }
        let expiredCount = 0;
        // Use Promise.all with transactions for idempotency and concurrency safety
        await Promise.all(pendingOrdersQuery.docs.map(async (doc) => {
            try {
                await db.runTransaction(async (tx) => {
                    const orderDoc = await tx.get(doc.ref);
                    if (!orderDoc.exists)
                        return;
                    const orderData = orderDoc.data();
                    // Idempotency guard: verify it's still pending inside the transaction
                    if (orderData.status !== 'PAYMENT_PENDING') {
                        return;
                    }
                    // Ensure we don't accidentally expire orders that actually have verified payments
                    const paymentsSnapshot = await tx.get(db.collection('payments')
                        .where('orderId', '==', doc.id)
                        .where('status', '==', 'VERIFIED'));
                    if (!paymentsSnapshot.empty) {
                        (0, logger_1.logWarn)(`Order ${doc.id} is PAYMENT_PENDING but has a VERIFIED payment. Auto-correcting.`);
                        tx.update(doc.ref, {
                            status: 'CONFIRMED',
                            paymentStatus: 'VERIFIED',
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        return;
                    }
                    // Expire order securely
                    tx.update(doc.ref, {
                        status: 'CANCELLED',
                        cancelReason: 'Expired due to payment timeout',
                        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    // Release pickup slot if present
                    if (orderData.pickupSlotId) {
                        const slotRef = db.collection('pickupSlots').doc(orderData.pickupSlotId);
                        tx.update(slotRef, { bookedCount: admin.firestore.FieldValue.increment(-1) });
                    }
                });
                expiredCount++;
            }
            catch (err) {
                (0, logger_1.logError)(`Failed to process expiration for order ${doc.id}:`, err);
            }
        }));
        (0, logger_1.logInfo)(`Expired ${expiredCount} pending orders.`);
    }
    catch (error) {
        (0, logger_1.logError)('Error expiring pending orders:', error);
    }
});
//# sourceMappingURL=expirePendingOrders.js.map
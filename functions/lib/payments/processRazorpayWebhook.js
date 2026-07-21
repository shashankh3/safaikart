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
exports.processRazorpayWebhook = void 0;
const tasks_1 = require("firebase-functions/v2/tasks");
const admin = __importStar(require("firebase-admin"));
const statusLogic_1 = require("../utils/statusLogic");
const OrderRepository_1 = require("../repositories/OrderRepository");
const logger_1 = require("../utils/logger");
const orderRepo = new OrderRepository_1.OrderRepository();
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.processRazorpayWebhook = (0, tasks_1.onTaskDispatched)({
    retryConfig: {
        maxAttempts: 5,
        minBackoffSeconds: 60,
    },
}, async (request) => {
    const { event, eventId } = request.data;
    if (!event) {
        (0, logger_1.logError)('Task missing event payload');
        return;
    }
    // Idempotency check with TTL support
    if (eventId) {
        const eventDocRef = db.collection('webhookEvents').doc(eventId);
        const eventDoc = await eventDocRef.get();
        if (eventDoc.exists) {
            (0, logger_1.logInfo)(`Event ${eventId} already processed. Skipping.`);
            return; // Idempotent success
        }
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days TTL
        await eventDocRef.set({
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            type: event.event,
            expiresAt: expiresAt
        });
    }
    // Log redacted summary instead of raw payload
    await db.collection('auditLogs').add({
        action: 'WEBHOOK_PROCESSING_START',
        eventType: event.event,
        accountId: event.account_id,
        eventId: eventId,
        at: admin.firestore.FieldValue.serverTimestamp()
    });
    if (event.event !== 'payment.captured' && event.event !== 'payment.failed' && event.event !== 'refund.processed') {
        return;
    }
    if (event.event === 'refund.processed') {
        const refund = event.payload.refund.entity;
        const rzpPaymentId = refund.payment_id;
        const refundId = refund.id;
        const refundAmount = refund.amount;
        await db.runTransaction(async (tx) => {
            const paymentsQuery = await tx.get(db.collection('payments').where('razorpayPaymentId', '==', rzpPaymentId));
            if (paymentsQuery.empty) {
                (0, logger_1.logWarn)(`Payment record not found for Razorpay Payment: ${rzpPaymentId}`);
                db.collection('auditLogs').add({
                    action: 'UNKNOWN_REFUND',
                    razorpayPaymentId: rzpPaymentId,
                    refundId: refundId,
                    attention: true,
                    at: admin.firestore.FieldValue.serverTimestamp()
                });
                return;
            }
            const paymentRecord = paymentsQuery.docs[0].data();
            const ordData = await orderRepo.findById(paymentRecord.orderId, tx);
            if (ordData) {
                if (ordData.status === 'REFUNDED' || ordData.refundId === refundId || (ordData.refunds && ordData.refunds.some((r) => r.id === refundId))) {
                    return; // Idempotent check
                }
                const isFullRefund = refundAmount >= paymentRecord.amountMinor || ordData.status === 'REFUND_PENDING' || ordData.status === 'CANCELLED';
                if (isFullRefund) {
                    const statusUpdate = (0, statusLogic_1.buildStatusHistoryUpdate)(ordData, 'REFUNDED');
                    await orderRepo.update(paymentRecord.orderId, Object.assign(Object.assign({}, statusUpdate), { paymentStatus: 'REFUNDED', refundId: refundId }), tx);
                }
                else {
                    await orderRepo.update(paymentRecord.orderId, {
                        refunds: admin.firestore.FieldValue.arrayUnion({
                            id: refundId,
                            amountMinor: refundAmount,
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        }),
                        refundedTotalMinor: admin.firestore.FieldValue.increment(refundAmount),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, tx);
                }
            }
        });
        return;
    }
    const payment = event.payload.payment.entity;
    const rzpOrderId = payment.order_id;
    const rzpPaymentId = payment.id;
    const method = payment.method;
    // 6. Find payment record
    const paymentsQuery = await db.collection('payments').where('razorpayOrderId', '==', rzpOrderId).get();
    if (paymentsQuery.empty) {
        (0, logger_1.logWarn)(`Payment record not found for Razorpay Order: ${rzpOrderId}`);
        // Return so task completes, it shouldn't retry if record genuinely lost
        return;
    }
    const paymentDocRef = paymentsQuery.docs[0].ref;
    const paymentRecord = paymentsQuery.docs[0].data();
    // 7. Verify Data Integrity
    if (payment.amount !== paymentRecord.amountMinor) {
        (0, logger_1.logError)(`Amount mismatch: expected ${paymentRecord.amountMinor}, got ${payment.amount}`);
        await paymentDocRef.update({ status: 'FAILED' });
        await db.collection('auditLogs').add({
            action: 'AMOUNT_MISMATCH',
            orderId: paymentRecord.orderId,
            expected: paymentRecord.amountMinor,
            actual: payment.amount,
            attention: true,
            at: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
    }
    if (payment.currency !== 'INR') {
        (0, logger_1.logError)(`Currency mismatch: expected INR, got ${payment.currency}`);
        await paymentDocRef.update({ status: 'FAILED' });
        return;
    }
    // 8. Firestore Transaction (Atomic Update)
    await db.runTransaction(async (tx) => {
        var _a;
        const payDoc = await tx.get(paymentDocRef);
        const ordData = await orderRepo.findById(paymentRecord.orderId, tx);
        if (!payDoc.exists || !ordData)
            return;
        // Idempotency check
        if (((_a = payDoc.data()) === null || _a === void 0 ? void 0 : _a.status) === 'VERIFIED') {
            return; // Already processed
        }
        if (event.event === 'payment.captured') {
            const isCancelled = ['CANCELLED', 'REFUND_PENDING', 'REFUNDED'].includes(ordData.status);
            tx.update(paymentDocRef, {
                status: 'VERIFIED',
                webhookVerified: true,
                razorpayPaymentId: rzpPaymentId,
                method: method,
                requiresRefund: isCancelled ? true : false,
                verifiedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            if (!isCancelled) {
                const statusUpdate = (0, statusLogic_1.buildStatusHistoryUpdate)(ordData, 'CONFIRMED');
                await orderRepo.update(paymentRecord.orderId, Object.assign(Object.assign({}, statusUpdate), { paymentStatus: 'VERIFIED' }), tx);
                if (ordData === null || ordData === void 0 ? void 0 : ordData.couponCode) {
                    const couponRef = db.collection('coupons').doc(ordData.couponCode);
                    tx.set(couponRef, {
                        usedCount: admin.firestore.FieldValue.increment(1),
                        usedBy: admin.firestore.FieldValue.arrayUnion(ordData.userId)
                    }, { merge: true });
                }
            }
            else {
                // Log late payment for cancelled order
                db.collection('auditLogs').add({
                    action: 'LATE_PAYMENT_DETECTED',
                    orderId: paymentRecord.orderId,
                    razorpayPaymentId: rzpPaymentId,
                    at: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        else if (event.event === 'payment.failed') {
            tx.update(paymentDocRef, {
                status: 'FAILED',
                webhookVerified: true,
                razorpayPaymentId: rzpPaymentId,
                verifiedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            await orderRepo.update(paymentRecord.orderId, {
                status: 'PAYMENT_PENDING',
                paymentStatus: 'FAILED',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, tx);
        }
    });
});
//# sourceMappingURL=processRazorpayWebhook.js.map
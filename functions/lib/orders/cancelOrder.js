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
exports.cancelOrder = void 0;
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const statusLogic_1 = require("../utils/statusLogic");
const razorpayClient_1 = require("../payments/razorpayClient");
const config_1 = require("../utils/config");
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.cancelOrder = (0, https_2.onCall)({ secrets: [razorpayClient_1.razorpayKeySecret], enforceAppCheck: config_1.shouldEnforceAppCheck }, async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const { rateLimiter } = await Promise.resolve().then(() => __importStar(require('../utils/rateLimiter')));
    await rateLimiter(uid, 'cancelOrder', 5, 3600);
    const { orderId, reason } = request.data;
    if (!orderId) {
        throw new https_1.HttpsError('invalid-argument', 'Order ID is required');
    }
    const db = admin.firestore();
    const orderRef = db.collection('orders').doc(orderId);
    let newStatus = 'CANCELLED';
    let razorpayPaymentId = null;
    let amountToRefundMinor = 0;
    try {
        await db.runTransaction(async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) {
                throw new https_1.HttpsError('not-found', 'Order not found');
            }
            const orderData = orderDoc.data();
            if ((orderData === null || orderData === void 0 ? void 0 : orderData.userId) !== uid) {
                throw new https_1.HttpsError('permission-denied', 'Not authorized to cancel this order');
            }
            const status = orderData === null || orderData === void 0 ? void 0 : orderData.status;
            if (status !== 'CONFIRMED' && status !== 'PICKUP_SCHEDULED' && status !== 'PAYMENT_PENDING' && status !== 'DRAFT') {
                throw new https_1.HttpsError('failed-precondition', 'Order cannot be cancelled at this stage');
            }
            if ((orderData === null || orderData === void 0 ? void 0 : orderData.paymentStatus) === 'VERIFIED' || (orderData === null || orderData === void 0 ? void 0 : orderData.paymentStatus) === 'CAPTURED') {
                newStatus = 'REFUND_PENDING';
                // find payment
                const paymentsSnapshot = await transaction.get(db.collection('payments')
                    .where('orderId', '==', orderId)
                    .where('status', '==', 'VERIFIED'));
                if (!paymentsSnapshot.empty) {
                    const payment = paymentsSnapshot.docs[0].data();
                    razorpayPaymentId = payment.razorpayPaymentId;
                    amountToRefundMinor = payment.amountMinor;
                }
            }
            if (orderData === null || orderData === void 0 ? void 0 : orderData.pickupSlotId) {
                const slotRef = db.collection('pickupSlots').doc(orderData.pickupSlotId);
                const slotDoc = await transaction.get(slotRef);
                if (slotDoc.exists) {
                    transaction.update(slotRef, { bookedCount: firestore_1.FieldValue.increment(-1) });
                }
            }
            const statusUpdate = (0, statusLogic_1.buildStatusHistoryUpdate)(orderData, newStatus);
            transaction.update(orderRef, Object.assign(Object.assign({}, statusUpdate), { cancelReason: reason || null, cancelledAt: firestore_1.FieldValue.serverTimestamp() }));
        });
        if (newStatus === 'REFUND_PENDING' && razorpayPaymentId && amountToRefundMinor > 0) {
            const authHeader = (0, razorpayClient_1.getRazorpayAuthHeader)();
            const response = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount: amountToRefundMinor })
            });
            if (response.ok) {
                const refundData = await response.json();
                // Use a transaction to safely append REFUND_INITIATED
                await db.runTransaction(async (tx) => {
                    const freshDoc = await tx.get(orderRef);
                    if (!freshDoc.exists)
                        return;
                    const freshData = freshDoc.data();
                    const refundUpdate = (0, statusLogic_1.buildStatusHistoryUpdate)(freshData, 'REFUND_INITIATED');
                    tx.update(orderRef, Object.assign(Object.assign({}, refundUpdate), { refundId: refundData.id, refundStatus: 'INITIATED' }));
                });
                newStatus = 'REFUND_INITIATED';
            }
            else {
                const errText = await response.text();
                console.error('Refund failed during cancelOrder:', errText);
                await orderRef.update({
                    refundStatus: 'FAILED',
                    refundError: errText,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        return { success: true, message: 'Order cancelled successfully', newStatus };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        console.error('Unhandled cancelOrder error:', error);
        throw new https_1.HttpsError('internal', 'An unexpected error occurred while cancelling the order.');
    }
});
//# sourceMappingURL=cancelOrder.js.map
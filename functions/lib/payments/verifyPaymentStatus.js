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
exports.verifyPaymentStatus = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const statusLogic_1 = require("../utils/statusLogic");
const razorpayClient_1 = require("./razorpayClient");
const config_1 = require("../utils/config");
const logger_1 = require("../utils/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.verifyPaymentStatus = (0, https_1.onCall)({ secrets: [razorpayClient_1.razorpayKeySecret], enforceAppCheck: config_1.shouldEnforceAppCheck }, async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { orderId } = request.data;
    if (!orderId) {
        throw new https_1.HttpsError('invalid-argument', 'Order ID is required.');
    }
    const paymentsQuery = await db.collection('payments')
        .where('orderId', '==', orderId)
        .where('userId', '==', uid)
        .get();
    const paymentDocs = paymentsQuery.docs
        .filter((doc) => !!doc.data().razorpayOrderId)
        .sort((a, b) => {
        var _a, _b, _c, _d;
        const aTime = ((_b = (_a = a.data().createdAt) === null || _a === void 0 ? void 0 : _a.toMillis) === null || _b === void 0 ? void 0 : _b.call(_a)) || 0;
        const bTime = ((_d = (_c = b.data().createdAt) === null || _c === void 0 ? void 0 : _c.toMillis) === null || _d === void 0 ? void 0 : _d.call(_c)) || 0;
        return bTime - aTime;
    });
    if (paymentDocs.length === 0) {
        throw new https_1.HttpsError('not-found', 'Payment record not found.');
    }
    const paymentDocRef = paymentDocs[0].ref;
    const paymentRecord = paymentDocs[0].data();
    // If already verified, just return
    if (paymentRecord.status === 'VERIFIED') {
        return { paymentStatus: 'VERIFIED', orderStatus: 'CONFIRMED' };
    }
    if (paymentRecord.status === 'FAILED') {
        return { paymentStatus: 'FAILED', orderStatus: 'PAYMENT_PENDING' };
    }
    // Fallback: Manually check Razorpay API
    const authHeader = (0, razorpayClient_1.getRazorpayAuthHeader)();
    const rzpOrderId = paymentRecord.razorpayOrderId;
    try {
        const response = await fetch(`https://api.razorpay.com/v1/orders/${rzpOrderId}/payments`, {
            method: 'GET',
            headers: {
                'Authorization': authHeader
            }
        });
        if (!response.ok) {
            throw new Error('Razorpay API error');
        }
        const data = await response.json();
        const payments = data.items || [];
        // Find a captured payment
        const capturedPayment = payments.find((p) => p.status === 'captured');
        if (capturedPayment) {
            // Verify Amount & Currency
            if (capturedPayment.amount === paymentRecord.amountMinor && capturedPayment.currency === 'INR') {
                // Update Firestore
                await db.runTransaction(async (tx) => {
                    var _a, _b;
                    const payDoc = await tx.get(paymentDocRef);
                    const ordRef = db.collection('orders').doc(orderId);
                    const ordDoc = await tx.get(ordRef);
                    if (!payDoc.exists || !ordDoc.exists)
                        return;
                    if (((_a = payDoc.data()) === null || _a === void 0 ? void 0 : _a.status) === 'VERIFIED')
                        return;
                    const isCancelled = ['CANCELLED', 'REFUND_PENDING', 'REFUNDED'].includes((_b = ordDoc.data()) === null || _b === void 0 ? void 0 : _b.status);
                    tx.update(paymentDocRef, {
                        status: 'VERIFIED',
                        webhookVerified: false, // Verified via polling
                        razorpayPaymentId: capturedPayment.id,
                        requiresRefund: isCancelled ? true : false,
                        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    if (!isCancelled) {
                        const ordData = ordDoc.data();
                        const statusUpdate = (0, statusLogic_1.buildStatusHistoryUpdate)(ordData, 'CONFIRMED');
                        tx.update(ordRef, Object.assign(Object.assign({}, statusUpdate), { paymentStatus: 'VERIFIED' }));
                        if (ordData.couponCode) {
                            const couponRef = db.collection('coupons').doc(ordData.couponCode);
                            tx.set(couponRef, {
                                usedCount: admin.firestore.FieldValue.increment(1),
                                usedBy: admin.firestore.FieldValue.arrayUnion(ordData.userId)
                            }, { merge: true });
                        }
                    }
                    else {
                        db.collection('auditLogs').add({
                            action: 'LATE_PAYMENT_DETECTED',
                            orderId: ordRef.id,
                            razorpayPaymentId: capturedPayment.id,
                            at: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                });
                return { paymentStatus: 'VERIFIED', orderStatus: 'CONFIRMED' };
            }
        }
        // Check if any payment failed
        const failedPayment = payments.find((p) => p.status === 'failed');
        if (failedPayment) {
            // We could mark it failed, but let's wait for webhook or manual retry to be safe
            return { paymentStatus: 'PENDING', orderStatus: 'PAYMENT_PENDING' };
        }
        return { paymentStatus: paymentRecord.status, orderStatus: 'PAYMENT_PENDING' };
    }
    catch (error) {
        (0, logger_1.logError)('Manual verification failed:', error);
        return { paymentStatus: paymentRecord.status, orderStatus: 'PAYMENT_PENDING' };
    }
});
//# sourceMappingURL=verifyPaymentStatus.js.map
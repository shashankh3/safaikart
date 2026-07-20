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
exports.submitReview = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const rateLimiter_1 = require("../utils/rateLimiter");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const contracts_1 = require("../contracts");
exports.submitReview = (0, https_1.onCall)({ enforceAppCheck: true }, async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in to submit a review.');
    }
    await (0, rateLimiter_1.rateLimiter)(uid, 'submitReview', 3, 3600); // Max 3 reviews per hour
    let orderId;
    let rating;
    let comment;
    try {
        const parsed = contracts_1.submitReviewRequest.parse(request.data);
        orderId = parsed.orderId;
        rating = parsed.rating;
        comment = parsed.comment;
    }
    catch (e) {
        throw new https_1.HttpsError('invalid-argument', `Validation error: ${e.message}`);
    }
    const orderRef = db.collection('orders').doc(orderId);
    const reviewRef = db.collection('reviews').doc(orderId); // Deterministic ID ensures 1 review per order
    await db.runTransaction(async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Order not found.');
        }
        const orderData = orderDoc.data();
        if (orderData.userId !== uid) {
            throw new https_1.HttpsError('permission-denied', 'You can only review your own orders.');
        }
        if (orderData.status !== 'DELIVERED') {
            throw new https_1.HttpsError('failed-precondition', 'You can only review delivered orders.');
        }
        const reviewDoc = await transaction.get(reviewRef);
        if (reviewDoc.exists) {
            throw new https_1.HttpsError('already-exists', 'You have already reviewed this order.');
        }
        // Snapshot service IDs involved in the order for analytics/filtering
        const serviceIds = orderData.items ? orderData.items.map((item) => item.serviceId) : [];
        const uniqueServiceIds = [...new Set(serviceIds)];
        transaction.set(reviewRef, {
            userId: uid,
            orderId: orderId,
            rating,
            comment: comment || null,
            serviceIds: uniqueServiceIds,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Optionally update user profile to mark they've left a review or order doc
        transaction.update(orderRef, {
            isReviewed: true
        });
    });
    return { success: true };
});
//# sourceMappingURL=submitReview.js.map
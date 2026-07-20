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
exports.adminSetOrderPhotos = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const assertAdmin_1 = require("../utils/assertAdmin");
const zod_1 = require("zod");
const photosSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    photos: zod_1.z.array(zod_1.z.string().url())
});
exports.adminSetOrderPhotos = (0, https_1.onCall)(async (request) => {
    (0, assertAdmin_1.assertAdmin)(request, ['superadmin', 'admin', 'ops']);
    const { data, auth } = request;
    let orderId;
    let photos;
    try {
        const parsed = photosSchema.parse(data);
        orderId = parsed.orderId;
        photos = parsed.photos;
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
            const now = admin.firestore.FieldValue.serverTimestamp();
            transaction.update(orderRef, {
                photos: photos,
                updatedAt: now,
            });
            // Write Audit Log
            const auditLogRef = db.collection('auditLogs').doc();
            transaction.set(auditLogRef, {
                actorUid: auth === null || auth === void 0 ? void 0 : auth.uid,
                action: 'SET_ORDER_PHOTOS',
                orderId: orderId,
                before: { photos: orderData.photos || [] },
                after: { photos: photos },
                at: now
            });
        });
        return { success: true, message: `Photos updated for order ${orderId}` };
    }
    catch (error) {
        console.error('Error in adminSetOrderPhotos:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', error.message || 'An error occurred while setting order photos.');
    }
});
//# sourceMappingURL=adminSetOrderPhotos.js.map
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
exports.generateInvoice = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const storage = admin.storage();
const logger = (0, logger_1.createLogger)({ context: 'generateInvoice' });
exports.generateInvoice = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    // Verify Admin Role
    const adminDoc = await db.collection('adminUsers').doc(uid).get();
    if (!adminDoc.exists) {
        throw new https_1.HttpsError('permission-denied', 'Only admins can generate invoices.');
    }
    const { orderId } = request.data;
    if (!orderId) {
        throw new https_1.HttpsError('invalid-argument', 'Order ID is required.');
    }
    try {
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Order not found.');
        }
        const orderData = orderDoc.data();
        // In a real implementation, you would use a library like 'pdfkit' or 'jspdf' here on the backend
        // to generate a PDF buffer using `orderData`.
        // For this demonstration, we create a simple text buffer pretending to be a PDF.
        const pdfContent = `INVOICE FOR ORDER ${orderId}\nAmount: ${orderData.finalAmountMinor / 100} INR\nStatus: ${orderData.status}`;
        const pdfBuffer = Buffer.from(pdfContent, 'utf-8');
        const bucket = storage.bucket();
        const file = bucket.file(`invoices/${orderId}_invoice.pdf`);
        await file.save(pdfBuffer, {
            metadata: { contentType: 'application/pdf' },
        });
        // Generate a signed URL valid for 1 hour
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000,
        });
        // Log the audit action
        await db.collection('auditLogs').add({
            action: 'INVOICE_GENERATED',
            orderId,
            actorUid: uid,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`Invoice generated for order ${orderId} by admin ${uid}`);
        return { downloadUrl: url };
    }
    catch (error) {
        logger.error('Failed to generate invoice', error);
        throw new https_1.HttpsError('internal', 'An error occurred while generating the invoice.');
    }
});
//# sourceMappingURL=generateInvoice.js.map
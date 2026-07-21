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
exports.onBroadcastCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.onBroadcastCreated = (0, firestore_1.onDocumentCreated)('broadcasts/{broadcastId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    if (data.status !== 'SCHEDULED' && data.status !== 'PENDING') {
        return; // Already processed or not ready
    }
    const { title, body, targetTopic, deepLink } = data;
    try {
        const message = {
            notification: {
                title,
                body
            },
            topic: targetTopic || 'all_users', // default to all_users topic
        };
        if (deepLink) {
            message.data = { deepLink };
        }
        // Send the message
        const response = await admin.messaging().send(message);
        // Update broadcast doc with success
        await snapshot.ref.update({
            status: 'SENT',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            messageId: response
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error sending broadcast:', error);
        await snapshot.ref.update({
            status: 'FAILED',
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
            error: error.message
        });
    }
});
//# sourceMappingURL=onBroadcastCreated.js.map
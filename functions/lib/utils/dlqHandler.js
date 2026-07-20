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
exports.processDeadLetters = void 0;
const pubsub_1 = require("firebase-functions/v2/pubsub");
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("./logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const logger = (0, logger_1.createLogger)({ context: 'DLQ_Handler' });
exports.processDeadLetters = (0, pubsub_1.onMessagePublished)('safaikart-dlq', async (event) => {
    const message = event.data;
    if (!message) {
        logger.warn('Received empty DLQ message');
        return;
    }
    const payload = message.message.json;
    const messageId = message.message.messageId;
    const attributes = message.message.attributes;
    logger.error(`Processing DLQ message ${messageId}`, payload, { attributes });
    try {
        // Persist to Firestore for manual review / replay logic
        await db.collection('deadLetters').doc(messageId).set({
            payload,
            attributes,
            receivedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'UNRESOLVED'
        });
        logger.info(`Successfully logged dead letter ${messageId} to Firestore.`);
    }
    catch (err) {
        logger.error('Failed to log dead letter to Firestore', err);
        // Throwing an error here will cause PubSub to retry the DLQ handler itself, 
        // depending on the topic configuration.
        throw err;
    }
});
//# sourceMappingURL=dlqHandler.js.map
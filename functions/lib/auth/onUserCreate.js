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
exports.onUserCreate = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const pubsub_1 = require("@google-cloud/pubsub");
const logger_1 = require("../utils/logger");
const pubsub = new pubsub_1.PubSub();
// Initialize admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.onUserCreate = functions.region('asia-south1').auth.user().onCreate(async (user) => {
    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const userRef = db.collection('users').doc(user.uid);
    const profileRef = db.collection('profiles').doc(user.uid);
    const batch = db.batch();
    batch.set(userRef, {
        createdAt: now,
        phoneNumber: user.phoneNumber || null,
        email: user.email || null,
    });
    batch.set(profileRef, {
        userId: user.uid,
        phoneNumber: user.phoneNumber || null,
        email: user.email || null,
        displayName: user.displayName || 'New User',
        photoURL: user.photoURL || null,
        isBlocked: false,
        createdAt: now,
        updatedAt: now,
        defaultAddressId: null,
        fcmTokens: []
    });
    await batch.commit();
    // Publish async event for background workers (Welcome Email, Analytics, etc.)
    try {
        await pubsub.topic('user-signup-events').publishJSON({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            phoneNumber: user.phoneNumber,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        (0, logger_1.logError)('Failed to publish user-signup-events', error);
    }
});
//# sourceMappingURL=onUserCreate.js.map
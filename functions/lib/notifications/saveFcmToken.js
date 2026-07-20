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
exports.saveFcmToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.saveFcmToken = (0, https_2.onCall)(async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const { token, platform } = request.data;
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Token is required');
    }
    if (typeof token !== 'string' || token.length > 255) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid token format');
    }
    const db = admin.firestore();
    const profileRef = db.collection('profiles').doc(uid);
    await db.runTransaction(async (transaction) => {
        var _a;
        const profileDoc = await transaction.get(profileRef);
        let tokens = [];
        if (profileDoc.exists) {
            tokens = ((_a = profileDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmTokens) || [];
        }
        // Remove any existing token with the same value
        tokens = tokens.filter(t => t.token !== token);
        // Add the new token to the beginning
        tokens.unshift({
            token,
            platform,
            updatedAt: admin.firestore.Timestamp.now()
        });
        // Enforce max of 3 tokens
        if (tokens.length > 3) {
            tokens = tokens.slice(0, 3);
        }
        transaction.set(profileRef, { fcmTokens: tokens }, { merge: true });
    });
    return { success: true };
});
//# sourceMappingURL=saveFcmToken.js.map
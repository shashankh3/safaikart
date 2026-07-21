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
exports.onUserDelete = exports.deleteAccount = void 0;
const https_1 = require("firebase-functions/v2/https");
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// 1. Client callable for deleting own account
exports.deleteAccount = (0, https_1.onCall)(async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in to delete account.');
    }
    try {
        // Delete user from Firebase Auth. This will trigger beforeUserDeleted or onUserDelete 
        // to do the actual data cleanup.
        await admin.auth().deleteUser(uid);
        return { success: true, message: 'Account deleted successfully' };
    }
    catch (error) {
        (0, logger_1.logError)(`Error deleting user ${uid}:`, error);
        throw new https_1.HttpsError('internal', 'An error occurred while deleting your account.');
    }
});
// 2. Auth Trigger (Runs when deleted from client callable, or via Firebase Console)
exports.onUserDelete = functions.region('asia-south1').auth.user().onDelete(async (user) => {
    const uid = user.uid;
    const batch = db.batch();
    // Delete profile
    batch.delete(db.collection('profiles').doc(uid));
    // Delete cart
    batch.delete(db.collection('carts').doc(uid));
    // Delete addresses
    const addressesQuery = await db.collection('addresses').where('userId', '==', uid).get();
    addressesQuery.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    // We KEEP orders and payments for financial auditing, but we might want to anonymize them slightly
    // if strict GPDP/GDPR requires it. The prompt says "keep orders and payments records", 
    // so we leave them intact or just don't delete them.
    // Optional: write an audit log
    const auditRef = db.collection('auditLogs').doc();
    batch.set(auditRef, {
        action: 'ACCOUNT_DELETED',
        userId: uid,
        at: admin.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();
});
//# sourceMappingURL=deleteAccount.js.map
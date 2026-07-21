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
exports.markAllNotificationsRead = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const rateLimiter_1 = require("../utils/rateLimiter");
const config_1 = require("../utils/config");
const logger_1 = require("../utils/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.markAllNotificationsRead = (0, https_1.onCall)({ enforceAppCheck: config_1.shouldEnforceAppCheck }, async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in.');
    }
    await (0, rateLimiter_1.rateLimiter)(uid, 'markAllNotificationsRead', 20, 3600);
    try {
        const unreadQuery = await db.collection('notifications')
            .where('userId', '==', uid)
            .where('isRead', '==', false)
            .limit(500)
            .get();
        if (unreadQuery.empty) {
            return { success: true, count: 0 };
        }
        const batch = db.batch();
        unreadQuery.docs.forEach(doc => {
            batch.update(doc.ref, {
                isRead: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        await batch.commit();
        (0, logger_1.logInfo)(`Marked ${unreadQuery.size} notifications as read for user ${uid}`, { userId: uid });
        return { success: true, count: unreadQuery.size };
    }
    catch (error) {
        (0, logger_1.logError)('Error in markAllNotificationsRead', error, { userId: uid });
        throw new https_1.HttpsError('internal', 'An error occurred while marking notifications as read.');
    }
});
//# sourceMappingURL=markAllNotificationsRead.js.map
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
exports.syncAdminRoles = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const VALID_ROLES = ['superadmin', 'admin', 'support', 'ops', 'finance'];
exports.syncAdminRoles = (0, firestore_1.onDocumentWritten)('adminUsers/{uid}', async (event) => {
    const uid = event.params.uid;
    const snapshot = event.data;
    if (!snapshot) {
        return;
    }
    // If document is deleted, remove custom claims
    if (!snapshot.after.exists) {
        await admin.auth().setCustomUserClaims(uid, { admin: false, role: null });
        (0, logger_1.logInfo)(`Removed admin claims for ${uid}`);
        return;
    }
    // If created or updated, sync role with whitelist check
    const data = snapshot.after.data();
    const role = data === null || data === void 0 ? void 0 : data.role;
    if (role) {
        if (!VALID_ROLES.includes(role)) {
            (0, logger_1.logWarn)(`Attempted to set invalid role "${role}" for user ${uid}. Revoking claims.`);
            await admin.auth().setCustomUserClaims(uid, { admin: false, role: null });
            return;
        }
        await admin.auth().setCustomUserClaims(uid, { admin: true, role: role });
        (0, logger_1.logInfo)(`Set admin role ${role} for ${uid}`);
    }
});
//# sourceMappingURL=syncAdminRoles.js.map
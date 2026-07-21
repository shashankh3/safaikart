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
exports.deactivateExpiredSlots = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.deactivateExpiredSlots = (0, scheduler_1.onSchedule)({ schedule: 'every 6 hours', timeoutSeconds: 120 }, async () => {
    // We want to deactivate slots that are before today
    const today = new Date();
    // Format YYYY-MM-DD
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayDateStr = `${year}-${month}-${day}`;
    try {
        const expiredSlotsQuery = await db.collection('pickupSlots')
            .where('isActive', '==', true)
            .where('date', '<', todayDateStr)
            .get();
        if (expiredSlotsQuery.empty) {
            (0, logger_1.logInfo)('No expired pickup slots to deactivate.');
            return;
        }
        const batch = db.batch();
        expiredSlotsQuery.docs.forEach(doc => {
            batch.update(doc.ref, {
                isActive: false,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        await batch.commit();
        (0, logger_1.logInfo)(`Deactivated ${expiredSlotsQuery.size} expired pickup slots.`);
    }
    catch (error) {
        (0, logger_1.logError)('Error deactivating expired pickup slots:', error);
    }
});
//# sourceMappingURL=deactivateExpiredSlots.js.map
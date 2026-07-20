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
exports.checkServiceability = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const contracts_1 = require("../contracts");
const cache_1 = require("../utils/cache");
exports.checkServiceability = (0, https_1.onCall)({ enforceAppCheck: true }, async (request) => {
    let pincode;
    try {
        const parsed = contracts_1.checkServiceabilityRequest.parse(request.data);
        pincode = parsed.pincode;
    }
    catch (e) {
        throw new https_1.HttpsError('invalid-argument', `Invalid pincode format`);
    }
    let zonesData = cache_1.zonesCache.get('active_zones');
    if (!zonesData) {
        const zonesQuery = await db.collection('zones').where('isActive', '==', true).get();
        zonesData = zonesQuery.docs.map(doc => doc.data());
        cache_1.zonesCache.set('active_zones', zonesData);
    }
    if (zonesData.length === 0) {
        // If no active zones exist, assume global serviceability
        return { isServiceable: true };
    }
    for (const zoneData of zonesData) {
        if (zoneData.pincodes && Array.isArray(zoneData.pincodes) && zoneData.pincodes.includes(pincode)) {
            return { isServiceable: true, zoneName: zoneData.name || null };
        }
    }
    return { isServiceable: false };
});
//# sourceMappingURL=checkServiceability.js.map
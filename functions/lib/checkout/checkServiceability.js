"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkServiceability = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const contracts_1 = require("../contracts");
exports.checkServiceability = (0, https_1.onCall)(async (request) => {
    let pincode;
    try {
        const parsed = contracts_1.checkServiceabilityRequest.parse(request.data);
        pincode = parsed.pincode;
    }
    catch (e) {
        throw new https_1.HttpsError('invalid-argument', `Invalid pincode format`);
    }
    const zonesQuery = await db.collection('zones').where('isActive', '==', true).get();
    if (zonesQuery.empty) {
        // If no active zones exist, assume global serviceability
        return { isServiceable: true };
    }
    for (const doc of zonesQuery.docs) {
        const zoneData = doc.data();
        if (zoneData.pincodes && Array.isArray(zoneData.pincodes) && zoneData.pincodes.includes(pincode)) {
            return { isServiceable: true, zoneName: zoneData.name || null };
        }
    }
    return { isServiceable: false };
});
//# sourceMappingURL=checkServiceability.js.map
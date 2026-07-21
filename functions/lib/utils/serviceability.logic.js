"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPincodeServiceable = isPincodeServiceable;
const cache_1 = require("./cache");
async function isPincodeServiceable(db, pincode) {
    let zonesData = cache_1.zonesCache.get('active_zones');
    if (!zonesData) {
        const zonesQuery = await db.collection('zones').where('isActive', '==', true).get();
        zonesData = zonesQuery.docs.map(doc => doc.data());
        cache_1.zonesCache.set('active_zones', zonesData);
    }
    if (zonesData.length === 0) {
        // If no active zones exist, assume global serviceability
        return { isServiceable: true, zoneName: null };
    }
    for (const zoneData of zonesData) {
        if (zoneData.pincodes && Array.isArray(zoneData.pincodes) && zoneData.pincodes.includes(pincode)) {
            return { isServiceable: true, zoneName: zoneData.name || null };
        }
    }
    return { isServiceable: false, zoneName: null };
}
//# sourceMappingURL=serviceability.logic.js.map
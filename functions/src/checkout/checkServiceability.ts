import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

import { checkServiceabilityRequest } from '../contracts';
import { zonesCache } from '../utils/cache';

export const checkServiceability = onCall({ enforceAppCheck: true }, async (request) => {
  let pincode: string;
  try {
    const parsed = checkServiceabilityRequest.parse(request.data);
    pincode = parsed.pincode;
  } catch (e: any) {
    throw new HttpsError('invalid-argument', `Invalid pincode format`);
  }

  let zonesData = zonesCache.get('active_zones');
  
  if (!zonesData) {
    const zonesQuery = await db.collection('zones').where('isActive', '==', true).get();
    zonesData = zonesQuery.docs.map(doc => doc.data());
    zonesCache.set('active_zones', zonesData);
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

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

import { checkServiceabilityRequest } from '../contracts';

export const checkServiceability = onCall(async (request) => {
  let pincode: string;
  try {
    const parsed = checkServiceabilityRequest.parse(request.data);
    pincode = parsed.pincode;
  } catch (e: any) {
    throw new HttpsError('invalid-argument', `Invalid pincode format`);
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

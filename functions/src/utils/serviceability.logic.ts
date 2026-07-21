import * as admin from 'firebase-admin';
import { zonesCache } from './cache';

export async function isPincodeServiceable(db: admin.firestore.Firestore, pincode: string): Promise<{ isServiceable: boolean, zoneName: string | null }> {
  let zonesData = zonesCache.get('active_zones');
  
  if (!zonesData) {
    const zonesQuery = await db.collection('zones').where('isActive', '==', true).get();
    zonesData = zonesQuery.docs.map(doc => doc.data());
    zonesCache.set('active_zones', zonesData);
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

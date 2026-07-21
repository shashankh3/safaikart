import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

import { checkServiceabilityRequest } from '../contracts';
import { shouldEnforceAppCheck } from '../utils/config';
import { isPincodeServiceable } from '../utils/serviceability.logic';

export const checkServiceability = onCall({ enforceAppCheck: shouldEnforceAppCheck }, async (request) => {
  let pincode: string;
  try {
    const parsed = checkServiceabilityRequest.parse(request.data);
    pincode = parsed.pincode;
  } catch (e: any) {
    throw new HttpsError('invalid-argument', `Invalid pincode format`);
  }

  const { isServiceable, zoneName } = await isPincodeServiceable(db, pincode);

  if (isServiceable) {
    return { isServiceable: true, zoneName };
  }

  return { isServiceable: false };
});

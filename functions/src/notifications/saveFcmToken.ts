import { HttpsError } from 'firebase-functions/v2/https';
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const saveFcmToken = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const { token, platform } = request.data;
  if (!token) {
    throw new HttpsError('invalid-argument', 'Token is required');
  }

  // Save to user profile
  await admin.firestore().collection('profiles').doc(uid).set({
    fcmTokens: FieldValue.arrayUnion({
      token,
      platform,
      updatedAt: FieldValue.serverTimestamp()
    })
  }, { merge: true });

  return { success: true };
});

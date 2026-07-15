import { HttpsError } from 'firebase-functions/v2/https';
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const removeFcmToken = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const { token } = request.data;
  if (!token) {
    throw new HttpsError('invalid-argument', 'Token is required');
  }

  const profileRef = admin.firestore().collection('profiles').doc(uid);
  const profileDoc = await profileRef.get();
  
  if (profileDoc.exists) {
    const data = profileDoc.data();
    if (data && data.fcmTokens && Array.isArray(data.fcmTokens)) {
      const updatedTokens = data.fcmTokens.filter((t: any) => t.token !== token);
      await profileRef.update({ fcmTokens: updatedTokens });
    }
  }

  return { success: true };
});

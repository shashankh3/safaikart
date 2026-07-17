import { HttpsError } from 'firebase-functions/v2/https';
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

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
  
  if (typeof token !== 'string' || token.length > 255) {
     throw new HttpsError('invalid-argument', 'Invalid token format');
  }

  const db = admin.firestore();
  const profileRef = db.collection('profiles').doc(uid);

  await db.runTransaction(async (transaction) => {
    const profileDoc = await transaction.get(profileRef);
    let tokens: any[] = [];
    if (profileDoc.exists) {
      tokens = profileDoc.data()?.fcmTokens || [];
    }

    // Remove any existing token with the same value
    tokens = tokens.filter(t => t.token !== token);

    // Add the new token to the beginning
    tokens.unshift({
      token,
      platform,
      updatedAt: admin.firestore.Timestamp.now()
    });

    // Enforce max of 3 tokens
    if (tokens.length > 3) {
      tokens = tokens.slice(0, 3);
    }

    transaction.set(profileRef, { fcmTokens: tokens }, { merge: true });
  });

  return { success: true };
});

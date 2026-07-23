import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export async function rateLimiter(uid: string, functionName: string, maxCalls: number, windowSeconds: number) {
  const db = admin.firestore();
  const rateLimitRef = db.collection('rateLimits').doc(`${uid}_${functionName}`);

  const doc = await rateLimitRef.get();
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  if (!doc.exists) {
    return async () => {
      await rateLimitRef.set({ 
        count: 1,
        windowStart: now,
        expiresAt: admin.firestore.Timestamp.fromMillis(now + windowMs)
      });
    };
  }

  const data = doc.data()!;
  const windowStart = data.windowStart || 0;

  if (now - windowStart >= windowMs) {
    return async () => {
      await rateLimitRef.set({ 
        count: 1,
        windowStart: now,
        expiresAt: admin.firestore.Timestamp.fromMillis(now + windowMs)
      });
    };
  }

  const count = data.count || 0;
  if (count >= maxCalls) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Rate limit exceeded for ${functionName}. Please try again later.`
    );
  }

  return async () => {
    await rateLimitRef.update({ 
      count: admin.firestore.FieldValue.increment(1)
    });
  };
}

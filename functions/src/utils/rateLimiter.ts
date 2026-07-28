import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

export async function rateLimiter(uid: string, functionName: string, maxCalls: number, windowSeconds: number) {
  const db = admin.firestore();
  const rateLimitRef = db.collection('rateLimits').doc(`${uid}_${functionName}`);

  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(rateLimitRef);

    if (!doc.exists) {
      tx.set(rateLimitRef, {
        count: 1,
        windowStart: now,
        expiresAt: admin.firestore.Timestamp.fromMillis(now + windowMs)
      });
      return;
    }

    const data = doc.data()!;
    const windowStart = data.windowStart || 0;

    if (now - windowStart >= windowMs) {
      tx.set(rateLimitRef, {
        count: 1,
        windowStart: now,
        expiresAt: admin.firestore.Timestamp.fromMillis(now + windowMs)
      });
      return;
    }

    const count = data.count || 0;
    if (count >= maxCalls) {
      throw new HttpsError(
        'resource-exhausted',
        `Rate limit exceeded for ${functionName}. Please try again later.`
      );
    }

    tx.update(rateLimitRef, {
      count: admin.firestore.FieldValue.increment(1)
    });
  });

  // Return dummy no-op callback for backward compatibility
  return async () => {};
}

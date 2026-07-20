import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export async function rateLimiter(uid: string, functionName: string, maxCalls: number, windowSeconds: number) {
  const db = admin.firestore();
  const rateLimitRef = db.collection('rateLimits').doc(`${uid}_${functionName}`);

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(rateLimitRef);
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    if (!doc.exists) {
      transaction.set(rateLimitRef, { 
        count: 1,
        windowStart: now,
        expiresAt: admin.firestore.Timestamp.fromMillis(now + windowMs)
      });
      return;
    }

    const data = doc.data()!;
    const windowStart = data.windowStart || 0;

    if (now - windowStart >= windowMs) {
      // Reset window
      transaction.update(rateLimitRef, { 
        count: 1,
        windowStart: now,
        expiresAt: admin.firestore.Timestamp.fromMillis(now + windowMs)
      });
      return;
    }

    const count = data.count || 0;
    if (count >= maxCalls) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Rate limit exceeded for ${functionName}. Please try again later.`
      );
    }

    transaction.update(rateLimitRef, { 
      count: count + 1
    });
  });
}

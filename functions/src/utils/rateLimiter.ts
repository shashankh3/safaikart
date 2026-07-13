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
      transaction.set(rateLimitRef, { calls: [now] });
      return;
    }

    const data = doc.data();
    const calls = data?.calls || [];
    const validCalls = calls.filter((timestamp: number) => now - timestamp < windowMs);

    if (validCalls.length >= maxCalls) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Rate limit exceeded for ${functionName}. Please try again later.`
      );
    }

    validCalls.push(now);
    transaction.update(rateLimitRef, { calls: validCalls });
  });
}

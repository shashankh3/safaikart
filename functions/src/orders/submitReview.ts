import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { rateLimiter } from '../utils/rateLimiter';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

import { submitReviewRequest } from '../contracts';
import { shouldEnforceAppCheck } from '../utils/config';

export const submitReview = onCall({ enforceAppCheck: shouldEnforceAppCheck }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in to submit a review.');
  }

  const consumeRateLimit = await rateLimiter(uid, 'submitReview', 3, 3600); // Max 3 reviews per hour

  let orderId: string;
  let rating: number;
  let comment: string | undefined;

  try {
    const parsed = submitReviewRequest.parse(request.data);
    orderId = parsed.orderId;
    rating = parsed.rating;
    comment = parsed.comment;
  } catch (e: any) {
    throw new HttpsError('invalid-argument', `Validation error: ${e.message}`);
  }

  const orderRef = db.collection('orders').doc(orderId);
  const reviewRef = db.collection('reviews').doc(orderId); // Deterministic ID ensures 1 review per order

  await db.runTransaction(async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      throw new HttpsError('not-found', 'Order not found.');
    }

    const orderData = orderDoc.data()!;
    if (orderData.userId !== uid) {
      throw new HttpsError('permission-denied', 'You can only review your own orders.');
    }

    if (orderData.status !== 'DELIVERED') {
      throw new HttpsError('failed-precondition', 'You can only review delivered orders.');
    }

    const reviewDoc = await transaction.get(reviewRef);
    if (reviewDoc.exists) {
      throw new HttpsError('already-exists', 'You have already reviewed this order.');
    }

    // Snapshot service IDs involved in the order for analytics/filtering
    const serviceIds = orderData.items ? orderData.items.map((item: any) => item.serviceId) : [];
    const uniqueServiceIds = [...new Set(serviceIds)];

    transaction.set(reviewRef, {
      userId: uid,
      orderId: orderId,
      rating,
      comment: comment || null,
      serviceIds: uniqueServiceIds,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Optionally update user profile to mark they've left a review or order doc
    transaction.update(orderRef, {
      isReviewed: true
    });
  });

  await consumeRateLimit();
  return { success: true };
});

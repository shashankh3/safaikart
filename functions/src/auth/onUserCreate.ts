import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { PubSub } from '@google-cloud/pubsub';
import { logError } from '../utils/logger';

let _pubsub: PubSub | null = null;
function getPubSub(): PubSub {
  if (!_pubsub) {
    _pubsub = new PubSub();
  }
  return _pubsub;
}

if (!admin.apps.length) {
  admin.initializeApp();
}

export const onUserCreate = functions.region('asia-south1').auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const userRef = db.collection('users').doc(user.uid);
  const profileRef = db.collection('profiles').doc(user.uid);

  const batch = db.batch();

  batch.set(userRef, {
    createdAt: now,
    phoneNumber: user.phoneNumber || null,
    email: user.email || null,
  });

  batch.set(profileRef, {
    userId: user.uid,
    phoneNumber: user.phoneNumber || null,
    email: user.email || null,
    displayName: user.displayName || 'New User',
    photoURL: user.photoURL || null,
    isBlocked: false,
    createdAt: now,
    updatedAt: now,
    defaultAddressId: null,
    fcmTokens: [],
  });

  await batch.commit();

  // Publish async event for background workers (Welcome Email, Analytics, etc.)
  try {
    const pubsub = getPubSub();
    await pubsub.topic('user-signup-events').publishJSON({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('Failed to publish user-signup-events', error);
  }
});

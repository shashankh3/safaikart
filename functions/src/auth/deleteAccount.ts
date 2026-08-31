import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { region } from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { logError } from '../utils/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// 1. Client callable for deleting own account
export const deleteAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in to delete account.');
  }

  try {
    // Delete user from Firebase Auth. This will trigger beforeUserDeleted or onUserDelete 
    // to do the actual data cleanup.
    await admin.auth().deleteUser(uid);
    return { success: true, message: 'Account deleted successfully' };
  } catch (error: any) {
    logError(`Error deleting user ${uid}:`, error);
    throw new HttpsError('internal', 'An error occurred while deleting your account.');
  }
});

// 2. Auth Trigger (Runs when deleted from client callable, or via Firebase Console)
export const onUserDelete = region('asia-south1').auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const batch = db.batch();

  // Delete profile
  batch.delete(db.collection('profiles').doc(uid));
  
  // Delete cart
  batch.delete(db.collection('carts').doc(uid));

  // Delete addresses
  const addressesQuery = await db.collection('addresses').where('userId', '==', uid).get();
  addressesQuery.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // We KEEP orders and payments for financial auditing, but we might want to anonymize them slightly
  // if strict GPDP/GDPR requires it. The prompt says "keep orders and payments records", 
  // so we leave them intact or just don't delete them.

  // Optional: write an audit log
  const auditRef = db.collection('auditLogs').doc();
  batch.set(auditRef, {
    action: 'ACCOUNT_DELETED',
    userId: uid,
    at: admin.firestore.FieldValue.serverTimestamp()
  });

  await batch.commit();
});

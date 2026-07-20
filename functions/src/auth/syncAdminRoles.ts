import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const syncAdminRoles = onDocumentWritten('adminUsers/{uid}', async (event) => {
  const uid = event.params.uid;
  const snapshot = event.data;

  if (!snapshot) {
    return;
  }

  // If document is deleted, remove custom claims
  if (!snapshot.after.exists) {
    await admin.auth().setCustomUserClaims(uid, { admin: false, role: null });
    console.log(`Removed admin claims for ${uid}`);
    return;
  }

  // If created or updated, sync role
  const data = snapshot.after.data();
  const role = data?.role;

  if (role) {
    await admin.auth().setCustomUserClaims(uid, { admin: true, role: role });
    console.log(`Set admin role ${role} for ${uid}`);
  }
});

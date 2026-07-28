import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { logInfo, logWarn } from '../utils/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const VALID_ROLES = ['superadmin', 'admin', 'support', 'ops', 'finance'];

export const syncAdminRoles = onDocumentWritten('adminUsers/{uid}', async (event) => {
  const uid = event.params.uid;
  const snapshot = event.data;

  if (!snapshot) {
    return;
  }

  // If document is deleted, remove custom claims
  if (!snapshot.after.exists) {
    await admin.auth().setCustomUserClaims(uid, { admin: false, role: null });
    logInfo(`Removed admin claims for ${uid}`);
    return;
  }

  // If created or updated, sync role with whitelist check
  const data = snapshot.after.data();
  const role = data?.role;

  if (role) {
    if (!VALID_ROLES.includes(role)) {
      logWarn(`Attempted to set invalid role "${role}" for user ${uid}. Revoking claims.`);
      await admin.auth().setCustomUserClaims(uid, { admin: false, role: null });
      return;
    }

    await admin.auth().setCustomUserClaims(uid, { admin: true, role: role });
    logInfo(`Set admin role ${role} for ${uid}`);
  }
});

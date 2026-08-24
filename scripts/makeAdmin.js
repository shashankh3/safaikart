const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

try {
  initializeApp({
    credential: applicationDefault(),
  });
} catch (e) {
  console.error('Failed to initialize Firebase Admin.');
  console.error('Ensure GOOGLE_APPLICATION_CREDENTIALS is set to your service account key path.');
  console.error('Error:', e.message);
  process.exit(1);
}

const uid = process.argv[2];
const roleInput = (process.argv[3] || 'superadmin').toLowerCase();

const VALID_ROLES = ['superadmin', 'admin', 'ops', 'finance', 'support', 'viewer'];

if (!uid) {
  console.error('Usage: node scripts/makeAdmin.js <UID> [role]');
  console.error(`Allowed roles: ${VALID_ROLES.join(', ')} (default: superadmin)`);
  process.exit(1);
}

if (!VALID_ROLES.includes(roleInput)) {
  console.error(`Invalid role: ${roleInput}. Allowed roles: ${VALID_ROLES.join(', ')}`);
  process.exit(1);
}

const db = getFirestore();
const auth = getAuth();

async function makeAdmin() {
  try {
    const userRecord = await auth.getUser(uid);

    // 1. Set custom claims
    await auth.setCustomUserClaims(uid, {
      admin: true,
      role: roleInput,
    });

    // 2. Add to adminUsers collection for UI & security rules
    await db.collection('adminUsers').doc(uid).set(
      {
        uid,
        email: userRecord.email || null,
        name: userRecord.displayName || userRecord.email?.split('@')[0] || 'Admin',
        role: roleInput,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`✅ Successfully assigned role '${roleInput}' to user ${uid} (${userRecord.email || userRecord.phoneNumber || 'No email/phone'}).`);
    process.exit(0);
  } catch (error) {
    console.error('Error assigning admin role:', error);
    process.exit(1);
  }
}

makeAdmin();

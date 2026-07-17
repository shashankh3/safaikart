const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

try {
  initializeApp({
    credential: applicationDefault()
  });
} catch (e) {
  console.error('Failed to initialize Firebase Admin.');
  console.error('Ensure GOOGLE_APPLICATION_CREDENTIALS is set to your service account key path.');
  console.error('Error:', e.message);
  process.exit(1);
}

const uid = process.argv[2];

if (!uid) {
  console.error('Usage: node revokeAdmin.js <UID>');
  process.exit(1);
}

const db = getFirestore();
const auth = getAuth();

async function revokeAdmin() {
  try {
    // 1. Remove custom claim
    await auth.setCustomUserClaims(uid, null);
    
    // 2. Remove from adminUsers collection
    await db.collection('adminUsers').doc(uid).delete();
    
    console.log(`Successfully revoked admin privileges from user ${uid}.`);
    process.exit(0);
  } catch (error) {
    console.error('Error revoking admin privileges:', error);
    process.exit(1);
  }
}

revokeAdmin();

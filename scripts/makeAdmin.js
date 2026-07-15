const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  console.error('Could not load service-account.json. Make sure it exists in the root folder.');
  process.exit(1);
}

const uid = process.argv[2];

if (!uid) {
  console.error('Usage: node makeAdmin.js <UID>');
  process.exit(1);
}

const db = admin.firestore();

async function makeAdmin() {
  try {
    await db.collection('adminUsers').doc(uid).set({
      role: 'ADMIN',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Successfully made user ${uid} an admin.`);
    process.exit(0);
  } catch (error) {
    console.error('Error making user admin:', error);
    process.exit(1);
  }
}

makeAdmin();

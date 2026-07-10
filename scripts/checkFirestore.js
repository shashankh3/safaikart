const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.resolve(__dirname, '../service-account.json');
const serviceAccount = require(serviceAccountPath);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function check() {
  const snapshot = await db.collection('services').where('category', '==', 'DRY CLEANING').get();
  console.log(`Found ${snapshot.size} items for DRY CLEANING`);
}

check().catch(console.error);

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

async function verify() {
  const snapshot = await db.collection('services').where('categoryId', '==', 'shoe-cleaning').get();
  console.log(`Found ${snapshot.size} shoe-cleaning services in Firestore.`);
  snapshot.forEach(doc => {
    console.log(`- ${doc.data().name} (Price: ${doc.data().priceMinor})`);
  });
}

verify().catch(console.error);

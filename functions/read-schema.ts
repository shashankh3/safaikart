process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
import * as admin from 'firebase-admin';

admin.initializeApp({
  projectId: "safaikart-dev"
});

const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('services').where('priceType', '==', 'variable').limit(1).get();
  if (snapshot.empty) {
    console.log("No variable services found.");
  } else {
    snapshot.forEach(doc => console.log(doc.id, '=>', doc.data()));
  }
}
run().catch(console.error);

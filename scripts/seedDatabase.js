const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// 1. Initialize Firebase Admin SDK
const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ ERROR: service-account.json not found in the root directory.');
  console.error('Please download it from Firebase Console -> Project Settings -> Service Accounts, and save it as "service-account.json" in d:\\safaikart\\');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// 2. Define the exact catalog to seed
const catalog = [
  // DRY CLEANING
  { name: 'Shirt', categoryId: 'dry_cleaning', priceMinor: 9000, priceType: 'fixed', unit: 'piece', sortOrder: 1, isActive: true, addons: [{ id: 'starch', name: 'Starch', priceMinor: 4000 }] },
  { name: 'T-Shirt', categoryId: 'dry_cleaning', priceMinor: 7000, priceType: 'fixed', unit: 'piece', sortOrder: 2, isActive: true, addons: [] },
  { name: 'Trousers / Pants', categoryId: 'dry_cleaning', priceMinor: 9000, priceType: 'fixed', unit: 'piece', sortOrder: 3, isActive: true, addons: [] },
  { name: 'Kurta', categoryId: 'dry_cleaning', priceMinor: 11000, priceType: 'fixed', unit: 'piece', sortOrder: 4, isActive: true, addons: [{ id: 'starch', name: 'Starch', priceMinor: 4000 }] },
  { name: 'Pyjama', categoryId: 'dry_cleaning', priceMinor: 7000, priceType: 'fixed', unit: 'piece', sortOrder: 5, isActive: true, addons: [] },
  { name: 'Jacket (Light)', categoryId: 'dry_cleaning', priceMinor: 25000, priceType: 'fixed', unit: 'piece', sortOrder: 6, isActive: true, addons: [] },
  { name: 'Jacket (Heavy / Leather)', categoryId: 'dry_cleaning', priceMinor: 45000, priceType: 'fixed', unit: 'piece', sortOrder: 7, isActive: true, addons: [] },
  { name: 'Saree (Cotton)', categoryId: 'dry_cleaning', priceMinor: 18000, priceType: 'fixed', unit: 'piece', sortOrder: 8, isActive: true, addons: [{ id: 'starch', name: 'Starch', priceMinor: 4000 }] },
  { name: 'Saree (Silk / Heavy)', categoryId: 'dry_cleaning', priceMinor: 35000, priceType: 'fixed', unit: 'piece', sortOrder: 9, isActive: true, addons: [] },
  { name: 'Lehenga (Light)', categoryId: 'dry_cleaning', priceMinor: 40000, priceType: 'fixed', unit: 'piece', sortOrder: 10, isActive: true, addons: [] },
  { name: 'Lehenga (Heavy)', categoryId: 'dry_cleaning', priceMinor: 80000, priceType: 'fixed', unit: 'piece', sortOrder: 11, isActive: true, addons: [] },
  { name: 'Sherwani', categoryId: 'dry_cleaning', priceMinor: 60000, priceType: 'fixed', unit: 'piece', sortOrder: 12, isActive: true, addons: [] },
  { name: 'Suit (2 Piece)', categoryId: 'dry_cleaning', priceMinor: 30000, priceType: 'fixed', unit: 'piece', sortOrder: 13, isActive: true, addons: [] },
  { name: 'Suit (3 Piece)', categoryId: 'dry_cleaning', priceMinor: 40000, priceType: 'fixed', unit: 'piece', sortOrder: 14, isActive: true, addons: [] },
  
  // STEAM PRESS
  { name: 'Shirt', categoryId: 'steam_press', priceMinor: 1800, priceType: 'fixed', unit: 'piece', sortOrder: 1, isActive: true, addons: [] },
  { name: 'T-Shirt', categoryId: 'steam_press', priceMinor: 1500, priceType: 'fixed', unit: 'piece', sortOrder: 2, isActive: true, addons: [] },
  { name: 'Trousers / Pants', categoryId: 'steam_press', priceMinor: 1800, priceType: 'fixed', unit: 'piece', sortOrder: 3, isActive: true, addons: [] },
  { name: 'Kurta', categoryId: 'steam_press', priceMinor: 2500, priceType: 'fixed', unit: 'piece', sortOrder: 4, isActive: true, addons: [] },
  { name: 'Saree (Cotton)', categoryId: 'steam_press', priceMinor: 5000, priceType: 'fixed', unit: 'piece', sortOrder: 5, isActive: true, addons: [] },
  { name: 'Suit (2 Piece)', categoryId: 'steam_press', priceMinor: 12000, priceType: 'fixed', unit: 'piece', sortOrder: 6, isActive: true, addons: [] },

  // HOUSEHOLD / SOFA
  { name: 'Sofa (Normal Cloth)', categoryId: 'household', priceMinor: 25000, maxPriceMinor: 25000, priceType: 'fixed', unit: 'seat', sortOrder: 1, isActive: true, addons: [] },
  { name: 'Carpet / Rug', categoryId: 'household', priceMinor: 3500, maxPriceMinor: 3500, priceType: 'fixed', unit: 'sqft', sortOrder: 2, isActive: true, addons: [] },
  { name: 'Curtains (Light)', categoryId: 'household', priceMinor: 35000, maxPriceMinor: 60000, priceType: 'variable', unit: 'piece', sortOrder: 3, isActive: true, addons: [] },
  { name: 'Curtains (Heavy)', categoryId: 'household', priceMinor: 60000, maxPriceMinor: 120000, priceType: 'variable', unit: 'piece', sortOrder: 4, isActive: true, addons: [] },
  { name: 'Blanket / Comforter (Single)', categoryId: 'household', priceMinor: 30000, priceType: 'fixed', unit: 'piece', sortOrder: 5, isActive: true, addons: [] },
  { name: 'Blanket / Comforter (Double)', categoryId: 'household', priceMinor: 45000, priceType: 'fixed', unit: 'piece', sortOrder: 6, isActive: true, addons: [] }
];

async function seed() {
  console.log('🌱 Starting Database Seeding...');
  
  const batch = db.batch();
  const servicesRef = db.collection('services');

  let count = 0;
  for (const item of catalog) {
    const docRef = servicesRef.doc(); // Auto-generate ID
    batch.set(docRef, {
      ...item,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    count++;
  }

  await batch.commit();
  console.log(`✅ Successfully seeded ${count} services to Firestore!`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Error during seeding:', err);
  process.exit(1);
});

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

// Shoe Cleaning Price List
const services = [
  {
    categoryId: "shoe-cleaning",
    name: "Basic Sneakers Cleaning",
    description: "Standard exterior cleaning for canvas and basic sneakers.",
    priceMinor: 25000,
    priceType: "fixed",
    unit: "pair",
    isActive: true,
    starchAddon: false
  },
  {
    categoryId: "shoe-cleaning",
    name: "Premium Sneakers Cleaning",
    description: "Deep interior and exterior cleaning for premium sneakers.",
    priceMinor: 40000,
    priceType: "fixed",
    unit: "pair",
    isActive: true,
    starchAddon: false
  },
  {
    categoryId: "shoe-cleaning",
    name: "Formal Leather Shoes Polish & Clean",
    description: "Cleaning and professional polishing for leather shoes.",
    priceMinor: 30000,
    priceType: "fixed",
    unit: "pair",
    isActive: true,
    starchAddon: false
  },
  {
    categoryId: "shoe-cleaning",
    name: "Suede Shoes Cleaning",
    description: "Specialized gentle cleaning for suede and nubuck materials.",
    priceMinor: 45000,
    priceType: "fixed",
    unit: "pair",
    isActive: true,
    starchAddon: false
  },
  {
    categoryId: "shoe-cleaning",
    name: "Ankle Boots Cleaning",
    description: "Cleaning for standard ankle-length boots.",
    priceMinor: 35000,
    priceType: "fixed",
    unit: "pair",
    isActive: true,
    starchAddon: false
  },
  {
    categoryId: "shoe-cleaning",
    name: "Knee-High Boots Cleaning",
    description: "Cleaning for tall, knee-high boots.",
    priceMinor: 50000,
    priceType: "fixed",
    unit: "pair",
    isActive: true,
    starchAddon: false
  },
  {
    categoryId: "shoe-cleaning",
    name: "Sandals & Floaters",
    description: "Basic washing and cleaning for sandals and floaters.",
    priceMinor: 15000,
    priceType: "fixed",
    unit: "pair",
    isActive: true,
    starchAddon: false
  },
  {
    categoryId: "shoe-cleaning",
    name: "Sports Shoes (Running/Gym)",
    description: "Deep clean focusing on sweat, mud, and odor removal.",
    priceMinor: 20000,
    priceType: "fixed",
    unit: "pair",
    isActive: true,
    starchAddon: false
  },
  {
    categoryId: "shoe-cleaning",
    name: "Women's Heels / Wedges",
    description: "Careful cleaning for delicate heels and wedges.",
    priceMinor: 25000,
    priceType: "fixed",
    unit: "pair",
    isActive: true,
    starchAddon: false
  },
  {
    categoryId: "shoe-cleaning",
    name: "Kids' Shoes",
    description: "Standard cleaning for children's footwear.",
    priceMinor: 15000,
    priceType: "fixed",
    unit: "pair",
    isActive: true,
    starchAddon: false
  },
  {
    categoryId: "shoe-cleaning",
    name: "Sole Whitening (Add-on)",
    description: "De-yellowing and whitening of rubber soles.",
    priceMinor: 20000,
    priceType: "fixed",
    unit: "pair",
    isActive: true,
    starchAddon: false
  },
  {
    categoryId: "shoe-cleaning",
    name: "Deodorizing & Sanitization (Add-on)",
    description: "Ozone treatment and deep sanitization for odor removal.",
    priceMinor: 10000,
    priceType: "fixed",
    unit: "pair",
    isActive: true,
    starchAddon: false
  },
  {
    categoryId: "shoe-cleaning",
    name: "Waterproofing / Stain Protection",
    description: "Application of hydrophobic spray to protect from water and stains.",
    priceMinor: 30000,
    priceType: "fixed",
    unit: "pair",
    isActive: true,
    starchAddon: false
  },
  {
    categoryId: "shoe-cleaning",
    name: "Luxury/Designer Shoe Restoration",
    description: "Comprehensive restoration for high-end designer footwear. (Price subject to inspection)",
    priceMinor: 100000, // Starts at Rs 1000
    priceType: "variable",
    unit: "pair",
    isActive: true,
    starchAddon: false
  },
  {
    categoryId: "shoe-cleaning",
    name: "Color Restoration",
    description: "Dyeing and color correction for faded shoes. (Price subject to inspection)",
    priceMinor: 80000, // Starts at Rs 800
    priceType: "variable",
    unit: "pair",
    isActive: true,
    starchAddon: false
  }
];

async function seed() {
  console.log('Seeding Shoe Cleaning category data...');
  
  // Create or enable the category
  const categoryRef = db.collection('categories').doc('shoe-cleaning');
  await categoryRef.set({
    name: "Shoe Cleaning",
    iconName: "shoe",
    isActive: true,
    sortOrder: 3
  }, { merge: true });
  console.log('Category shoe-cleaning activated.');

  // Add services
  const batch = db.batch();
  for (const service of services) {
    const docRef = db.collection('services').doc();
    batch.set(docRef, {
      ...service,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    console.log(`Prepared: ${service.name} (Type: ${service.priceType}, Price: ₹${service.priceMinor / 100})`);
  }
  
  await batch.commit();
  console.log(`\nSuccessfully seeded ${services.length} shoe cleaning services into Firestore.`);
}

seed().then(() => {
  console.log('Done.');
  process.exit(0);
}).catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// 1. Initialize Firebase Admin
const serviceAccountPath = path.resolve(__dirname, '../service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ ERROR: service-account.json not found.');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// 2. Parse prices.txt
const pricesText = fs.readFileSync(path.resolve(__dirname, '../prices.txt'), 'utf-8');

const catalog = [];
let currentCategory = '';
let currentSubcategory = '';

const lines = pricesText.split('\n');
for (const line of lines) {
  const tLine = line.trim();
  if (!tLine) continue;

  if (tLine.startsWith('## ')) {
    currentCategory = tLine.replace('## ', '').trim();
    currentSubcategory = '';
  } else if (tLine.startsWith('### ')) {
    currentSubcategory = tLine.replace('### ', '').trim();
  } else if (tLine.startsWith('- ')) {
    const match = tLine.match(/^- (.+?)\s*(—|-)\s*Rs\s+([\d,]+)\s*(?:-\s*[\d,]+\s*)?(.*)/);
    
    if (match) {
      let name = match[1].trim();
      let shortName = name;
      if (currentSubcategory) {
        name = `${currentSubcategory} - ${name}`;
      }
      
      const priceStr = match[3].replace(/,/g, '');
      const priceMinor = parseInt(priceStr, 10) * 100;
      
      let unit = 'piece';
      const suffix = match[4].toLowerCase();
      if (suffix.includes('sqft')) unit = 'sqft';
      else if (suffix.includes('kg')) unit = 'kg';
      else if (suffix.includes('seat')) unit = 'seat';
      else if (suffix.includes('chair')) unit = 'chair';
      else if (suffix.includes('package')) unit = 'package';
      
      // Determine the precise 6 categories and chip categories
      let categoryId = 'DRY CLEANING';
      let icon = 'hanger';
      let chipCategories = ['Clothing'];
      
      if (currentCategory === 'STEAM PRESS') {
        categoryId = 'STEAM PRESS';
        icon = 'iron';
        chipCategories = ['Clothing'];
      } else if (currentCategory === 'SHOES CLEANING') {
        categoryId = 'SHOE CLEANING';
        icon = 'shoe-sneaker';
        chipCategories = ['Footwear'];
      } else if (currentSubcategory === 'Household') {
        categoryId = 'SOFA CLEANING'; // Represents Home Textiles
        icon = 'sofa';
        chipCategories = ['Home'];
      }
      
      // Luxury Care Overrides
      const luxuryKeywords = ['kanjivaram', 'dulhan', 'heavy', 'leather', 'tuxedo', 'groom'];
      if (luxuryKeywords.some(kw => name.toLowerCase().includes(kw))) {
        categoryId = 'LUXURY CARE';
        icon = 'star';
        chipCategories.push('Premium');
      }

      catalog.push({
        title: shortName, // using title and category for frontend compatibility
        name: name,
        category: categoryId,
        categoryId: categoryId,
        description: name,
        priceMinor,
        currency: 'INR',
        unit,
        time: categoryId === 'STEAM PRESS' ? '1 DAY' : '1-2 DAY',
        estimatedDurationHours: categoryId === 'STEAM PRESS' ? 24 : 48,
        imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(shortName)}&background=random`,
        icon,
        chipCategories,
        isActive: true,
      });
    }
  }
}

async function seed() {
  console.log('🌱 Starting catalog categorization (' + catalog.length + ' items)...');
  
  // Clear existing services
  const servicesRef = db.collection('services');
  const existingServices = await servicesRef.get();
  if (!existingServices.empty) {
    let delBatch = db.batch();
    existingServices.docs.forEach(doc => delBatch.delete(doc.ref));
    await delBatch.commit();
    console.log(`Deleted ${existingServices.size} old services`);
  }

  // Insert all services
  let batch = db.batch();
  let count = 0;
  
  for (const item of catalog) {
    const docRef = servicesRef.doc();
    batch.set(docRef, {
      ...item,
      id: docRef.id,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    count++;
    
    if (count % 450 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  
  if (count % 450 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Successfully seeded ${count} perfectly categorized services to Firestore!`);
  process.exit(0);
}

seed().catch(console.error);

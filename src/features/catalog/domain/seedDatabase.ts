import { db, collection, getDocs, writeBatch, doc } from '../../../core/firebase/firestore';
import { 
  MOCK_SHOE_CLEANING, 
  MOCK_DRY_CLEANING, 
  MOCK_STEAM_PRESS, 
  MOCK_HOUSEHOLD, 
  MOCK_LAUNDRY, 
  MOCK_LUXURY_CARE 
} from './mockCatalog';

export const seedDatabase = async () => {
  try {
    console.log('Fetching categories...');
    const catSnapshot = await getDocs(collection(db, 'categories'));
    const categories: any = {};
    catSnapshot.forEach(doc => {
      const data = doc.data();
      categories[data.name.toUpperCase()] = doc.id;
    });

    console.log('Categories map:', categories);

    const getCatId = (name: string) => categories[name.toUpperCase()] || name;

    const allItems = [
      ...MOCK_LAUNDRY.map((i, idx) => ({ ...i, categoryId: getCatId('LAUNDRY'), sortOrder: idx, isActive: true })),
      ...MOCK_DRY_CLEANING.map((i, idx) => ({ ...i, categoryId: getCatId('DRY CLEANING'), sortOrder: idx, isActive: true })),
      ...MOCK_SHOE_CLEANING.map((i, idx) => ({ ...i, categoryId: getCatId('SHOE CLEANING'), sortOrder: idx, isActive: true })),
      ...MOCK_STEAM_PRESS.map((i, idx) => ({ ...i, categoryId: getCatId('STEAM PRESS'), sortOrder: idx, isActive: true })),
      ...MOCK_HOUSEHOLD.map((i, idx) => ({ ...i, categoryId: getCatId('SOFA CLEANING'), sortOrder: idx, isActive: true })),
      ...MOCK_LUXURY_CARE.map((i, idx) => ({ ...i, categoryId: getCatId('LUXURY CARE'), sortOrder: idx, isActive: true }))
    ];

    console.log(`Starting to seed ${allItems.length} items...`);
    
    // Firestore batches have a limit of 500 writes
    const batches = [];
    let currentBatch = writeBatch(db);
    let count = 0;

    for (const item of allItems) {
      const docRef = doc(collection(db, 'services'), item.id);
      currentBatch.set(docRef, item);
      count++;

      if (count === 499) {
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        count = 0;
      }
    }
    
    if (count > 0) {
      batches.push(currentBatch);
    }

    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(`Committed batch ${i + 1}/${batches.length}`);
    }

    console.log('Successfully seeded database!');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    return false;
  }
};

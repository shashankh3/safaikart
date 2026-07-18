import { db, setDoc, doc } from '../../../core/firebase/firestore';
import { CATALOG_V2_DATA } from './mockCatalogV2';

export const seedDatabaseV2 = async () => {
  try {
    console.log('Seeding V2 Catalog...');
    const docRef = doc(db, 'appConfig', 'catalog_v2');
    await setDoc(docRef, CATALOG_V2_DATA);
    console.log('Successfully seeded V2 catalog!');
    return true;
  } catch (error) {
    console.error('Error seeding V2 catalog:', error);
    return false;
  }
};

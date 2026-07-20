import { db, collection, getDocs, deleteDoc, doc } from '../src/core/firebase/firestore';

export const cleanupOldCollections = async () => {
  try {
    console.log('Fetching old categories...');
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    console.log(`Found ${categoriesSnapshot.size} categories. Deleting...`);
    
    for (const categoryDoc of categoriesSnapshot.docs) {
      await deleteDoc(doc(db, 'categories', categoryDoc.id));
      console.log(`Deleted category: ${categoryDoc.id}`);
    }

    console.log('Fetching old services...');
    const servicesSnapshot = await getDocs(collection(db, 'services'));
    console.log(`Found ${servicesSnapshot.size} services. Deleting...`);
    
    for (const serviceDoc of servicesSnapshot.docs) {
      await deleteDoc(doc(db, 'services', serviceDoc.id));
      console.log(`Deleted service: ${serviceDoc.id}`);
    }

    console.log('Successfully cleaned up old collections. Database is now strictly using catalog_v2!');
    return true;
  } catch (error) {
    console.error('Error cleaning up old collections:', error);
    return false;
  }
};

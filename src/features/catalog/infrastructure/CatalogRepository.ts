import { db, collection, getDocs, query, where, orderBy, getDoc, doc } from '../../../core/firebase/firestore';
import { Category } from '../domain/Category';
import { Service } from '../domain/Service';

export class CatalogRepository {
  static async getCategories(): Promise<Category[]> {
    const q = query(collection(db, 'categories'), where('isActive', '==', true), orderBy('sortOrder', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  }

  static async getServices(): Promise<Service[]> {
    const q = query(collection(db, 'services'), where('isActive', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  static async getFullCatalogV2(): Promise<any> {
    const docRef = doc(db, 'appConfig', 'catalog_v2');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data();
    }
    return null;
  }
}

import { db, collection, getDocs, query, where, orderBy } from '../../../core/firebase/firestore';
import { Category } from '../domain/Category';
import { Service } from '../domain/Service';

export class CatalogRepository {
  static async getCategories(): Promise<Category[]> {
    const q = query(collection(db, 'categories'), where('isActive', '==', true), orderBy('sortOrder', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  }

  static async getServices(): Promise<Service[]> {
    // Note: If services collection gets huge, consider fetching only specific categories or removing orderBy if no composite index exists.
    // For now, we assume the composite index exists as specified in the prompt: (categoryId ASC, isActive ASC, sortOrder ASC)
    // To make it simple without hitting missing index errors early in dev, we just fetch all active.
    const q = query(collection(db, 'services'), where('isActive', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)).sort((a, b) => a.sortOrder - b.sortOrder);
  }
}

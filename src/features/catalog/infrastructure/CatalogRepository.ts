import { db, doc, getDocFromServer } from '../../../core/firebase/firestore';

export class CatalogRepository {
  static async getFullCatalogV2(): Promise<any> {
    const docRef = doc(db, 'appConfig', 'catalog_v2');
    const snapshot = await getDocFromServer(docRef);
    if (snapshot.exists()) {
      return snapshot.data();
    }
    return null;
  }
}

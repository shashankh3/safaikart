import {collection, doc, getDoc, getDocs, query, where, orderBy} from '@react-native-firebase/firestore';
import { db } from '../../../app/config/firebase';
import { Order } from '../domain/Order';

export class OrderRepository {
  private collectionPath = 'orders';

  async listOrders(userId: string): Promise<Order[]> {
    const q = query(
      collection(db, this.collectionPath),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  }

  async getOrder(orderId: string, userId: string): Promise<Order | null> {
    const docRef = doc(db, this.collectionPath, orderId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().userId === userId) {
      return { id: docSnap.id, ...docSnap.data() } as Order;
    }
    return null;
  }


}

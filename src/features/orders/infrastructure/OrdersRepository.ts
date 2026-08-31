import {collection, doc, query, where, orderBy, getDocs, getDoc, onSnapshot, Unsubscribe} from '@react-native-firebase/firestore';
import { httpsCallable } from '@react-native-firebase/functions';
import { db, auth, functions } from '../../../app/config/firebase';
import { Order } from '../domain/Order';

export class OrdersRepository {
  async getOrders(): Promise<Order[]> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', uid)
    );
    const snapshot = await getDocs(q);
    
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order));

    return orders.sort((a: any, b: any) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
      return timeB - timeA;
    });
  }

  async getOrder(orderId: string): Promise<Order | null> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    const docRef = doc(db, 'orders', orderId);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) return null;
    
    const data = snapshot.data();
    if (data.userId !== uid) throw new Error('Unauthorized');

    return {
      id: snapshot.id,
      ...data
    } as Order;
  }

  subscribeToOrder(orderId: string, callback: (order: Order | null) => void): Unsubscribe {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      callback(null);
      return () => {};
    }

    const docRef = doc(db, 'orders', orderId);
    return onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
      } else {
        const data = snapshot.data();
        if (data.userId === uid) {
          callback({ id: snapshot.id, ...data } as Order);
        } else {
          callback(null);
        }
      }
    });
  }

  async cancelOrder(orderId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const cancelFn = httpsCallable(functions, 'cancelOrder');
    try {
      const result = await cancelFn({ orderId, reason });
      return result.data as any;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to cancel order');
    }
  }
}

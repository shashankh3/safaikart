import firestore from '@react-native-firebase/firestore';
import { db, doc, getDoc, setDoc } from '../../../core/firebase/firestore';
import { Cart } from '../domain/Cart';

export class CartRepository {
  static async getRemoteCart(userId: string): Promise<Cart | null> {
    const snap = await getDoc(doc(db, 'carts', userId));
    return snap.exists() ? (snap.data() as Cart) : null;
  }
  static async saveRemoteCart(userId: string, cart: Cart): Promise<void> {
    await setDoc(doc(db, 'carts', userId), { ...cart, updatedAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
  }
}

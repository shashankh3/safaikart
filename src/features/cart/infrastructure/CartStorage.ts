import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cart } from '../domain/Cart';

const CART_KEY = '@safaikart_cart';

export class CartStorage {
  static async loadLocal(): Promise<Cart | null> {
    const data = await AsyncStorage.getItem(CART_KEY);
    return data ? JSON.parse(data) : null;
  }
  static async saveLocal(cart: Cart): Promise<void> {
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
  }
  static async clearLocal(): Promise<void> {
    await AsyncStorage.removeItem(CART_KEY);
  }
}

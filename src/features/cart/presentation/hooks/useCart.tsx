import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, onSnapshot, query, where, orderBy, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../../app/config/firebase';
import { orderConverter } from '../../../../shared/lib/firebase/converters';
import { Order } from '../../../../shared/types';

const CartContext = createContext<any>({});

export const useCart = (): any => useContext(CartContext);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const TEMP_USER_ID = 'guest-123'; // Mock user until Auth phase

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const storedCart = await AsyncStorage.getItem('@safaikart_cart');
        if (storedCart) setCartItems(JSON.parse(storedCart));
      } catch (e) {
        console.error('Failed to load cart', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadCart();
  }, []);

  // Save cart to AsyncStorage whenever it changes
  useEffect(() => {
    if (!isLoaded) return;
    const saveCart = async () => {
      try {
        await AsyncStorage.setItem('@safaikart_cart', JSON.stringify(cartItems));
      } catch (e) {
        console.error('Failed to save cart', e);
      }
    };
    saveCart();
  }, [cartItems, isLoaded]);

  // Firestore real-time listener for orders
  useEffect(() => {
    const q = query(
      collection(db, 'orders').withConverter(orderConverter),
      where('userId', '==', TEMP_USER_ID),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => doc.data());
      setOrderHistory(orders);
      
      // Find the most recent active order
      const active = orders.find(o => 
        !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status)
      );
      setActiveOrder(active || null);
    }, (error) => {
      console.error('Error fetching orders:', error);
    });

    return () => unsubscribe();
  }, []);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => {
    const addonsPrice = (item.addons || []).reduce((a: number, addon: any) => a + (addon.priceMinor || 0) / 100, 0);
    return sum + ((item.price + addonsPrice) * item.quantity);
  }, 0);

  const addToCart = (newItems: any[]) => {
    setCartItems(prevItems => {
      let updatedCart = [...prevItems];
      
      newItems.forEach(newItem => {
        if (newItem.quantity <= 0) return;
        // Find existing item with same ID and same addons
        const existingItemIndex = updatedCart.findIndex(item => {
          if (item.id !== newItem.id) return false;
          const currentAddons = item.addons || [];
          const newAddons = newItem.addons || [];
          if (currentAddons.length !== newAddons.length) return false;
          // Compare addon IDs
          const currentAddonIds = currentAddons.map((a: any) => a.id).sort().join(',');
          const newAddonIds = newAddons.map((a: any) => a.id).sort().join(',');
          return currentAddonIds === newAddonIds;
        });
        
        if (existingItemIndex >= 0) {
          updatedCart[existingItemIndex].quantity += newItem.quantity;
        } else {
          updatedCart.push(newItem);
        }
      });
      
      return updatedCart;
    });
  };

  const clearCart = () => setCartItems([]);

  const placeOrder = async () => {
    if (cartItems.length === 0) return;

    try {
      const newOrder: Order = {
        id: '', // Firestore generates this
        userId: TEMP_USER_ID,
        status: 'PAYMENT_PENDING',
        paymentStatus: 'NOT_STARTED',
        priceConfirmed: true,
        items: cartItems,
        subtotalMinor: totalPrice * 100, // Converting to paise
        deliveryFeeMinor: 0,
        discountMinor: 0,
        taxMinor: 0,
        finalAmountMinor: totalPrice * 100,
        currency: 'INR',
        addressId: 'temp-address-id',
        addressSnapshot: { id: 'temp-address-id', line1: '123 Test St', city: 'Test City', pincode: '123456' },
        pickupSlotId: 'temp-slot-id',
        pickupSlotSnapshot: { id: 'temp-slot-id', date: '2026-07-11', startTime: '10:00', endTime: '12:00', capacity: 10, bookedCount: 0, isActive: true, serviceArea: 'All' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Write to Firestore
      const docRef = doc(collection(db, 'orders'));
      newOrder.id = docRef.id;
      await setDoc(docRef.withConverter(orderConverter), newOrder);

      clearCart();
    } catch (e) {
      console.error('Error placing order:', e);
    }
  };

  return (
    <CartContext.Provider value={{ cartItems, totalItems, totalPrice, addToCart, clearCart, activeOrder, placeOrder, orderHistory }}>
      {children}
    </CartContext.Provider>
  );
};

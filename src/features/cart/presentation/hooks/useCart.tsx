import React, { createContext, useContext } from 'react';
import { useCartQuery, useCartMutations } from '../../application/useCart';

const CartContext = createContext<any>({});

export const useCart = (): any => useContext(CartContext);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: cart } = useCartQuery();
  const { addToCart, clearCart, setQuantity, removeFromCart } = useCartMutations();
  
  const cartItems = cart?.items || [];
  
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => {
    const base = item.priceMinor ? item.priceMinor / 100 : 0;
    const addonsPrice = (item.addons || []).reduce((a: number, addon: any) => a + ((addon.priceMinor || 0) / 100), 0);
    return sum + ((base + addonsPrice) * item.quantity);
  }, 0);

  const wrappedAddToCart = async (newItems: any[]) => {
    for (const item of newItems) {
      if (item.quantity <= 0) continue;
      await addToCart({
        serviceId: item.serviceId || item.id,
        nameSnapshot: item.nameSnapshot || item.name || item.title || 'Service Item',
        quantity: item.quantity,
        priceMinor: item.priceMinor !== undefined ? item.priceMinor : (item.price ? Math.round(item.price * 100) : 0),
        addons: item.addons || []
      });
    }
  };

  const wrappedClearCart = () => clearCart();

  return (
    <CartContext.Provider value={{ cartItems, totalItems, totalPrice, addToCart: wrappedAddToCart, clearCart: wrappedClearCart, setQuantity, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
};

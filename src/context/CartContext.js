import React, { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);

  // Calculate totals dynamically
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const addToCart = (newItems) => {
    setCartItems(prevItems => {
      let updatedCart = [...prevItems];
      
      newItems.forEach(newItem => {
        if (newItem.quantity <= 0) return;
        const existingItemIndex = updatedCart.findIndex(item => item.id === newItem.id);
        if (existingItemIndex >= 0) {
          // If it exists, replace or add quantity (let's replace to make it simpler, or add? ServiceDetails passes current selection)
          // Since ServiceDetails starts from 0 each time, adding is fine. But actually ServiceDetails should probably just add to what's there.
          updatedCart[existingItemIndex].quantity += newItem.quantity;
        } else {
          // Add new item
          updatedCart.push(newItem);
        }
      });
      
      return updatedCart;
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const placeOrder = () => {
    if (cartItems.length === 0) return;
    const newOrder = {
      id: `SK-${Math.floor(1000 + Math.random() * 9000)}`,
      items: [...cartItems],
      totalPrice,
      timestamp: new Date().toISOString()
    };
    setActiveOrder(newOrder);
    setOrderHistory(prev => [newOrder, ...prev]);
    clearCart();
  };

  return (
    <CartContext.Provider value={{ cartItems, totalItems, totalPrice, addToCart, clearCart, activeOrder, placeOrder, orderHistory }}>
      {children}
    </CartContext.Provider>
  );
};

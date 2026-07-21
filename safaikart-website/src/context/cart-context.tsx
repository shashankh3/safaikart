import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Service, ServiceAddon } from "@/hooks/useCatalog";

export type CartItem = {
  id: string; // Unique ID for the cart item (since same service can be added with different addons)
  service: Service;
  quantity: number;
  selectedAddons: ServiceAddon[];
};

type CartContextType = {
  items: CartItem[];
  addItem: (service: Service, quantity: number, addons?: ServiceAddon[]) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  subtotalMinor: number;
  itemCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("safaikart_web_cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("safaikart_web_cart", JSON.stringify(items));
  }, [items]);

  const addItem = (service: Service, quantity: number, addons: ServiceAddon[] = []) => {
    setItems((prev) => {
      // Create a unique hash for this item based on service ID and selected addons
      const addonHash = addons.map(a => a.name).sort().join("|");
      const uniqueId = `${service.id}-${addonHash}`;
      
      const existing = prev.find(item => item.id === uniqueId);
      if (existing) {
        return prev.map(item => 
          item.id === uniqueId 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      
      return [...prev, { id: uniqueId, service, quantity, selectedAddons: addons }];
    });
    setIsCartOpen(true);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => setItems([]);

  const subtotalMinor = items.reduce((total, item) => {
    const basePrice = item.service.priceMinor || 0;
    const addonsPrice = item.selectedAddons.reduce((sum, a) => sum + a.priceMinor, 0);
    return total + ((basePrice + addonsPrice) * item.quantity);
  }, 0);

  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        subtotalMinor,
        itemCount,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

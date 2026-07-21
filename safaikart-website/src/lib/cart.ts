import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createElement } from "react";

export type CartItem = {
  serviceId: string;
  name: string;
  priceMinor: number;
  unit?: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalMinor: number;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (serviceId: string, qty: number) => void;
  remove: (serviceId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const KEY = "safaikart:cart:v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const subtotalMinor = items.reduce((n, i) => n + i.priceMinor * i.quantity, 0);
    return {
      items,
      count,
      subtotalMinor,
      add(item, qty = 1) {
        setItems((prev) => {
          const idx = prev.findIndex((p) => p.serviceId === item.serviceId);
          if (idx === -1) return [...prev, { ...item, quantity: qty }];
          const copy = [...prev];
          copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + qty };
          return copy;
        });
      },
      setQty(serviceId, qty) {
        setItems((prev) =>
          qty <= 0
            ? prev.filter((p) => p.serviceId !== serviceId)
            : prev.map((p) => (p.serviceId === serviceId ? { ...p, quantity: qty } : p)),
        );
      },
      remove(serviceId) {
        setItems((prev) => prev.filter((p) => p.serviceId !== serviceId));
      },
      clear() {
        setItems([]);
      },
    };
  }, [items]);

  return createElement(CartContext.Provider, { value }, children);
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

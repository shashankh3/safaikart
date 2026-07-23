import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createElement } from "react";

export type CartItem = {
  serviceId: string;
  name: string;
  priceMinor: number;
  unit?: string;
  priceType?: string;
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
const MAX_CART_LINES = 50;
const MAX_QUANTITY_PER_LINE = 99;

function normaliseQuantity(qty: unknown): number {
  const n = Math.floor(Number(qty));
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_QUANTITY_PER_LINE, Math.max(1, n));
}

function normalisePriceMinor(price: unknown): number {
  const n = Math.floor(Number(price));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function sanitiseItem(item: unknown): CartItem | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Partial<CartItem>;
  const serviceId = String(raw.serviceId || "").trim();
  if (!serviceId) return null;

  return {
    serviceId,
    name: String(raw.name || "Service").trim() || "Service",
    priceMinor: normalisePriceMinor(raw.priceMinor),
    unit: raw.unit ? String(raw.unit) : undefined,
    priceType: raw.priceType ? String(raw.priceType) : undefined,
    quantity: normaliseQuantity(raw.quantity),
  };
}

function sanitiseItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];
  const byService = new Map<string, CartItem>();

  for (const raw of items) {
    const item = sanitiseItem(raw);
    if (!item) continue;
    const existing = byService.get(item.serviceId);
    if (existing) {
      byService.set(item.serviceId, {
        ...item,
        quantity: Math.min(MAX_QUANTITY_PER_LINE, existing.quantity + item.quantity),
      });
    } else if (byService.size < MAX_CART_LINES) {
      byService.set(item.serviceId, item);
    }
  }

  return [...byService.values()];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
      if (raw) setItems(sanitiseItems(JSON.parse(raw)));
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
    const subtotalMinor = items.reduce(
      (n, i) => n + (i.priceType === "variable" ? 0 : i.priceMinor * i.quantity),
      0,
    );
    return {
      items,
      count,
      subtotalMinor,
      add(item, qty = 1) {
        const nextItem = sanitiseItem({ ...item, quantity: qty });
        if (!nextItem) return;
        setItems((prev) => {
          const cleanPrev = sanitiseItems(prev);
          const idx = cleanPrev.findIndex((p) => p.serviceId === nextItem.serviceId);
          if (idx === -1) {
            if (cleanPrev.length >= MAX_CART_LINES) return cleanPrev;
            return [...cleanPrev, nextItem];
          }
          const copy = [...cleanPrev];
          copy[idx] = {
            ...copy[idx],
            ...nextItem,
            quantity: Math.min(MAX_QUANTITY_PER_LINE, copy[idx].quantity + nextItem.quantity),
          };
          return copy;
        });
      },
      setQty(serviceId, qty) {
        const nextQty = Math.floor(Number(qty));
        setItems((prev) =>
          !Number.isFinite(nextQty) || nextQty <= 0
            ? prev.filter((p) => p.serviceId !== serviceId)
            : prev.map((p) =>
              p.serviceId === serviceId
                ? { ...p, quantity: Math.min(MAX_QUANTITY_PER_LINE, nextQty) }
                : p,
            ),
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

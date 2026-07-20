import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit as limitConstraint, QueryConstraint } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { toast } from 'sonner';

export type Order = {
  id: string;
  status?: string;
  finalAmountMinor?: number;
  currency?: string;
  createdAt?: unknown;
  userId?: string;
  items?: unknown[];
  // Include other relevant fields as needed
};

export type OrdersStreamConfig = {
  statuses?: string[];
  limitCount?: number;
};

export function useOrdersStream(config?: OrdersStreamConfig) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Memoize config dependencies
  const statusesStr = config?.statuses?.join(',') || '';
  const limitCount = config?.limitCount;

  useEffect(() => {
    setLoading(true);
    const db = getDb();
    const constraints: QueryConstraint[] = [];
    
    if (config?.statuses && config.statuses.length > 0) {
      constraints.push(where("status", "in", config.statuses));
    }
    
    constraints.push(orderBy("createdAt", "desc"));
    
    if (limitCount) {
      constraints.push(limitConstraint(limitCount));
    }
    
    const q = query(collection(db, "orders"), ...constraints);
    
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Order,
        );
        setOrders(rows);
        setLoading(false);
      },
      (err) => {
        toast.error(err.message || "Realtime feed failed");
        setLoading(false);
      }
    );
    
    return () => unsub();
  }, [statusesStr, limitCount]);

  return { orders, loading };
}

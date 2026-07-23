import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatINR, statusColor, toDate } from "@/lib/format";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_customer/app/orders")({
  ssr: false,
  component: MyOrders,
});

type Order = {
  id: string;
  status?: string;
  paymentStatus?: string;
  finalAmountMinor?: number;
  items?: Array<{ name?: string; quantity?: number }>;
  createdAt?: unknown;
};

function itemLabel(item: { name?: string; nameSnapshot?: string; quantity?: number }) {
  return `${item.name || item.nameSnapshot || "Service"} × ${item.quantity || 1}`;
}

function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const db = getDb();
    const q = query(collection(db, "orders"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Order[];
      docs.sort((a, b) => {
        const tA = (a.createdAt as any)?.toMillis?.() || 0;
        const tB = (b.createdAt as any)?.toMillis?.() || 0;
        return tB - tA;
      });
      setOrders(docs);
      setLoading(false);
    }, (err) => {
      console.error("Orders fetch error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <Link to="/services">
          <Button className="rounded-xl bg-brand text-gold hover:bg-brand/90">Order again</Button>
        </Link>
      </div>

      {loading && <div className="mt-8 text-brand/50">Loading…</div>}

      {!loading && orders.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-brand/20 p-12 text-center">
          <Package className="h-10 w-10 mx-auto text-brand/40" />
          <div className="mt-3 text-brand/70">No orders yet.</div>
          <Link to="/services">
            <Button className="mt-4 rounded-xl bg-brand text-gold hover:bg-brand/90">Browse services</Button>
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {orders.map((o) => (
          <Link
            key={o.id}
            to="/app/orders/$id"
            params={{ id: o.id }}
            className="block rounded-2xl border border-brand/10 bg-white p-4 hover:border-brand/30 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">#{o.id.slice(0, 8).toUpperCase()}</div>
                <div className="text-xs text-brand/60">{formatDate(toDate(o.createdAt))}</div>
              </div>
              <Badge className={statusColor(o.status || "PAYMENT_PENDING")}>{o.status || "PAYMENT_PENDING"}</Badge>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="text-brand/70">
                {(o.items || []).map(itemLabel).join(", ") || "—"}
              </div>
              <div className="font-semibold">{formatINR(o.finalAmountMinor || 0)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatINR, statusColor, toDate } from "@/lib/format";
import { ArrowLeft, MessageCircle, RotateCcw } from "lucide-react";
import { OrderTimeline } from "@/components/order-timeline";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/_customer/app/orders/$id")({
  ssr: false,
  component: OrderDetail,
});

type Order = Record<string, unknown> & { id: string };

function OrderDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const [order, setOrder] = useState<Order | null>(null);

  function reorder() {
    if (!order) return;
    const items = (order.items as Array<{ serviceId?: string; name?: string; quantity?: number; priceMinor?: number; unit?: string | null }>) || [];
    if (items.length === 0) return toast.error("No items to re-order");
    cart.clear();
    for (const it of items) {
      if (!it.serviceId) continue;
      cart.add(
        {
          serviceId: it.serviceId,
          name: it.name || "",
          priceMinor: it.priceMinor || 0,
          unit: it.unit || undefined,
        },
        it.quantity || 1,
      );
    }
    toast.success("Items added to cart");
    navigate({ to: "/checkout" });
  }

  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(doc(db, "orders", id), (snap) => {
      if (snap.exists()) setOrder({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [id]);

  if (!order) return <div className="text-brand/50">Loading…</div>;

  const items = (order.items as Array<{ name?: string; quantity?: number; priceMinor?: number }>) || [];
  const finalAmount = (order.finalAmountMinor as number) || 0;
  const subtotal = (order.subtotalMinor as number) || 0;
  const discount = (order.discountMinor as number) || 0;
  const deliveryFee = (order.deliveryFeeMinor as number) || 0;
  const status = (order.status as string) || "pending";

  return (
    <div>
      <Link to="/app/orders" className="inline-flex items-center gap-1 text-brand/60 hover:text-brand text-sm">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>
      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Order #{id.slice(0, 8).toUpperCase()}</h1>
          <div className="text-xs text-brand/60">{formatDate(toDate(order.createdAt))}</div>
        </div>
        <Badge className={statusColor(status)}>{status}</Badge>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-brand/10 bg-white p-5">
          <div className="font-semibold mb-3">Items</div>
          <div className="divide-y divide-brand/10">
            {items.map((it, i) => (
              <div key={i} className="py-2 flex justify-between text-sm">
                <span>{it.name} × {it.quantity}</span>
                <span className="font-medium">{formatINR((it.priceMinor || 0) * (it.quantity || 0))}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-brand/10 space-y-2 text-sm text-brand/70">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>-{formatINR(discount)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>{formatINR(deliveryFee)}</span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-brand/10 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatINR(finalAmount)}</span>
          </div>
          <div className="mt-6">
            <div className="font-semibold mb-3">Progress</div>
            <OrderTimeline status={status} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-brand/10 bg-white p-5">
            <div className="font-semibold mb-2">Delivery</div>
            <div className="text-sm text-brand/70">
              {(order.address as { line1?: string; city?: string; pincode?: string })?.line1}<br />
              {(order.address as { line1?: string; city?: string; pincode?: string })?.city}
              {" "}
              {(order.address as { line1?: string; city?: string; pincode?: string })?.pincode}
            </div>
          </div>
          <Button onClick={reorder} className="w-full rounded-xl bg-brand text-gold hover:bg-brand/90 font-semibold">
            <RotateCcw className="h-4 w-4 mr-1.5" /> Re-order
          </Button>
          <Link to="/app/support">
            <Button variant="outline" className="w-full rounded-xl border-brand/20">
              <MessageCircle className="h-4 w-4 mr-1.5" /> Contact support
            </Button>
          </Link>
        </aside>
      </div>
    </div>
  );
}

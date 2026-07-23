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
import { useAuth } from "@/context/auth-context";
import { httpsCallable } from "firebase/functions";
import { getFns } from "@/lib/firebase";
import { payWithRazorpay } from "@/lib/razorpay";

export const Route = createFileRoute("/_customer/app/orders/$id")({
  ssr: false,
  component: OrderDetail,
});

type Order = Record<string, unknown> & { id: string };

type OrderItem = {
  serviceId?: string;
  name?: string;
  nameSnapshot?: string;
  quantity?: number;
  priceMinor?: number;
  unitPriceMinor?: number;
  lineTotalMinor?: number;
  unit?: string | null;
  priceType?: string;
};

function itemName(item: OrderItem) {
  return item.name || item.nameSnapshot || "Service";
}

function itemUnitPrice(item: OrderItem) {
  return item.priceMinor ?? item.unitPriceMinor ?? 0;
}

function itemLineTotal(item: OrderItem) {
  if (typeof item.lineTotalMinor === "number") return item.lineTotalMinor;
  return itemUnitPrice(item) * (item.quantity || 1);
}

function isPaymentRetryable(status: string, paymentStatus: string) {
  return (
    status === "PAYMENT_PENDING" ||
    ["NOT_STARTED", "PAYMENT_PENDING", "PAYMENT_CREATED", "FAILED", "PENDING", "CREATED"].includes(paymentStatus)
  );
}

function OrderDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [retryingPayment, setRetryingPayment] = useState(false);

  function reorder() {
    if (!order) return;
    const items = (order.items as OrderItem[]) || [];
    if (items.length === 0) return toast.error("No items to re-order");
    cart.clear();
    for (const it of items) {
      if (!it.serviceId) continue;
      cart.add(
        {
          serviceId: it.serviceId,
          name: itemName(it),
          priceMinor: itemUnitPrice(it),
          unit: it.unit || undefined,
          priceType: it.priceType,
        },
        it.quantity || 1,
      );
    }
    toast.success("Items added to cart");
    navigate({ to: "/checkout" });
  }

  async function retryPayment() {
    if (!user) return toast.error("Must be logged in to pay");
    setRetryingPayment(true);
    try {
      const createPayment = httpsCallable<any, any>(getFns(), "createPaymentOrder");
      const { data: paymentRes } = await createPayment({ orderId: id });

      await payWithRazorpay({
        orderId: id,
        razorpayOrderId: paymentRes.razorpayOrderId,
        razorpayKeyId: paymentRes.razorpayKeyId,
        amountMinor: paymentRes.amountMinor,
        customerName: user.displayName || "Customer",
        customerPhone: user.phoneNumber || "",
        description: `SafaiKart order ${id.slice(0, 6).toUpperCase()}`,
      });

      toast.success("Payment successful!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setRetryingPayment(false);
    }
  }

  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(doc(db, "orders", id), (snap) => {
      if (snap.exists()) setOrder({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [id]);

  if (!order) return <div className="text-brand/50">Loading…</div>;

  const items = (order.items as OrderItem[]) || [];
  const finalAmount = (order.finalAmountMinor as number) || 0;
  const subtotal = (order.subtotalMinor as number) || 0;
  const discount = (order.discountMinor as number) || 0;
  const deliveryFee = (order.deliveryFeeMinor as number) || 0;
  const status = (order.status as string) || "pending";
  const paymentStatus = (order.paymentStatus as string) || "NOT_STARTED";
  const address = ((order.addressSnapshot || order.address) as { line1?: string; city?: string; pincode?: string }) || {};

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
                <span>{itemName(it)} × {it.quantity || 1}</span>
                <span className="font-medium">{formatINR(itemLineTotal(it))}</span>
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
              {address.line1 || "Address not available"}<br />
              {address.city}
              {" "}
              {address.pincode}
            </div>
          </div>
          {isPaymentRetryable(status, paymentStatus) && (
            <Button onClick={retryPayment} disabled={retryingPayment} className="w-full rounded-xl bg-brand text-gold hover:bg-brand/90 font-semibold mb-3">
              {retryingPayment ? "Processing..." : "Complete Payment"}
            </Button>
          )}
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

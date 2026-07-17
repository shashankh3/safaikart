import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatINR, toDate } from "@/lib/format";
import { Wallet, Printer, Loader2, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settlement")({
  ssr: false,
  component: SettlementPage,
});

type Order = {
  id: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  finalAmountMinor?: number;
  driverName?: string;
  driverId?: string;
  currency?: string;
  createdAt?: unknown;
  refundedAt?: unknown;
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function SettlementPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [date, setDate] = useState<string>(isoDate(new Date()));

  useEffect(() => {
    const db = getDb();
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1000));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Order),
      );
    });
    return unsub;
  }, []);

  const stats = useMemo(() => {
    if (!orders) return null;
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const dayOrders = orders.filter((o) => {
      const d = toDate(o.createdAt);
      return d && d >= start && d < end;
    });
    const paid = dayOrders.filter(
      (o) => o.paymentStatus === "PAID" || o.paymentStatus === "VERIFIED",
    );
    const refunded = dayOrders.filter((o) => o.paymentStatus === "REFUNDED");
    const cashOrders = paid.filter(
      (o) => (o.paymentMethod || "").toUpperCase() === "COD" || (o.paymentMethod || "").toUpperCase() === "CASH",
    );
    const onlineOrders = paid.filter(
      (o) => !["COD", "CASH", ""].includes((o.paymentMethod || "").toUpperCase()),
    );

    const cashTotal = cashOrders.reduce((s, o) => s + (o.finalAmountMinor || 0), 0);
    const onlineTotal = onlineOrders.reduce((s, o) => s + (o.finalAmountMinor || 0), 0);
    const refundTotal = refunded.reduce((s, o) => s + (o.finalAmountMinor || 0), 0);
    const gross = cashTotal + onlineTotal;
    const net = gross - refundTotal;

    // Per rider
    const riderMap = new Map<string, { orders: number; cash: number; online: number }>();
    paid.forEach((o) => {
      const rider = o.driverName || o.driverId || "Unassigned";
      const cur = riderMap.get(rider) || { orders: 0, cash: 0, online: 0 };
      cur.orders += 1;
      const isCash = ["COD", "CASH"].includes((o.paymentMethod || "").toUpperCase());
      if (isCash) cur.cash += o.finalAmountMinor || 0;
      else cur.online += o.finalAmountMinor || 0;
      riderMap.set(rider, cur);
    });
    const riders = Array.from(riderMap.entries())
      .map(([name, v]) => ({ name, ...v, total: v.cash + v.online }))
      .sort((a, b) => b.total - a.total);

    return {
      count: dayOrders.length,
      paidCount: paid.length,
      cashCount: cashOrders.length,
      onlineCount: onlineOrders.length,
      refundCount: refunded.length,
      cashTotal,
      onlineTotal,
      refundTotal,
      gross,
      net,
      riders,
    };
  }, [orders, date]);

  if (!orders || !stats) {
    return (
      <div className="p-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading settlement…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-card border-border/70 print:hidden">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-end gap-3">
          <div className="space-y-1.5 flex-1 max-w-xs">
            <Label>Settlement date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <Button
            onClick={() => window.print()}
            className="h-11 rounded-xl bg-brand hover:bg-brand-dark text-white gap-2"
          >
            <Printer className="h-4 w-4" /> Print report
          </Button>
        </CardContent>
      </Card>

      <div className="print:block">
        <div className="hidden print:block mb-4">
          <div className="text-2xl font-bold">SafaiKart — Daily Settlement</div>
          <div className="text-sm text-muted-foreground">
            {new Date(date).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl shadow-card border-border/70 bg-brand text-white border-brand">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wider text-gold font-semibold">Net revenue</div>
              <div className="text-2xl font-bold mt-2">{formatINR(stats.net)}</div>
              <div className="text-xs text-white/60 mt-1">Gross − refunds</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-card border-border/70">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Cash</div>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{formatINR(stats.cashTotal)}</div>
              <div className="text-xs text-muted-foreground mt-1">{stats.cashCount} orders</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-card border-border/70">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Online</div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{formatINR(stats.onlineTotal)}</div>
              <div className="text-xs text-muted-foreground mt-1">{stats.onlineCount} orders</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-card border-border/70">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Refunds</div>
              <div className="text-2xl font-bold mt-2 text-rose-600">-{formatINR(stats.refundTotal)}</div>
              <div className="text-xs text-muted-foreground mt-1">{stats.refundCount} orders</div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-card border-border/70 mt-5">
          <CardContent className="p-0">
            <div className="p-5 border-b border-border">
              <div className="text-sm font-semibold">Per-rider collection</div>
              <div className="text-xs text-muted-foreground">
                Cash to reconcile from each runner
              </div>
            </div>
            {stats.riders.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                No paid orders on this day.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Rider</th>
                    <th className="text-right px-5 py-3 font-medium">Orders</th>
                    <th className="text-right px-5 py-3 font-medium">Cash</th>
                    <th className="text-right px-5 py-3 font-medium">Online</th>
                    <th className="text-right px-5 py-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.riders.map((r) => (
                    <tr key={r.name} className="border-t border-border">
                      <td className="px-5 py-3 font-medium">{r.name}</td>
                      <td className="px-5 py-3 text-right">{r.orders}</td>
                      <td className="px-5 py-3 text-right font-semibold text-amber-700">
                        {formatINR(r.cash)}
                      </td>
                      <td className="px-5 py-3 text-right">{formatINR(r.online)}</td>
                      <td className="px-5 py-3 text-right font-bold">{formatINR(r.total)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                    <td className="px-5 py-3">Totals</td>
                    <td className="px-5 py-3 text-right">{stats.paidCount}</td>
                    <td className="px-5 py-3 text-right text-amber-700">{formatINR(stats.cashTotal)}</td>
                    <td className="px-5 py-3 text-right">{formatINR(stats.onlineTotal)}</td>
                    <td className="px-5 py-3 text-right">{formatINR(stats.gross)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <div className="hidden print:block mt-6 text-xs text-muted-foreground">
          Report generated {new Date().toLocaleString("en-IN")}
        </div>
      </div>

      <div className="text-xs text-muted-foreground print:hidden">
        Tip: assign a payment method to orders (<code>paymentMethod: "COD"</code> or{" "}
        <code>"ONLINE"</code>) to split cash vs online.{" "}
        <Badge variant="outline" className="ml-1 rounded-full text-[10px]">reads live from Firestore</Badge>
      </div>
    </div>
  );
}

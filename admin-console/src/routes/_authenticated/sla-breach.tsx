import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatINR, statusColor, toDate } from "@/lib/format";
import { slaBadge } from "@/components/order-timeline";
import { AlertTriangle, Clock, Loader2, TrendingDown, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sla-breach")({
  ssr: false,
  component: SlaBreachPage,
});

type Order = {
  id: string;
  userId?: string;
  status?: string;
  paymentStatus?: string;
  finalAmountMinor?: number;
  currency?: string;
  createdAt?: unknown;
  driverName?: string;
  addressSnapshot?: Record<string, unknown>;
};

const ACTIVE_STATUSES = new Set([
  "PLACED",
  "CONFIRMED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "CLEANING_IN_PROGRESS",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
]);

function SlaBreachPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(getDb(), "orders"), orderBy("createdAt", "desc"), limit(500)),
      (snap) => {
        setOrders(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Order),
        );
      },
    );
    return unsub;
  }, []);

  const { breached, atRisk, healthy, total } = useMemo(() => {
    const active = (orders || []).filter((o) => ACTIVE_STATUSES.has(o.status || ""));
    const withSla = active.map((o) => {
      const sla = slaBadge(o.status, toDate(o.createdAt));
      return { order: o, sla };
    });
    return {
      total: active.length,
      breached: withSla.filter((x) => x.sla?.tone === "danger"),
      atRisk: withSla.filter((x) => x.sla?.tone === "warn"),
      healthy: withSla.filter((x) => x.sla?.tone === "ok").length,
    };
  }, [orders]);

  if (!orders) {
    return (
      <div className="p-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading SLA data…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={AlertTriangle} label="Breached (>24h)" value={String(breached.length)} tone="danger" />
        <KPI icon={Clock} label="At risk (6–24h)" value={String(atRisk.length)} tone="warn" />
        <KPI icon={TrendingDown} label="Healthy (<6h)" value={String(healthy)} tone="ok" />
        <KPI icon={Clock} label="Active orders" value={String(total)} />
      </div>

      <SlaTable
        title="Breached orders"
        subtitle="Past the 24-hour promise — resolve immediately"
        rows={breached}
        emptyLabel="No breaches. Every active order is within SLA."
        tone="danger"
        onOpen={() => navigate({ to: "/orders" })}
      />

      <SlaTable
        title="At-risk orders"
        subtitle="6–24h since placed — nudge riders now"
        rows={atRisk}
        emptyLabel="No orders in the danger zone."
        tone="warn"
        onOpen={() => navigate({ to: "/orders" })}
      />
    </div>
  );
}

function SlaTable({
  title,
  subtitle,
  rows,
  emptyLabel,
  tone,
  onOpen,
}: {
  title: string;
  subtitle: string;
  rows: Array<{ order: Order; sla: ReturnType<typeof slaBadge> }>;
  emptyLabel: string;
  tone: "danger" | "warn";
  onOpen: () => void;
}) {
  const badgeTone =
    tone === "danger"
      ? "bg-rose-100 text-rose-800 border-rose-200"
      : "bg-amber-100 text-amber-900 border-amber-200";
  return (
    <Card className="rounded-2xl shadow-card border-border/70 overflow-hidden">
      <CardContent className="p-0">
        <div className="p-5 border-b border-border flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              {tone === "danger" ? (
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              ) : (
                <Clock className="h-4 w-4 text-amber-600" />
              )}
              {title}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
          </div>
          <Button variant="outline" size="sm" onClick={onOpen} className="rounded-xl gap-1">
            Open Orders <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">{emptyLabel}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Order</th>
                  <th className="text-left px-5 py-3 font-medium">Placed</th>
                  <th className="text-left px-5 py-3 font-medium">Age</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Runner</th>
                  <th className="text-left px-5 py-3 font-medium">Pincode</th>
                  <th className="text-right px-5 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map(({ order: o, sla }) => {
                  const addr = (o.addressSnapshot ?? {}) as Record<string, unknown>;
                  return (
                    <tr key={o.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-5 py-3 font-mono text-xs">{o.id.slice(0, 12)}…</td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant="outline"
                          className={`${badgeTone} rounded-full font-mono text-[11px]`}
                        >
                          {sla?.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant="outline"
                          className={`${statusColor(o.status || "")} rounded-full font-medium`}
                        >
                          {o.status || "—"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {o.driverName || <span className="text-rose-600 font-medium">Unassigned</span>}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {String(addr.pincode ?? addr.postalCode ?? "—")}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">
                        {formatINR(o.finalAmountMinor, o.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "danger" | "warn" | "ok";
}) {
  const cls =
    tone === "danger"
      ? "bg-rose-600 text-white border-rose-700"
      : tone === "warn"
      ? "bg-amber-500 text-white border-amber-600"
      : tone === "ok"
      ? "bg-emerald-600 text-white border-emerald-700"
      : "";
  return (
    <Card className={`rounded-2xl shadow-card border-border/70 ${cls}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className={`text-xs uppercase tracking-wider font-semibold ${tone ? "opacity-90" : "text-muted-foreground"}`}>
            {label}
          </div>
          <Icon className={`h-4 w-4 ${tone ? "opacity-90" : "text-muted-foreground"}`} />
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

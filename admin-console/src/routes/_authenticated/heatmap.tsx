import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR, toDate } from "@/lib/format";
import { Loader2, Flame, GitBranch } from "lucide-react";

export const Route = createFileRoute("/_authenticated/heatmap")({
  ssr: false,
  component: HeatmapPage,
});

type Order = {
  id: string;
  status?: string;
  paymentStatus?: string;
  finalAmountMinor?: number;
  createdAt?: unknown;
  pickedUpAt?: unknown;
  deliveredAt?: unknown;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function HeatmapPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(
      query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(2000)),
      (snap) =>
        setOrders(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Order),
        ),
    );
    return unsub;
  }, []);

  const { grid, max, funnel } = useMemo(() => {
    const g: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let m = 0;
    let created = 0;
    let paid = 0;
    let picked = 0;
    let delivered = 0;

    for (const o of orders || []) {
      const d = toDate(o.createdAt);
      if (d) {
        const revenue = o.finalAmountMinor || 0;
        g[d.getDay()][d.getHours()] += revenue;
        if (g[d.getDay()][d.getHours()] > m) m = g[d.getDay()][d.getHours()];
        created += 1;
      }
      if (o.paymentStatus === "PAID" || o.paymentStatus === "VERIFIED") paid += 1;
      if (o.pickedUpAt || ["PICKED_UP", "IN_PROCESS", "READY", "OUT_FOR_DELIVERY", "DELIVERED"].includes(o.status || "")) picked += 1;
      if (o.status === "DELIVERED") delivered += 1;
    }
    return { grid: g, max: m, funnel: { created, paid, picked, delivered } };
  }, [orders]);

  if (!orders) {
    return (
      <div className="p-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading analytics…
      </div>
    );
  }

  const funnelRows = [
    { label: "Orders created", value: funnel.created, pct: 100 },
    {
      label: "Paid",
      value: funnel.paid,
      pct: funnel.created ? (funnel.paid / funnel.created) * 100 : 0,
    },
    {
      label: "Picked up",
      value: funnel.picked,
      pct: funnel.created ? (funnel.picked / funnel.created) * 100 : 0,
    },
    {
      label: "Delivered",
      value: funnel.delivered,
      pct: funnel.created ? (funnel.delivered / funnel.created) * 100 : 0,
    },
  ];

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-5 w-5 text-brand" />
            <div>
              <div className="font-semibold">Revenue heatmap</div>
              <div className="text-xs text-muted-foreground">
                By weekday × hour — last 2000 orders
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="w-10"></th>
                  {HOURS.map((h) => (
                    <th key={h} className="w-6 text-center text-muted-foreground font-normal py-1">
                      {h % 3 === 0 ? h : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, di) => (
                  <tr key={day}>
                    <td className="pr-2 text-right font-medium text-muted-foreground">{day}</td>
                    {HOURS.map((h) => {
                      const v = grid[di][h];
                      const intensity = max > 0 ? v / max : 0;
                      return (
                        <td key={h} className="p-0.5">
                          <div
                            title={`${day} ${h}:00 — ${formatINR(v)}`}
                            className="w-6 h-6 rounded"
                            style={{
                              background:
                                v === 0
                                  ? "hsl(var(--muted))"
                                  : `rgba(27,59,34,${0.15 + intensity * 0.85})`,
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            Low
            <div className="flex gap-0.5">
              {[0.15, 0.3, 0.5, 0.7, 1].map((v) => (
                <div
                  key={v}
                  className="w-4 h-4 rounded"
                  style={{ background: `rgba(27,59,34,${v})` }}
                />
              ))}
            </div>
            High
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="h-5 w-5 text-brand" />
            <div>
              <div className="font-semibold">Conversion funnel</div>
              <div className="text-xs text-muted-foreground">
                Created → Paid → Picked → Delivered
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {funnelRows.map((r) => (
              <div key={r.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{r.label}</span>
                  <span className="text-muted-foreground">
                    {r.value.toLocaleString()} · {r.pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-8 bg-muted rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand to-brand-dark rounded-lg transition-all"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

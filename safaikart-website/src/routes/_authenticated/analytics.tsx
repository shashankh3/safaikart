import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR, toDate } from "@/lib/format";
import { Loader2, TrendingUp, Repeat, ShoppingBag, Users, Trophy } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  ssr: false,
  component: AnalyticsPage,
});

type Order = {
  id: string;
  userId?: string;
  status?: string;
  paymentStatus?: string;
  finalAmountMinor?: number;
  currency?: string;
  addressSnapshot?: Record<string, unknown>;
  items?: Array<{ name?: string; serviceName?: string; quantity?: number; qty?: number; priceMinor?: number; unitPriceMinor?: number }>;
  driverId?: string;
  driverName?: string;
  createdAt?: unknown;
};

const BRAND = "#1B3B22";
const GOLD = "#F4C73E";
const COLORS = [BRAND, GOLD, "#4ade80", "#60a5fa", "#f472b6", "#fb923c", "#a78bfa", "#22d3ee"];

function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);

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
    const paid = orders.filter((o) => o.paymentStatus === "PAID" || o.paymentStatus === "VERIFIED");
    const revenue = paid.reduce((s, o) => s + (o.finalAmountMinor || 0), 0);
    const aov = paid.length ? revenue / paid.length : 0;

    const userOrders = new Map<string, number>();
    orders.forEach((o) => {
      if (!o.userId) return;
      userOrders.set(o.userId, (userOrders.get(o.userId) || 0) + 1);
    });
    const totalUsers = userOrders.size;
    const repeatUsers = Array.from(userOrders.values()).filter((n) => n > 1).length;
    const repeatRate = totalUsers ? (repeatUsers / totalUsers) * 100 : 0;

    // Revenue by service
    const svcMap = new Map<string, number>();
    paid.forEach((o) => {
      (o.items || []).forEach((it) => {
        const name = it.name || it.serviceName || "Other";
        const price = it.priceMinor ?? it.unitPriceMinor ?? 0;
        const qty = it.quantity ?? it.qty ?? 1;
        svcMap.set(name, (svcMap.get(name) || 0) + price * qty);
      });
    });
    const byService = Array.from(svcMap.entries())
      .map(([name, v]) => ({ name, value: v / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Revenue by pincode
    const pinMap = new Map<string, number>();
    paid.forEach((o) => {
      const addr = (o.addressSnapshot ?? {}) as Record<string, unknown>;
      const pin = String(addr.pincode ?? addr.postalCode ?? "—");
      pinMap.set(pin, (pinMap.get(pin) || 0) + (o.finalAmountMinor || 0));
    });
    const byPincode = Array.from(pinMap.entries())
      .map(([name, v]) => ({ name, value: v / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Hour x DoW heatmap (last 30d)
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    const heat: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    orders.forEach((o) => {
      const d = toDate(o.createdAt);
      if (!d || d.getTime() < cutoff) return;
      heat[d.getDay()][d.getHours()]++;
    });
    const maxHeat = Math.max(1, ...heat.flat());

    // Rider leaderboard
    const rider = new Map<string, { orders: number; revenue: number }>();
    orders.forEach((o) => {
      const name = o.driverName || o.driverId;
      if (!name) return;
      const cur = rider.get(name) || { orders: 0, revenue: 0 };
      cur.orders += 1;
      if (o.status === "DELIVERED") cur.revenue += o.finalAmountMinor || 0;
      rider.set(name, cur);
    });
    const leaderboard = Array.from(rider.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);

    // Cohort retention (last 6 months, monthly buckets)
    const monthKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const now2 = new Date();
    const cohortMonths: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now2.getFullYear(), now2.getMonth() - i, 1);
      cohortMonths.push(monthKey(d));
    }
    // user -> sorted list of month keys of orders
    const userMonths = new Map<string, Set<string>>();
    orders.forEach((o) => {
      if (!o.userId) return;
      const d = toDate(o.createdAt);
      if (!d) return;
      const mk = monthKey(d);
      if (!cohortMonths.includes(mk)) return;
      if (!userMonths.has(o.userId)) userMonths.set(o.userId, new Set());
      userMonths.get(o.userId)!.add(mk);
    });
    // First-order month per user = cohort
    const userFirstMonth = new Map<string, string>();
    orders
      .slice()
      .sort((a, b) => {
        const da = toDate(a.createdAt)?.getTime() ?? 0;
        const db2 = toDate(b.createdAt)?.getTime() ?? 0;
        return da - db2;
      })
      .forEach((o) => {
        if (!o.userId) return;
        const d = toDate(o.createdAt);
        if (!d) return;
        if (!userFirstMonth.has(o.userId)) userFirstMonth.set(o.userId, monthKey(d));
      });

    const cohorts = cohortMonths.map((cm) => {
      const usersInCohort = Array.from(userFirstMonth.entries())
        .filter(([, m]) => m === cm)
        .map(([u]) => u);
      const cohortSize = usersInCohort.length;
      const cmIdx = cohortMonths.indexOf(cm);
      const retention = cohortMonths.slice(cmIdx).map((tm) => {
        if (cohortSize === 0) return null;
        const active = usersInCohort.filter((u) => userMonths.get(u)?.has(tm)).length;
        return { month: tm, pct: (active / cohortSize) * 100, count: active };
      });
      return { cohort: cm, size: cohortSize, retention };
    });

    return {
      revenue,
      aov,
      repeatRate,
      totalUsers,
      byService,
      byPincode,
      heat,
      maxHeat,
      leaderboard,
      orderCount: orders.length,
      cohorts,
      cohortMonths,
    };
  }, [orders]);

  if (!orders || !stats) {
    return (
      <div className="p-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading analytics…
      </div>
    );
  }

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={TrendingUp} label="Total revenue" value={formatINR(stats.revenue)} accent />
        <KPI icon={ShoppingBag} label="Avg order value" value={formatINR(stats.aov)} />
        <KPI icon={Users} label="Unique customers" value={stats.totalUsers.toLocaleString("en-IN")} />
        <KPI icon={Repeat} label="Repeat rate" value={`${stats.repeatRate.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl shadow-card border-border/70">
          <CardContent className="p-5">
            <div className="text-sm font-semibold mb-1">Revenue by service</div>
            <div className="text-xs text-muted-foreground mb-4">Top items by revenue (₹)</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.byService} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" width={110} fontSize={11} />
                <Tooltip formatter={(v: number) => `₹${v.toFixed(0)}`} />
                <Bar dataKey="value" fill={BRAND} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-card border-border/70">
          <CardContent className="p-5">
            <div className="text-sm font-semibold mb-1">Revenue by pincode</div>
            <div className="text-xs text-muted-foreground mb-4">Top 10 delivery pincodes</div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={stats.byPincode}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {stats.byPincode.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `₹${v.toFixed(0)}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-5">
          <div className="text-sm font-semibold mb-1">Order heatmap</div>
          <div className="text-xs text-muted-foreground mb-4">
            Orders by day of week × hour (last 30 days)
          </div>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="flex gap-1 pl-10 mb-1">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="w-6 text-[10px] text-center text-muted-foreground">
                    {h % 3 === 0 ? h : ""}
                  </div>
                ))}
              </div>
              {stats.heat.map((row, d) => (
                <div key={d} className="flex gap-1 items-center mb-1">
                  <div className="w-8 text-[11px] text-muted-foreground pr-2 text-right">
                    {DAYS[d]}
                  </div>
                  {row.map((v, h) => {
                    const intensity = v / stats.maxHeat;
                    const bg = v === 0
                      ? "hsl(0 0% 96%)"
                      : `rgba(27, 59, 34, ${0.15 + intensity * 0.85})`;
                    return (
                      <div
                        key={h}
                        title={`${DAYS[d]} ${h}:00 — ${v} orders`}
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: bg }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-5">
          <div className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold" /> Rider leaderboard
          </div>
          <div className="text-xs text-muted-foreground mb-4">Ranked by orders handled</div>
          {stats.leaderboard.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No rider assignments yet. Assign runners from an order detail sheet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left py-2 font-medium">#</th>
                  <th className="text-left py-2 font-medium">Rider</th>
                  <th className="text-right py-2 font-medium">Orders</th>
                  <th className="text-right py-2 font-medium">Delivered revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats.leaderboard.map((r, i) => (
                  <tr key={r.name} className="border-t border-border">
                    <td className="py-3">
                      <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                        i === 0 ? "bg-gold text-brand" : i < 3 ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-3 font-medium">{r.name}</td>
                    <td className="py-3 text-right">{r.orders}</td>
                    <td className="py-3 text-right font-semibold">{formatINR(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-5">
          <div className="text-sm font-semibold mb-1">Cohort retention</div>
          <div className="text-xs text-muted-foreground mb-4">
            % of first-order customers who ordered again in each following month
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Cohort</th>
                  <th className="text-right py-2 pr-4 font-medium">Size</th>
                  {stats.cohortMonths.map((_, i) => (
                    <th key={i} className="text-center py-2 px-1 font-medium">
                      M{i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.cohorts.map((c) => (
                  <tr key={c.cohort} className="border-t border-border">
                    <td className="py-2 pr-4 font-medium whitespace-nowrap">{c.cohort}</td>
                    <td className="py-2 pr-4 text-right text-muted-foreground">{c.size}</td>
                    {stats.cohortMonths.map((_, i) => {
                      const off = stats.cohortMonths.indexOf(c.cohort);
                      const relIdx = i - off;
                      const cell = relIdx >= 0 ? c.retention[relIdx] : null;
                      if (!cell) {
                        return <td key={i} className="py-2 px-1 text-center text-muted-foreground/30">—</td>;
                      }
                      const alpha = Math.min(1, 0.15 + cell.pct / 100);
                      return (
                        <td key={i} className="py-1 px-1 text-center">
                          <div
                            className="rounded px-2 py-1.5 font-semibold"
                            style={{
                              backgroundColor: `rgba(27, 59, 34, ${alpha})`,
                              color: cell.pct > 40 ? "white" : "#1B3B22",
                            }}
                            title={`${cell.count} of ${c.size} users`}
                          >
                            {cell.pct.toFixed(0)}%
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function KPI({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={`rounded-2xl shadow-card border-border/70 ${
        accent ? "bg-brand text-white border-brand" : ""
      }`}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className={`text-xs uppercase tracking-wider font-semibold ${accent ? "text-gold" : "text-muted-foreground"}`}>
            {label}
          </div>
          <Icon className={`h-4 w-4 ${accent ? "text-gold" : "text-muted-foreground"}`} />
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

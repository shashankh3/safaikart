import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import {
  ShoppingBag,
  IndianRupee,
  Clock,
  Users as UsersIcon,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { formatDate, formatINR, statusColor } from "@/lib/format";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: DashboardPage,
});

const PENDING_STATUSES = [
  "PAYMENT_PENDING",
  "CONFIRMED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "CLEANING_IN_PROGRESS",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
];

const PAID_STATUSES = new Set(["VERIFIED", "PAID"]);

type TimestampLike = { toDate: () => Date };
function toJsDate(input: unknown): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === "object" && input !== null && "toDate" in (input as object)) {
    try {
      return (input as TimestampLike).toDate();
    } catch {
      return null;
    }
  }
  if (typeof input === "string" || typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

type WeekBucket = { day: string; date: string; orders: number; revenue: number };
type Metrics = {
  todayOrders: number;
  todayRevenueMinor: number;
  pending: number;
  users: number;
  week: WeekBucket[];
  weekRevenueMinor: number;
};

async function loadMetrics(): Promise<Metrics> {
  const db = getDb();
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const weekStartTs = Timestamp.fromDate(startOfWeek);
  const todayTs = Timestamp.fromDate(startOfDay);

  const ordersRef = collection(db, "orders");
  const usersRef = collection(db, "profiles");

  const [weekOrdersSnap, pendingSnap, usersCount] = await Promise.all([
    getDocs(query(ordersRef, where("createdAt", ">=", weekStartTs))).catch(() => null),
    getCountFromServer(query(ordersRef, where("status", "in", PENDING_STATUSES.slice(0, 10)))).catch(() => null),
    getCountFromServer(usersRef).catch(() => null),
  ]);

  // Init week buckets (oldest -> newest)
  const buckets: WeekBucket[] = [];
  const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
  const dateFmt = new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric" });
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfDay);
    d.setDate(d.getDate() - i);
    buckets.push({
      day: dayFmt.format(d),
      date: dateFmt.format(d),
      orders: 0,
      revenue: 0,
    });
  }

  let todayOrders = 0;
  let todayRevenueMinor = 0;
  let weekRevenueMinor = 0;

  const NON_REVENUE_STATUSES = new Set(["DRAFT", "CANCELLED", "FAILED", "REFUNDED", "REFUND_PENDING"]);

  for (const d of weekOrdersSnap?.docs ?? []) {
    const data = d.data() as {
      status?: string;
      finalAmountMinor?: number;
      paymentStatus?: string;
      createdAt?: unknown;
    };
    
    // Ignore invalid/cancelled orders completely
    if (data.status && NON_REVENUE_STATUSES.has(data.status)) {
      continue;
    }

    const created = toJsDate(data.createdAt);
    if (!created) continue;
    const daysAgo = Math.floor(
      (startOfDay.getTime() - new Date(created).setHours(0, 0, 0, 0)) / 86400000,
    );
    const idx = 6 - daysAgo;
    const isPaid = !data.paymentStatus || PAID_STATUSES.has(data.paymentStatus);
    const amount = isPaid ? data.finalAmountMinor ?? 0 : 0;
    if (idx >= 0 && idx < 7) {
      buckets[idx].orders += 1;
      buckets[idx].revenue += amount / 100;
      weekRevenueMinor += amount;
    }
    if (created >= startOfDay) {
      todayOrders += 1;
      todayRevenueMinor += amount;
    }
    void todayTs;
  }

  return {
    todayOrders,
    todayRevenueMinor,
    pending: pendingSnap?.data().count ?? 0,
    users: usersCount?.data().count ?? 0,
    week: buckets,
    weekRevenueMinor,
  };
}

async function loadRecentOrders() {
  const db = getDb();
  const snap = await getDocs(
    query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(8)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
}

function DashboardPage() {
  const metrics = useQuery({ queryKey: ["dashboard-metrics"], queryFn: loadMetrics });
  const recent = useQuery({ queryKey: ["dashboard-recent"], queryFn: loadRecentOrders });

  const cards = [
    {
      label: "Orders Today",
      value: metrics.data?.todayOrders ?? "—",
      icon: ShoppingBag,
      accent: "bg-brand text-gold",
    },
    {
      label: "Revenue Today",
      value: formatINR(metrics.data?.todayRevenueMinor ?? 0),
      icon: IndianRupee,
      accent: "bg-gold text-brand",
    },
    {
      label: "Pending Orders",
      value: metrics.data?.pending ?? "—",
      icon: Clock,
      accent: "bg-brand text-gold",
    },
    {
      label: "Registered Users",
      value: metrics.data?.users ?? "—",
      icon: UsersIcon,
      accent: "bg-gold text-brand",
    },
  ];

  const week = metrics.data?.week ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, accent }) => (
          <Card key={label} className="rounded-2xl shadow-card border-border/70">
            <CardContent className="p-5 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground font-medium">{label}</div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  {metrics.isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : value}
                </div>
              </div>
              <div className={`h-11 w-11 rounded-xl grid place-items-center ${accent} shadow-elevated`}>
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl shadow-card border-border/70 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Revenue · Last 7 days</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Total {formatINR(metrics.data?.weekRevenueMinor ?? 0)}
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64">
              {metrics.isLoading ? (
                <div className="h-full grid place-items-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={week} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1B3B22" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#1B3B22" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#6B7280", fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#6B7280", fontSize: 12 }}
                      tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      }}
                      formatter={(v: number) => [`₹${v.toFixed(2)}`, "Revenue"]}
                      labelFormatter={(_, p) => p?.[0]?.payload?.date ?? ""}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#1B3B22"
                      strokeWidth={2.5}
                      fill="url(#revFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-card border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Orders · Last 7 days</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {week.reduce((s, w) => s + w.orders, 0)} total
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64">
              {metrics.isLoading ? (
                <div className="h-full grid place-items-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={week} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#6B7280", fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#6B7280", fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      }}
                      cursor={{ fill: "rgba(27,59,34,0.05)" }}
                      labelFormatter={(_, p) => p?.[0]?.payload?.date ?? ""}
                    />
                    <Bar dataKey="orders" fill="#F4C73E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
          <Link
            to="/orders"
            className="text-sm text-brand font-semibold inline-flex items-center gap-1 hover:underline"
          >
            View all <ArrowUpRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recent.isLoading ? (
            <div className="p-10 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading orders…
            </div>
          ) : recent.data && recent.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Order</th>
                    <th className="text-left px-5 py-3 font-medium">Created</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-right px-5 py-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.data.map((o) => {
                    const order = o as {
                      id: string;
                      status?: string;
                      finalAmountMinor?: number;
                      currency?: string;
                      createdAt?: unknown;
                    };
                    return (
                      <tr key={order.id} className="border-t border-border hover:bg-muted/40">
                        <td className="px-5 py-3 font-mono text-xs">{order.id.slice(0, 10)}…</td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            variant="outline"
                            className={`${statusColor(order.status || "")} font-medium rounded-full`}
                          >
                            {order.status || "—"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold">
                          {formatINR(order.finalAmountMinor, order.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-muted-foreground">No orders yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

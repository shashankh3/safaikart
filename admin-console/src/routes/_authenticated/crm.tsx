import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatINR, statusColor, toDate } from "@/lib/format";
import {
  Loader2,
  Search,
  Users as UsersIcon,
  IndianRupee,
  ShoppingBag,
  UserPlus,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  CalendarClock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/crm")({
  ssr: false,
  component: CRMPage,
});

type Profile = {
  id: string;
  name?: string;
  email?: string;
  photoURL?: string;
  phoneNumber?: string;
  createdAt?: unknown;
};

type Order = {
  id: string;
  userId?: string;
  status?: string;
  paymentStatus?: string;
  finalAmountMinor?: number;
  currency?: string;
  addressSnapshot?: Record<string, unknown>;
  items?: Array<{ name?: string; serviceName?: string; quantity?: number; qty?: number }>;
  createdAt?: unknown;
};

type Customer = {
  id: string;
  profile?: Profile;
  totalOrders: number;
  totalSpentMinor: number;
  firstOrderAt: Date | null;
  lastOrderAt: Date | null;
  activeOrders: number;
  deliveredOrders: number;
  orders: Order[];
};

const TERMINAL = new Set(["DELIVERED", "CANCELLED", "REFUNDED"]);

async function loadCRM(): Promise<{ profiles: Profile[]; orders: Order[] }> {
  const db = getDb();
  const [profSnap, ordSnap] = await Promise.all([
    getDocs(query(collection(db, "profiles"), limit(1000))).catch(() =>
      getDocs(collection(db, "profiles")),
    ),
    getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1000))).catch(() =>
      getDocs(collection(db, "orders")),
    ),
  ]);
  const profiles = profSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Profile[];
  const orders = ordSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Order[];
  return { profiles, orders };
}

function buildCustomers(profiles: Profile[], orders: Order[]): Customer[] {
  const map = new Map<string, Customer>();
  for (const p of profiles) {
    map.set(p.id, {
      id: p.id,
      profile: p,
      totalOrders: 0,
      totalSpentMinor: 0,
      firstOrderAt: null,
      lastOrderAt: null,
      activeOrders: 0,
      deliveredOrders: 0,
      orders: [],
    });
  }
  for (const o of orders) {
    const uid = o.userId;
    if (!uid) continue;
    let c = map.get(uid);
    if (!c) {
      c = {
        id: uid,
        profile: undefined,
        totalOrders: 0,
        totalSpentMinor: 0,
        firstOrderAt: null,
        lastOrderAt: null,
        activeOrders: 0,
        deliveredOrders: 0,
        orders: [],
      };
      map.set(uid, c);
    }
    c.orders.push(o);
    c.totalOrders += 1;
    c.totalSpentMinor += o.finalAmountMinor ?? 0;
    const d = toDate(o.createdAt);
    if (d) {
      if (!c.firstOrderAt || d < c.firstOrderAt) c.firstOrderAt = d;
      if (!c.lastOrderAt || d > c.lastOrderAt) c.lastOrderAt = d;
    }
    if (o.status === "DELIVERED") c.deliveredOrders += 1;
    else if (o.status && !TERMINAL.has(o.status)) c.activeOrders += 1;
  }
  return Array.from(map.values());
}

function daysSince(d: Date | null): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function segmentOf(c: Customer): { label: string; className: string } {
  if (c.totalOrders === 0) return { label: "Lead", className: "bg-slate-100 text-slate-700 border-slate-200" };
  if (c.totalOrders === 1) return { label: "New", className: "bg-sky-100 text-sky-800 border-sky-200" };
  const since = daysSince(c.lastOrderAt);
  if (since !== null && since > 60)
    return { label: "At Risk", className: "bg-rose-100 text-rose-800 border-rose-200" };
  if (c.totalOrders >= 5 || c.totalSpentMinor >= 500000)
    return { label: "VIP", className: "bg-amber-100 text-amber-900 border-amber-200" };
  return { label: "Regular", className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
}

function CRMPage() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["crm"],
    queryFn: loadCRM,
  });

  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<string>("ALL");
  const [sort, setSort] = useState<string>("lastOrder");
  const [selected, setSelected] = useState<Customer | null>(null);

  const customers = useMemo(
    () => (data ? buildCustomers(data.profiles, data.orders) : []),
    [data],
  );

  const metrics = useMemo(() => {
    const total = customers.length;
    const withOrders = customers.filter((c) => c.totalOrders > 0).length;
    const revenue = customers.reduce((s, c) => s + c.totalSpentMinor, 0);
    const now = Date.now();
    const newThisMonth = customers.filter((c) => {
      if (!c.firstOrderAt) return false;
      return now - c.firstOrderAt.getTime() < 30 * 24 * 60 * 60 * 1000;
    }).length;
    const repeat = customers.filter((c) => c.totalOrders >= 2).length;
    return { total, withOrders, revenue, newThisMonth, repeat };
  }, [customers]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = customers.filter((c) => {
      if (segment !== "ALL" && segmentOf(c).label !== segment) return false;
      if (!s) return true;
      const p = c.profile;
      return (
        c.id.toLowerCase().includes(s) ||
        (p?.name || "").toLowerCase().includes(s) ||
        (p?.email || "").toLowerCase().includes(s) ||
        (p?.phoneNumber || "").toLowerCase().includes(s)
      );
    });
    list = list.sort((a, b) => {
      switch (sort) {
        case "spent":
          return b.totalSpentMinor - a.totalSpentMinor;
        case "orders":
          return b.totalOrders - a.totalOrders;
        case "firstOrder":
          return (b.firstOrderAt?.getTime() ?? 0) - (a.firstOrderAt?.getTime() ?? 0);
        case "lastOrder":
        default:
          return (b.lastOrderAt?.getTime() ?? 0) - (a.lastOrderAt?.getTime() ?? 0);
      }
    });
    return list;
  }, [customers, search, segment, sort]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={UsersIcon}
          label="Total Customers"
          value={metrics.total.toString()}
          hint={`${metrics.withOrders} with orders`}
        />
        <MetricCard
          icon={IndianRupee}
          label="Lifetime Revenue"
          value={formatINR(metrics.revenue)}
          hint="All time"
        />
        <MetricCard
          icon={UserPlus}
          label="New (30 days)"
          value={metrics.newThisMonth.toString()}
          hint="First order in last 30 days"
        />
        <MetricCard
          icon={Sparkles}
          label="Repeat Customers"
          value={metrics.repeat.toString()}
          hint="2+ orders"
        />
      </div>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone or uid…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-xl"
            />
          </div>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="h-11 w-full md:w-40 rounded-xl">
              <SelectValue placeholder="Segment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All segments</SelectItem>
              <SelectItem value="Lead">Lead</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Regular">Regular</SelectItem>
              <SelectItem value="VIP">VIP</SelectItem>
              <SelectItem value="At Risk">At Risk</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-11 w-full md:w-48 rounded-xl">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastOrder">Last order (recent)</SelectItem>
              <SelectItem value="firstOrder">First order (recent)</SelectItem>
              <SelectItem value="spent">Total spent</SelectItem>
              <SelectItem value="orders">Order count</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-11 rounded-xl"
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-16 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading customers…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">No customers match.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Customer</th>
                    <th className="text-left px-5 py-3 font-medium">Segment</th>
                    <th className="text-left px-5 py-3 font-medium">First order</th>
                    <th className="text-left px-5 py-3 font-medium">Last order</th>
                    <th className="text-right px-5 py-3 font-medium">Orders</th>
                    <th className="text-right px-5 py-3 font-medium">Lifetime value</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const p = c.profile;
                    const seg = segmentOf(c);
                    const initials =
                      (p?.name || p?.email || c.id)
                        .split(/[\s@]/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((s) => s[0]?.toUpperCase())
                        .join("") || "?";
                    return (
                      <tr
                        key={c.id}
                        className="border-t border-border hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => setSelected(c)}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              {p?.photoURL ? <AvatarImage src={p.photoURL} alt={p.name} /> : null}
                              <AvatarFallback className="bg-brand text-gold text-xs font-semibold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate">
                                {p?.name || "Unknown"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {p?.email || p?.phoneNumber || c.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant="outline" className={`${seg.className} rounded-full font-medium`}>
                            {seg.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                          {c.firstOrderAt ? formatDate(c.firstOrderAt) : "—"}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                          {c.lastOrderAt ? (
                            <span>
                              {formatDate(c.lastOrderAt)}
                              <span className="block text-[11px]">
                                {daysSince(c.lastOrderAt)}d ago
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold">{c.totalOrders}</td>
                        <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">
                          {formatINR(c.totalSpentMinor)}
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

      <CustomerSheet customer={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="rounded-2xl shadow-card border-border/70">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {label}
          </div>
          <div className="h-9 w-9 rounded-xl bg-brand/10 text-brand grid place-items-center">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
        {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

function CustomerSheet({
  customer,
  onOpenChange,
}: {
  customer: Customer | null;
  onOpenChange: (open: boolean) => void;
}) {
  const p = customer?.profile;
  const seg = customer ? segmentOf(customer) : null;
  const avg =
    customer && customer.totalOrders > 0
      ? customer.totalSpentMinor / customer.totalOrders
      : 0;
  const lastOrder = customer?.orders[0];
  const addr = (lastOrder?.addressSnapshot ?? {}) as Record<string, unknown>;
  const addressLine = [addr.line1, addr.line2, addr.city, addr.state, addr.pincode ?? addr.postalCode]
    .filter(Boolean)
    .join(", ");

  return (
    <Sheet open={!!customer} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {customer && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
              <SheetTitle className="text-lg">Customer profile</SheetTitle>
              <SheetDescription>Aggregated from Firestore orders & profile</SheetDescription>
            </SheetHeader>

            <div className="px-6 py-6 space-y-6">
              <section className="rounded-2xl bg-brand text-white p-5 shadow-elevated">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14 ring-2 ring-gold/40">
                    {p?.photoURL ? <AvatarImage src={p.photoURL} alt={p.name} /> : null}
                    <AvatarFallback className="bg-white/10 text-gold text-lg font-semibold">
                      {(p?.name || p?.email || customer.id)
                        .split(/[\s@]/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((s) => s[0]?.toUpperCase())
                        .join("") || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold">{p?.name || "Unknown customer"}</div>
                    <div className="text-xs font-mono text-white/70 break-all mt-1">{customer.id}</div>
                    {seg && (
                      <Badge variant="outline" className={`${seg.className} rounded-full font-medium mt-2`}>
                        {seg.label}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-5">
                  <MiniStat label="Orders" value={customer.totalOrders.toString()} />
                  <MiniStat label="Lifetime" value={formatINR(customer.totalSpentMinor)} />
                  <MiniStat label="Avg order" value={formatINR(avg)} />
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoBlock icon={Mail} title="Email">
                  <div className="text-sm break-all">{p?.email || "—"}</div>
                </InfoBlock>
                <InfoBlock icon={Phone} title="Phone">
                  <div className="text-sm">{p?.phoneNumber || "—"}</div>
                </InfoBlock>
                <InfoBlock icon={CalendarClock} title="First order">
                  <div className="text-sm">
                    {customer.firstOrderAt ? formatDate(customer.firstOrderAt) : "—"}
                  </div>
                  {customer.firstOrderAt && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {daysSince(customer.firstOrderAt)} days ago
                    </div>
                  )}
                </InfoBlock>
                <InfoBlock icon={CalendarClock} title="Last order">
                  <div className="text-sm">
                    {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}
                  </div>
                  {customer.lastOrderAt && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {daysSince(customer.lastOrderAt)} days ago
                    </div>
                  )}
                </InfoBlock>
                {addressLine && (
                  <InfoBlock icon={MapPin} title="Latest address" className="md:col-span-2">
                    <div className="text-sm">{addressLine}</div>
                  </InfoBlock>
                )}
              </div>

              <section>
                <div className="flex items-center gap-2 text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-3">
                  <ShoppingBag className="h-3.5 w-3.5" /> Order history ({customer.orders.length})
                </div>
                <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                  {customer.orders.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      No orders yet — this customer is a lead.
                    </div>
                  ) : (
                    customer.orders
                      .slice()
                      .sort(
                        (a, b) =>
                          (toDate(b.createdAt)?.getTime() ?? 0) -
                          (toDate(a.createdAt)?.getTime() ?? 0),
                      )
                      .map((o) => (
                        <div key={o.id} className="p-4 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-mono text-muted-foreground">
                              {o.id.slice(0, 12)}…
                            </div>
                            <div className="text-sm mt-0.5">{formatDate(o.createdAt)}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {o.items?.length ?? 0} item{(o.items?.length ?? 0) === 1 ? "" : "s"}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold text-sm">
                              {formatINR(o.finalAmountMinor, o.currency)}
                            </div>
                            <Badge
                              variant="outline"
                              className={`${statusColor(o.status || "")} rounded-full font-medium mt-1`}
                            >
                              {o.status || "—"}
                            </Badge>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-gold font-semibold">{label}</div>
      <div className="text-sm font-bold mt-0.5">{value}</div>
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border p-4 bg-card ${className || ""}`}>
      <div className="flex items-center gap-2 text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-2">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {children}
    </div>
  );
}

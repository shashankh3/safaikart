import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatINR } from "@/lib/format";
import { Gift, Users2, Loader2, Search, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/referrals")({
  ssr: false,
  component: ReferralsPage,
});

type Profile = {
  id: string;
  displayName?: string;
  name?: string;
  email?: string;
  phone?: string;
  referralCode?: string;
  referredBy?: string;
  createdAt?: unknown;
};

type Order = {
  id: string;
  userId?: string;
  finalAmountMinor?: number;
  paymentStatus?: string;
};

function ReferralsPage() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const db = getDb();
    const unsubP = onSnapshot(query(collection(db, "profiles"), limit(1000)), (snap) => {
      setProfiles(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Profile),
      );
    });
    const unsubO = onSnapshot(
      query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1000)),
      (snap) => {
        setOrders(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Order),
        );
      },
    );
    return () => {
      unsubP();
      unsubO();
    };
  }, []);

  const referrers = useMemo(() => {
    if (!profiles || !orders) return [];
    const byId = new Map(profiles.map((p) => [p.id, p]));
    const referredMap = new Map<string, Profile[]>();
    profiles.forEach((p) => {
      if (!p.referredBy) return;
      const arr = referredMap.get(p.referredBy) || [];
      arr.push(p);
      referredMap.set(p.referredBy, arr);
    });
    const revenueByUser = new Map<string, number>();
    orders.forEach((o) => {
      if (!o.userId) return;
      if (o.paymentStatus !== "PAID" && o.paymentStatus !== "VERIFIED") return;
      revenueByUser.set(o.userId, (revenueByUser.get(o.userId) || 0) + (o.finalAmountMinor || 0));
    });
    return Array.from(referredMap.entries())
      .map(([refId, invited]) => {
        const p = byId.get(refId);
        const invitedRevenue = invited.reduce(
          (s, i) => s + (revenueByUser.get(i.id) || 0),
          0,
        );
        return {
          id: refId,
          name: p?.displayName || p?.name || p?.email || refId.slice(0, 10),
          code: p?.referralCode,
          count: invited.length,
          invited,
          revenue: invitedRevenue,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [profiles, orders]);

  const totalReferred = referrers.reduce((s, r) => s + r.count, 0);
  const totalReferralRevenue = referrers.reduce((s, r) => s + r.revenue, 0);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return referrers;
    return referrers.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        (r.code || "").toLowerCase().includes(s) ||
        r.id.toLowerCase().includes(s),
    );
  }, [referrers, search]);

  if (!profiles || !orders) {
    return (
      <div className="p-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading referrals…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl shadow-card border-border/70 bg-brand text-white border-brand">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-wider text-gold font-semibold mb-2">
              Total referrers
            </div>
            <div className="text-3xl font-bold">{referrers.length}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-card border-border/70">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                People invited
              </div>
              <Users2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">{totalReferred}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-card border-border/70">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Referral revenue
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">{formatINR(totalReferralRevenue)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, or user id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <Gift className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No referrals yet. Users with a <code className="text-xs">referredBy</code> field will appear.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Referrer</th>
                    <th className="text-left px-5 py-3 font-medium">Code</th>
                    <th className="text-right px-5 py-3 font-medium">Invited</th>
                    <th className="text-right px-5 py-3 font-medium">Referral revenue</th>
                    <th className="text-left px-5 py-3 font-medium">Recent invitees</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.id.slice(0, 12)}…</div>
                      </td>
                      <td className="px-5 py-3">
                        {r.code ? (
                          <Badge variant="outline" className="rounded-full font-mono text-xs bg-gold/10 border-gold/30 text-brand">
                            {r.code}
                          </Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">{r.count}</td>
                      <td className="px-5 py-3 text-right font-semibold">{formatINR(r.revenue)}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.invited.slice(0, 3).map((i) => (
                            <Badge key={i.id} variant="outline" className="rounded-full text-xs">
                              {i.displayName || i.name || i.email || i.id.slice(0, 6)}
                            </Badge>
                          ))}
                          {r.invited.length > 3 && (
                            <Badge variant="outline" className="rounded-full text-xs">+{r.invited.length - 3}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Latest {formatDate(r.invited[0]?.createdAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

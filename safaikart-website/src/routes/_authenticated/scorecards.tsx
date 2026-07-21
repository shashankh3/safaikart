import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR, toDate } from "@/lib/format";
import { Loader2, Bike, Trophy, Clock, AlertOctagon } from "lucide-react";
import { useOrdersStream } from "@/hooks/useOrdersStream";

export const Route = createFileRoute("/_authenticated/scorecards")({
  ssr: false,
  component: ScorecardsPage,
});

type Order = {
  id: string;
  status?: string;
  driverName?: string;
  driverId?: string;
  finalAmountMinor?: number;
  createdAt?: unknown;
  deliveredAt?: unknown;
  pickedUpAt?: unknown;
};

type Complaint = { id: string; driverId?: string; driverName?: string };

const SLA_HOURS = 24;

function ScorecardsPage() {
  const { orders: rawOrdersRaw, loading } = useOrdersStream({ limitCount: 1000 });
  const orders = loading ? null : rawOrdersRaw;
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  useEffect(() => {
    const db = getDb();
    const u2 = onSnapshot(collection(db, "complaints"), (snap) =>
      setComplaints(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Complaint),
      ),
    );
    return () => {
      u2();
    };
  }, []);

  const rows = useMemo(() => {
    if (!orders) return [];
    const map = new Map<
      string,
      {
        name: string;
        delivered: number;
        active: number;
        revenue: number;
        onTime: number;
        durations: number[];
        complaints: number;
      }
    >();
    for (const o of orders) {
      const key = o.driverName || o.driverId || "Unassigned";
      const cur =
        map.get(key) || {
          name: key,
          delivered: 0,
          active: 0,
          revenue: 0,
          onTime: 0,
          durations: [] as number[],
          complaints: 0,
        };
      if (o.status === "DELIVERED") {
        cur.delivered += 1;
        cur.revenue += o.finalAmountMinor || 0;
        const created = toDate(o.createdAt);
        const done = toDate(o.deliveredAt);
        if (created && done) {
          const hrs = (done.getTime() - created.getTime()) / (1000 * 60 * 60);
          cur.durations.push(hrs);
          if (hrs <= SLA_HOURS) cur.onTime += 1;
        }
      } else if (o.status && !["CANCELLED", "REFUNDED"].includes(o.status)) {
        cur.active += 1;
      }
      map.set(key, cur);
    }
    for (const c of complaints) {
      const key = c.driverName || c.driverId;
      if (!key) continue;
      const cur = map.get(key);
      if (cur) cur.complaints += 1;
    }
    return Array.from(map.values())
      .map((r) => ({
        ...r,
        avgHrs: r.durations.length
          ? r.durations.reduce((a, b) => a + b, 0) / r.durations.length
          : null,
        onTimePct: r.delivered ? (r.onTime / r.delivered) * 100 : null,
      }))
      .sort((a, b) => b.delivered - a.delivered);
  }, [orders, complaints]);

  if (!orders) {
    return (
      <div className="p-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading scorecards…
      </div>
    );
  }

  const topRider = rows[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl shadow-card border-border/70 bg-brand text-white">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-gold font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Top rider
            </div>
            <div className="text-2xl font-bold mt-2">{topRider?.name || "—"}</div>
            <div className="text-xs text-white/70 mt-1">{topRider?.delivered || 0} deliveries</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-card border-border/70">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
              <Bike className="h-4 w-4" /> Active riders
            </div>
            <div className="text-2xl font-bold mt-2">
              {rows.filter((r) => r.name !== "Unassigned").length}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-card border-border/70">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" /> SLA target
            </div>
            <div className="text-2xl font-bold mt-2">{SLA_HOURS}h</div>
            <div className="text-xs text-muted-foreground mt-1">created → delivered</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-card border-border/70 overflow-hidden">
        <CardContent className="p-0">
          <div className="p-5 border-b border-border">
            <div className="text-sm font-semibold">Rider scorecards</div>
            <div className="text-xs text-muted-foreground">Ranked by deliveries completed</div>
          </div>
          {rows.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              No orders yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Rider</th>
                    <th className="text-right px-5 py-3 font-medium">Delivered</th>
                    <th className="text-right px-5 py-3 font-medium">Active</th>
                    <th className="text-right px-5 py-3 font-medium">Revenue</th>
                    <th className="text-right px-5 py-3 font-medium">Avg time</th>
                    <th className="text-right px-5 py-3 font-medium">On-time %</th>
                    <th className="text-right px-5 py-3 font-medium">Complaints</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.name} className="border-t border-border hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium">{r.name}</td>
                      <td className="px-5 py-3 text-right">{r.delivered}</td>
                      <td className="px-5 py-3 text-right">{r.active}</td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {formatINR(r.revenue)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {r.avgHrs !== null ? `${r.avgHrs.toFixed(1)}h` : "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {r.onTimePct !== null ? (
                          <Badge
                            variant="outline"
                            className={`rounded-full ${
                              r.onTimePct >= 90
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : r.onTimePct >= 70
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {r.onTimePct.toFixed(0)}%
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {r.complaints > 0 ? (
                          <Badge
                            variant="outline"
                            className="rounded-full bg-rose-50 text-rose-700 border-rose-200"
                          >
                            <AlertOctagon className="h-3 w-3 mr-1" />
                            {r.complaints}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
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

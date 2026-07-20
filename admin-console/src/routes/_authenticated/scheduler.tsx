import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR, statusColor, toDate } from "@/lib/format";
import { useOrdersStream } from "@/hooks/useOrdersStream";
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/scheduler")({
  ssr: false,
  component: SchedulerPage,
});

type Order = {
  id: string;
  status?: string;
  finalAmountMinor?: number;
  currency?: string;
  addressSnapshot?: Record<string, unknown>;
  pickupSlotSnapshot?: Record<string, unknown>;
  createdAt?: unknown;
};

const CAPACITY_PER_SLOT = 10;

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function SchedulerPage() {
  const { orders: rawOrdersRaw, loading } = useOrdersStream({ limitCount: 500 });
  const orders = loading ? null : rawOrdersRaw;
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>();
    (orders ?? []).forEach((o) => {
      const p = (o.pickupSlotSnapshot ?? {}) as Record<string, unknown>;
      const d = toDate(p.date ?? p.startAt ?? p.start);
      if (!d) return;
      const k = dayKey(d);
      const list = map.get(k) ?? [];
      list.push(o);
      map.set(k, list);
    });
    return map;
  }, [orders]);

  const shift = (delta: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  };

  const isLoading = orders === null;

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-card border-border/70">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand" />
            <div>
              <div className="font-semibold">Pickup & Delivery Schedule</div>
              <div className="text-xs text-muted-foreground">
                Week of {days[0].toLocaleDateString("en-IN", { month: "long", day: "numeric" })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => shift(-1)} className="rounded-xl">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="rounded-xl"
            >
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => shift(1)} className="rounded-xl">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="p-16 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading pickups…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {days.map((d) => {
            const list = grouped.get(dayKey(d)) ?? [];
            const isToday = dayKey(d) === dayKey(new Date());
            const overCap = list.length > CAPACITY_PER_SLOT;
            return (
              <Card
                key={dayKey(d)}
                className={`rounded-2xl border ${isToday ? "border-brand shadow-elevated" : "border-border/70 shadow-card"}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-sm font-semibold ${isToday ? "text-brand" : ""}`}>
                      {fmtDay(d)}
                    </div>
                    <Badge
                      variant="outline"
                      className={`rounded-full text-[10px] ${
                        overCap
                          ? "bg-rose-100 text-rose-800 border-rose-200"
                          : list.length >= CAPACITY_PER_SLOT * 0.8
                            ? "bg-amber-100 text-amber-900 border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {list.length}/{CAPACITY_PER_SLOT}
                    </Badge>
                  </div>
                  <div className="space-y-2 max-h-[520px] overflow-y-auto">
                    {list.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-8 text-center">
                        No pickups
                      </div>
                    ) : (
                      list.map((o) => {
                        const addr = (o.addressSnapshot ?? {}) as Record<string, unknown>;
                        const p = (o.pickupSlotSnapshot ?? {}) as Record<string, unknown>;
                        const win =
                          p.window ||
                          p.slot ||
                          (p.startTime && p.endTime ? `${p.startTime} – ${p.endTime}` : "");
                        return (
                          <div
                            key={o.id}
                            className="rounded-xl border border-border p-2.5 bg-card hover:shadow-card transition"
                          >
                            <div className="text-[11px] font-mono text-muted-foreground truncate">
                              {o.id.slice(0, 10)}…
                            </div>
                            <div className="text-xs font-medium truncate mt-0.5">
                              {String(addr.name ?? "—")}
                            </div>
                            {win ? (
                              <div className="text-[11px] text-muted-foreground">{String(win)}</div>
                            ) : null}
                            <div className="flex items-center justify-between mt-1.5 gap-1">
                              <Badge
                                variant="outline"
                                className={`${statusColor(o.status || "")} rounded-full text-[10px] px-1.5 py-0`}
                              >
                                {o.status || "—"}
                              </Badge>
                              <span className="text-[11px] font-semibold">
                                {formatINR(o.finalAmountMinor, o.currency)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

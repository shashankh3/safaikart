import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getDb } from "@/lib/firebase";
import { formatDate, toDate, statusColor } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrdersStream } from "@/hooks/useOrdersStream";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Printer, MapPin, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/route-sheet")({
  ssr: false,
  component: RouteSheetPage,
});

type Order = {
  id: string;
  status?: string;
  addressSnapshot?: Record<string, unknown>;
  pickupSlotSnapshot?: Record<string, unknown>;
};

const PICKUP_STATUSES = ["CONFIRMED", "PICKUP_SCHEDULED"];
const DELIVERY_STATUSES = ["READY_FOR_DELIVERY", "OUT_FOR_DELIVERY"];

function dayKey(d: Date | null): string {
  if (!d) return "";
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function RouteSheetPage() {
  const { orders: rawOrdersRaw, loading } = useOrdersStream({ limitCount: 500 });
  const orders = loading ? null : rawOrdersRaw;
  const [day, setDay] = useState<string>(() => dayKey(new Date()));
  const [mode, setMode] = useState<"pickup" | "delivery">("pickup");

  const filtered = useMemo(() => {
    const allow = mode === "pickup" ? PICKUP_STATUSES : DELIVERY_STATUSES;
    return (orders ?? []).filter((o) => {
      if (!allow.includes(o.status || "")) return false;
      const p = (o.pickupSlotSnapshot ?? {}) as Record<string, unknown>;
      const d = toDate(p.date ?? p.startAt ?? p.start);
      return dayKey(d) === day;
    });
  }, [orders, day, mode]);

  const byPincode = useMemo(() => {
    const map = new Map<string, Order[]>();
    filtered.forEach((o) => {
      const addr = (o.addressSnapshot ?? {}) as Record<string, unknown>;
      const pin = String(addr.pincode ?? addr.postalCode ?? "—");
      const list = map.get(pin) ?? [];
      list.push(o);
      map.set(pin, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const nextDays = useMemo(() => {
    const arr: string[] = [];
    for (let i = -1; i <= 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push(dayKey(d));
    }
    return arr;
  }, []);

  const isLoading = orders === null;

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl shadow-card border-border/70 print:hidden">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
          <Select value={mode} onValueChange={(v) => setMode(v as "pickup" | "delivery")}>
            <SelectTrigger className="h-11 w-full md:w-48 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pickup">Pickup route</SelectItem>
              <SelectItem value="delivery">Delivery route</SelectItem>
            </SelectContent>
          </Select>
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger className="h-11 w-full md:w-56 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {nextDays.map((k) => {
                const d = new Date(k);
                return (
                  <SelectItem key={k} value={k}>
                    {d.toLocaleDateString("en-IN", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <div className="md:ml-auto flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {filtered.length} stops · {byPincode.length} pincodes
            </div>
            <Button
              onClick={() => window.print()}
              className="h-11 rounded-xl bg-brand hover:bg-brand-dark text-white gap-2"
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="print:block">
        <div className="hidden print:block mb-4">
          <h1 className="text-2xl font-bold">
            SafaiKart · {mode === "pickup" ? "Pickup" : "Delivery"} Route
          </h1>
          <p className="text-sm text-gray-600">
            {new Date(day).toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {isLoading ? (
          <div className="p-16 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
          </div>
        ) : byPincode.length === 0 ? (
          <Card className="rounded-2xl shadow-card">
            <CardContent className="p-16 text-center text-muted-foreground">
              No {mode}s scheduled for this day.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {byPincode.map(([pin, list]) => (
              <Card
                key={pin}
                className="rounded-2xl shadow-card border-border/70 print:shadow-none print:border-gray-300 break-inside-avoid"
              >
                <CardContent className="p-0">
                  <div className="px-5 py-3 bg-brand text-white flex items-center gap-2 rounded-t-2xl print:bg-gray-200 print:text-black">
                    <MapPin className="h-4 w-4 text-gold print:text-black" />
                    <div className="font-semibold">Pincode {pin}</div>
                    <div className="ml-auto text-xs bg-white/10 rounded-full px-2 py-0.5 print:bg-transparent">
                      {list.length} stop{list.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-muted-foreground print:bg-gray-100">
                      <tr>
                        <th className="text-left px-5 py-2 font-medium w-10">#</th>
                        <th className="text-left px-5 py-2 font-medium">Customer</th>
                        <th className="text-left px-5 py-2 font-medium">Address</th>
                        <th className="text-left px-5 py-2 font-medium">Slot</th>
                        <th className="text-left px-5 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((o, i) => {
                        const addr = (o.addressSnapshot ?? {}) as Record<string, unknown>;
                        const p = (o.pickupSlotSnapshot ?? {}) as Record<string, unknown>;
                        const win =
                          p.window ||
                          p.slot ||
                          (p.startTime && p.endTime ? `${p.startTime} – ${p.endTime}` : "—");
                        const addressLine = [addr.line1, addr.line2, addr.city]
                          .filter(Boolean)
                          .join(", ");
                        return (
                          <tr key={o.id} className="border-t border-border">
                            <td className="px-5 py-3 font-medium">{i + 1}</td>
                            <td className="px-5 py-3">
                              <div className="font-medium">{String(addr.name ?? "—")}</div>
                              <div className="text-xs text-muted-foreground">
                                {String(addr.phone ?? "")}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-muted-foreground">
                              {addressLine || "—"}
                              {addr.landmark ? (
                                <div className="text-xs">Landmark: {String(addr.landmark)}</div>
                              ) : null}
                            </td>
                            <td className="px-5 py-3 whitespace-nowrap">{String(win)}</td>
                            <td className="px-5 py-3">
                              <Badge
                                variant="outline"
                                className={`${statusColor(o.status || "")} rounded-full text-[10px]`}
                              >
                                {o.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

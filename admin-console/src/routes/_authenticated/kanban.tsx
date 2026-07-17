import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { adminUpdateOrderStatus } from "@/lib/admin-callables";
import { formatDate, formatINR, statusColor } from "@/lib/format";
import { Loader2, GripVertical, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/kanban")({
  ssr: false,
  component: KanbanPage,
});

const COLUMNS: { key: string; label: string; hint?: string }[] = [
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PICKUP_SCHEDULED", label: "Pickup scheduled" },
  { key: "PICKED_UP", label: "Picked up" },
  { key: "CLEANING_IN_PROGRESS", label: "Cleaning" },
  { key: "READY_FOR_DELIVERY", label: "Ready" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

type Order = {
  id: string;
  status?: string;
  finalAmountMinor?: number;
  currency?: string;
  createdAt?: unknown;
  userId?: string;
  items?: unknown[];
};

function KanbanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const db = getDb();
    const q = query(
      collection(db, "orders"),
      where("status", "in", COLUMNS.map((c) => c.key)),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Order,
        );
        setOrders(rows);
        setLoading(false);
      },
      (err) => {
        toast.error(err.message || "Realtime feed failed");
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const byStatus = useMemo(() => {
    const map: Record<string, Order[]> = {};
    for (const c of COLUMNS) map[c.key] = [];
    for (const o of orders) {
      if (o.status && map[o.status]) map[o.status].push(o);
    }
    return map;
  }, [orders]);

  async function move(id: string, toStatus: string) {
    const current = orders.find((o) => o.id === id);
    if (!current || current.status === toStatus) return;
    setSavingId(id);
    try {
      // Route via callable — Firestore rules block direct order writes.
      await adminUpdateOrderStatus(id, toStatus);
      const { logOrderChange } = await import("@/lib/audit");
      void logOrderChange(id, "moved on kanban", { from: current.status, to: toStatus });
      toast.success(`Moved to ${toStatus.replaceAll("_", " ")}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Live Operations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Realtime pipeline · Drag cards across columns to update status.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Live
        </div>
      </div>

      {loading ? (
        <div className="p-16 grid place-items-center text-muted-foreground">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Connecting to live feed…
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 md:-mx-8 px-4 md:px-8 pb-4">
          <div className="flex gap-4 min-w-max">
            {COLUMNS.map((col) => {
              const list = byStatus[col.key] || [];
              const isOver = dragOver === col.key;
              return (
                <div
                  key={col.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(col.key);
                  }}
                  onDragLeave={() => setDragOver((v) => (v === col.key ? null : v))}
                  onDrop={() => {
                    setDragOver(null);
                    if (dragId) move(dragId, col.key);
                    setDragId(null);
                  }}
                  className={`w-80 shrink-0 rounded-2xl border transition-colors ${
                    isOver
                      ? "border-brand bg-brand/5"
                      : "border-border/70 bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${statusColor(col.key).split(" ")[0].replace("bg-", "bg-")}`}
                        aria-hidden
                      />
                      <span className="text-sm font-semibold">{col.label}</span>
                    </div>
                    <Badge variant="outline" className="rounded-full text-xs">
                      {list.length}
                    </Badge>
                  </div>

                  <div className="p-3 space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto">
                    {list.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-8">
                        No orders
                      </div>
                    ) : (
                      list.map((o) => (
                        <Card
                          key={o.id}
                          draggable
                          onDragStart={() => setDragId(o.id)}
                          onDragEnd={() => setDragId(null)}
                          className={`p-3 rounded-xl border-border/70 bg-card cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition ${
                            dragId === o.id ? "opacity-50" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-mono text-[11px] text-muted-foreground truncate">
                                {o.id.slice(0, 10)}…
                              </div>
                              <div className="mt-1 text-sm font-semibold">
                                {formatINR(o.finalAmountMinor, o.currency)}
                              </div>
                            </div>
                            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{o.items?.length ?? 0} items</span>
                            <span className="truncate ml-2">{formatDate(o.createdAt)}</span>
                          </div>
                          {savingId === o.id && (
                            <div className="mt-2 text-[11px] inline-flex items-center gap-1 text-brand">
                              <RefreshCw className="h-3 w-3 animate-spin" /> Saving…
                            </div>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

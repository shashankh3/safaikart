import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatINR, toDate } from "@/lib/format";
import { Loader2, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { logOrderChange } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/reattempts")({
  ssr: false,
  component: ReattemptsPage,
});

type Attempt = { at?: unknown; reason?: string; nextSlot?: string; byUid?: string };
type Order = {
  id: string;
  status?: string;
  userId?: string;
  finalAmountMinor?: number;
  addressSnapshot?: Record<string, unknown>;
  createdAt?: unknown;
  attempts?: Attempt[];
  lastFailureReason?: string;
  driverName?: string;
};

const REASONS = [
  "Customer not available",
  "Wrong address",
  "Refused by customer",
  "Payment issue",
  "Rain / weather",
  "Vehicle breakdown",
  "Other",
] as const;

const schema = z.object({
  reason: z.string().min(1).max(120),
  nextSlot: z.string().max(64).optional(),
});

function ReattemptsPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [target, setTarget] = useState<Order | null>(null);
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [nextSlot, setNextSlot] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(
      query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(500)),
      (snap) =>
        setOrders(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Order),
        ),
    );
    return unsub;
  }, []);

  const buckets = useMemo(() => {
    if (!orders) return { active: [], failed: [], resolved: [] };
    const active: Order[] = [];
    const failed: Order[] = [];
    const resolved: Order[] = [];
    for (const o of orders) {
      const attempts = (o.attempts || []).length;
      if (o.status === "DELIVERED" && attempts > 0) resolved.push(o);
      else if (attempts > 0) failed.push(o);
      else if (
        o.status &&
        !["DELIVERED", "CANCELLED", "REFUNDED"].includes(o.status)
      )
        active.push(o);
    }
    return { active, failed, resolved };
  }, [orders]);

  async function markFailed() {
    if (!target) return;
    const finalReason = reason === "Other" ? customReason.trim() : reason;
    const parsed = schema.safeParse({ reason: finalReason, nextSlot: nextSlot || undefined });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid input");
      return;
    }
    setSaving(true);
    try {
      const { adminUpdateOrderStatus } = await import("@/lib/admin-callables");
      // Route via callable — server owns status write + attempt log.
      await adminUpdateOrderStatus(target.id, "REATTEMPT", {
        lastFailureReason: parsed.data.reason,
        attempt: {
          at: new Date().toISOString(),
          reason: parsed.data.reason,
          nextSlot: parsed.data.nextSlot ?? null,
        },
      });
      await logOrderChange(target.id, "delivery_failed", {
        reason: parsed.data.reason,
        nextSlot: parsed.data.nextSlot ?? null,
      });
      toast.success("Marked for re-attempt");
      setTarget(null);
      setReason(REASONS[0]);
      setCustomReason("");
      setNextSlot("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (!orders) {
    return (
      <div className="p-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading orders…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Active"
          value={buckets.active.length}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="Awaiting re-attempt"
          value={buckets.failed.length}
          icon={<RotateCcw className="h-4 w-4" />}
          highlight
        />
        <StatCard
          label="Resolved with re-attempt"
          value={buckets.resolved.length}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <Section title="Awaiting re-attempt" orders={buckets.failed} onSelect={setTarget} showAttempts />
      <Section title="Active orders" orders={buckets.active} onSelect={setTarget} />

      <Dialog open={!!target} onOpenChange={(v) => !v && setTarget(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Mark delivery failed</DialogTitle>
          </DialogHeader>
          {target && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground font-mono">
                Order {target.id.slice(0, 16)}…
              </div>
              <div>
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="h-11 rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {reason === "Other" && (
                <div>
                  <Label>Custom reason</Label>
                  <Input
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    maxLength={120}
                    className="h-11 rounded-xl mt-1"
                  />
                </div>
              )}
              <div>
                <Label>Reschedule slot (optional)</Label>
                <Input
                  value={nextSlot}
                  onChange={(e) => setNextSlot(e.target.value)}
                  placeholder="e.g. Tomorrow 10am-12pm"
                  maxLength={64}
                  className="h-11 rounded-xl mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={markFailed}
              disabled={saving}
              className="rounded-xl bg-brand hover:bg-brand-dark text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log failure"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`rounded-2xl shadow-card border-border/70 ${
        highlight ? "bg-brand text-white" : ""
      }`}
    >
      <CardContent className="p-5">
        <div
          className={`text-xs uppercase tracking-wider font-semibold flex items-center gap-2 ${
            highlight ? "text-gold" : "text-muted-foreground"
          }`}
        >
          {icon} {label}
        </div>
        <div className="text-3xl font-bold mt-2">{value}</div>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  orders,
  onSelect,
  showAttempts,
}: {
  title: string;
  orders: Order[];
  onSelect: (o: Order) => void;
  showAttempts?: boolean;
}) {
  return (
    <Card className="rounded-2xl shadow-card border-border/70 overflow-hidden">
      <CardContent className="p-0">
        <div className="p-5 border-b border-border">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{orders.length} orders</div>
        </div>
        {orders.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Nothing here.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Order</th>
                  <th className="text-left px-5 py-3 font-medium">Address</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Amount</th>
                  {showAttempts && (
                    <th className="text-left px-5 py-3 font-medium">Last failure</th>
                  )}
                  <th className="text-right px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 100).map((o) => {
                  const addr = (o.addressSnapshot || {}) as Record<string, unknown>;
                  const attempts = o.attempts || [];
                  const last = attempts[attempts.length - 1];
                  return (
                    <tr key={o.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <div className="font-mono text-xs">{o.id.slice(0, 14)}…</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(o.createdAt)}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {String(addr.line1 || addr.city || "—")}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className="rounded-full">
                          {o.status || "—"}
                        </Badge>
                        {attempts.length > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {attempts.length} attempt{attempts.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {formatINR(o.finalAmountMinor)}
                      </td>
                      {showAttempts && (
                        <td className="px-5 py-3 text-xs">
                          <div className="font-medium">{last?.reason || o.lastFailureReason || "—"}</div>
                          {last?.nextSlot && (
                            <div className="text-muted-foreground">→ {last.nextSlot}</div>
                          )}
                        </td>
                      )}
                      <td className="px-5 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelect(o)}
                          className="rounded-lg gap-1"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Log failure
                        </Button>
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

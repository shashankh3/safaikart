import { useEffect, useMemo, useRef, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Bell, ShoppingBag, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatINR } from "@/lib/format";
import { useNavigate } from "@tanstack/react-router";

type Notif = {
  id: string;
  kind: "order" | "payment";
  title: string;
  subtitle: string;
  at: Date | null;
  amountMinor?: number;
};
import { useAuth } from "@/context/auth-context";
import { hasPermission } from "@/lib/rbac";

export function NotificationsBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const seenOrders = useRef<Set<string> | null>(null);
  const seenPayments = useRef<Set<string> | null>(null);
  const navigate = useNavigate();

  const { admin } = useAuth();
  const sessionStart = useMemo(() => new Date(), []);

  useEffect(() => {
    if (!admin || !hasPermission(admin.role, "orders.update")) return;

    const db = getDb();
    const qOrders = query(
      collection(db, "orders"),
      where("createdAt", ">=", sessionStart),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub1 = onSnapshot(qOrders, (snap) => {
      const list: Notif[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const created = (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? null;
        return {
          id: `o:${d.id}`,
          kind: "order",
          title: "New order",
          subtitle: `${d.id.slice(0, 10)}… · ${formatINR(data.finalAmountMinor as number, data.currency as string)}`,
          at: created,
          amountMinor: data.finalAmountMinor as number | undefined,
        };
      });
      if (seenOrders.current) {
        const added = list.filter((n) => !seenOrders.current!.has(n.id));
        if (added.length) setUnread((u) => u + added.length);
      }
      seenOrders.current = new Set(list.map((n) => n.id));
      setItems((prev) => merge(prev, list));
    });

    let unsub2: (() => void) | undefined;
    try {
      const qPay = query(
        collection(db, "payments"),
        where("status", "==", "FAILED"),
        where("createdAt", ">=", sessionStart),
        orderBy("createdAt", "desc"),
        limit(20),
      );
      unsub2 = onSnapshot(
        qPay,
        (snap) => {
          const list: Notif[] = snap.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            const created =
              (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? null;
            return {
              id: `p:${d.id}`,
              kind: "payment",
              title: "Payment failed",
              subtitle: `Order ${String(data.orderId || "").slice(0, 10)}…`,
              at: created,
            };
          });
          if (seenPayments.current) {
            const added = list.filter((n) => !seenPayments.current!.has(n.id));
            if (added.length) setUnread((u) => u + added.length);
          }
          seenPayments.current = new Set(list.map((n) => n.id));
          setItems((prev) => merge(prev, list));
        },
        () => {
          // payments collection may be missing an index or blocked by rules — degrade silently
          unsub2?.();
          unsub2 = undefined;
        },
      );
    } catch {
      // payments collection may not be indexed
    }

    return () => {
      unsub1();
      unsub2?.();
    };
  }, [admin, sessionStart]);

  if (!admin || !hasPermission(admin.role, "orders.update")) return null;

  return (
    <DropdownMenu onOpenChange={(o) => o && setUnread(0)}>
      <DropdownMenuTrigger asChild>
        <button className="relative rounded-full h-9 w-9 grid place-items-center bg-card border border-border hover:shadow-card transition">
          <Bell className="h-4 w-4 text-foreground" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            You're all caught up.
          </div>
        ) : (
          items.slice(0, 15).map((n) => (
            <button
              key={n.id}
              onClick={() =>
                navigate({ to: n.kind === "payment" ? "/orders" : "/orders" })
              }
              className="w-full text-left px-3 py-2.5 hover:bg-muted/60 flex items-start gap-3 border-b border-border last:border-0"
            >
              <div
                className={`h-8 w-8 shrink-0 rounded-full grid place-items-center ${
                  n.kind === "payment"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-brand/10 text-brand"
                }`}
              >
                {n.kind === "payment" ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <ShoppingBag className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium flex items-center gap-2">
                  {n.title}
                  {n.kind === "payment" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] rounded-full bg-rose-50 text-rose-700 border-rose-200"
                    >
                      failed
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">{n.subtitle}</div>
                {n.at && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDate(n.at)}
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function merge(prev: Notif[], next: Notif[]): Notif[] {
  const map = new Map<string, Notif>();
  [...prev, ...next].forEach((n) => map.set(n.id, n));
  return Array.from(map.values()).sort(
    (a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0),
  );
}

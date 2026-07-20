import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Settings,
  Contact,
  Kanban,
  CalendarDays,
  Map,
  Ticket,
  ShieldCheck,
  History,
  LogOut,
  Search,
  Bike,
  BarChart3,
  Megaphone,
  Star,
  Gift,
  MapPinned,
  Wallet,
  AlertTriangle,
  ImageIcon,
  Wrench,
  Zap,
  QrCode,
  Receipt,
  Sparkles,
  MessageSquare,
  Trophy,
  RotateCcw,
  Upload,
  Flame,
  UserCircle,
  Phone,
} from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { formatINR } from "@/lib/format";

type OrderHit = {
  id: string;
  userId?: string;
  finalAmountMinor?: number;
  status?: string;
  addressSnapshot?: Record<string, unknown>;
};
type UserHit = { id: string; name?: string; email?: string; phoneNumber?: string };
type DriverHit = { id: string; name?: string; phone?: string };

type NavRoute = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
};

const ROUTES: NavRoute[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "gd" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, hint: "ga" },
  { to: "/heatmap", label: "Heatmap & Funnel", icon: Flame },
  { to: "/orders", label: "Orders", icon: ShoppingBag, hint: "go" },
  { to: "/reattempts", label: "Re-attempts", icon: RotateCcw },
  { to: "/sla-breach", label: "SLA Breach", icon: Zap },
  { to: "/labels", label: "QR Labels", icon: QrCode },
  { to: "/kanban", label: "Live Operations", icon: Kanban, hint: "gk" },
  { to: "/scheduler", label: "Scheduler", icon: CalendarDays },
  { to: "/route-sheet", label: "Route Sheet", icon: Map },
  { to: "/drivers", label: "Runners", icon: Bike },
  { to: "/scorecards", label: "Rider Scorecards", icon: Trophy },
  { to: "/settlement", label: "Settlement", icon: Wallet },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/crm", label: "CRM", icon: Contact, hint: "gc" },
  { to: "/inbox", label: "Inbox", icon: MessageSquare },
  { to: "/broadcasts", label: "Broadcasts", icon: Megaphone },
  { to: "/winback", label: "Win-back", icon: Sparkles },
  { to: "/feedback", label: "Feedback & NPS", icon: Star },
  { to: "/referrals", label: "Referrals", icon: Gift },
  { to: "/coupons", label: "Coupons", icon: Ticket },
  { to: "/complaints", label: "Complaints", icon: AlertTriangle },
  { to: "/catalog", label: "Catalog", icon: Package },
  { to: "/imports", label: "CSV Import", icon: Upload },
  { to: "/zones", label: "Zones & Surge", icon: MapPinned },
  { to: "/banners", label: "Banners", icon: ImageIcon },
  { to: "/users", label: "Users", icon: Users },
  { to: "/admins", label: "Admins", icon: ShieldCheck },
  { to: "/audit", label: "Audit Log", icon: History },
  { to: "/app-config", label: "App Config", icon: Wrench },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const isField =
        t &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      // Vim-style "g X" quick nav
      if (!isField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === "g") {
          (window as unknown as { __gPress?: number }).__gPress = Date.now();
          return;
        }
        const gt = (window as unknown as { __gPress?: number }).__gPress;
        if (gt && Date.now() - gt < 900) {
          const match = ROUTES.find((r) => r.hint === `g${e.key.toLowerCase()}`);
          if (match) {
            e.preventDefault();
            (window as unknown as { __gPress?: number }).__gPress = undefined;
            navigate({ to: match.to });
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const { data: searchData } = useQuery({
    queryKey: ["command-palette-data"],
    queryFn: async () => {
      const db = getDb();
      const [oSnap, uSnap, dSnap] = await Promise.all([
        getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(200))),
        getDocs(query(collection(db, "profiles"), limit(500))),
        getDocs(query(collection(db, "drivers"), limit(200))),
      ]);
      return {
        orders: oSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as OrderHit[],
        users: uSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as UserHit[],
        drivers: dSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as DriverHit[],
      };
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const orders = searchData?.orders || [];
  const users = searchData?.users || [];
  const drivers = searchData?.drivers || [];

  const query_ = debouncedQ.trim().toLowerCase();
  const orderHits = useMemo(() => {
    if (!query_) return orders.slice(0, 8);
    return orders
      .filter((o) => {
        const addr = (o.addressSnapshot || {}) as Record<string, unknown>;
        return (
          o.id.toLowerCase().includes(query_) ||
          (o.userId || "").toLowerCase().includes(query_) ||
          String(addr.phone || "").toLowerCase().includes(query_) ||
          String(addr.city || "").toLowerCase().includes(query_) ||
          String(addr.line1 || "").toLowerCase().includes(query_)
        );
      })
      .slice(0, 8);
  }, [orders, query_]);

  const userHits = useMemo(() => {
    if (!query_) return [];
    return users
      .filter(
        (u) =>
          (u.name || "").toLowerCase().includes(query_) ||
          (u.email || "").toLowerCase().includes(query_) ||
          (u.phoneNumber || "").toLowerCase().includes(query_),
      )
      .slice(0, 6);
  }, [users, query_]);

  const driverHits = useMemo(() => {
    if (!query_) return [];
    return drivers
      .filter(
        (d) =>
          (d.name || "").toLowerCase().includes(query_) ||
          (d.phone || "").toLowerCase().includes(query_),
      )
      .slice(0, 6);
  }, [drivers, query_]);

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={q}
        onValueChange={setQ}
        placeholder="Search orders, customers, drivers, pages…"
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {ROUTES.map((r) => {
            const Icon = r.icon;
            return (
              <CommandItem key={r.to} onSelect={() => go(r.to)}>
                <Icon className="mr-2 h-4 w-4" /> {r.label}
                {r.hint && (
                  <span className="ml-auto text-[10px] text-muted-foreground uppercase">
                    {r.hint}
                  </span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        {orderHits.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={query_ ? "Orders matching search" : "Recent orders"}>
              {orderHits.map((o) => {
                const addr = (o.addressSnapshot || {}) as Record<string, unknown>;
                return (
                  <CommandItem
                    key={o.id}
                    value={`order-${o.id}-${o.userId ?? ""}-${addr.phone ?? ""}-${addr.city ?? ""}`}
                    onSelect={() => go("/orders")}
                  >
                    <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-xs">{o.id.slice(0, 12)}…</span>
                    <span className="ml-3 text-xs text-muted-foreground truncate">
                      {String(addr.phone || addr.city || "")}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {o.status} · {formatINR(o.finalAmountMinor)}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {userHits.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Customers">
              {userHits.map((u) => (
                <CommandItem
                  key={u.id}
                  value={`user-${u.name ?? ""}-${u.phoneNumber ?? ""}-${u.email ?? ""}`}
                  onSelect={() => go("/crm")}
                >
                  <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{u.name || "—"}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {u.phoneNumber || u.email || ""}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {driverHits.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Runners">
              {driverHits.map((d) => (
                <CommandItem
                  key={d.id}
                  value={`driver-${d.name ?? ""}-${d.phone ?? ""}`}
                  onSelect={() => go("/drivers")}
                >
                  <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{d.name || "—"}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{d.phone || ""}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={async () => {
              setOpen(false);
              await logout();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

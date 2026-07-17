import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Settings,
  Contact,
  Kanban,
  CalendarDays,
  Map,
  Ticket,
  ShieldCheck,
  History,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessRoute } from "@/lib/rbac";
import { useAuth } from "@/context/auth-context";
import logoAsset from "@/assets/safaikart-logo.jpeg.asset.json";

const NAV_GROUPS: Array<{
  label: string;
  items: ReadonlyArray<{ to: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/kanban", label: "Live Ops", icon: Kanban },
      { to: "/orders", label: "Orders", icon: ShoppingBag },
      { to: "/reattempts", label: "Re-attempts", icon: RotateCcw },
      { to: "/sla-breach", label: "SLA Breach", icon: Zap },
      { to: "/labels", label: "QR Labels", icon: QrCode },
      { to: "/scheduler", label: "Scheduler", icon: CalendarDays },
      { to: "/route-sheet", label: "Route Sheet", icon: Map },
      { to: "/drivers", label: "Runners", icon: Bike },
      { to: "/scorecards", label: "Rider Scorecards", icon: Trophy },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/settlement", label: "Settlement", icon: Wallet },
      { to: "/expenses", label: "Expenses", icon: Receipt },
    ],
  },
  {
    label: "Growth",
    items: [
      { to: "/crm", label: "CRM", icon: Contact },
      { to: "/inbox", label: "Inbox", icon: MessageSquare },
      { to: "/broadcasts", label: "Broadcasts", icon: Megaphone },
      { to: "/winback", label: "Win-back", icon: Sparkles },
      { to: "/feedback", label: "Feedback", icon: Star },
      { to: "/referrals", label: "Referrals", icon: Gift },
      { to: "/coupons", label: "Coupons", icon: Ticket },
      { to: "/complaints", label: "Complaints", icon: AlertTriangle },
    ],
  },
  {
    label: "Catalog",
    items: [
      { to: "/catalog", label: "Catalog", icon: Package },
      { to: "/imports", label: "CSV Import", icon: Upload },
      { to: "/zones", label: "Zones & Surge", icon: MapPinned },
      { to: "/banners", label: "Banners", icon: ImageIcon },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/heatmap", label: "Heatmap & Funnel", icon: Flame },
    ],
  },
  {
    label: "Team",
    items: [
      { to: "/users", label: "Users", icon: Users },
      { to: "/admins", label: "Admins", icon: ShieldCheck },
      { to: "/audit", label: "Audit Log", icon: History },
      { to: "/app-config", label: "App Config", icon: Wrench },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];


export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { admin } = useAuth();
  const role = admin?.role;
  const groups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => canAccessRoute(role, i.to)) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-sidebar text-sidebar-foreground min-h-screen sticky top-0">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
        <div className="h-14 w-14 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-elevated shrink-0">
          <img src={logoAsset.url} alt="SafaiKart" className="h-full w-full object-cover" />
        </div>
        <div>
          <div className="text-base font-semibold tracking-tight text-white">SafaiKart</div>
          <div className="text-xs text-sidebar-foreground/70">Admin Console</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-1.5 text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/50">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map(({ to, label, icon: Icon }) => {
                const active = pathname === to || pathname.startsWith(to + "/");
                return (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                      "hover:bg-sidebar-accent/70",
                      active
                        ? "bg-sidebar-accent text-white shadow-inner ring-1 ring-white/5"
                        : "text-sidebar-foreground/85",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-gold" : "text-sidebar-foreground/70",
                      )}
                    />
                    <span>{label}</span>
                    {active && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-gold" aria-hidden />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="rounded-xl bg-sidebar-accent/60 p-3">
          <div className="text-xs uppercase tracking-wider text-gold font-semibold">Region</div>
          <div className="text-sm text-white mt-1">asia-south1</div>
        </div>
      </div>
    </aside>
  );
}

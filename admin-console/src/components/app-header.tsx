import { useState } from "react";
import { LogOut, ChevronDown, Search } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationsBell } from "@/components/notifications-bell";


const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/analytics": "Analytics",
  "/kanban": "Live Operations",
  "/orders": "Orders",
  "/scheduler": "Scheduler",
  "/route-sheet": "Route Sheet",
  "/drivers": "Runners & Drivers",
  "/crm": "CRM",
  "/broadcasts": "Broadcasts",
  "/feedback": "Feedback & NPS",
  "/referrals": "Referrals",
  "/catalog": "Catalog",
  "/zones": "Zones & Surge Pricing",
  "/coupons": "Coupons",
  "/users": "Users",
  "/admins": "Admins",
  "/audit": "Audit Log",
  "/settings": "Settings",
};


function dispatchCmdK() {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
  );
}

export function AppHeader() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [loggingOut, setLoggingOut] = useState(false);

  const title =
    Object.entries(TITLES).find(([k]) => pathname === k || pathname.startsWith(k + "/"))?.[1] ??
    "Admin";

  const initials =
    (admin?.name || admin?.email || "A")
      .split(/[\s@]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "A";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate({ to: "/login", replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="h-16 sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
      <div className="h-full px-4 md:px-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-foreground tracking-tight">
            {title}
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Welcome back{admin?.name ? `, ${admin.name}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={dispatchCmdK}
            className="hidden md:inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:shadow-card transition"
          >
            <Search className="h-3.5 w-3.5" /> Quick search
            <kbd className="ml-2 px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">⌘K</kbd>
          </button>

          

          <NotificationsBell />

          <DropdownMenu>

            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full bg-card border border-border pl-1 pr-3 py-1 hover:shadow-card transition-shadow">
                <Avatar className="h-8 w-8">
                  {admin?.photoURL ? <AvatarImage src={admin.photoURL} alt={admin.name} /> : null}
                  <AvatarFallback className="bg-brand text-gold text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium text-foreground">
                  {admin?.name || "Admin"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{admin?.name || "Admin"}</div>
              <div className="text-xs text-muted-foreground truncate">{admin?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} disabled={loggingOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {loggingOut ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export { Button };

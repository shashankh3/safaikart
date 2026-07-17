import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { CommandPalette } from "@/components/command-palette";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { canAccessRoute } from "@/lib/rbac";
import { Loader2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user, admin, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking your session…
        </div>
      </div>
    );
  }

  const allowed = admin ? canAccessRoute(admin.role, pathname) : false;

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">
          {allowed ? (
            <Outlet />
          ) : (
            <div className="max-w-md mx-auto mt-16 rounded-2xl border border-border/70 bg-card p-8 text-center shadow-card">
              <ShieldAlert className="h-10 w-10 mx-auto text-rose-500" />
              <div className="mt-3 text-lg font-semibold">Access denied</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Your role (<span className="font-mono">{admin?.role}</span>) doesn't have access
                to this page. Ask a Super Admin if you need it.
              </div>
            </div>
          )}
        </main>
      </div>
      <CommandPalette />
      <KeyboardShortcuts />
    </div>
  );
}

import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_customer")({
  ssr: false,
  component: CustomerLayout,
});

function CustomerLayout() {
  const { user, loading, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login", replace: true });
    else if (role === "admin") navigate({ to: "/dashboard", replace: true });
  }, [user, role, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-white">
        <div className="flex items-center gap-2 text-brand/60 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-brand">
      <SiteHeader />
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}

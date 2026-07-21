import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { CommandPalette } from "@/components/command-palette";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { canAccessRoute } from "@/lib/rbac";
import { Loader2, ShieldAlert } from "lucide-react";
import { getFirebaseAuth, getDb } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// Helper for beforeLoad to resolve current session state
async function resolveAuthSession() {
  const auth = getFirebaseAuth();
  await auth.authStateReady(); // Wait for initial auth state
  
  const user = auth.currentUser;
  if (!user) return { user: null, role: null };

  const db = getDb();
  try {
    const adminSnap = await getDoc(doc(db, "adminUsers", user.uid));
    if (adminSnap.exists()) {
      return { user, role: adminSnap.data().role };
    }
  } catch (e: any) {
    // If it's a permission-denied, they definitely aren't an admin.
    if (e.code !== 'permission-denied') {
      console.warn("Failed to read adminUsers:", e);
    }
  }
  
  return { user, role: "customer" };
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const session = await resolveAuthSession();
    
    if (!session.user) {
      throw redirect({
        to: "/login",
        replace: true,
      });
    }

    if (session.role === "customer") {
      // Customers belong in the app, not the admin console
      throw redirect({
        to: "/login", // or a specific unauthorized page
        replace: true,
      });
    }

    // Role-based Access Control (RBAC) at the route level
    if (!canAccessRoute(session.role, location.pathname)) {
      throw redirect({
        to: "/unauthorized", 
        replace: true,
      });
    }
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  // We can still use the context for UI state (e.g. displaying name in header)
  const { user, admin, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading console…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <KeyboardShortcuts />
    </div>
  );
}

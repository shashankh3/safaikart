import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider, useCart } from "@/context/cart-context";
import { CartSheet } from "@/components/consumer/cart-sheet";
import { Sparkles, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SafaiKart" },
      {
        name: "description",
        content:
          "SafaiKart premium dry cleaning and laundry services.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function GlobalNavbar() {
  const { user, loading: authLoading } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();
  const location = useLocation();
  const router = useRouter();

  // Hide the global navbar if we are inside the admin dashboard or login screens
  const isAppRoute = location.pathname.startsWith('/dashboard') || location.pathname === '/login';
  
  if (isAppRoute) return null;

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-brand text-gold grid place-items-center shadow-lg shadow-brand/20 group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-brand">SafaiKart</span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link to="/" className="text-sm font-semibold hover:text-brand transition-colors text-muted-foreground hidden md:block">Services</Link>
          <Link to="/" className="text-sm font-semibold hover:text-brand transition-colors text-muted-foreground hidden md:block">How it Works</Link>
          
          <Button 
            variant="outline" 
            size="icon"
            className="rounded-xl border-border relative bg-white hover:bg-muted"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingCart className="h-4 w-4 text-brand" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-gold text-brand text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center animate-in zoom-in">
                {itemCount}
              </span>
            )}
          </Button>

          {!authLoading && user ? (
            <Link to="/dashboard">
              <Button variant="outline" className="hidden sm:flex rounded-xl border-brand text-brand hover:bg-brand hover:text-gold shadow-sm">
                Admin Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button className="rounded-xl bg-brand text-gold hover:opacity-90 shadow-lg shadow-brand/20">Sign In</Button>
            </Link>
          )}
        </nav>
      </div>
    </motion.header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <div className="flex flex-col min-h-screen">
              <GlobalNavbar />
              <div className="flex-1">
                <Outlet />
              </div>
            </div>
            <CartSheet />
            <Toaster richColors position="top-right" />
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

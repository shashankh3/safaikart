import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, User as UserIcon, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function SiteHeader() {
  const { user, role, customer, admin, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate({ to: "/", replace: true });
  }

  const linkClass =
    "relative py-2 md:py-0 text-brand/70 hover:text-brand transition-colors after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:w-0 after:rounded-full after:bg-gold after:transition-all after:duration-300 hover:after:w-full";

  const navLinks = (
    <>
      <Link to="/" onClick={() => setMenuOpen(false)} className={linkClass}>Home</Link>
      <Link to="/services" onClick={() => setMenuOpen(false)} className={linkClass}>Services</Link>
      {role === "customer" && (
        <Link to="/app/orders" onClick={() => setMenuOpen(false)} className={linkClass}>My Orders</Link>
      )}
      <Link to="/app/support" onClick={() => setMenuOpen(false)} className={linkClass}>Support</Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-brand/10 shadow-[0_1px_0_0_rgba(27,59,34,0.03)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <Link to="/" className="group flex min-w-0 items-center gap-2.5">
          <div className="h-9 w-9 shrink-0 rounded-xl overflow-hidden ring-1 ring-brand/15 shadow-sm transition-transform duration-300 group-hover:scale-105">
            <img src="/images/logo.svg" alt="SafaiKart" className="h-full w-full object-cover" />
          </div>
          <div className="font-bold tracking-tight text-brand truncate">SafaiKart</div>
        </Link>

        <nav className="hidden md:flex items-center justify-center gap-7 text-sm font-medium">
          {navLinks}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 justify-self-end">
          <Link
            to="/cart"
            className="relative inline-flex items-center gap-1.5 rounded-xl border border-brand/15 bg-white px-2.5 sm:px-3 py-2 text-brand hover:bg-brand/5 hover:border-brand/30 transition-all text-sm"
            aria-label="Cart"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline font-medium">Cart</span>
            {count > 0 && (
              <span className="ml-0.5 min-w-5 h-5 grid place-items-center rounded-full bg-gradient-to-br from-gold to-gold-deep text-brand text-[10px] font-bold px-1 ring-2 ring-white shadow-sm">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="shrink-0 rounded-full h-9 w-9 grid place-items-center bg-brand text-gold text-sm font-bold ring-1 ring-brand/10 hover:ring-gold/40 transition-all">
                  {(customer?.name || admin?.name || "U").slice(0, 1).toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm">{customer?.name || admin?.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {customer?.email || customer?.phone || admin?.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
                    Admin Console
                  </DropdownMenuItem>
                )}
                {role === "customer" && (
                  <>
                    <DropdownMenuItem onClick={() => navigate({ to: "/app/orders" })}>
                      My Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate({ to: "/app/profile" })}>
                      Profile
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => navigate({ to: "/login" })}
              className="inline-flex items-center justify-center gap-2 h-9 rounded-xl px-3.5 text-sm font-bold text-brand bg-gradient-to-br from-[#F7D45C] via-gold to-gold-deep shadow-[0_10px_26px_-10px_rgba(224,169,46,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-[1.03] active:translate-y-0 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2"
            >
              <UserIcon className="h-4 w-4 sm:mr-0.5" />
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="md:hidden h-9 w-9 grid place-items-center rounded-xl border border-brand/15 text-brand hover:bg-brand/5 transition-colors"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-white">
              <div className="mt-8 flex flex-col text-base font-medium divide-y divide-brand/10">
                {navLinks}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

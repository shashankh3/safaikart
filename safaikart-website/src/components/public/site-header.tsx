import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, User as UserIcon, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/lib/cart";
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

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-brand/10 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-4">
        {/* Brand Logo */}
        <Link to="/" className="group flex min-w-0 items-center gap-2.5">
          <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden ring-1 ring-brand/15 shadow-sm transition-transform duration-300 group-hover:scale-105 bg-[#0C3818] flex items-center justify-center p-0.5">
            <img src="/images/logo.png" alt="SafaiKart" className="h-full w-full object-cover" />
          </div>
          <div className="text-xl font-bold tracking-tight text-[#11381E]">SafaiKart</div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center justify-center gap-8 text-sm font-medium">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="relative py-1 text-brand/70 hover:text-brand transition-colors [&.active]:text-brand [&.active]:font-bold group"
          >
            {({ isActive }) => (
              <div className="relative flex flex-col items-center">
                <span>Home</span>
                {isActive ? (
                  <div className="absolute -bottom-2 flex flex-col items-center">
                    <span className="h-[2px] w-5 bg-gold rounded-full" />
                    <span className="h-1 w-1 rounded-full bg-gold -mt-[0.5px]" />
                  </div>
                ) : (
                  <span className="absolute -bottom-2 h-[2px] w-0 bg-gold rounded-full transition-all duration-200 group-hover:w-4" />
                )}
              </div>
            )}
          </Link>

          <Link
            to="/services"
            className="relative py-1 text-brand/70 hover:text-brand transition-colors [&.active]:text-brand [&.active]:font-bold group"
          >
            {({ isActive }) => (
              <div className="relative flex flex-col items-center">
                <span>Services</span>
                {isActive && (
                  <div className="absolute -bottom-2 flex flex-col items-center">
                    <span className="h-[2px] w-5 bg-gold rounded-full" />
                    <span className="h-1 w-1 rounded-full bg-gold -mt-[0.5px]" />
                  </div>
                )}
              </div>
            )}
          </Link>

          {role === "customer" && (
            <Link
              to="/app/orders"
              className="relative py-1 text-brand/70 hover:text-brand transition-colors [&.active]:text-brand [&.active]:font-bold group"
            >
              {({ isActive }) => (
                <div className="relative flex flex-col items-center">
                  <span>My Orders</span>
                  {isActive && (
                    <div className="absolute -bottom-2 flex flex-col items-center">
                      <span className="h-[2px] w-5 bg-gold rounded-full" />
                      <span className="h-1 w-1 rounded-full bg-gold -mt-[0.5px]" />
                    </div>
                  )}
                </div>
              )}
            </Link>
          )}

          <Link
            to="/app/support"
            className="relative py-1 text-brand/70 hover:text-brand transition-colors [&.active]:text-brand [&.active]:font-bold group"
          >
            {({ isActive }) => (
              <div className="relative flex flex-col items-center">
                <span>Support</span>
                {isActive && (
                  <div className="absolute -bottom-2 flex flex-col items-center">
                    <span className="h-[2px] w-5 bg-gold rounded-full" />
                    <span className="h-1 w-1 rounded-full bg-gold -mt-[0.5px]" />
                  </div>
                )}
              </div>
            )}
          </Link>
        </nav>

        {/* Right Actions (Cart & Sign In) */}
        <div className="flex items-center gap-2 sm:gap-3 justify-self-end">
          <Link
            to="/cart"
            className="relative inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 sm:px-4 py-1.5 text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all text-sm font-medium shadow-xs"
            aria-label="Cart"
          >
            <ShoppingBag className="h-4 w-4 text-brand" />
            <span className="font-medium text-brand">Cart</span>
            <span className="min-w-5 h-5 grid place-items-center rounded-full bg-[#E5A83B] text-brand text-xs font-bold px-1.5 leading-none">
              {count > 0 ? count : 1}
            </span>
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
              className="inline-flex items-center justify-center gap-1.5 h-9 rounded-full px-4 sm:px-5 text-sm font-bold text-brand bg-gradient-to-r from-[#F6D560] via-[#F4C73E] to-[#E3A42C] shadow-[0_4px_12px_rgba(229,168,59,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[.98]"
            >
              <UserIcon className="h-4 w-4" />
              <span>Sign in</span>
            </button>
          )}

          {/* Mobile hamburger */}
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
                <Link to="/" onClick={() => setMenuOpen(false)} className="py-3 text-brand">Home</Link>
                <Link to="/services" onClick={() => setMenuOpen(false)} className="py-3 text-brand">Services</Link>
                {role === "customer" && (
                  <Link to="/app/orders" onClick={() => setMenuOpen(false)} className="py-3 text-brand">My Orders</Link>
                )}
                <Link to="/app/support" onClick={() => setMenuOpen(false)} className="py-3 text-brand">Support</Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

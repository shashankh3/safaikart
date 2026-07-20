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
import logoAsset from "@/assets/safaikart-logo.jpeg.asset.json";

export function SiteHeader() {
  const { user, role, customer, admin, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate({ to: "/", replace: true });
  }

  const navLinks = (
    <>
      <Link to="/" onClick={() => setMenuOpen(false)} className="text-brand/80 hover:text-brand py-2 md:py-0">Home</Link>
      <Link to="/services" onClick={() => setMenuOpen(false)} className="text-brand/80 hover:text-brand py-2 md:py-0">Services</Link>
      {role === "customer" && (
        <Link to="/app/orders" onClick={() => setMenuOpen(false)} className="text-brand/80 hover:text-brand py-2 md:py-0">My Orders</Link>
      )}
      <Link to="/app/support" onClick={() => setMenuOpen(false)} className="text-brand/80 hover:text-brand py-2 md:py-0">Support</Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-brand/10">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <div className="h-9 w-9 shrink-0 rounded-xl overflow-hidden ring-1 ring-brand/20">
            <img src="/images/logo.svg" alt="SafaiKart" className="h-full w-full object-cover" />
          </div>
          <div className="font-semibold text-brand truncate">SafaiKart</div>
        </Link>

        <nav className="hidden md:flex items-center justify-center gap-6 text-sm">
          {navLinks}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 justify-self-end">
          <Link
            to="/cart"
            className="relative inline-flex items-center gap-1 rounded-xl border border-brand/15 bg-white px-2.5 sm:px-3 py-2 text-brand hover:bg-brand/5 text-sm"
            aria-label="Cart"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span className="ml-0.5 sm:ml-1 min-w-5 h-5 grid place-items-center rounded-full bg-brand text-gold text-[10px] font-semibold px-1">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="shrink-0 rounded-full h-9 w-9 grid place-items-center bg-brand text-gold text-sm font-semibold">
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
            <Button
              onClick={() => navigate({ to: "/login" })}
              className="h-9 rounded-xl bg-brand text-gold hover:bg-brand/90 font-semibold px-3"
            >
              <UserIcon className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Sign in</span>
            </Button>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="md:hidden h-9 w-9 grid place-items-center rounded-xl border border-brand/15 text-brand"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-white">
              <div className="mt-8 flex flex-col text-base divide-y divide-brand/10">
                {navLinks}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

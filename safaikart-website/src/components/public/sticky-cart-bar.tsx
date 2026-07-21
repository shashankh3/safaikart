import { Link, useLocation } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";

/**
 * Mobile-only sticky "View cart" bar. Hides on /cart and /checkout to avoid
 * duplication with in-page totals.
 */
export function StickyCartBar() {
  const { count, subtotalMinor } = useCart();
  const { pathname } = useLocation();
  if (count === 0) return null;
  if (pathname.startsWith("/cart") || pathname.startsWith("/checkout")) return null;

  return (
    <div className="md:hidden fixed bottom-3 inset-x-3 z-40">
      <Link
        to="/cart"
        className="flex items-center justify-between rounded-2xl bg-brand text-gold px-4 py-3 shadow-lg shadow-brand/20"
      >
        <div className="flex items-center gap-2 font-semibold">
          <ShoppingBag className="h-4 w-4" />
          <span>{count} item{count === 1 ? "" : "s"}</span>
          <span className="opacity-70 font-normal">·</span>
          <span>{formatINR(subtotalMinor)}</span>
        </div>
        <span className="text-sm font-semibold">View cart →</span>
      </Link>
    </div>
  );
}

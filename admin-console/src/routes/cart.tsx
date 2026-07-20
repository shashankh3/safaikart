import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/cart")({
  ssr: false,
  head: () => ({ meta: [{ title: "Your Cart — SafaiKart" }] }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-brand">
      <SiteHeader />
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Your Cart</h1>

        {cart.items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-brand/20 p-12 text-center">
            <ShoppingBag className="h-10 w-10 mx-auto text-brand/40" />
            <div className="mt-3 text-brand/70">Your cart is empty.</div>
            <Link to="/services">
              <Button className="mt-4 rounded-xl bg-brand text-gold hover:bg-brand/90">Browse services</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border border-brand/10 bg-white divide-y divide-brand/10">
              {cart.items.map((it) => (
                <div
                  key={it.serviceId}
                  className="p-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-3 items-center sm:flex sm:gap-4"
                >
                  <div className="min-w-0 sm:flex-1">
                    <div className="font-medium truncate">{it.name}</div>
                    <div className="text-xs text-brand/60">
                      {formatINR(it.priceMinor)}{it.unit ? ` / ${it.unit}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => cart.remove(it.serviceId)}
                    className="shrink-0 text-brand/50 hover:text-destructive sm:order-last"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-1 rounded-lg border border-brand/15 shrink-0">
                    <button
                      onClick={() => cart.setQty(it.serviceId, it.quantity - 1)}
                      className="h-8 w-8 grid place-items-center text-brand hover:bg-brand/5"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-8 text-center text-sm font-medium">{it.quantity}</div>
                    <button
                      onClick={() => cart.setQty(it.serviceId, it.quantity + 1)}
                      className="h-8 w-8 grid place-items-center text-brand hover:bg-brand/5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-right font-semibold shrink-0 sm:w-24">
                    {formatINR(it.priceMinor * it.quantity)}
                  </div>
                </div>
              ))}
            </div>


            <div className="mt-6 rounded-2xl border border-brand/10 bg-brand/5 p-5">
              <div className="flex items-center justify-between text-lg">
                <span>Subtotal</span>
                <span className="font-bold">{formatINR(cart.subtotalMinor)}</span>
              </div>
              <div className="mt-1 text-xs text-brand/60">
                Final total includes delivery + surge pricing calculated at checkout.
              </div>
              <Button
                onClick={() => navigate({ to: "/checkout" })}
                className="mt-4 w-full h-12 rounded-xl bg-brand text-gold hover:bg-brand/90 font-semibold text-base"
              >
                Proceed to checkout <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

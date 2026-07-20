import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { SERVICE_TYPES } from "@/lib/taxonomy";
import { ArrowRight, ShoppingBag, Plus } from "lucide-react";

export const Route = createFileRoute("/services/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Our Services — SafaiKart" },
      { name: "description", content: "Choose a service — dry cleaning, steam press, wash & fold, shoe care and more. Pickup at your door." },
      { property: "og:title", content: "Our Services — SafaiKart" },
      { property: "og:description", content: "Laundry, dry cleaning, steam press and more. Book pickup in seconds." },
    ],
  }),
  component: ServiceTypesPage,
});

function ServiceTypesPage() {
  const cart = useCart();

  return (
    <div className="min-h-screen bg-white text-brand">
      <SiteHeader />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">What do you need cleaned?</h1>
            <p className="text-brand/60 mt-1 text-sm sm:text-base">Pick a service to see options for men, women and home.</p>
          </div>
          <Link to="/cart" className="shrink-0">
            <Button variant="outline" className="rounded-xl bg-white dark:bg-white border-brand/30 text-brand hover:bg-brand/5 hover:text-brand">
              <ShoppingBag className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">View cart ({cart.count})</span>
              <span className="sm:hidden">{cart.count}</span>
            </Button>
          </Link>
        </div>


        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_TYPES.map((t) => {
            const Icon = t.icon;
            const IMG_MAP: Record<string, string> = {
              "dry-cleaning": "/images/dry_cleaning_suit.png",
              "steam-press": "/images/steam_press.png",
              "laundry": "/images/laundry_basket.png",
              "shoe-care": "/images/shoe_cleaning.png",
              "household": "/images/sofa_cleaning.png",
              "premium": "/images/luxury_care.png",
            };
            const bgImage = IMG_MAP[t.key] || "/images/laundry_basket.png";

            return (
              <Link
                key={t.key}
                to="/services/$type"
                params={{ type: t.key }}
                className="group block rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-md hover:shadow-xl transition-all duration-300"
              >
                {/* Top Half: Image */}
                <div 
                  className="h-40 w-full relative bg-cover bg-center" 
                  style={{ backgroundImage: `url(${bgImage})` }}
                >
                  <div className="absolute inset-0 bg-brand/40 flex items-center justify-center p-4">
                    <h3 className="text-white text-lg font-bold text-center drop-shadow-md">
                      {t.name}
                    </h3>
                  </div>
                </div>

                {/* Bottom Half: Info Section */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-brand flex items-center justify-center text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">{t.name}</div>
                      <div className="text-[11px] font-medium text-gray-500 mt-0.5">Est. Time: 1-2 DAY</div>
                    </div>
                  </div>
                  
                  {/* Plus Button */}
                  <div className="h-8 w-8 rounded-lg bg-gold flex items-center justify-center text-brand font-bold shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                    <Plus className="h-5 w-5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

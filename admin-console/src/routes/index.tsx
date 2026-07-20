import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { Button } from "@/components/ui/button";
import { CalendarClock, Sparkles, ShieldCheck, Truck, ArrowRight, Plus } from "lucide-react";
import { SERVICE_TYPES } from "@/lib/taxonomy";
import logoAsset from "@/assets/safaikart-logo-full.png.asset.json";



export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SafaiKart — Laundry & Dry Cleaning, Picked Up & Delivered" },
      {
        name: "description",
        content:
          "Book laundry, dry cleaning and steam-press pickups in minutes. Doorstep service, transparent pricing, live tracking.",
      },
      { property: "og:title", content: "SafaiKart — Laundry & Dry Cleaning" },
      {
        property: "og:description",
        content: "Doorstep laundry & dry cleaning with live tracking and transparent pricing.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-white text-brand">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, #F4C73E33 0%, transparent 45%), radial-gradient(circle at 85% 60%, #1B3B2233 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-10 md:pt-16 pb-12 md:pb-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand/5 text-brand px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" /> Doorstep pickup in 60 mins
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Fresh clothes.<br />
              <span className="text-brand/70">Zero effort.</span>
            </h1>
            <p className="mt-4 md:mt-5 text-brand/70 max-w-lg text-base md:text-lg">
              Book laundry, dry cleaning and steam-press pickups in seconds. We pick up,
              clean with care, and deliver back — spotless.
            </p>
            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
              <Link to="/services" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-12 px-6 rounded-xl bg-brand text-gold hover:bg-brand/90 font-semibold text-base">
                  <CalendarClock className="h-5 w-5 mr-2" /> Schedule a pickup
                </Button>
              </Link>
              <Link to="/services" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto h-12 px-6 rounded-xl bg-white dark:bg-white border-brand/30 text-brand hover:bg-brand/5 hover:text-brand">
                  Browse services <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
            <div className="mt-6 md:mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand/60">
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand" /> 100% quality guarantee</div>
              <div className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-brand" /> Free pickup & delivery</div>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="aspect-square rounded-3xl overflow-hidden shadow-elevated">
              <img
                src="/images/logo.svg"
                alt="SafaiKart"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

        </div>

      </section>

      {/* Services */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Our services</h2>
            <p className="text-brand/60 mt-1">Pick a service to see items & pricing.</p>
          </div>
          <Link to="/services" className="text-sm text-brand hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_TYPES.map((s) => {
            const Icon = s.icon;
            const IMG_MAP: Record<string, string> = {
              "dry-cleaning": "/images/dry_cleaning_suit.png",
              "steam-press": "/images/steam_press.png",
              "laundry": "/images/laundry_basket.png",
              "shoe-care": "/images/shoe_cleaning.png",
              "household": "/images/sofa_cleaning.png",
              "premium": "/images/luxury_care.png",
            };
            const bgImage = IMG_MAP[s.key] || "/images/laundry_basket.png";

            return (
              <Link
                key={s.key}
                to="/services/$type"
                params={{ type: s.key }}
                className="group block rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-md hover:shadow-xl transition-all duration-300"
              >
                {/* Top Half: Image */}
                <div 
                  className="h-40 w-full relative bg-cover bg-center" 
                  style={{ backgroundImage: `url(${bgImage})` }}
                >
                  <div className="absolute inset-0 bg-brand/40 flex items-center justify-center p-4">
                    <h3 className="text-white text-lg font-bold text-center drop-shadow-md">
                      {s.name}
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
                      <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">{s.name}</div>
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
      </section>


      {/* How it works */}
      <section className="bg-brand/5 py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-center">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: "1", t: "Schedule pickup", d: "Choose services, pick a time slot, and confirm your address." },
              { n: "2", t: "We collect & clean", d: "Our runner picks up your clothes. We clean with expert care." },
              { n: "3", t: "Delivered fresh", d: "Your clothes are delivered back, spotless and ready to wear." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl bg-white p-6 shadow-card">
                <div className="h-10 w-10 rounded-xl bg-brand text-gold grid place-items-center font-bold">{s.n}</div>
                <div className="mt-4 text-lg font-semibold">{s.t}</div>
                <div className="mt-1 text-sm text-brand/60">{s.d}</div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/services">
              <Button className="h-12 px-8 rounded-xl bg-brand text-gold hover:bg-brand/90 font-semibold">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

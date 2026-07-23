import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import {
  CalendarClock,
  Sparkles,
  ShieldCheck,
  Truck,
  ArrowRight,
  Plus,
  Clock,
  Wallet,
} from "lucide-react";
import { SERVICE_TYPES } from "@/lib/taxonomy";

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

const IMG_MAP: Record<string, string> = {
  "dry-cleaning": "/images/dry_cleaning_suit.png",
  "steam-press": "/images/steam_press.png",
  "laundry": "/images/laundry_basket.png",
  "shoe-care": "/images/shoe_cleaning.png",
  "household": "/images/sofa_cleaning.png",
  "premium": "/images/luxury_care.png",
};

const HERO_STATS = [
  { value: "100%", label: "Quality guarantee" },
  { value: "Care", label: "Premium handling" },
  { value: "60 min", label: "Express pickup" },
];

const FEATURES = [
  { icon: ShieldCheck, title: "Quality guarantee", desc: "Not happy? We re-clean it free, no questions asked." },
  { icon: Truck, title: "Free pickup & delivery", desc: "At your door, at a time that actually suits you." },
  { icon: Clock, title: "Fast turnaround", desc: "Most orders are back to you within 1–2 days." },
  { icon: Wallet, title: "Transparent pricing", desc: "Clear per-item rates — no surprises at checkout." },
];

const STEPS = [
  { n: "1", t: "Schedule pickup", d: "Choose services, pick a time slot, and confirm your address." },
  { n: "2", t: "We collect & clean", d: "Our runner picks up your clothes. We clean with expert care." },
  { n: "3", t: "Delivered fresh", d: "Your clothes are delivered back, spotless and ready to wear." },
];

// Testimonials removed for launch to avoid fake claims

const GOLD_CTA =
  "inline-flex items-center justify-center gap-2 rounded-xl font-bold text-brand bg-gradient-to-br from-[#F7D45C] via-gold to-gold-deep shadow-[0_14px_34px_-12px_rgba(224,169,46,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-[1.03] active:translate-y-0 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2";

const GHOST_GOLD_CTA =
  "group inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-gold border border-gold/40 transition-all duration-200 hover:bg-gold hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand";

function Landing() {
  return (
    <div className="min-h-screen bg-white text-brand">
      <SiteHeader />

      {/* ── Hero (full green) ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand text-white">
        <div className="sk-hero-glow absolute inset-0" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-14 md:pt-20 pb-16 md:pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="sk-eyebrow text-gold">
              <Sparkles className="h-3.5 w-3.5" /> Doorstep pickup in 60 mins
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.03]">
              Fresh clothes,
              <br />
              <span className="text-gold">zero effort.</span>
            </h1>
            <p className="mt-5 text-white/75 text-base md:text-lg max-w-lg">
              Book laundry, dry cleaning and steam-press pickups in seconds. We collect,
              clean with care, and deliver back — spotless.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/services" className={`${GOLD_CTA} h-12 px-7 text-base w-full sm:w-auto`}>
                <CalendarClock className="h-5 w-5" /> Schedule a pickup
              </Link>
              <Link to="/services" className={`${GHOST_GOLD_CTA} h-12 px-7 text-base w-full sm:w-auto`}>
                Browse services <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 max-w-md">
              {HERO_STATS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white/5 border border-white/10 px-3 py-3 text-center backdrop-blur-sm"
                >
                  <div className="text-lg sm:text-xl font-extrabold text-gold">{s.value}</div>
                  <div className="text-[11px] text-white/60 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Hero visual — collage + floating chips */}
          <motion.div 
            className="relative hidden md:block"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          >
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gold/10 blur-2xl" aria-hidden="true" />
            <div className="relative grid grid-cols-2 gap-4">
              <div className="col-span-2 aspect-[16/10] rounded-3xl overflow-hidden ring-1 ring-white/15 shadow-elevated">
                <img src="/images/luxury_care.png" alt="Premium garment care" className="h-full w-full object-cover" />
              </div>
              <div className="aspect-square rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-elevated">
                <img src="/images/dry_cleaning_suit.png" alt="Dry cleaning" className="h-full w-full object-cover" />
              </div>
              <div className="aspect-square rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-elevated">
                <img src="/images/steam_press.png" alt="Steam press" className="h-full w-full object-cover" />
              </div>
            </div>
            <div className="sk-chip sk-float absolute -left-4 top-6">
              <Sparkles className="h-4 w-4 text-gold" /> Premium Care
            </div>
            <div className="sk-chip sk-float-slow absolute -right-3 bottom-4">
              <Truck className="h-4 w-4 text-brand" /> Free pickup &amp; delivery
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Services ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between gap-4 mb-8"
        >
          <div>
            <div className="sk-eyebrow text-brand/50">
              <Sparkles className="h-3.5 w-3.5" /> What we clean
            </div>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">Our services</h2>
            <p className="text-brand/60 mt-1">Pick a service to see items &amp; pricing.</p>
          </div>
          <Link to="/services" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand/70 transition-colors">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {SERVICE_TYPES.map((s) => {
            const Icon = s.icon;
            const bgImage = IMG_MAP[s.key] || "/images/laundry_basket.png";
            return (
              <Link
                key={s.key}
                to="/services/$type"
                params={{ type: s.key }}
                className="group sk-card sk-card-hover block overflow-hidden"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={bgImage}
                    alt={s.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand/90 via-brand/25 to-transparent" />
                  <div className="absolute inset-x-4 bottom-3 flex items-center justify-between">
                    <h3 className="text-white text-lg font-bold drop-shadow-md">{s.name}</h3>
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-gold to-gold-deep grid place-items-center text-brand shadow-md transition-transform duration-300 group-hover:scale-110">
                      <Plus className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <div className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-brand/5 text-brand grid place-items-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{s.name}</div>
                    <div className="text-xs text-brand/55 truncate">{s.tagline}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto shrink-0 text-brand/30 transition-all duration-300 group-hover:text-brand group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </motion.div>
      </section>

      {/* ── Why SafaiKart (soft green band) ───────────────── */}
      <section className="bg-brand/5 border-y border-brand/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="sk-eyebrow text-brand/50 justify-center">
              <ShieldCheck className="h-3.5 w-3.5" /> Why SafaiKart
            </div>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">Laundry, done properly</h2>
            <p className="text-brand/60 mt-2">
              Everything you'd expect from a premium service — and nothing you wouldn't.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="sk-card sk-card-hover p-6">
                  <div className="h-12 w-12 rounded-2xl bg-brand text-gold grid place-items-center shadow-sm">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="mt-4 font-semibold">{f.title}</div>
                  <div className="mt-1 text-sm text-brand/60 leading-relaxed">{f.desc}</div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto"
        >
          <div className="sk-eyebrow text-brand/50 justify-center">
            <Clock className="h-3.5 w-3.5" /> How it works
          </div>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">Three steps to fresh</h2>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative mt-12 grid gap-10 md:gap-6 md:grid-cols-3"
        >
          <div
            className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-brand/10 via-gold/50 to-brand/10"
            aria-hidden="true"
          />
          {STEPS.map((s) => (
            <div key={s.n} className="relative flex flex-col items-center text-center px-4">
              <div className="relative z-10 h-16 w-16 rounded-2xl bg-gradient-to-br from-gold to-gold-deep text-brand grid place-items-center text-xl font-extrabold shadow-[0_12px_30px_-10px_rgba(224,169,46,0.6)] ring-4 ring-white">
                {s.n}
              </div>
              <div className="mt-5 text-lg font-semibold">{s.t}</div>
              <div className="mt-1.5 text-sm text-brand/60 max-w-xs">{s.d}</div>
            </div>
          ))}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <Link to="/services" className={`${GOLD_CTA} h-12 px-8 text-base`}>
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>

      {/* Testimonials section removed for launch */}

      {/* ── Final CTA (green card on white) ───────────────── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-brand text-white px-6 py-12 md:px-14 md:py-16 text-center shadow-elevated"
        >
          <div className="sk-hero-glow absolute inset-0" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Ready for effortless laundry?</h2>
            <p className="mt-3 text-white/75 max-w-xl mx-auto">
              Schedule your first pickup in under a minute. We'll handle the rest.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/services" className={`${GOLD_CTA} h-12 px-8 text-base w-full sm:w-auto`}>
                <CalendarClock className="h-5 w-5" /> Schedule a pickup
              </Link>
              <Link to="/services" className={`${GHOST_GOLD_CTA} h-12 px-8 text-base w-full sm:w-auto`}>
                Browse services <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <SiteFooter />
    </div>
  );
}

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
  ChevronRight,
  Crown,
  Leaf,
  Zap,
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

const GOLD_CTA =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold text-brand bg-gradient-to-r from-[#F6D560] via-[#F4C73E] to-[#E3A42C] shadow-[0_0_24px_rgba(244,199,62,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[.98]";

const GHOST_GOLD_CTA =
  "group inline-flex items-center justify-center gap-2 rounded-full font-semibold text-white/90 border border-[#275939] bg-[#113824]/60 backdrop-blur-xs transition-all duration-200 hover:bg-white/10 hover:border-gold/60 hover:text-white";

function Landing() {
  return (
    <div className="min-h-screen bg-white text-brand">
      <SiteHeader />

      {/* ── Hero Section (Deep Forest Green with Golden Highlights) ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0C2A1B] text-white">
        {/* Ambient background glows */}
        <div className="sk-hero-glow absolute inset-0 opacity-80" aria-hidden="true" />
        <div
          className="absolute top-1/2 right-4 lg:right-12 -translate-y-1/2 w-[480px] lg:w-[620px] h-[480px] lg:h-[620px] rounded-full bg-[#18482E]/70 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-12 md:pt-16 pb-16 md:pb-20 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 items-center">
          {/* Left Column: Eyebrow, Title, Description, CTAs, Feature Glass Box */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-start"
          >
            {/* Eyebrow with Scooter Icon & Gold Underline */}
            <div className="inline-flex flex-col">
              <div className="inline-flex items-center gap-2 text-gold font-bold text-xs sm:text-[13px] tracking-widest uppercase">
                <svg
                  className="h-4 w-4 text-gold shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="18" r="3" />
                  <path d="M6 15h7l3-7h3" />
                  <path d="M12 18h2a2 2 0 0 0 2-2v-4" />
                  <path d="M18 8h1a1 1 0 0 0 1-1V5" />
                </svg>
                <span>Doorstep pickup in 60 mins</span>
              </div>
              <div className="w-14 h-[2px] bg-gradient-to-r from-gold to-transparent mt-1.5 rounded-full" />
            </div>

            {/* Headline */}
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-[3.75rem] font-extrabold tracking-tight leading-[1.06] text-white">
              Fresh clothes,
              <br />
              <span className="text-gold">zero effort.</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-white/80 text-base sm:text-lg max-w-lg leading-relaxed">
              Book laundry, dry cleaning and steam-press pickups in seconds. We collect,
              clean with care, and deliver back — spotless.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5 w-full sm:w-auto">
              <Link
                to="/services"
                className="inline-flex items-center justify-center gap-2.5 h-12 sm:h-13 px-6 sm:px-7 rounded-full font-bold text-brand bg-gradient-to-r from-[#F6D560] via-[#F4C73E] to-[#E3A42C] shadow-[0_0_24px_rgba(244,199,62,0.4)] hover:shadow-[0_0_36px_rgba(244,199,62,0.65)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <CalendarClock className="h-4 w-4 sm:h-5 sm:w-5 text-brand" />
                <span>Schedule a pickup</span>
                <span className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-black/10 flex items-center justify-center ml-0.5">
                  <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                </span>
              </Link>
              <Link
                to="/services"
                className="group inline-flex items-center justify-center gap-2 h-12 sm:h-13 px-6 sm:px-7 rounded-full font-semibold text-white/90 border border-[#275939] bg-[#113824]/60 backdrop-blur-xs hover:bg-white/10 hover:border-gold/60 hover:text-white transition-all duration-200"
              >
                <span>Browse services</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Feature Stats Glass Box */}
            <div className="mt-9 w-full max-w-lg rounded-2xl bg-[#123824]/75 border border-[#27593A]/80 backdrop-blur-md px-4 sm:px-5 py-3.5 grid grid-cols-3 divide-x divide-[#27593A]/80 shadow-xl">
              {/* Feature 1 */}
              <div className="flex items-center gap-2 sm:gap-2.5 pr-2 sm:pr-3">
                <div className="text-gold shrink-0">
                  <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 stroke-[1.5]" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-white text-sm sm:text-base leading-tight">100%</div>
                  <div className="text-[10px] sm:text-xs text-white/70 leading-tight mt-0.5 whitespace-nowrap">
                    Quality guarantee
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-center gap-2 sm:gap-2.5 px-2 sm:px-3">
                <div className="text-gold shrink-0">
                  <Leaf className="h-6 w-6 sm:h-7 sm:w-7 stroke-[1.5]" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-white text-sm sm:text-base leading-tight">Care</div>
                  <div className="text-[10px] sm:text-xs text-white/70 leading-tight mt-0.5 whitespace-nowrap">
                    Premium handling
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3">
                <div className="text-gold shrink-0">
                  <Zap className="h-6 w-6 sm:h-7 sm:w-7 stroke-[1.5]" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-white text-sm sm:text-base leading-tight">60 min</div>
                  <div className="text-[10px] sm:text-xs text-white/70 leading-tight mt-0.5 whitespace-nowrap">
                    Express pickup
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Hero Visual Grid with Golden Outlines & Badges */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
          >
            <div className="flex flex-col gap-3.5 sm:gap-4">
              {/* Top Large Card: Luxury Care with Golden Outline */}
              <div className="relative aspect-[16/9.5] sm:aspect-[16/9] rounded-[1.75rem] overflow-hidden border-[1.5px] border-[#DDA743]/85 shadow-[0_16px_40px_rgba(0,0,0,0.45)] group">
                <img
                  src="/images/luxury_care.png"
                  alt="Premium Care"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Floating Badge (Top-Left) */}
                <div className="absolute top-3.5 sm:top-4 left-3.5 sm:left-4 z-10 inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-[#FFF6DB] text-[#1B3B22] font-bold text-xs shadow-md border border-[#F2DA9A]">
                  <Crown className="h-3.5 w-3.5 fill-[#E0A92E] text-[#E0A92E]" />
                  <span>Premium Care</span>
                </div>

                {/* Concentric Golden Arcs / Orbital Lines (Bottom-Right) */}
                <svg
                  className="absolute -bottom-3 -right-3 w-40 sm:w-48 h-40 sm:h-48 pointer-events-none opacity-80"
                  viewBox="0 0 160 160"
                  fill="none"
                >
                  <circle cx="160" cy="160" r="140" stroke="#E5A83B" strokeWidth="1" strokeOpacity="0.4" />
                  <circle cx="160" cy="160" r="105" stroke="#E5A83B" strokeWidth="1" strokeOpacity="0.55" />
                  <circle cx="160" cy="160" r="70" stroke="#E5A83B" strokeWidth="1" strokeOpacity="0.7" />
                  <circle cx="160" cy="160" r="35" stroke="#E5A83B" strokeWidth="1" strokeOpacity="0.85" />
                  {/* 4-point golden sparkle star */}
                  <path
                    d="M98 98 Q98 94 94 94 Q98 94 98 90 Q98 94 102 94 Q98 94 98 98 Z"
                    fill="#F4C73E"
                  />
                </svg>
              </div>

              {/* Bottom Row: 2 Cards Side-by-Side with Golden Outlines */}
              <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
                {/* Dry Cleaning Card */}
                <div className="relative aspect-[1.3/1] sm:aspect-[1.35/1] rounded-[1.5rem] overflow-hidden border-[1.5px] border-[#DDA743]/85 shadow-[0_12px_32px_rgba(0,0,0,0.4)] group">
                  <img
                    src="/images/dry_cleaning_suit.png"
                    alt="Dry Cleaning"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Top-Left Circular Badge */}
                  <div className="absolute top-3 left-3 z-10 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#123621]/85 backdrop-blur-sm border border-gold/40 text-gold flex items-center justify-center shadow-sm">
                    <svg
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gold"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3c0 1.5 1.5 2.5 3 3.5l8.5 6.5A2 2 0 0 1 19.5 18H4.5a2 2 0 0 1-1-3L12 8.5" />
                      <path d="M3.5 18h17" />
                    </svg>
                  </div>
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                  {/* Bottom Text Overlay */}
                  <div className="absolute bottom-3 sm:bottom-3.5 left-3 sm:left-3.5 right-3 sm:right-3.5 z-10">
                    <div className="font-bold text-white text-xs sm:text-sm md:text-base leading-tight">
                      Dry Cleaning
                    </div>
                    <div className="text-[10px] sm:text-xs text-white/75 mt-0.5 leading-tight">
                      Sharp. Crisp. Ready to wear.
                    </div>
                  </div>
                </div>

                {/* Steam Press Card */}
                <div className="relative aspect-[1.3/1] sm:aspect-[1.35/1] rounded-[1.5rem] overflow-hidden border-[1.5px] border-[#DDA743]/85 shadow-[0_12px_32px_rgba(0,0,0,0.4)] group">
                  <img
                    src="/images/steam_press.png"
                    alt="Steam Press"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Top-Left Circular Badge */}
                  <div className="absolute top-3 left-3 z-10 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#123621]/85 backdrop-blur-sm border border-gold/40 text-gold flex items-center justify-center shadow-sm">
                    <svg
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gold"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 17h18a1 1 0 0 0 1-1v-4a7 7 0 0 0-7-7H7a4 4 0 0 0-4 4v8Z" />
                      <path d="M6 10h8" />
                      <path d="M3 14h18" />
                    </svg>
                  </div>
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                  {/* Bottom Text Overlay */}
                  <div className="absolute bottom-3 sm:bottom-3.5 left-3 sm:left-3.5 right-3 sm:right-3.5 z-10">
                    <div className="font-bold text-white text-xs sm:text-sm md:text-base leading-tight">
                      Steam Press
                    </div>
                    <div className="text-[10px] sm:text-xs text-white/75 mt-0.5 leading-tight">
                      Wrinkle-free perfection.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Services ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
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
          viewport={{ once: true }}
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
            viewport={{ once: true }}
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
            viewport={{ once: true }}
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
          viewport={{ once: true }}
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
          viewport={{ once: true }}
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

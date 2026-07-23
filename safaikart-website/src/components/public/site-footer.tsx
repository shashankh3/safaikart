import { Link } from "@tanstack/react-router";
import { Mail, Sparkles, ShieldCheck, Truck } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative mt-16 overflow-hidden bg-brand text-white">
      {/* top gold accent */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-gold to-transparent opacity-70" />
      <div className="sk-band-glow absolute inset-0" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-14 grid gap-10 md:grid-cols-4 text-sm">
        <div className="md:pr-6">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl overflow-hidden ring-1 ring-white/15">
              <img src="/images/logo.svg" alt="SafaiKart" className="h-full w-full object-cover" />
            </div>
            <div className="text-base font-bold tracking-tight">SafaiKart</div>
          </div>
          <p className="text-white/60 mt-3 leading-relaxed">
            Premium laundry &amp; dry-cleaning, picked up and delivered to your door.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/75">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" /> Quality guarantee
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/75">
              <Truck className="h-3.5 w-3.5 text-gold" /> Free pickup
            </span>
          </div>
        </div>

        <div>
          <div className="text-gold font-semibold mb-3 text-xs uppercase tracking-wider">Explore</div>
          <ul className="space-y-2.5 text-white/70">
            <li><Link to="/" className="hover:text-gold transition-colors">Home</Link></li>
            <li><Link to="/services" className="hover:text-gold transition-colors">Services</Link></li>
            <li><Link to="/cart" className="hover:text-gold transition-colors">Cart</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-gold font-semibold mb-3 text-xs uppercase tracking-wider">Account</div>
          <ul className="space-y-2.5 text-white/70">
            <li><Link to="/login" className="hover:text-gold transition-colors">Sign in</Link></li>
            <li><Link to="/app/orders" className="hover:text-gold transition-colors">My Orders</Link></li>
            <li><Link to="/app/profile" className="hover:text-gold transition-colors">Profile</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-gold font-semibold mb-3 text-xs uppercase tracking-wider">Help</div>
          <ul className="space-y-2.5 text-white/70">
            <li><Link to="/app/support" className="hover:text-gold transition-colors">Contact Support</Link></li>
            <li>
              <a href="mailto:hello@safaikart.com" className="inline-flex items-center gap-1.5 hover:text-gold transition-colors">
                <Mail className="h-3.5 w-3.5" /> hello@safaikart.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/50">
          <div>© {new Date().getFullYear()} SafaiKart. All rights reserved.</div>
          <div className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-gold" /> Cleaned with care in India
          </div>
        </div>
      </div>
    </footer>
  );
}

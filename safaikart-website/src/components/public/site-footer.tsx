import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-brand/10 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 grid gap-8 md:grid-cols-4 text-sm">
        <div>
          <div className="text-brand font-semibold text-base">SafaiKart</div>
          <p className="text-brand/60 mt-2">
            Premium laundry & dry-cleaning, picked up and delivered to your door.
          </p>
        </div>
        <div>
          <div className="text-brand font-medium mb-2">Explore</div>
          <ul className="space-y-1.5 text-brand/70">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/services">Services</Link></li>
            <li><Link to="/cart">Cart</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-brand font-medium mb-2">Account</div>
          <ul className="space-y-1.5 text-brand/70">
            <li><Link to="/login">Sign in</Link></li>
            <li><Link to="/app/orders">My Orders</Link></li>
            <li><Link to="/app/profile">Profile</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-brand font-medium mb-2">Help</div>
          <ul className="space-y-1.5 text-brand/70">
            <li><Link to="/app/support">Contact Support</Link></li>
            <li><a href="mailto:hello@safaikart.com">hello@safaikart.com</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-brand/10 py-4 text-center text-xs text-brand/50">
        © {new Date().getFullYear()} SafaiKart. All rights reserved.
      </div>
    </footer>
  );
}

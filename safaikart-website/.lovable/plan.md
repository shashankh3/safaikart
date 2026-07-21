
# SafaiKart Customer + Admin Platform

Turn the app into a public-facing site with:
- **Public landing** at `/` — sells services with an instant "Schedule pickup" CTA.
- **Guest browsing & cart** — no login required to fill cart.
- **Customer auth at checkout** — phone OTP, Google sign-in, or email+password.
- **Customer app** at `/app/*` — order tracking, history, profile, addresses, support.
- **Admin console** — everything we built moves under `/admin/*`, unchanged in behavior.
- **Single `/login`** — email+password → admin, OTP/Google → customer.

## Routing map

```text
/                          Landing page (hero, services, how-it-works, CTA)
/services                  Full catalog (public, uses existing `catalog` collection)
/service/$slug             Service detail + "Add to cart"
/cart                      Cart + slot picker + address (guest OK)
/checkout                  Requires auth → prompts sign-in modal
/track/$orderId            Public tracking via short link
/login                     Unified login (OTP / Google / email+password)
/app/orders                Customer: my orders
/app/orders/$id            Customer: order detail, timeline, invoice, re-order
/app/profile               Customer: name, phone, addresses
/app/support               Customer: contact support, complaint form
/admin/*                   Existing admin console (moved from /_authenticated/*)
```

## Auth model

- **Firebase Phone Auth** for OTP (requires enabling Phone provider + invisible reCAPTCHA).
- **Google Sign-in** via `signInWithPopup(GoogleAuthProvider)`.
- **Email + password** — existing flow, routes to admin if `adminUsers/{uid}` exists, else to customer app.
- New `customers/{uid}` Firestore doc auto-created on first customer login (name, phone, addresses, createdAt).
- `AuthContext` extended with `customer` profile alongside `admin`; a `role: "admin" | "customer" | null` derived flag drives routing.
- Guards:
  - `/admin/*` → requires `admin` role (existing RBAC preserved).
  - `/app/*` → requires signed-in customer.
  - `/checkout` → if unauthenticated, show sign-in modal; on success continues.

## Cart & checkout

- Guest cart persisted in `localStorage` (`safaikart:cart`).
- Checkout writes `orders/{id}` with existing schema (`status: "pending"`, items, address, slot, `userId`).
- **Razorpay UPI** via hosted Checkout script (`checkout.razorpay.com/v1/checkout.js`):
  - New Cloud Function `createRazorpayOrder` (asia-south1) → returns `order_id`.
  - Client opens Razorpay modal; on success, function `verifyRazorpayPayment` verifies signature + marks order paid.
  - Requires secrets: `RAZORPAY_KEY_ID` (public, in client) + `RAZORPAY_KEY_SECRET` (functions env).
- COD option also available.

## Customer app screens

- **My Orders** — real-time list via `onSnapshot` filtered by `userId`; status badges + aging.
- **Order Detail** — reuses existing timeline component + photo proofs; "Download invoice", "Re-order", "Raise complaint".
- **Profile** — edit name, saved addresses (array on `customers/{uid}`).
- **Support** — writes to existing `complaints` collection with `source: "customer"`.

## Landing page (service-first)

Sections: hero with CTA + hero image, service cards (pulled live from `catalog`), how-it-works (3 steps), pricing highlights, testimonials, footer with support links. SEO metadata + og:image on `/`, `/services`, `/service/$slug`.

## File changes

**New**
- `src/routes/index.tsx` (rewrite: landing)
- `src/routes/services.tsx`, `src/routes/service.$slug.tsx`, `src/routes/cart.tsx`, `src/routes/checkout.tsx`, `src/routes/track.$orderId.tsx`
- `src/routes/_customer.tsx` (layout gate for `/app/*`)
- `src/routes/_customer/app.orders.tsx`, `app.orders.$id.tsx`, `app.profile.tsx`, `app.support.tsx`
- `src/components/public/{site-header,site-footer,hero,service-grid,how-it-works,testimonials}.tsx`
- `src/components/auth/sign-in-modal.tsx` (OTP + Google + email tabs)
- `src/lib/cart.ts` (Zustand or context + localStorage)
- `src/lib/customer.ts` (customer profile helpers)
- `src/lib/razorpay.ts` (client loader)
- `functions/src/razorpay.ts` (create order + verify signature webhook)

**Move / rename**
- `src/routes/_authenticated.tsx` → `src/routes/_admin.tsx` with path `/admin`
- `src/routes/_authenticated/*.tsx` → `src/routes/_admin/admin.<name>.tsx` (URL becomes `/admin/<name>`)
- `src/routes/login.tsx` → unified login with tabs; success redirects by role.
- Admin sidebar `to=` paths updated to `/admin/*`.

**Edit**
- `src/context/auth-context.tsx` — add `customer` profile, `role` flag, OTP + Google helpers, auto-create `customers/{uid}` on first customer login.
- `firestore.rules` — add `customers/{uid}` (self-read/write), allow authenticated customers to create their own `orders` with `userId == auth.uid`, keep admin-only status writes via callable.
- `src/components/app-sidebar.tsx`, `app-header.tsx`, `command-palette.tsx` — retarget `/admin/*`.
- `functions/src/index.ts` — export new Razorpay callables + verification.
- `SECURITY.md` — document customer role, Razorpay secrets, App Check for phone auth.

## Secrets required

- `RAZORPAY_KEY_ID` (client-safe, added as VITE var)
- `RAZORPAY_KEY_SECRET` (functions env, via `add_secret` at deploy time)

## Firebase Console steps (user must do)

1. Enable **Phone** and **Google** providers in Firebase Auth.
2. Add production domain to Auth authorized domains.
3. Deploy updated `firestore.rules` and new Cloud Functions.
4. Create a Razorpay account and put the key pair into secrets.

## Rollout order

1. Route refactor: move admin under `/admin/*`, keep app compiling.
2. Landing + services browse (public, read-only).
3. Cart + guest flow.
4. Auth expansion (OTP + Google + customer profile + unified login).
5. Checkout with Razorpay + COD.
6. Customer app (orders, profile, support).
7. Firestore rules + functions + docs update.

Scope is large; expect a multi-batch implementation. I'll ship batches 1–4 first so the site is browsable and login works, then 5–7.

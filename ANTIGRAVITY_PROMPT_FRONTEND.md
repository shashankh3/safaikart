# Prompt for Antigravity — SafaiKart Frontend Fix Pass (Android App + Website)

## Context (read first)

Two frontends share ONE Firebase project/database:

1. **Android customer app** — Expo/React Native at repo root (`App.tsx`, `src/` with feature-sliced layout: `src/features/*/domain|application|infrastructure|presentation`). Uses `@react-native-firebase/*`, React Query, React Navigation.
2. **Website** — `admin-console/` (Vite + React + TanStack Router/Query + shadcn/ui + Firebase web SDK). It contains BOTH the web-based admin console (`src/routes/_authenticated/*`) AND public consumer pages (`src/routes/services.*`, `cart.tsx`, `checkout.tsx`, `_customer/*`).

The backend contract is defined by `functions/src/` (callables: `createOrderDraft`, `createPaymentOrder`, `verifyPaymentStatus`, `cancelOrder`, `editOrderItems`, `validateCoupon`, `adminUpdateOrderStatus`, `adminConfirmOrderPrice`, `adminAssignDriver`, `adminSetOrderPhotos`, `saveFcmToken`, `removeFcmToken`, `markNotificationRead`) and `firestore.rules` (collections: `profiles`, `orders`, `payments`, `addresses`, `carts`, `services`, `categories`, `coupons`, `pickupSlots`, `zones`, `banners`, `adminUsers`, `issues`, `reviews`, `auditLogs`, `appConfig`, `drivers`, `expenses`, `settlements`, `broadcasts`, `referrals`). Anything not in that list is DEFAULT-DENIED by rules. A separate backend-hardening pass is running from `ANTIGRAVITY_PROMPT.md`; do not undo its changes — treat the backend contract as the source of truth. The mobile app is the reference client: it uses the correct collections and callables.

Non-negotiable product decisions:
- **Admin is web-only.** All admin functionality lives in `admin-console/`. The mobile app must be customer-only to keep APK size and performance optimal.
- Both frontends keep sharing the same Firestore database and the same Cloud Functions.

Work in this order: Part 1 (website consumer flow is broken against the real backend — highest priority), Part 2 (website admin console), Part 3 (Android app). Commit small, per-finding.

---

## PART 1 — CRITICAL: the website's consumer flow targets a backend that does not exist

The consumer-facing web pages were built against a fantasy schema. Every item below is a hard runtime failure or silent data corruption against the real backend. Fix by porting the website to the REAL contract (the one the mobile app uses) — do NOT create new backend endpoints to match the website.

### 1.1 Non-existent callables
- `checkout.tsx` calls `createCustomerOrder` — **does not exist**. Replace with the real flow: `createOrderDraft({ addressId, pickupSlotId, couponCode, directItems })`. Note the real callable takes an `addressId` referencing the `addresses` collection and a `pickupSlotId` referencing `pickupSlots` — not free-text name/phone/address/slot strings. Build the web checkout to: pick/create an address doc in `addresses` (schema: `userId`, `line1`, `line2`, `city`, `state`, `pincode`), pick a real slot from `pickupSlots`, then call `createOrderDraft`.
- `lib/razorpay.ts` calls `createRazorpayOrder` and `verifyRazorpayPayment` — **neither exists**. Replace with `createPaymentOrder({ orderId })` (returns `razorpayOrderId`, `razorpayKeyId`, `amountMinor`, `currency`) and, after Razorpay checkout completes, `verifyPaymentStatus({ orderId })` for server-side confirmation. Keep using the web Razorpay JS SDK (it's better UX than the app's WebView) but wire it to the real callables.
- `checkout.tsx` offers **Cash on Delivery** (`paymentMethod: "cod"`); the backend has no COD concept — orders sit in `PAYMENT_PENDING` until Razorpay confirms. Remove COD from the website (or explicitly ask me before designing a COD backend flow; do not fake it client-side).

### 1.2 Wrong collection names (default-denied by rules and/or empty)
- `profile` (singular) is used in `users.tsx`, `crm.tsx`, `dashboard.tsx`, `referrals.tsx`, `winback.tsx`, `imports.tsx`, `command-palette.tsx` — the real collection is **`profiles`**. These pages currently read an empty/denied collection.
- `customers` — `auth-context.tsx#ensureCustomerDoc` reads/writes `customers/{uid}`, which is not in rules (denied). Customer identity lives in `profiles/{uid}` (created by the `onUserCreate` auth trigger) and addresses in the `addresses` collection — NOT as an array on the profile. Rewrite `ensureCustomerDoc` to read `profiles`; remove the embedded `addresses[]` array shape from `CustomerProfile`.
- `orderLogs` (`lib/audit.ts`, `audit.tsx`), `orderMessages` (`inbox.tsx`), `feedback` (`feedback.tsx`), `complaints` (`complaints.tsx`, `scorecards.tsx`, `winback.tsx`) — none exist in rules. Map them to the real collections: audit → `auditLogs` (admin-writable per rules), support/complaints/inbox → `issues` + `issues/{id}/messages`, feedback → `reviews`. Delete `lib/audit.ts`'s custom `orderLogs` writer and log admin actions to `auditLogs` with the same shape the functions use (`actorUid`, `action`, `orderId`, `before`, `after`, `at`).

### 1.3 Wrong field names / schema drift
- Coupons: website (`lib/coupons.ts`, `coupons.tsx`) uses `{ code (field), active, type: "PERCENT"|"FLAT", value, minOrderMinor, maxDiscountMinor, usageLimit, usageCount, expiresAt }`. The real schema (backend + app) is: **doc ID = the code**, `{ isActive, type: 'percent'|'flat', discountValue, minimumOrderAmount, maxUsage, usedCount, usedBy, validUntil }`. Port both the admin coupons CRUD page and the consumer validation to the real schema — and on the consumer side, STOP reading `coupons` directly (the backend pass makes coupons admin-only-readable): call the `validateCoupon` callable instead, exactly like the app does.
- Orders: website reads `totalMinor` in `_customer/app.orders.tsx` and writes `totalMinor`/`subtotalMinor`/`discountMinor` from the client at checkout. The real field is **`finalAmountMinor`**, and ALL amounts are computed server-side by `createOrderDraft` — the client never sends totals. Remove all client-computed money fields from order creation; render `finalAmountMinor`/`subtotalMinor`/`discountMinor`/`deliveryFeeMinor` from the server-written doc.

### 1.4 Direct writes that Firestore rules block (or that the backend pass will block)
- `orders.tsx#assignDriver` does `updateDoc(doc(db,"orders",id), {...})` — rules deny ALL client updates to `orders` (and the file's own `admin-callables.ts` comment says never to do this). Use the `adminAssignDriver` callable.
- `orders.tsx#uploadPhoto` uploads to Storage path `orders/{id}/...` but `storage.rules` only allows `orderPhotos/{orderId}/...`; it then does a direct `updateDoc` on the order (denied). Fix path to `orderPhotos/{orderId}/…` and persist via the `adminSetOrderPhotos` callable.
- `orders.tsx#refundOrder` calls `adminUpdateOrderStatus(id, "REFUNDED", ...)` — per the backend transition map, `REFUNDED` is only reachable from `CANCELLED`/`REFUND_PENDING`, so this fails on live orders. Rework the refund action to first transition to `CANCELLED` (which triggers the server-side refund flow for paid orders) and surface the resulting `REFUND_PENDING`/`REFUND_INITIATED` states in the UI.
- `imports.tsx` bulk-writes `services` and `profile` docs directly from CSV. Services writes are legal for admins, but validate rows against the real service schema (`priceMinor` integer, `priceType` `'fixed'|'variable'`, `categoryId` exists, `isActive` boolean) before writing; profiles bulk-import must go (profiles are auth-trigger-owned).

### 1.5 Broken auth/session behavior on the website
- `auth-context.tsx`: when `ensureCustomerDoc` throws (it currently always does, see 1.2), the catch sets `admin=null, customer=null` → `role=null` → `_authenticated` layout shows an infinite "Checking your session…" for every non-admin signed-in user. After fixing the collection, also add an explicit error state (don't mask failures as null-role).
- Public signup exists (`signUpEmail`, Google, phone OTP). That's fine for customers, but confirm the post-signup redirect lands customers on the consumer pages (`/services`, `/app/orders`) and never the admin shell.
- `notifications-bell.tsx` subscribes to the ENTIRE `orders` and `payments` collections with `onSnapshot` — for a non-superadmin this may be fine permission-wise but it streams every order in the company to the browser continuously. Scope it (e.g. `where("createdAt", ">", sessionStart)` + `limit`), and gate by role.

### 1.6 Missing consumer surfaces on the website (after the contract fix)
The web checkout must reach feature parity with the app's flow against the real backend: address book CRUD (`addresses`), real pickup-slot picker (`pickupSlots` with capacity), coupon via `validateCoupon`, order cancel via `cancelOrder`, and the `_customer/app.orders.$id` detail page rendering real fields (`statusHistory`, `pickupSlotSnapshot`, `addressSnapshot`, `priceConfirmed`, payment status). The `where("userId","==",uid) + orderBy("createdAt","desc")` query on orders needs a composite index — add it to the `firestore.indexes.json` the backend pass creates.

---

## PART 2 — Website admin console improvements

2.1 **Scalability of reads.** `users.tsx` fetches 500 profiles client-side then filters in JS; `dashboard.tsx` downloads a full week of orders to compute metrics; `analytics.tsx`, `heatmap.tsx`, `winback.tsx`, `crm.tsx`, `scorecards.tsx` similarly fetch whole collections. Acceptable at launch scale, but: add `limit()` + cursor pagination (`startAfter`) to every table view, use `getCountFromServer` for counts (dashboard already does), and add server-side search where feasible (query by phone/email prefix) instead of client filtering. Document per page in a comment what the read cost is.

2.2 **RBAC consistency.** `lib/rbac.ts#canAccessRoute` gates routes client-side; verify its role→route map matches `firestore.rules` role gates (finance pages → `finance`, ops pages → `ops`, etc.) so users don't land on pages whose queries all fail. Show role-appropriate nav in `app-sidebar.tsx` (hide pages the role can't access rather than rendering then denying).

2.3 **Replace `prompt()`/`confirm()`** (e.g. `refundOrder` uses `window.prompt`) with the shadcn `AlertDialog`/`Dialog` components already in the repo. Destructive actions (refund, cancel, delete admin, deactivate service) need typed-confirmation dialogs showing the money/impact involved.

2.4 **Error/reporting hygiene.** `lib/lovable-error-reporting.ts` and `error-capture.ts` are leftovers from Lovable scaffolding — review; strip anything phoning home to third-party endpoints, keep a minimal console/Firestore error log.

2.5 **Optimistic-update correctness.** `orders.tsx#updateStatus` patches local state after the callable succeeds but the `onSnapshot` will also fire — verify no flicker/stale merge; prefer relying on the snapshot alone.

2.6 **The public marketing/services pages** (`services.$type.*`) read `services`/`categories` directly — fine (public-readable). But they duplicate taxonomy logic in `lib/taxonomy.ts` that must stay consistent with what the app renders; drive both from Firestore fields (`gender`, `wearType`, `categoryId`) rather than hardcoded route-side maps where they disagree.

---

## PART 3 — Android app improvements

3.1 **REMOVE all admin code from the app** (the explicit product decision: admin is web-only). Delete `src/features/admin/` (AdminDashboardScreen, CatalogManagerScreen, AdminOrderManagerScreen), their three routes in `RootNavigator.tsx`, the `isAdmin` logic in `useAuth.ts` (and its `adminUsers` read on every login), and any Profile-screen entry to admin. Also delete `src/core/firebase/catalogSeed.ts` (client-side DB seeding — dead weight and a footgun; seeding belongs in a script or the admin console). This directly shrinks the bundle.

3.2 **Kill dead/demo code paths:**
- `HomeScreen.tsx` renders a HARDCODED `services` array and `OFFERS` array (one banner even points at `https://picsum.photos/...`, a placeholder image service) while `useServicesQuery`/`useCategoriesQuery` exist. Drive the home screen entirely from Firestore (`services`, `categories`, `banners` collections — banners are what the admin console manages); remove picsum and unused assets.
- `useCart.tsx` (presentation hook) exposes stub `placeOrder = async () => {}`, `activeOrder = null`, `orderHistory = []` — remove them; the real flows live in checkout/orders features. Also the whole `CartContext` is typed `any` — type it properly with the `Cart` domain model.
- There are DUPLICATE modules: `OrderRepository.ts` AND `OrdersRepository.ts`; `application/useCart.ts` AND `presentation/hooks/useCart.tsx`; `application/useAddressesQuery.ts` AND `presentation/hooks/useAddresses.ts`. Consolidate each pair to one canonical module and fix imports.
- `env.ts` defines `API_URL: 'https://api.safaikart.com'` — nothing uses a REST API; remove or repurpose.
- `App.tsx` has ~15 lines of commented-out Sentry wiring; either adopt Sentry properly (behind `!isExpoGo`) or delete the comments. Crashlytics in `bootstrap.ts` is the active reporter — if keeping only Crashlytics, delete the Sentry remnants.

3.3 **Money-display bug risk in cart:** `useCart.tsx` computes `totalPrice` in RUPEES (`priceMinor / 100`) while everything else in the codebase uses MINOR units; `wrappedAddToCart` even converts `item.price * 100` when `priceMinor` is absent — mixed-unit paths that invite the classic ×100 display bug. Standardize: store and compute ONLY `priceMinor` (integer) end-to-end, convert to rupees exclusively in a single `formatINR` display helper. Add unit tests for cart totals with addons.

3.4 **Payment UX robustness (`PaymentScreen.tsx`):**
- The WebView flow detects completion by URL sniffing (`isCallbackUrl`) — brittle. Since `createPaymentOrder` returns `checkoutUrl` into a WebView, at minimum: handle the user closing the modal mid-payment (currently "Cancel Payment" just hides the WebView — then poll `verifyPaymentStatus` anyway, since money may have moved), handle WebView load errors, and add a timeout that routes to `PaymentPendingScreen` which polls `verifyPaymentStatus` with backoff.
- `isLoading` is never reset to false on the success path (`handlePay` leaves the spinner if the WebView URL arrives) — audit loading states.

3.5 **The app's web build masquerade:** `App.tsx` renders the whole app inside a fake phone frame (412×892, scaled) when `Platform.OS === 'web'`. Since the real website exists in `admin-console/`, decide: if the Expo web target (`safaikart-consumer` hosting target) is not shipping, remove `react-native-web`, `react-dom`, `@expo/metro-runtime` deps and the phone-frame code (bundle/dep savings); if it IS shipping, say so and I'll reconsider. Default action: remove.

3.6 **Notifications:** `RootNavigator` sets up FCM correctly, but foreground notifications only `console.log` — show an in-app toast/banner and refresh the `NotificationCenter` query. `NotificationCenterScreen` depends on the `notifications` collection rules being added by the backend pass — coordinate the read query (`where userId == uid`, `orderBy createdAt desc`, limit + pagination) and add its composite index.

3.7 **Type safety debt:** navigators are typed `createMaterialTopTabNavigator<any>` / `createNativeStackNavigator<any>` with `navigation: any` throughout screens. Define a `RootStackParamList`/`TabParamList` and type all `useNavigation`/route params — this repo already uses TypeScript strictly elsewhere (domain models exist); presentation should match.

3.8 **Performance quick wins:** `HomeScreen` runs six `Animated.loop`s permanently for service-icon animations — pause them when the screen is unfocused (`useIsFocused`) and honor reduced-motion; heavy `require()`d PNG assets (`premium-bg.jpg.png`, banner backgrounds) should be compressed/webp-ed; `App.tsx` loads 6 Inter weights + 3 full icon fonts up-front — drop unused weights, and rely on `@expo/vector-icons` lazy font loading instead of preloading all three sets.

---

## Constraints & definition of done

1. The backend (functions + rules) is the contract; frontends adapt to it. Never re-add client-side writes to `orders`/`payments`, never send client-computed totals.
2. Admin stays web-only; the app ships zero admin code after this pass.
3. Website consumer checkout must complete an end-to-end order against the REAL backend (draft → Razorpay → CONFIRMED) — verify with the Firebase emulator or a test-mode Razorpay key, and document the manual test steps in the PR.
4. Keep commits small and per-finding, prefixed by part (e.g. `fix(web): 1.1 replace createCustomerOrder with createOrderDraft`).
5. TypeScript must compile with no new `any` in changed files; run existing Jest suites; for the app, verify `expo run:android` builds.
6. Where a fix needs a product decision I haven't made (e.g. COD support, Expo web target), pick the option flagged as default here and note it in the commit message.

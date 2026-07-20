# Prompt for Antigravity — SafaiKart Frontend Deep-Dive Pass 2 (App + Website)

## Context (read first)

This is the SECOND frontend pass. Pass 1 (`ANTIGRAVITY_PROMPT_FRONTEND.md`) covered: porting the website's consumer flow off the fantasy backend (wrong callables/collections/fields), removing direct order writes in the console, removing admin code from the app, the hardcoded home screen, cart unit standardization, WebView payment robustness, dead-code cleanup, and perf quick wins. Backend passes 1–2 (`ANTIGRAVITY_PROMPT.md`, `ANTIGRAVITY_PROMPT_BACKEND_2.md`) are landing in parallel — the functions in `functions/src/` and `firestore.rules` are the contract; a shared zod contracts package (`functions/src/contracts/`) is being introduced (Backend-2 C4) — consume it in both frontends as it lands.

**Check current file state before fixing each item** — earlier passes may have already touched these files. If an item is already fixed, verify and move on. Everything below is NEW or a deeper cut than Pass 1.

Repos: app at root (`src/`, Expo/RN), website in `admin-console/` (Vite/React, both admin and consumer surfaces). Work order: Part A (app correctness bugs) → Part B (app payment/order lifecycle) → Part C (website) → Part D (cross-cutting quality). Small per-finding commits.

---

## PART A — App: correctness bugs found this pass

### A1. App Check is configured but NEVER initialized (dead security)
`src/core/firebase/appCheck.ts` builds the provider and calls `initializeAppCheck` — but **no file imports it**. `bootstrap.ts` only imports `./config/firebase`. The whole App Check setup (debug/playIntegrity providers) is dead code; when the backend enforces `enforceAppCheck: true` (Backend-1 B6), every app callable will start failing. Fix: import and initialize App Check in `bootstrap.ts` BEFORE any Firestore/Functions usage; make initialization awaited/ordered (bootstrap is `async` but called fire-and-forget in `App.tsx` — restructure so Firebase-dependent providers render after bootstrap completes, e.g. a `bootstrapReady` state gate alongside `fontsLoaded`). Verify end-to-end with the debug provider (log the token) and document the Play Integrity setup steps (SHA-256 registration, debug token allowlisting in Firebase console) in a README.

### A2. Checkout money math is wrong when addons exist + double-converts units
`CheckoutScreen.tsx` line ~68: `subtotalMinor = calculatedTotalPrice * 100` where `calculatedTotalPrice` comes from the cart context's rupee-converted total (Pass-1 3.3 standardizes this — coordinate). Worse, line ~33 for `directItems`: `item.price + addon.priceMinor/100` mixes rupee `price` with minor-unit addons, and line ~224–240 recomputes item totals with `item.price * 100 + addonPriceMinor` — three different unit conventions in ONE file. Also `deliveryFeeMinor = 4000` is hardcoded client-side (backend moves it to `appConfig` in Backend-1 C5 — read it from there with a sane default). And the client-computed "total" shown before order creation can DISAGREE with the server's `finalAmountMinor` (different coupon logic, delivery fee) — after `createOrderDraft` returns, always display the server's returned `finalAmountMinor` on the Payment screen, never the locally computed value (currently `navigation.navigate('Payment', { orderId })` doesn't pass amount, but `PaymentScreen` reads `route.params.amount` — which is therefore `undefined` → renders `₹NaN`! Trace: CheckoutScreen navigates with only `{ orderId }`; PaymentScreen destructures `{ orderId, amount }`. **The payment screen shows NaN today.** Pass the server's `finalAmountMinor` through, or fetch the order doc in PaymentScreen.)

### A3. Success-alert-then-navigate breaks the payment funnel
`CheckoutScreen.handlePlaceOrder` shows `Alert.alert('Success', 'Order Draft Created: <id>')` and only navigates to Payment when the user taps OK. An order draft is NOT success — payment hasn't happened; users who dismiss the alert (Android back button) are stranded with a `PAYMENT_PENDING` order and booked slot. Fix: navigate straight to the Payment screen (`navigation.replace`, so back doesn't return to a stale checkout), no interstitial alert. Also send the idempotency key that Backend-2 A4 adds to `createOrderDraft` (generate a UUID per checkout attempt, reuse it on retry).

### A4. Coupon state can be stale at order time
The user applies a coupon (validated against `subtotalMinor` at apply time), then edits quantities in the checkout's inline quantity editor — the applied coupon/discount is NOT revalidated, so the displayed discount can violate `minimumOrderAmount` until the server recomputes (silently producing a different final price than shown). Fix: re-run `validateCouponUseCase` whenever cart totals change while a coupon is applied; if it becomes invalid, remove it with a toast explaining why.

### A5. Order edit window UX is built on a fiction
`OrderTrackingScreen` exposes "Edit Order" navigating to `EditOrderScreen`, which calls `editOrderItems` — a callable that could never succeed until Backend-1 A1's fix, and even after, only within 3 minutes of creation. The UI shows the edit button without checking `editableUntil`. Fix: only render the Edit button when `now < order.editableUntil.toMillis()` AND status is `PAYMENT_PENDING`/`CONFIRMED`; show a live countdown ("Editable for 2:41"); handle the callable's `failed-precondition` gracefully (refresh order, hide button). Test against the fixed backend.

### A6. `PaymentPendingScreen` navigation targets a screen that doesn't exist in its navigator
It calls `navigation.navigate('Orders')` ("I'll check later") — but `Orders` is a TAB inside `MainTabs`, and this screen lives in `CheckoutNavigator` (a separate stack). React Navigation may fail or behave inconsistently. Fix: `navigation.navigate('MainTabs', { screen: 'Orders' })` (or `popToTop` + navigate). This class of bug is why Pass-1 3.7 (typed navigators) matters — if param lists are already typed by now, this becomes a compile error; fix all instances the compiler reveals.

### A7. Payment status listener misses the FAILED order state
`checkPaymentStatus.usecase.ts#listenToOrder` maps `paymentStatus === 'FAILED'` → failed, but the webhook sets the ORDER to `{ status: 'PAYMENT_PENDING', paymentStatus: 'FAILED' }` — fine — while `verifyFallback` maps identically; however neither handles the backend's top-up flow (`paymentStatus: 'PAYMENT_PENDING'` on a CONFIRMED order, from Backend-1 A6): the listener would read `paymentStatus: 'PAYMENT_PENDING'` and stay silent forever. Add explicit handling: if `status === 'CONFIRMED' && paymentStatus === 'VERIFIED'` → success; if `paymentStatus === 'FAILED'` → failed; if order enters top-up state → navigate to a "pay difference" flow (new lightweight screen reusing PaymentScreen with the top-up amount). Coordinate field semantics with the contracts package.

### A8. Cart merge strategy loses data + `new Date()` in Firestore write
- `useCart.ts#useCartQuery`: if a remote cart exists it WINS wholesale over local (`cart = remoteCart`) — items added while logged-out/offline are silently discarded on next fetch. Merge by `serviceId` (sum quantities, cap at backend limits) instead of replace.
- `CartRepository.saveRemoteCart` writes `updatedAt: new Date()` (client clock) with `{ merge: true }` — rules require keys `hasOnly(['userId','items','updatedAt'])` and the doc never includes `userId`, so with `merge:true` on first write the doc lacks `userId`... verify against rules (hasOnly permits missing keys; fine) but switch to `serverTimestamp()` and always include `userId` explicitly.
- Cart mutations read `queryClient.getQueryData` as source of truth — two rapid mutations race (both read the same snapshot, second overwrites first). Serialize via a mutation queue or use functional updates against the freshest state.

### A9. Duplicated screen-level status maps drift
`OrdersScreen.getStatusColor`, `OrderTrackingScreen`'s timeline, and the notification copy each hardcode their own status→color/label mapping, and `OrdersScreen` treats unknown statuses as PAYMENT_PENDING-grey (new statuses from Backend-2 A5, e.g. `REFUND_INITIATED`, render wrong). Create ONE `src/features/orders/domain/orderStatusMeta.ts` exporting `{ label, color, icon, isTerminal, customerMessage }` per status (including `REFUND_INITIATED`, `REFUND_PENDING`, `DRIVER_ASSIGNED` history entries) and use it everywhere. Mirror the same table into the website's `lib/format.ts` `statusColor` (or better: put it in the shared contracts package).

---

## PART B — App: lifecycle & UX robustness

### B1. No handling for blocked users, maintenance, or forced updates at the entry point
`src/core/updates/checkUpdates.ts` + `compareVersions.ts` exist (tested, even) but verify they're actually invoked at startup and wired to `appConfig` (minimum version, store URL, maintenance flag). Add: read `appConfig/public` on launch → if `maintenanceMode`, show a blocking screen; if `minAppVersion > current`, show force-update screen; if the profile has `isBlocked: true`, sign out with a support-contact message (backend enforces server-side per Backend-1 B3; the app should explain, not just fail).

### B2. Foreground/notification UX (extends Pass-1 3.6)
After tapping a notification for an order, `OrderTracking` opens — but if the app was cold-started from the notification, the navigation ref may not be ready (`navigationRef.current.navigate` in `RootNavigator`'s listener races container mount). Queue the deep link until `onReady` fires (React Navigation's `createNavigationContainerRef` + `isReady()` pattern). Also handle the `getInitialNotification`/killed-state case explicitly.

### B3. Error states are Alert-only and blocking
Every failure path uses `Alert.alert` (checkout, coupon, payment, cancel). Introduce a lightweight toast/snackbar (no new heavy dependency — a simple animated component in `shared/ui`) for recoverable errors, keep Alert only for decisions. Standardize Firebase error mapping: `functions/https` errors carry `code` (`failed-precondition`, `resource-exhausted` etc.) — map codes to human messages in one helper (`shared/lib/errors.ts`) instead of surfacing raw `error.message` (which currently leaks backend internals like "Rate limit exceeded for createOrderDraft").

### B4. Offline behavior is half-wired
`AppProvider` wires NetInfo → React Query's `onlineManager` (good) but: queries use default `retry: 2` even for callables (mutations through `useMutation` don't retry — fine — but `createOrderDraft` etc. are called OUTSIDE React Query as raw use-cases, so they get no offline queueing and no dedup). Minimum: pre-flight connectivity check in the order/payment use-cases with a clear "You're offline" message, and disable the Place Order button when `onlineManager.isOnline()` is false. Also enable Firestore's built-in persistence explicitly (RN Firebase: `firestore().settings({ persistence: true })` — confirm current default and set it deliberately) so catalog/orders render from cache offline.

### B5. Support/issues feature is schema'd but unbuilt
`shared/validation/index.ts` defines `issueSchema` (orderId, issueType, description, photoUrl) and the backend rules support `issues` + `issues/{id}/messages` — but the app's Help & Support just deep-links to WhatsApp (`ProfileScreen`). Build the in-app flow: "Report an issue" on OrderTracking (create `issues` doc — rules already allow owner create), a thread screen on the existing messages subcollection with `onSnapshot`, and surface admin replies via the notification center. Keep WhatsApp as a secondary option. This also gives the console's complaints/inbox pages (fixed in Pass-1 1.2) real data to manage.

### B6. Profile completeness
`ProfileScreen` menu has "Payment Methods" and "Coupons & Offers" items that navigate to a generic `SubScreen` placeholder. Either implement (Coupons: list active public coupons via the mechanism Backend-1 B4 established; Payment Methods: nothing to manage with UPI-only — remove it) or remove the dead entries. Add the "Delete account" entry required by Play policy, wired to the `deleteAccount` callable from Backend-2 B7, with a typed confirmation and active-order guard messaging.

---

## PART C — Website: second-pass findings

### C1. RBAC map vs backend roles mismatch
`lib/rbac.ts` defines a `viewer` role — but `firestore.rules` has no `viewer` in any `hasAnyAdminRole([...])` list, so a viewer passes `isAdmin()` (doc exists in `adminUsers`) and can READ everything admin-readable (orders, payments, profiles, auditLogs) while the UI pretends they're read-only — and `normaliseRole` DEFAULTS unknown roles to `viewer`, silently granting that read access on a typo'd role. Decisions: (a) confirm `viewer` is intended and add it to the backend role gates consistently (Backend passes unify roles — coordinate; read access for viewer is probably fine but make it explicit in rules), (b) make `normaliseRole` fail closed: unknown/missing role → sign out with an error, not a default role. Also reconcile the permissions matrix with what rules actually allow per role (e.g. rbac gives `support` → `users.write`; rules only allow support to update `profiles` — verify each Permission maps to a real allowed operation and prune the rest).

### C2. Session-time role staleness
`auth-context` reads `adminUsers/{uid}` ONCE at auth-state change. Revoking an admin (or changing role) doesn't take effect until they re-login; the backend's claim-sync (Backend-1 B1) invalidates tokens server-side but this client never refreshes. Subscribe with `onSnapshot` to the own `adminUsers` doc: on delete → force sign-out; on role change → update context live and re-evaluate current route access. Also call `user.getIdToken(true)` after detecting a change so refreshed custom claims reach callables.

### C3. Dashboard/analytics money math counts wrong
`dashboard.tsx#loadMetrics` counts `!data.paymentStatus || PAID_STATUSES.has(...)` as PAID — i.e., orders MISSING paymentStatus count as revenue, and `finalAmountMinor` includes orders later refunded (no subtraction of `refundedTotalMinor` from Backend-1 A2's partial-refund tracking). Audit all money aggregation pages (`dashboard`, `analytics`, `settlement`, `scorecards`): revenue = VERIFIED payments minus refunds, orders missing paymentStatus are NOT paid, and label metrics precisely ("Collected", "Refunded", "Net"). Extract shared aggregation helpers into `lib/metrics.ts` with unit tests (the console currently has NO tests — add vitest, it's a Vite project; wire `npm test`).

### C4. `_customer` layout and consumer routes need the same auth hardening
- `_customer/app.orders.$id.tsx`: verify it checks the order's `userId` against the session user client-side too (rules enforce it, but the page should show "not found" rather than a permissions error toast).
- After Pass-1 fixes `ensureCustomerDoc` → `profiles`, ensure a customer signing in on the website who ALSO has an `adminUsers` doc lands on the admin shell (current logic prefers admin — confirm and keep) and that customer-only users can never see `_authenticated` routes even by URL (the redirect exists; add the inverse: admins visiting `/app/*` consumer pages is allowed — fine — but document it).
- The services catalog pages read Firestore directly with NO loading/error UI in places — standardize on React Query with skeletons (components exist in `ui/skeleton.tsx`).

### C5. Console real-time listeners: scope and lifecycle
Beyond Pass-1's notifications-bell fix: `orders.tsx` subscribes to the latest 200 orders for as long as the tab is open (fine), but `kanban.tsx`, `scheduler.tsx`, `route-sheet.tsx`, `reattempts.tsx`, `sla-breach.tsx` each open their OWN full-collection `onSnapshot` — navigating between ops pages accumulates listeners if any cleanup is missed, and 5 pages × full orders stream is unnecessary read volume. Introduce one shared `useOrdersStream(scope)` hook (React Query + a single onSnapshot per scope, shared via queryClient) that these pages consume with client-side derivation; verify unsubscribes on unmount. Cap each with `where('createdAt', '>=', <recent>)` where the page semantics allow (kanban/scheduler only need non-terminal or recent orders — filter server-side by status with an `in` query).

### C6. Invoice/labels/export correctness
`lib/invoice.ts` (and labels/route-sheet printing) — verify against real order shape: `finalAmountMinor` fields, GST handling (`taxMinor` exists and is always 0 — if invoices show GST lines, they're fabricating tax; show tax only when non-zero and add your GSTIN via `appConfig`), addons rendered per item, and refund state on the invoice. Money formatting must use `formatINR` everywhere (grep for ad-hoc `/100` conversions and `toFixed` on money — replace).

### C7. Command palette searches a wrong collection and unbounded
`command-palette.tsx` queries `profile` (fixed to `profiles` in Pass 1 — verify) and fetches without limits on keystroke. Debounce (300ms), `limit(10)` per collection, and require ≥ 2 chars. Same for any other live search.

---

## PART D — Cross-cutting quality (both frontends)

### D1. Adopt the shared contracts package everywhere
As Backend-2 C4 lands `functions/src/contracts/` (zod schemas + types for every callable and shared enums like OrderStatus): replace ALL hand-rolled request/response types — app: `CheckoutRepository`, `PaymentRepository`, `OrdersRepository`, use-cases, `Order.ts` domain (keep the domain file but derive/re-export types); web: `admin-callables.ts`, checkout flow, `format.ts` ORDER_STATUSES. Add a lint/CI check that fails when a callable is invoked with a name string not present in the contracts (simple wrapper: `callFn(contracts.createOrderDraft, payload)` that types both sides).

### D2. Testing floor
- App: there are unit tests only for backend logic + `compareVersions`. Add Jest tests for: cart merge & totals (A8/Pass-1 3.3), `orderStatusMeta` completeness (every OrderStatus has an entry — catches future drift), coupon revalidation logic (A4), and error-code mapping (B3).
- Web: add vitest + tests for `lib/metrics.ts` (C3), `lib/rbac.ts` (role→route/permission matrix, fail-closed normaliseRole), and coupon/format helpers.
- Both: one Playwright (web) smoke — login → services → cart → checkout → mock payment; and document a manual app E2E script in `WORKFLOW.md`.

### D3. Accessibility & polish minimums
App: touch targets ≥ 44dp on the quantity steppers and tab bar (currently icon-only 16px hit areas on +/-/trash in checkout — pad them), `accessibilityLabel`/`accessibilityRole` on all Pressables, respect `prefers-reduced-motion` for the looping icon animations (extends Pass-1 3.8). Web: the console uses shadcn (good base) — ensure dialogs trap focus (they do), add `aria-label`s on icon-only buttons (theme toggle, bell, row actions), and keyboard row-activation in tables.

### D4. Build & release hygiene
- App: `eas.json` exists — verify profiles (dev/preview/prod) set distinct Firebase config, `expo-updates` channel per profile, and Crashlytics enabled only in prod (root `firebase.json` sets `crashlytics_debug_enabled: false` — confirm). Assert `google-services.json` matches the prod project.
- Web: `vite.config.ts` — add route-level code splitting for `_authenticated` (admin bundle should not ship to consumer visitors; TanStack Router supports lazy route components — make ALL `_authenticated/*` routes lazy), check bundle with `rollup-plugin-visualizer`, and confirm the Firebase hosting target `safaikart-admin` deploys `admin-console/dist` while consumer pages deploy correctly (two hosting targets exist — document which URL serves what in `admin-console/README`).
- Both: pin the exact same status/collection constants via D1 so a backend rename can't silently break one client.

---

## Constraints & definition of done

1. Backend contract is the source of truth; consume `functions/src/contracts/` as it lands (D1). Flag any contract gap you find to me rather than working around it.
2. Admin stays web-only; app stays customer-only. Nothing in this pass adds client-side writes to `orders`/`payments` or client-computed money sent to the server.
3. Fix A2's `₹NaN` payment screen and A1's dead App Check FIRST — one breaks the visible payment flow, the other will break every callable when backend enforcement lands.
4. Every logic change ships with tests per D2; TypeScript strict, no new `any`; app builds via `expo run:android`, web via `npm run build` in `admin-console/`, all green.
5. Small commits: `fix(app): A2 pass server finalAmountMinor to PaymentScreen`. Where earlier passes already fixed an item, note "verified fixed in pass N" in the commit/PR description instead of re-doing it.
6. Decisions made — don't re-ask: navigate-don't-alert after checkout (A3), remove Payment Methods menu / implement Coupons list (B6), viewer role kept but fail-closed normalisation (C1), in-app issues feature built (B5), all `_authenticated` routes lazy-loaded (D4).

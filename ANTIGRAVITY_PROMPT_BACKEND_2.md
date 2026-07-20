# Prompt for Antigravity — SafaiKart Backend Deep-Dive Pass 2 (Runtime Bugs, Business-Logic Gaps, Missing Subsystems)

## Context (read first)

This is the SECOND backend hardening pass for SafaiKart (Firebase project shared by the Expo Android app and the web console in `admin-console/`). Pass 1 (`ANTIGRAVITY_PROMPT.md`) covered: the editOrderItems dead-window bug, partial-refund webhook corruption, quantity validation, orders-create rule, late-capture resurrection, top-up payment flow, coupon usage recording, slot leaks, admin-auth unification, webhook logging/idempotency, profiles field rules, input validation/App Check, refund job queue, composite indexes, and config extraction.

**Check the current state of each file before fixing** — Pass 1 may have already landed some of these. If a Pass-1 fix already covers an item below, verify it actually does and move on. Everything in this prompt is NEW or a deeper cut. Same ground rules: pure logic in `*.logic.ts` files with Jest unit tests (`tests/unit/`), rules changes tested in `tests/rules/firestore.test.ts` against the emulator, small per-finding commits, region stays `asia-south1`, callable names and field shapes preserved unless stated.

---

## PART A — Critical runtime bugs (these crash or corrupt in production TODAY)

### A1. `FieldValue.serverTimestamp()` inside arrays — `adminUpdateOrderStatus` AND `adminAssignDriver` throw at runtime
`functions/src/admin/adminUpdateOrderStatus.ts` (~line 58–78) and `functions/src/admin/adminAssignDriver.ts` (~line 34–56) both build:
```ts
const now = admin.firestore.FieldValue.serverTimestamp();
const newStatusHistoryEntry = { status: newStatus, at: now };
updatePayload.statusHistory = admin.firestore.FieldValue.arrayUnion(newStatusHistoryEntry);
// and the else-branch: statusHistory: [{ status, at: orderData.createdAt }, newStatusHistoryEntry]
```
The Admin SDK **rejects `serverTimestamp()` sentinels inside array values** ("Server timestamps are not supported as array values") — both the `arrayUnion` path and the array-literal path throw. Consequence: **every admin status transition and every driver assignment fails** the moment it reaches the statusHistory write. Fix: use `admin.firestore.Timestamp.now()` for the `at` field inside array entries (keep `serverTimestamp()` for top-level `updatedAt`). Add a unit-extractable helper (e.g. `buildStatusHistoryUpdate(orderData, newStatus, now)` in a `.logic.ts`) with tests, and an integration-style test using `firebase-functions-test`/emulator that actually executes the update payload against Firestore to catch sentinel-placement errors in future.

### A2. `verifyPaymentStatus` explodes on top-up payment docs (`razorpayOrderId: null`)
`functions/src/payments/verifyPaymentStatus.ts` picks the LATEST payment (`orderBy createdAt desc, limit 1`). After `editOrderItems`/`adminConfirmOrderPrice` create a top-up payment doc with `razorpayOrderId: null`, the latest doc is that one → the code fetches `https://api.razorpay.com/v1/orders/null/payments`. Beyond the wasted call, the REAL captured payment for the original order is now unreachable through this endpoint — the app's polling fallback breaks exactly when the webhook is also most likely to have raced. Fix: skip payment docs with `razorpayOrderId == null` when selecting the record to verify (or verify ALL non-null payment docs for the order); coordinate with Pass-1's top-up fix (A6 there) so a top-up doc gets its Razorpay order created before it's ever the "latest".

### A3. Timezone bug in delivery estimates — pickup slots treated as UTC
`createOrderDraft.ts` (~line 144) and `editOrderItems.ts` (~line 180) build the pickup datetime as `new Date(`${slotData.date}T${HH}:${mm}:00Z`)` — the trailing **`Z` interprets an IST slot time as UTC**, so every `estimatedDeliveryDate` is shifted by +5:30 (a 10:00 IST pickup is computed as 15:30 IST). Fix: construct with the correct offset (`+05:30`) or store slot datetimes as Firestore Timestamps at slot-creation time and stop string-parsing. Extract `computeEstimatedDelivery(slotDate, startTime, maxDurationHours)` into a `.logic.ts` with unit tests covering the IST offset, midnight rollover, and malformed input (the current silent `catch → 48h fallback` should log a warning). Deduplicate — the same block is copy-pasted in both files.

### A4. `createOrderDraft` has no idempotency — network retries create duplicate orders
A flaky client that retries the callable (default SDK behavior on timeout is surfacing an error, but users tap "Place order" again) creates N orders, N slot-capacity increments, and N `PAYMENT_PENDING` ghosts. Fix: accept an optional `idempotencyKey` (client-generated UUID) in the payload; inside the transaction, check/create `orderIdempotency/{uid_key}` mapping to the created orderId; on replay return the existing `{orderId, finalAmountMinor, priceConfirmed}` instead of creating a new order. TTL-expire these docs (reuse the TTL mechanism from Pass-1 C5). Update the app's `CheckoutRepository`/usecase to send the key (one-line client change; flag it for the frontend pass).

### A5. Status-transition map has unreachable/missing states and no slot/refund side-effects
`adminUpdateOrderStatus.ts` `ALLOWED_TRANSITIONS`:
- `PAYMENT_PENDING → CANCELLED` is allowed but does NOT release the pickup slot (Pass-1 A8 fixed `cancelOrder`; this admin path has the same leak) and does not check `paymentStatus` — if a payment was VERIFIED while status lagged, cancelling here strands the customer's money with no refund path.
- `CANCELLED → REFUNDED` lets an admin mark REFUNDED **with zero verification that a Razorpay refund exists**. Require either a linked `refundId` on the order or route through the refund-job flow from Pass-1 C1; otherwise finance reporting will count phantom refunds.
- `REFUND_INITIATED` (set by `cancelOrder` after a successful Razorpay refund call) is **absent from the map entirely** — orders in that state can never be transitioned by admins (not even to REFUNDED when the webhook is missed). Add `REFUND_INITIATED: ['REFUNDED']`.
- Nothing ever sets `PICKUP_SCHEDULED` automatically even though every order HAS a pickup slot at creation. Decide: either auto-transition CONFIRMED→PICKUP_SCHEDULED when payment verifies (webhook/verifyPaymentStatus), or drop the state. Pick auto-transition (it's what the notification copy and app timeline expect) and document it.

### A6. `statusHistory` is only written by admin callables — customer-visible timeline is full of holes
The webhook's `PAYMENT_PENDING→CONFIRMED`, `cancelOrder`'s `→CANCELLED/REFUND_PENDING/REFUND_INITIATED`, `verifyPaymentStatus`'s `→CONFIRMED`, and the refund webhook's `→REFUNDED` all update `status` WITHOUT appending to `statusHistory`. The order timeline (rendered by both app `OrderTrackingScreen` and console `order-timeline.tsx`) silently misses the most important events. Fix: create one shared helper (same `.logic.ts` as A1) that every status write goes through — it appends the history entry (with `Timestamp.now()`, per A1) and sets `status` + `updatedAt` consistently. Refactor all five call sites onto it.

---

## PART B — Business-logic gaps (features half-built or unenforced)

### B1. Zones/serviceability is a UI fiction — the backend never checks it
A `zones` collection exists (admin console manages it, rules allow public read) but **no function ever consults it**. `createOrderDraft` accepts any address with any pincode — customers outside the service area can pay for pickups you can't fulfill. Fix: in `createOrderDraft`, after loading the address, validate `addressData.pincode` against active zones (design the lookup: either zone docs contain a `pincodes: string[]` array or a range; inspect what the console's `zones.tsx` actually writes and match it). Reject with a clear `failed-precondition` ("We don't service pincode X yet"). Also expose a lightweight `checkServiceability({ pincode })` callable so both frontends can gate the address form early.

### B2. Pickup slots: no past-date guard, no cleanup, no generation
`createOrderDraft` books any slot that `isActive && bookedCount < capacity` — **including slots whose date/time already passed**. Nothing generates future slots or deactivates past ones (ops presumably hand-creates them in the console). Fix: (a) reject booking when the slot's start datetime (IST, per A3) is in the past or less than a configurable lead-time (e.g. 2h) away; (b) add a scheduled function (can share the Pass-1 A8 scheduler) that deactivates expired slots; (c) optionally auto-generate the next N days of slots from a template in `appConfig` so ops stops hand-crafting documents.

### B3. Customers are never notified about the events that need action
`sendOrderStatusNotification` only fires on `status` change. Missing, high-value triggers:
- **Price confirmed / top-up required**: `adminConfirmOrderPrice` may create a pending extra payment and set `paymentStatus: 'PAYMENT_PENDING'` — the customer is NEVER told they owe money; the order just stalls. Send a push + notification-center entry ("Your final price is ₹X — pay ₹Y difference") when `priceConfirmed` flips true, with distinct copy for refund-due vs top-up-due vs unchanged.
- **Refund initiated/completed**: currently the REFUNDED case reuses cancellation copy ("Please collect your items" — wrong; Pass-1 C6 noted the copy, but also add a trigger on `refundStatus`/`refundId` changes so customers learn when money is actually on its way).
- **PICKUP_SCHEDULED** has no case in the switch at all (falls through to `return`) — the one status customers care most about sends nothing. Add it (ties into A5's auto-transition decision).
Restructure: move the copy map into a `.logic.ts` (`buildOrderNotification(before, after): {title, body, type} | null`) and unit-test every transition, so nobody adds a status without deciding its notification.

### B4. Reviews: no verification, no validation, no linkage
`firestore.rules` lets any signed-in user create a `reviews` doc with ANY fields — no schema check, no rating bounds, no proof they ever ordered, no one-review-per-order, and reviews are world-readable. Competitors/trolls can flood 1-star or absurd data. Fix: block direct client creates (`allow create: if false`) and add a `submitReview` callable that: validates rating ∈ 1..5 and text ≤ 1000 chars (zod), requires the referenced order to exist, belong to the caller, and be `DELIVERED`, enforces one review per order (deterministic doc ID `review_{orderId}`), and snapshots `serviceIds` for aggregation. Keep public read.

### B5. Broadcasts: admins compose them, nothing sends them
The console writes `broadcasts` docs but **no function delivers them** — the marketing feature is a write-only collection. Fix: add an `onDocumentCreated('broadcasts/{id}')` trigger that: reads targeting (all users / by zone / by last-order-age — inspect what fields `broadcasts.tsx` actually writes and support those), fans out FCM via topic messaging (subscribe app clients to a `broadcast` topic on login — flag the one-line app change for the frontend pass) or batched `sendEachForMulticast` over `profiles.fcmTokens` for small audiences, writes per-broadcast delivery stats back onto the doc (`sentCount`, `failedCount`, `completedAt`), and marks status `SENT`/`FAILED`. Cap audience size per run and process in chunks to stay within function timeout; make the trigger idempotent (check `status` before sending).

### B6. Dead collections promised by rules but never implemented — decide and act
- `orders/{orderId}/logs` subcollection: rules say "written by Cloud Functions only" — **no function writes it, ever**. Either write real per-order logs there from the shared status helper (A6) and admin actions, or delete the rule block. Prefer implementing: it gives the console's order timeline an authoritative source.
- `settlements`: read-only-for-finance rules, "Cloud Function only" writes — no writer exists. If settlement reports are on the roadmap, add a scheduled monthly aggregation (sum VERIFIED payments minus REFUNDED, by day); otherwise remove the rules block and console page stub. Pick based on the console's `settlement.tsx` — if it renders orders directly, drop the collection.
- `referrals`: rules exist, zero backend logic (no referral code generation, no credit). Remove the rules block or explicitly park it with a TODO — don't leave phantom attack surface.

### B7. Account deletion — required by Google Play, entirely missing
The app has account creation (phone OTP) but no deletion path; **Google Play's account-deletion policy requires it**. Add a `deleteAccount` callable: verifies recent auth, refuses if the user has active (non-terminal) orders, then deletes/anonymizes `profiles/{uid}`, `users/{uid}`, `addresses` (query by userId), `carts/{uid}`, FCM tokens, and finally the Auth user (`admin.auth().deleteUser`). Keep `orders`/`payments` rows for financial records but strip PII from `addressSnapshot` where legally allowed (document the retention decision). Also add an `onUserDelete` (v1 auth trigger, like `onUserCreate`) as a safety net that runs the same Firestore cleanup when a user is deleted via the Firebase console. Flag the app-side "Delete account" screen for the frontend pass.

---

## PART C — Hardening & correctness details

### C1. Payment webhook edge cases not yet covered by Pass 1
- **Amount-mismatch dead end**: on amount/currency mismatch the payment doc is set `FAILED` and 200 returned — but the ORDER keeps `paymentStatus: 'PAYMENT_CREATED'` forever and no one is alerted, even though money may have been captured at Razorpay. Write an `auditLogs` alert entry + set an `attention: true` flag on the order that the console surfaces (finance must manually refund at the gateway). This should never silently 200.
- **`payment.failed` races the customer's retry**: the failed handler sets the (single) payment doc `FAILED` keyed by `razorpayOrderId` — but one Razorpay order can receive multiple payment attempts; a `payment.failed` for attempt 1 arriving AFTER `payment.captured` for attempt 2 is guarded (VERIFIED check) — good — but a failed webhook arriving between the customer's retry and its capture flips the doc to FAILED and `createPaymentOrder`'s dedupe loop (`CREATED || PENDING`) then creates a SECOND Razorpay order while the first may still capture → double payment risk. Fix: before creating a new Razorpay order for a retry, call Razorpay's fetch-payments-for-order API on the existing `razorpayOrderId` and refuse if any attempt is `authorized`/`captured`/in-flight.
- **`refund.processed` for unknown payment**: logs a warning and commits nothing — but returns 200 OK, so it's lost forever. Write it to `auditLogs` with `attention: true`.

### C2. `cancelOrder` sets `refundStatus: 'PROCESSED'` on API acceptance — that's a lie
Razorpay's refund API returning 200 means the refund is *created* (`refund.status` is usually `processed` for instant refunds but can be `pending`/`failed` later). The truthful state is INITIATED until the `refund.processed` webhook lands. Rename the write to `refundStatus: 'INITIATED'`, store `refundId`, and let the webhook (Pass-1 A2 fixed version) flip to REFUNDED. Mirror the same in `editOrderItems`/`adminConfirmOrderPrice`'s post-transaction refund blocks (they currently write `refundStatus: 'PROCESSED'` too).

### C3. Rate limiting is missing exactly where it's expensive
Only `createOrderDraft` uses `rateLimiter`. Add it to: `createPaymentOrder` (each call can hit Razorpay's API), `verifyPaymentStatus` (polling endpoint that calls Razorpay — the app polls this; e.g. 30/hour/user), `validateCoupon` (coupon brute-force enumeration; 20/hour), `saveFcmToken`/`removeFcmToken` (10/hour), and the new `submitReview`/`deleteAccount`/`checkServiceability`. Also fix `rateLimiter` itself: the `calls` array is rewritten wholesale each transaction (contention hot-spot for a busy user) and unbounded within the window — trim to `maxCalls` entries and set an `expiresAt` field for the TTL policy.

### C4. Callable/data-contract drift between clients and functions — make the contract a typed artifact
Concrete drift found: the web console sends `{ orderId, status }` to `adminUpdateOrderStatus` but the function reads `newStatus` (every console status update fails with invalid-argument — the frontend pass fixes the client, but the root cause is that nothing owns the contract). Create `functions/src/contracts/` exporting zod schemas + inferred TS types for EVERY callable's request/response (`CreateOrderDraftRequest`, `AdminUpdateOrderStatusRequest{ orderId, newStatus }`, etc.). Functions parse requests through these schemas (this also completes Pass-1 B6); publish the same file to both frontends (simplest: a shared `packages/contracts` folder or a copy-on-build script — pick one and wire it). Fail loudly with field-level messages on mismatch.

### C5. `onUserCreate` has no error resilience and `profiles.role` duplicates authz state
- If the batch commit fails (transient), the auth user exists with no profile forever — the app's profile query then breaks. Auth triggers retry only if you enable retries: set `failurePolicy`/retry on the trigger and make the writes idempotent (`set` with merge — they already are; just enable retry and document it).
- `profiles.role: 'USER'` overlaps with the `adminUsers` role system unified in Pass-1 B1 — nothing reads `profiles.role`. Remove the field from creation (and from rules-tests fixtures) to avoid a second, contradictory authority.

### C6. Firestore rules — smaller gaps this pass
- `addresses`: no field validation (add `hasOnly` on expected keys + pincode `string.size() == 6` + line lengths) and **no cap per user** (a client can create unlimited docs). Enforce a cap in the `addAddress` path server-side or via a rules `get` on a counter; simplest: cap client creates at rules level is impractical — move address creation behind a callable OR accept the risk but add the field validation now.
- `carts`: items array size is capped (50) but item SHAPE is not — add map-key validation for each item (`serviceId`, `quantity`, `priceMinor`, `nameSnapshot`, `addons`) or at minimum validate `items` is a list of maps. Server-side revalidation (Pass-1 A3) is the real guard; this just cuts junk-data writes.
- `pickupSlots` are world-readable including `bookedCount` — fine functionally, but competitors can scrape your order volume in real time. Consider exposing only `isFull: bool` client-side (computed at write) and moving exact counts to admin reads. Low priority; note the decision either way.
- `appConfig` is world-readable and Pass-1 C5 moves pricing knobs (delivery fee) into it — verify nothing SECRET gets configured there (no API keys, no internal thresholds you don't want public). Split `appConfig/public` (world-readable) vs `appConfig/internal` (admin-read-only, functions read via Admin SDK) doc IDs.

### C7. `notifications` collection grows forever
Every order transition adds a doc per event; there's no TTL and no pagination contract. Add a TTL field (`expiresAt = createdAt + 90d`) + Firestore TTL policy, and a `markAllNotificationsRead` callable (the app currently marks one at a time — N round-trips for "mark all read"; do a batched update server-side, cap 500).

---

## PART D — Engineering hygiene & ops

### D1. Dependency/version skew in `functions/`
`functions/package.json`: TypeScript `^4.9` (root repo uses ~6.0 — the functions code compiles under rules different from everything else), `firebase-admin ^12` (root app erroneously has `^14` — Pass-1 C5 removes it from the app; functions should move to the current major), `firebase-functions ^5` (current is v6 — the v2 API you already use is stable across it). Upgrade all three in `functions/`, fix any breaking changes (v6 changes some default option types), and pin Node `"engines": { "node": "22" }` if the firebase-functions version supports it, else stay 20 and note why.

### D2. The `logger.ts` utility exists but every function uses raw `console.*`
`functions/src/utils/logger.ts` wraps the structured `firebase-functions/logger` — and has ZERO importers. Replace all `console.log/warn/error` calls across `functions/src/` with `logInfo/logWarn/logError`, and include stable context keys (`orderId`, `uid`, `paymentId`) so Cloud Logging queries work. Add an ESLint rule (`no-console`) to functions to keep it that way — functions currently have no lint config at all; add a minimal `eslint.config.js` (typescript-eslint recommended) and a `lint` script wired into the build.

### D3. Emulator/integration testing is firestore-rules-only
`firebase.json` emulators block only configures firestore. Add `functions`, `auth`, and `storage` emulator config + an `npm run test:integration` project that boots the emulator suite and exercises the money paths end-to-end: createOrderDraft → createPaymentOrder (Razorpay fetch mocked/stubbed) → webhook POST with a signed body → order CONFIRMED; plus cancel-with-refund and the A1 statusHistory write. The A1 bug (serverTimestamp-in-array) is exactly the class of failure unit tests can't catch — this suite is the fix.

### D4. Deploy safety
- No CI is configured anywhere (no `.github/`). Add a workflow: install → build functions → `npm test` (unit) → rules tests on emulator → (on main) `firebase deploy --only functions,firestore:rules,storage` with a manual approval gate. Store the Firebase token/workload identity as a secret.
- `firebase.json` deploys rules from the ROOT `firestore.rules`, but a SECOND `storage.rules` exists inside `admin-console/` — confirm it's a stale duplicate and delete it (deploying the wrong one would drop the orderPhotos protections).
- Verify `.env` at repo root is gitignored and contains no server secrets (Razorpay secrets must live only in Functions Secret Manager — `defineSecret` is already used; keep it that way). If `.env` was ever committed with secrets, rotate them.
- Enable Firestore Point-in-Time Recovery / scheduled backups for the project and document the runbook in `functions/README.md` (create it): how to replay a missed webhook, how to manually refund, how to restore.

### D5. Function runtime options
Set explicit options where defaults hurt: `paymentWebhook` — `minInstances: 1` if budget allows (webhook cold-start + Razorpay's timeout window), `maxInstances` caps on everything (runaway-cost guard, e.g. 10), `timeoutSeconds: 30` for callables (default 60 is generous for these), memory 256Mi is fine. Do it via `setGlobalOptions` + per-function overrides, with a comment on each override.

---

## Constraints & definition of done

1. Don't regress Pass-1 fixes; rebase onto whatever has landed. Where this prompt and Pass 1 touch the same file, this prompt's items are additive.
2. Both clients (app + web) keep working against the same database — any contract change lands in `functions/src/contracts/` (C4) and is flagged in the commit message with `BREAKING-FOR-CLIENTS:` so the frontend pass picks it up.
3. Every `.logic.ts` change ships with unit tests; A1/A6/D3 ship with emulator integration tests; rules changes ship with rules tests. All suites green (`npm test`, `npm run test:rules`, new `test:integration`).
4. Work order: PART A (all of it, A1 first — it's breaking production admin actions) → B7 (Play-policy compliance) → rest of B → C → D. Small commits: `fix(functions): A1 Timestamp.now() in statusHistory arrays`.
5. Decisions I've already made — don't re-ask: implement `orders/{id}/logs` (B6), auto-transition CONFIRMED→PICKUP_SCHEDULED (A5), reviews via callable (B4), broadcasts via trigger (B5), account deletion with order-record retention (B7). For anything else ambiguous, choose the smallest backward-compatible option and record it in the commit message.

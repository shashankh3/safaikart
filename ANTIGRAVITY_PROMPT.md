# Prompt for Antigravity — SafaiKart Backend Hardening & Bug-Fix Pass

## Context (read first)

This repo is **SafaiKart**, a laundry/cleaning-services platform with:

- **Customer mobile app**: Expo / React Native (repo root, `App.tsx`, `src/`), using `@react-native-firebase/*`.
- **Admin console**: web-only React app in `admin-console/` (Vite + shadcn/ui + TanStack Router). Admin work happens ONLY on the web — the mobile app must stay lean and customer-only. Do not add any admin features/screens/deps to the mobile app.
- **Shared backend**: one Firebase project used by BOTH clients — Firestore (`firestore.rules`), Cloud Storage (`storage.rules`), and Cloud Functions in `functions/src/` (region `asia-south1`), with Razorpay for payments (order create, webhook, refunds).

Key flows today:
- App calls `createOrderDraft` (callable) → order doc in `orders` with status `PAYMENT_PENDING` → `createPaymentOrder` creates a Razorpay order + `payments` doc → payment completes via `paymentWebhook` (HTTP) or `verifyPaymentStatus` (polling fallback) → order becomes `CONFIRMED`.
- Admin console drives fulfillment via callables: `adminUpdateOrderStatus`, `adminConfirmOrderPrice` (for `priceType: 'variable'` items), `adminAssignDriver`, `adminSetOrderPhotos`.
- `sendOrderStatusNotification` (Firestore trigger on `orders/{id}` update) writes to a `notifications` collection and sends FCM.

Your job: fix the flaws below and implement the improvements, **without breaking the existing app/console contract** (keep callable names, field names, and status values unless a fix explicitly requires a change — if so, update both clients too). Write/extend Jest tests for every logic fix (`functions` already has extracted pure logic files: `pricing.logic.ts`, `coupon.logic.ts`, `editOrder.logic.ts`, `webhook.logic.ts` — keep following that pattern: pure logic in `.logic.ts`, thin handlers around it).

---

## PART A — Critical bugs (fix these first)

### A1. `editOrderItems` is impossible to ever succeed (dead feature)
`functions/src/orders/editOrderItems.ts`: the handler requires `now - order.updatedAt >= 5 minutes` (the "D7 rate limit") AND `now <= order.editableUntil` (created as `createdAt + 3 minutes` in `createOrderDraft`). Since `updatedAt` is set to server time at order creation, both conditions can never be true simultaneously — every edit attempt fails. Fix: replace the `updatedAt`-based cooldown with a dedicated field (e.g. `lastEditedAt`, only set by successful edits) or drop the cooldown inside the 3-minute window entirely. Add a unit test proving an edit at t+1min succeeds and at t+4min fails.

### A2. Partial refund destroys active orders (money/state bug)
`functions/src/payments/paymentWebhook.ts`: the `refund.processed` branch unconditionally sets the order to `status: 'REFUNDED', paymentStatus: 'REFUNDED'`. But `editOrderItems` and `adminConfirmOrderPrice` issue **partial** refunds on live orders (price decreased). When Razorpay fires `refund.processed` for that partial refund, the webhook marks the whole in-progress order REFUNDED — killing fulfillment. Fix: compare `refund.amount` against the captured payment amount; only transition the order to REFUNDED on a full refund (or when order status is `REFUND_PENDING`/`CANCELLED`); for partial refunds, record the refund (e.g. append to a `refunds` array / update `refundedTotalMinor`) without touching order status.

### A3. Client-supplied quantities are never validated (money exploit)
`createOrderDraft` and `editOrderItems` take `item.quantity` straight from the client with no checks. A negative or fractional quantity flows into `calculateOrderTotals`, producing negative line totals → reduced/negative `finalAmountMinor`, and in `editOrderItems` on a CONFIRMED order a lowered total triggers an automatic Razorpay **refund** — i.e. user-triggered refunds while keeping items. Fix: in both handlers validate every item: `Number.isInteger(quantity) && quantity > 0 && quantity <= 100` (mirror the checks already done in `adminConfirmOrderPrice`), cap total item count (e.g. ≤ 50), and validate `directItems` shape with zod (zod is already a dependency; add it to `functions/package.json` if absent). Reject, don't silently skip.

### A4. Clients can create arbitrary `orders` docs directly in Firestore
`firestore.rules` line ~103: `allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;` on `orders`. But orders are created exclusively by the `createOrderDraft` callable via the Admin SDK (which bypasses rules). This rule lets any signed-in user write an order doc with ANY fields — e.g. `status: 'CONFIRMED'`, `finalAmountMinor: 0`, `priceConfirmed: true` — which then flows into the admin console and fulfillment. Fix: change to `allow create: if false;` (the header comment in the rules file already states this intent).

### A5. Late payment capture resurrects cancelled orders
`paymentWebhook` (`payment.captured` branch) and `verifyPaymentStatus` both set the order to `CONFIRMED` without checking its current status. If the user cancels while payment is in flight (or an old Razorpay order pays late), a `CANCELLED` order silently becomes `CONFIRMED`. Fix: inside the transaction, if order status is `CANCELLED`/`REFUND_PENDING`/`REFUNDED`, do NOT confirm — mark the payment `VERIFIED` but flag it (e.g. `requiresRefund: true`) and/or initiate an automatic refund, and log to `auditLogs`.

### A6. "Additional payment" flow is broken end-to-end
When `editOrderItems` or `adminConfirmOrderPrice` computes a price increase, they create a `payments` doc with `status: 'PENDING', razorpayOrderId: null` and set `paymentStatus: 'PAYMENT_PENDING'` on the order — but:
- `createPaymentOrder` refuses unless `order.status === 'PAYMENT_PENDING'` (the order is `CONFIRMED`), so the customer can never pay the difference; and
- `createPaymentOrder`'s dedupe loop finds any `CREATED`/`PENDING` payment and returns it as-is — for these docs that means returning `razorpayOrderId: null` and a broken `checkoutUrl`.
Fix: make `createPaymentOrder` support top-up payments (accept when `paymentStatus === 'PAYMENT_PENDING'` even if status is CONFIRMED; when the found pending payment has `razorpayOrderId: null`, create the Razorpay order for it — for its `amountMinor`, not the order's full amount — and update the doc). Add tests.

### A7. Coupon usage is never recorded (infinite reuse)
`coupon.logic.ts` checks `usedCount`, `maxUsage`, `usedBy` — but nothing ever increments `usedCount` or appends to `usedBy`. Every coupon is infinitely reusable by everyone. Also, `createOrderDraft` and `editOrderItems`/`adminConfirmOrderPrice` re-implement a weaker coupon check (only `isActive` + `minimumOrderAmount`; no expiry, no per-user, no max-usage) instead of calling `validateCouponApplicability`. Fix: (a) use `validateCouponApplicability` everywhere a coupon is applied; (b) on successful payment confirmation (webhook / verifyPaymentStatus), atomically `usedCount: increment(1)` and `usedBy: arrayUnion(uid)` in the same transaction; (c) release usage on full refund/cancel if you count at confirm-time.

### A8. Pickup-slot capacity leaks
`createOrderDraft` increments `pickupSlots.bookedCount` in the order transaction, but nothing ever decrements it — not on `cancelOrder`, not when a `PAYMENT_PENDING` order is abandoned. Slots fill up permanently with ghost bookings. Fix: decrement `bookedCount` (floor at 0) in `cancelOrder`'s transaction, and add a **scheduled function** (e.g. every 30 min) that expires orders stuck in `PAYMENT_PENDING` for > N hours: set them `CANCELLED` (reason `PAYMENT_TIMEOUT`) and release their slot.

---

## PART B — Security & rules

### B1. Unify the two parallel admin-auth systems
Today there are two disconnected admin mechanisms:
- **Firestore rules** check a doc in `adminUsers/{uid}` with a `role` field (`superadmin`/`admin`/`ops`/`support`/`finance`).
- **Callables** (`utils/assertAdmin.ts`) and **storage.rules** check the custom claim `token.admin === true` — with NO role granularity, set only by a manual script (`scripts/makeAdmin.js`).
Consequences: an `ops` user in `adminUsers` without the claim can't call any admin callable; anyone with the bare claim can call ALL admin callables including finance-sensitive `adminConfirmOrderPrice`; revoking (`scripts/revokeAdmin.js`) clears claims but may leave the `adminUsers` doc, or vice versa. Fix: make `adminUsers` the single source of truth. Add a Firestore trigger on `adminUsers/{uid}` writes that syncs custom claims `{ admin: true, role: <role> }` (and clears them on delete). Extend `assertAdmin` to `assertAdmin(request, allowedRoles?: string[])` and apply per-callable role gates consistent with `firestore.rules` (e.g. `adminConfirmOrderPrice` → superadmin/admin/finance; `adminAssignDriver` → superadmin/admin/ops; `adminUpdateOrderStatus` → superadmin/admin/ops).

### B2. Webhook logs unauthenticated payloads before signature verification
`paymentWebhook` writes the FULL raw body of every request into `auditLogs` BEFORE verifying the Razorpay signature. Anyone on the internet can spam this endpoint and bloat Firestore (cost attack), and full payloads containing customer payment PII are readable by every admin role. Fix: verify the signature FIRST; log only verified events, and store a redacted summary (event type, ids, amount) — not the raw payload. Also add webhook **event-id idempotency** (store `x-razorpay-event-id` in a dedupe doc; skip already-processed events) instead of relying only on payment-status checks.

### B3. `profiles` update rule lets users edit privileged fields
`firestore.rules`: `allow update: if isOwner(uid) || ...` on `profiles` with no field restrictions — a user can set their own `isBlocked: false`, change `role`, or tamper `fcmTokens`/`phoneNumber`. The `affectsOnly()` helper is already defined in the rules file but never used. Fix: restrict owner updates to safe fields, e.g. `affectsOnly(['displayName', 'photoURL', 'defaultAddressId', 'email', 'updatedAt'])`; privileged fields (`isBlocked`, `role`, `fcmTokens`) only via admin roles or Cloud Functions. Also: nothing anywhere enforces `isBlocked` — add a check in `createOrderDraft`/`createPaymentOrder` that rejects blocked users.

### B4. `coupons` are world-readable
`allow read: if true` on `coupons` exposes every coupon code, discount value, and the `usedBy` array (a list of customer UIDs — PII) to anyone, unauthenticated. The app already has a `validateCoupon` callable for checking codes. Fix: `allow read: if isAdmin();` and make the app rely on the callable. If the app currently lists public promo coupons, add an explicit `publicCoupons`/flagged subset instead.

### B5. `notifications` collection has NO Firestore rules
The trigger writes to `notifications` and `markNotificationRead` exists, but the rules file never matches `notifications` — default-deny means the app cannot read its own notification list (the in-app notification center silently shows nothing). Fix: add rules — `allow read: if isOwner(resource.data.userId) || isAdmin(); allow write: if false;`. Same review for `rateLimits` (should be locked: functions use Admin SDK) — confirm and document.

### B6. Missing input validation on all callables
No callable validates payload shape/types beyond presence checks (`adminSetOrderPhotos` accepts any array as `photos`; `cancelOrder` stores raw `reason`; etc.). Add zod schemas per callable (ids: non-empty strings with sane max length; `photos`: array of https URLs ≤ 20; `reason`: string ≤ 500 chars; quantities per A3). Also enable **App Check enforcement** (`enforceAppCheck: true`) on customer-facing callables — the app already ships `@react-native-firebase/app-check`; verify the admin console path too (web App Check/reCAPTCHA) before enforcing there.

### B7. Error-handling leaks and mis-typed errors
`cancelOrder` catches everything and rethrows `new HttpsError('internal', error.message)` — this both leaks internal error text to clients and converts proper `permission-denied`/`failed-precondition` codes into `internal` (the app can't distinguish). `adminConfirmOrderPrice` writes raw Razorpay error text (`refundError: errText`) onto the order doc, which customers can read. Fix: rethrow `HttpsError` as-is, wrap unknown errors with a generic message, keep details in server logs only, and store sanitized refund-failure info.

---

## PART C — Reliability & operational improvements

### C1. Refund-after-transaction has no retry path
In `cancelOrder`, `editOrderItems`, `adminConfirmOrderPrice`, the Razorpay refund HTTP call happens AFTER the Firestore transaction commits. A crash/timeout between the two leaves orders stuck in `REFUND_PENDING` (or with `refundStatus: 'FAILED'`) with no automated recovery. Fix: introduce a `refundJobs` (or task-queue) pattern — the transaction enqueues a refund job doc; a scheduled function (or `onDocumentCreated` trigger with retry) processes pending jobs idempotently (use Razorpay idempotency via receipt/notes). Surface failed refunds in the admin console (`settlements`/finance area).

### C2. Composite indexes are not managed in the repo
`firebase.json` has no `firestore.indexes` entry. Queries in code require composite indexes — e.g. `verifyPaymentStatus`: `payments` where `orderId` + `userId` + orderBy `createdAt desc`; `createPaymentOrder`: `orderId` + `userId`; webhook: `razorpayOrderId`. In production these throw `FAILED_PRECONDITION` unless someone clicked the console link manually. Fix: add `firestore.indexes.json` with every needed composite index and wire it into `firebase.json`.

### C3. N+1 reads and unbounded loops in checkout
`createOrderDraft` awaits one Firestore `get` per cart item sequentially. Fix: batch with `db.getAll(...refs)` and cap items (see A3). Same in `editOrderItems` (inside the transaction — use `transaction.getAll`).

### C4. v1/v2 SDK inconsistency
`createOrderDraft` uses v1 (`functions.region(...).https.onCall`, `(data, context)`) while everything else is v2 `onCall` with `setGlobalOptions({ region: 'asia-south1' })`. Migrate `createOrderDraft` to v2 for consistent options (region, App Check, secrets). `onUserCreate` must stay v1 (auth triggers have no v2 equivalent) — leave it, but add a comment saying why.

### C5. Data hygiene
- `rateLimits` docs grow forever; add Firestore TTL policy (document it; TTL field e.g. `expiresAt`) or clean them in the scheduled job from A8.
- Hardcoded values to move into `appConfig` (already exists, superadmin-writable, public-readable): delivery fee (`4000` minor hardcoded in `createOrderDraft`), edit window (3 min), rate limits, category fallback durations (`steam_press: 24 / household: 72 / else 48` duplicated in two files — deduplicate into shared logic regardless).
- `createPaymentOrder` hardcodes `method: 'upi'` and the hosting checkout URL `https://safaikart-6c4e4.web.app/...` — derive the base URL from config/env, and set `method` from the actual webhook payload only (it already does on capture; just don't pre-fill wrongly).
- Root `package.json` of the MOBILE APP depends on `firebase-admin` — a server-only SDK that must never ship in the app bundle. It's only needed by `scripts/makeAdmin.js`/`revokeAdmin.js`; give `scripts/` its own `package.json` and remove `firebase-admin` from the app.

### C6. Notification trigger robustness
`sendOrderStatusNotification`: token cleanup does a read-then-write on `profiles.fcmTokens` without a transaction (races with `saveFcmToken`); use a transaction or arrayRemove of exact entries. Also the REFUNDED status reuses "order was cancelled. Please collect your items" copy — wrong for refunds; give REFUND/REFUNDED distinct copy.

---

## Constraints & definition of done

1. **Do not** move admin functionality into the mobile app; admin stays web-only (`admin-console/`). Both clients keep sharing the same Firestore database.
2. Preserve existing callable names and Firestore document shapes; where a shape must change (e.g. refunds array), keep old fields populated for backward compatibility and update BOTH clients' read paths.
3. Every pure-logic change gets Jest unit tests (follow the existing `*.logic.ts` + `jest --selectProjects unit` pattern). Every `firestore.rules` change gets a rules test (`npm run test:rules` uses `@firebase/rules-unit-testing` against the emulator) — at minimum: orders create now denied to clients, profiles privileged-field update denied to owner, notifications readable by owner only, coupons no longer world-readable.
4. Run `npm test` in `functions/` and the rules suite; all green before finishing.
5. Order of work: PART A (A1–A8) → PART B → PART C. Deliver as small, reviewable commits per finding (e.g. `fix(functions): A2 partial refund no longer marks order REFUNDED`).
6. If you find that fixing something requires a decision I haven't specified (e.g. exact top-up payment UX), pick the smallest backward-compatible option and document it in the commit message.

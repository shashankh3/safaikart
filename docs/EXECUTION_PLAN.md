# SafaiKart — Execution Plan (Remaining Work)

> **How to use this file:** Each `TASK N` block below is self-contained — paste one block at a
> time into your executing agent (e.g. Antigravity), let it finish, paste its report back to the
> planning session for verification, then take the next block. Do them **in order**; later tasks
> assume earlier ones landed.
>
> Status of the codebase when this plan was written (2026-07-15):
> - Firestore (project `safaikart-6c4e4`) is live and reachable; billing is ACTIVE (docs saying
>   "billing blocked" are stale — 10 functions are already deployed, currently in us-central1).
> - Region fix (asia-south1) is already applied in code but NOT yet deployed (Task 0).
> - Auth, push notifications, App Check, and parts of payments are mocked/stubbed.

---

## TASK 0 — Deploy region-fixed functions (HUMAN action, not agent)

Run in the project root:

```
npx firebase-tools deploy --only functions --project safaikart-6c4e4
```

- Confirm YES when asked to delete the old `us-central1` functions (they are recreated in `asia-south1`).
- Afterward verify: `npx firebase-tools functions:list --project safaikart-6c4e4` → every function shows `asia-south1`.
- Update the Razorpay dashboard webhook URL to the new
  `https://asia-south1-safaikart-6c4e4.cloudfunctions.net/paymentWebhook`.
- Commit the 4 changed files (functions/src/index.ts, functions/src/checkout/createOrderDraft.ts,
  src/features/orders/infrastructure/OrdersRepository.ts,
  src/features/profile/presentation/screens/NotificationCenterScreen.tsx).

**Blocks:** every callable in the app until done.

---

## [DONE] TASK 1 — Real phone-OTP auth (replaces the anonymous-auth mock)

**Why first:** every order/address/profile is currently tied to a throwaway anonymous UID, and
`isAdmin` (email check in `src/features/auth/application/useAuth.ts:18`) can never be true, so the
admin screens are unreachable. Nothing else user-facing is trustworthy until identity is real.

**Current state:**
- `src/features/auth/presentation/screens/PhoneLoginScreen.tsx:22-29` — real `sendPhoneOtp` is
  commented out; navigates to OTP screen with `confirmation: null`.
- `src/features/auth/presentation/screens/OtpVerificationScreen.tsx:25-26` — any 6-digit code
  calls `signInAnonymously(auth)`.

**Do:**
1. Implement real Firebase phone auth for the JS SDK in Expo. Options (pick based on what the
   project supports — it currently runs in Expo Go but Tasks 3+ move it to a dev client):
   - Preferred (works after Task 3): `@react-native-firebase/auth` native `verifyPhoneNumber`.
   - Interim (works in Expo Go): `firebase/auth` `signInWithPhoneNumber` + a reCAPTCHA verifier
     (e.g. `expo-firebase-recaptcha`-style modal WebView). Check current Expo SDK 56 docs at
     https://docs.expo.dev/versions/v56.0.0/ before choosing a package.
2. PhoneLoginScreen: send real OTP, pass the confirmation object to OtpVerificationScreen.
3. OtpVerificationScreen: `confirmation.confirm(code)`; remove `signInAnonymously` and the
   "any 6 digits" bypass. Handle wrong-code and expired-code errors with user-visible messages.
4. On first sign-in, ensure the `users/{uid}` + `profiles/{uid}` docs are created (check
   firestore.rules — profile create is `allow create: if false`, so creation must happen in a
   Cloud Function or be permitted by a rules change; inspect how the current code expects
   profiles to appear and make it consistent).
5. Keep `EXPO_PUBLIC_ADMIN_EMAIL` admin gating working: decide how admin identity attaches to a
   phone-auth user (email link on profile doc, or an `adminUsers` collection check — the rules
   file already has an `adminUsers` collection; prefer that and update `useAuth.ts`).
6. Enable the Phone sign-in provider in the Firebase console (note it in the report if you can't).

**Acceptance:**
- Fresh install → enter real phone number → receive SMS → sign in; `auth.currentUser` is a phone
  user, not anonymous.
- Wrong OTP shows an error, doesn't sign in.
- Admin detection path compiles and is documented in the report.
- `npx tsc --noEmit` clean.

**Report back:** what package/approach was used, files touched, anything requiring console
configuration (test numbers, reCAPTCHA keys), and any rules changes proposed.

---

## [DONE] TASK 2 — Complete the Razorpay payment path

**Current state:**
- `functions/src/payments/createPaymentOrder.ts:67,133` points the client WebView at
  `https://safaikart-checkout.web.app/checkout?order_id=...` — **that page does not exist**
  (repo `public/` is just the Expo web shell; firebase.json has no `hosting` section).
- `RAZORPAY_KEY_ID` env is unset → falls back to `'rzp_test_placeholder'`
  (createPaymentOrder.ts:20, verifyPaymentStatus.ts:6).
- Secrets `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` are `defineSecret`-declared but not
  yet created in Secret Manager.
- Refunds are mocked: `functions/src/orders/editOrderItems.ts:126-132` (console.log), and
  `cancelOrder.ts:41-44` sets `REFUND_PENDING` with no Razorpay refund call.

**Do:**
1. Build the hosted checkout page: a minimal static page that reads `order_id` (+ whatever the
   function passes), loads `https://checkout.razorpay.com/v1/checkout.js`, opens Razorpay
   Checkout with `method: { upi: true, card: true, netbanking: true, wallet: true }` (per
   WORKFLOW.md), and on success/failure posts a message the app's WebView
   (`src/features/payments/presentation/screens/PaymentScreen.tsx`) can catch, and/or relies on
   the webhook + `PaymentPendingScreen` onSnapshot flow that already exists. Put it under
   `public/checkout/` and add a `hosting` section to firebase.json.
2. Set `RAZORPAY_KEY_ID` properly (functions env via `defineString`/params or hardcode the
   publishable test key for now — key ID is not secret; the SECRET stays in Secret Manager).
3. Implement real refunds with the Razorpay Orders/Refunds REST API using the existing secret:
   - `cancelOrder`: if payment captured → create refund, store refund id, set `REFUND_INITIATED`;
     webhook (`refund.processed`) advances to `REFUNDED`.
   - `editOrderItems`: replace the mocked partial refund/extra-payment block — partial refund via
     API when the new total is lower; when higher, create a new payment order for the difference
     and reuse the existing payment flow.
4. Make sure `paymentWebhook` verifies the Razorpay signature (it declares the webhook secret —
   verify the implementation actually checks `x-razorpay-signature` over the raw body and
   validates amounts; fix if not).
5. Don't deploy — leave deploy to the human (Task 0 pattern). Build with `cd functions && npm run build`.

**Acceptance:** functions `tsc` build clean; checkout page renders locally (open the HTML with a
test order id); refund code paths unit-testable and covered by at least a happy-path test if the
test harness allows (see Task 7).

**Report back:** exact Secret Manager entries the human must create
(`firebase functions:secrets:set RAZORPAY_KEY_SECRET` etc.), the hosting deploy command, and the
final checkout-page URL shape.

---

## [DONE] TASK 3 — Restore native Firebase (google-services, FCM, Crashlytics, App Check)

**Current state:** commit `a3fb26b` removed `@react-native-firebase/{app,crashlytics,app-check}`
for Expo Go compatibility; `src/core/firebase/messaging.ts:9-27` is a full no-op stub (real
implementation existed at commit `ca2f682`); `google-services.json` is a MOCK file (project
`safaikart-mock`, fake API key) while the real project is `safaikart-6c4e4`;
`src/core/firebase/appCheck.ts:8` has a literal `'YOUR_RECAPTCHA_ENTERPRISE_SITE_KEY'`;
`src/app/bootstrap.ts` error reporting is console-only.

**Do:**
1. Reinstate `@react-native-firebase/app`, `crashlytics`, `app-check` (versions compatible with
   Expo SDK 56 — check https://docs.expo.dev/versions/v56.0.0/) and their config-plugin entries in
   app.json. This means the app now requires a **dev client / EAS build**, not Expo Go — state
   this loudly in the report.
2. Replace `google-services.json` with the real one from the `safaikart-6c4e4` console (if you
   can't download it, leave a placeholder step for the human and say so).
3. Restore `src/core/firebase/messaging.ts` from the `ca2f682` implementation (git show
   `ca2f682:src/core/firebase/messaging.ts`), adapt to current code, wire
   `setupNotificationListeners` + token save (`saveFcmToken` callable already exists server-side).
   Add the `expo-notifications` plugin entry to app.json.
4. App Check: use the native Play Integrity provider on Android via
   `@react-native-firebase/app-check` instead of the web ReCaptcha provider; remove/replace the
   placeholder key file. Keep it fail-open (don't enforce in console yet).
5. Restore Crashlytics reporting in `src/app/bootstrap.ts`.
6. Add a notification-tap deep link handler: FCM payloads send `safaikart://order/{orderId}`
   (functions/src/notifications/sendOrderStatusNotification.ts:73) — add `"scheme": "safaikart"`
   to app.json and a linking config in the navigator that routes to the order details screen.

**Acceptance:** `npx tsc --noEmit` clean; `npx expo prebuild --no-install` (or expo-doctor) shows
no plugin errors; document that verification requires an EAS dev-client build.

**Report back:** package versions chosen, app.json diff, any console steps for the human
(download google-services.json, enable Play Integrity), and the EAS build command to test.

---

## TASK 4 — Remove mock data & wire real screens

**Hit list (all verified in code):**
1. `src/features/catalog/presentation/screens/SubScreen.tsx:27-80` — fake "My Addresses"
   (hardcoded address), fake "Payment Methods" (VISA •••• 4242 "Sarah Johnson"), fake coupons.
   Profile menu (`ProfileScreen.tsx:34`) routes here. Fix: route "My Addresses" to the real
   `AddressListScreen` (exists in `src/features/addresses` but is **not registered in any
   navigator** — register it); drop "Payment Methods" entirely (Razorpay handles instruments) or
   show order payment history; make "Coupons & Offers" read the real `coupons` collection.
2. `src/shared/ui/feedback/NotificationModal.tsx:12-21` — hardcoded `MOCK_NOTIFICATIONS`; read
   the real `notifications` collection (NotificationCenterScreen already shows how) or delete the
   modal if redundant.
3. `src/features/checkout/infrastructure/CheckoutRepository.ts:51-99` — when `pickupSlots` is
   empty it fabricates `mock-slot-*` slots with `Math.random()`; server-side slot reservation then
   fails. Fix: remove fabrication; show a "no slots available" state; add a seeding script (or
   scheduled function) that maintains real `pickupSlots` docs.
4. `src/features/profile/presentation/screens/ProfileScreen.tsx:84-87` — hardcoded
   `soumya_profile.png` avatar + "GOLD" badge → use profile doc's `photoURL`/initials; remove the
   tier badge or back it with real data.
5. `src/features/catalog/presentation/screens/HomeScreen.tsx:246` — the "clear cart on every
   mount" hack → replace with a one-time migration keyed in AsyncStorage, or remove.
6. `src/core/updates/checkUpdates.ts:19` — "Update Now" button is a no-op → open the Play Store
   URL via `Linking.openURL`; ALSO fix the lexicographic version compare (breaks at 1.10.0 vs
   1.9.0) with a numeric segment compare.
7. Move `mockCatalog.ts`, `mockCatalogV2.ts`, `seedDatabase*.ts` out of the app bundle (to
   `scripts/`) unless something imports them at runtime — check imports first.

**Acceptance:** grep for `MOCK_`, `mock-slot`, `4242`, `soumya_profile`, `Sarah Johnson` returns
no runtime-path hits; `npx tsc --noEmit` clean; each screen renders with real/empty-state data.

**Report back:** per-item done/skipped with reasons, navigator changes made.

---

## [DONE] TASK 5 — Admin order manager + variable-price confirmation

**Why:** WORKFLOW.md assumes an admin advances order statuses (PICKED_UP → IN_PROCESS → … →
DELIVERED) and confirms variable prices (`priceConfirmed: false` orders), but
`AdminDashboardScreen.tsx:42` says `alert('Order Manager coming soon!')`. Without this, no order
can ever progress and the `sendOrderStatusNotification` trigger never fires.

**Do:**
1. Build an `AdminOrderManagerScreen`: list orders filterable by status; detail view with a
   status-advance action following the exact status flow in WORKFLOW.md.
2. Status changes must go through a **Cloud Function** (`adminUpdateOrderStatus` callable) that
   verifies the caller against the `adminUsers` collection — firestore.rules almost certainly
   deny direct client writes to orders (verify; don't weaken rules).
3. Variable-price flow: for `priceConfirmed: false` orders, admin enters measured
   quantities/prices → function recalculates totals, sets `priceConfirmed: true`, and triggers the
   payment step consistent with Task 2's flow.
4. Register the screen in RootNavigator behind the existing admin gate.

**Acceptance:** functions build clean; app typecheck clean; an admin user can advance a test
order end-to-end in the emulator or a test project.

**Report back:** function signature, rules touched (should be none), screens added.

---

## TASK 6 — Build configuration (app.json / eas.json) for release

**Gaps (all verified):**
- No `extra.eas.projectId` and EAS project not initialized → run `eas init` (human may need to
  log in), commit the projectId.
- No `scheme` → added in Task 3; verify.
- Splash: `expo-splash-screen` plugin listed with no options; `assets/splash-icon.png` exists
  unreferenced → configure it.
- No `notification` config for expo-notifications (icon/color) → add.
- No `runtimeVersion` / `updates.url` despite expo-updates + `checkUpdates.ts` → add
  (`"runtimeVersion": { "policy": "appVersion" }` and the EAS updates URL once projectId exists).
- Android permissions block: add only what's used (notifications; check for location usage).
- eas.json `submit.production` empty → add Android service-account/track config (human provides
  the service account; `service-account.json` in repo root may be it — **verify it's gitignored
  either way**, and note prod secrets should not live in the repo).
- Repo hygiene: confirm `.env`, `service-account.json` are gitignored and not in git history
  (`git log --all -- service-account.json`); if they ever were committed, flag for key rotation.
  Remove dev artifacts from root (`firestore-debug.log`, `recent.jsonl`, `first_prompt*.txt`,
  `prices.txt`) or gitignore them.
- EAS env vars: `.env` is gitignored so EAS cloud builds won't see it → create the
  `EXPO_PUBLIC_FIREBASE_*` vars in EAS (`eas env:create --environment production ...`) — list the
  exact commands for the human.

**Acceptance:** `npx expo-doctor` passes; `eas build --profile preview --platform android`
configuration validates (don't necessarily run the full build).

**Report back:** full app.json/eas.json diffs, the list of `eas env:create` commands, any secrets
found in git history.

---

## [DONE] TASK 7 — Tests + CI

**Current state:** exactly one test file (`tests/rules/firestore.test.ts`, rules-only);
jest.config.js `testMatch` restricted to `tests/rules/**`; rules tests need Java JDK 17
(not installed); zero function/unit/component tests; no CI.

**Do:**
1. Widen jest config into two projects: `rules` (emulator, existing) and `unit` (node, no
   emulator).
2. Unit tests for the money-critical pure logic — extract-then-test where needed:
   - createOrderDraft pricing (addons, variable-price items, coupon cap, delivery fee)
   - validateCoupon (active/min-amount/flat/percent)
   - paymentWebhook signature verification (Task 2)
   - editOrderItems diff calculation
   - `checkUpdates` version comparison (Task 4's fix)
3. GitHub Actions workflow: install, `npx tsc --noEmit` (app + functions), unit tests on push/PR;
   rules tests in CI with the Firestore emulator (CI has Java) even though local can't run them.
4. Note JDK 17 as a local-setup step for the human (per docs/release-checklist.md).

**Acceptance:** `npm test` green locally for the unit project; workflow file lints.

**Report back:** coverage of the listed functions, CI file path, anything untestable and why.

---

## TASK 8 — Release pass (mostly HUMAN)

1. Re-run docs/release-checklist.md and docs/operator-notes.md top to bottom; update stale items
   (billing is already active; functions deployed in Task 0).
2. FCM token pruning on logout (checklist gap): clear the token from `profiles/{uid}.fcmTokens`
   on sign-out (client call to a small callable, or reuse saveFcmToken with a remove op).
3. Deploy: functions (human), hosting/checkout page (human), firestore.rules
   (`firebase deploy --only firestore:rules`) after a final rules test run.
4. Live Razorpay secrets into Secret Manager; switch `RAZORPAY_KEY_ID` to the live key; update
   webhook URL + secret in the Razorpay dashboard.
5. E2E smoke test on a physical device with the EAS build: sign in (real OTP) → order → pay
   (₹1 live or test mode) → admin advances status → push notification received → deep link opens
   order → cancel → refund appears.
6. Shoes-cleaning category: activate once prices confirmed (WORKFLOW.md says awaiting client
   prices; `mockCatalog.ts` already has 3 shoe items — reconcile with the client).
7. `eas build --profile production` → signed `.aab` → Play Console internal testing → production.

---

## Order & dependency summary

```
TASK 0 (deploy region fix)      ← human, do now
TASK 1 (real auth)              ← blocks trust in all user data; admin gate
TASK 2 (payments completion)    ← independent of 1, can run in parallel
TASK 3 (native Firebase/FCM)    ← moves app off Expo Go; after 1 & 2 land
TASK 4 (de-mock screens)        ← anytime after 1
TASK 5 (admin order manager)    ← needs 1 (admin identity)
TASK 6 (build config)           ← after 3 (plugins known)
TASK 7 (tests + CI)             ← after 2 (webhook/refund code exists)
TASK 8 (release pass)           ← last, mostly human
```

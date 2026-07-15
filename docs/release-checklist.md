# Pre-Launch Release Checklist

This checklist tracks the launch readiness work.

- [x] **Firestore Rules Hardening:** Collections locked down to least privilege.
- [x] **Rules Unit Tests:** Scaffolding created and comprehensive test file (`tests/rules/firestore.test.ts`) covering all 17 collections and roles written.
- [x] **UI Resilience Audit:** Loading, empty, and error states reviewed across Profile, Addresses, Cart, Checkout, Orders, and Notification Center. Native alerts added for permission/network errors.
- [x] **Form Validation:** Zod schemas introduced for the Address creation flow and Checkout flow.
- [x] **Code Hygiene:** Unused imports and outdated mock data cleaned up.
- [x] **Type Safety Check:** `tsc --noEmit` runs clean with no type errors.
- [x] **Security Hygiene Check:** `.env` is ignored by git, no hardcoded API keys exist in the `src/` directory, and `checkUpdates.ts` reads config safely.
- [x] **FCM Token Pruning on Logout:** Implemented token removal on sign-out via `removeFcmToken` callable.
- [x] **Unit Tests & CI:** Extracted logic and tested `validateCoupon.ts`, `paymentWebhook.ts`, `editOrderItems.ts`, `createOrderDraft.ts`, `compareVersions.ts`. GitHub Actions CI configured for tests and builds.
- [x] **App Features Verification:** Real phone OTP auth, Razorpay checkout page + refunds, native Firebase (FCM/Crashlytics/App Check), admin order manager.
- [x] **EAS Setup:** EAS project initialized (id c8689aa7-cbb2-4aad-a348-8ce979a8b0c1).
- [x] **Firebase Billing:** Billing is ACTIVE; 10 functions deployed (asia-south1).

## Pending Operator / Human Tasks
Follow these exact steps to complete the release:

- [ ] `eas login` and verify initialization, run `eas env:create` (Task 6 report).
- [ ] Run `firebase functions:secrets:set RAZORPAY_KEY_SECRET` and `firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET` with live values. Also set live `RAZORPAY_KEY_ID` in environment.
- [ ] Deploy all backend resources: `firebase deploy --only functions,hosting,firestore:rules` (after a final rules test run).
- [ ] Configure live webhook URL (`asia-south1`) + webhook secret in Razorpay dashboard.
- [ ] Obtain Google Play service-account JSON, place at `./google-play-service-account.json` (ensure it is gitignored).
- [ ] Create proper Android notification icon asset (white/transparent) and wire into `app.json` expo-notifications plugin.
- [ ] Run `eas build --profile preview` to generate APK.
- [ ] Perform physical-device E2E smoke test: OTP sign-in → order → pay → admin advance → push received → deep link → cancel → refund.
- [ ] Validate Shoes category pricing with client (go/no-go).
- [ ] Run `eas build --profile production` to generate `.aab`.
- [ ] Submit to Play Console internal testing → production.

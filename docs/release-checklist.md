# Pre-Launch Release Checklist

This checklist tracks the launch readiness work completed during the pre-billing phase. 

- [x] **Firestore Rules Hardening:** Collections locked down to least privilege (profiles read-only for public, carts user-owned, etc.).
- [x] **Rules Unit Tests:** Scaffolding created and comprehensive test file (`tests/rules/firestore.test.ts`) covering all 17 collections and roles written.
- [x] **UI Resilience Audit:** Loading, empty, and error states reviewed across Profile, Addresses, Cart, Checkout, Orders, and Notification Center. Native alerts added for permission/network errors.
- [x] **Form Validation:** Zod schemas introduced for the Address creation flow and Checkout flow to prevent malformed data from reaching the backend.
- [x] **Code Hygiene:** Unused imports and outdated mock data cleaned up.
- [x] **Type Safety Check:** `tsc --noEmit` runs clean with no type errors.
- [x] **Security Hygiene Check:** `.env` is ignored by git, no hardcoded API keys exist in the `src/` directory, and `checkUpdates.ts` reads config safely.
- [ ] **FCM Token Pruning on Logout:** (Identified as a gap - needs backend hook or local secure storage clearing if tokens are rotated).
- [ ] **Java Setup:** Java JDK 17 must be installed to run the local Firestore emulator tests.
- [ ] **Firebase Billing:** (BLOCKED) Awaiting client verification documents.

Once billing is unblocked, proceed to the `operator-notes.md` checklist for final deployment and verification.

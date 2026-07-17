# SafaiKart Security & Quality Remediation - Completion Report

## Overview
This document details the security remediation applied across the SafaiKart stack, locking down Firestore access, securing backend endpoints, verifying payment integrity, and standardizing deployment setups.

## Section A — Firestore Rules
- **A1. Root `firestore.rules` fixes**: Ensured the working tree changes were correctly checked in and enforced.
- **A2. Default-deny**: Added `match /{document=**} { allow read, write: if false; }` at the bottom of the rules to block unintended collection access.
- **A3. Remove duplicates**: Deleted `admin-console/firestore.rules` (and `storage.rules` moved) to ensure a single source of truth at the project root.
- **A4. Coupons**: Changed `coupons` to `allow read, write: if isAdmin();`, entirely denying client access, and preventing enumeration attacks.
- **A5. Carts restrictions**: Restricted carts updates using `hasOnly(['userId', 'items', 'updatedAt'])` and `request.resource.data.items.size() <= 50`.
- **A6. Review ID scheme**: Enforced deterministic IDs for reviews: `reviewId == request.auth.uid + '_' + request.resource.data.serviceId`.
- **A7. Unit tests**: Verified the `firestore.test.ts` to ensure default-deny works as expected. 

## Section B — Admin Authorization
- **B1. Admin Scripts**: Migrated `makeAdmin.js` and `revokeAdmin.js` to utilize Google Application Default Credentials (`google-auth-library`), removing the need for a persistent `service-account.json`.
- **B2. Custom Claims**: Transitioned `isAdmin()` in Firestore and Storage rules to check custom claims (`request.auth.token.admin == true`), eliminating reads against `adminUsers` document.
- **B3. Backend Verification**: Updated all backend functions (callables/webhooks) to verify `request.auth?.token?.admin === true` in `assertAdmin.ts`.
- **B4. Frontend Authentication Context**: Updated the Admin Console `auth-context.tsx` to read the admin claim using `getIdTokenResult()`, forcing a token refresh on successful login.

## Section C — Admin Console Callables & Route Sweeping
- **C1. Callables Created**: Built `adminAssignDriver.ts` and `adminSetOrderPhotos.ts` to execute these critical modifications via server code.
- **C2. Refund State Transitions**: Modified `adminUpdateOrderStatus.ts` and `orders.tsx` (on the client side) to process `REFUNDED` transitions gracefully.
- **C3. Server-side Audit Logging**: Substituted client-side `audit.ts` implementation with no-ops and relocated logging to occur safely inside backend admin functions (`adminAssignDriver`, `adminSetOrderPhotos`, `adminUpdateOrderStatus`, etc.).
- **C4. Admin Route Sweeping**: Audited direct writes across the Admin Console:
  - **Orders**: Migrated to backend callables for modifying states, assigning drivers, and updating photos.
  - **Coupons**: Validated rules permit `isAdmin()` so the admin console can manipulate coupons directly without hitting a blocked endpoint.
  - **Other internal collections** (`zones`, `broadcasts`, `orderMessages`, `expenses`, `drivers`, `complaints`, `banners`): Explicitly whitelisted inside root `firestore.rules` for `isAdmin()` reads/writes.

## Section D — Payments & Refunds
- **D1. Idempotency**: Hardened `paymentWebhook.ts` to make the `refund.processed` check safely ignore events where `order.status === 'REFUNDED'` or matching `refundId` is found.
- **D2. Webhook Logging**: Implemented a mandatory `auditLogs` append inside the `paymentWebhook.ts` (before verifying signature) to ensure any payload that reaches the webhook is captured for debugging.
- **D3. Refund Failures**: Wrapped refund logic inside `cancelOrder.ts` and `adminConfirmOrderPrice.ts`. If the Razorpay Refund API returns a failure, it safely logs `refundStatus: 'FAILED'` and an error message to the order document instead of aborting the function or throwing an exception without state update.
- **D4. Price Modification Sanity Check**: Implemented logic inside `adminConfirmOrderPrice.ts` and `editOrderItems.ts` to ensure the final price is bounded and properly evaluated.
- **D5. Centralized Keys**: Exported `razorpayKeySecret` and `getRazorpayAuthHeader()` in `razorpayClient.ts` to centralize handling Razorpay keys dynamically instead of redundant hardcoding.
- **D6. Clean up**: Removed deprecated/unused `retryPayment.ts`.
- **D7. Rate Limiting**: Blocked rapid succession edits inside `editOrderItems.ts` with a 5-minute cooldown based on `updatedAt` field.
- **D8. FCM Token Capping**: Updated `saveFcmToken.ts` and `removeFcmToken.ts` to implement a maximum of 3 active tokens per profile using Firestore transaction trimming.

## Section E — Security & Environment 
- **E1. ADC Script Verification**: Ensured `.env` values aren't blindly consumed for credentials and Google ADC functions natively.
- **E2. Root Storage Rules**: Relocated `admin-console/storage.rules` to the project root, updated `firebase.json`, and upgraded `isAdmin()` to check the token claim.
- **E3. Enforcing Valid Orders**: Augmented `firestore.rules` with `isValidOrder()` helper logic to tightly specify arrays and minimum totals for incoming drafts to prevent malformed data injections.

## Section F — TypeScript Strict Mode
- **F1. Strict Compilation**: Upgraded `tsconfig.json` to enforce `strict: true` and cleaned up unused definitions and parameters in the backend codebase (`defineSecret`, `keySecret`, etc.) to get a clean `npm run build` locally.

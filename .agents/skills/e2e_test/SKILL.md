---
name: e2e_test
description: Generate a comprehensive test suite that exercises the full SafaiKart user journey.
---
# Skill: E2E Test Script Generation

## Objective
Generate a comprehensive test suite that exercises the full SafaiKart user journey on a physical device or emulator.

## Rules of Engagement
- **Artifact**: Save test files to `production_artifacts/e2e_tests/`.
- **Framework**: Use Playwright with React Native support (via Detox or Maestro for native flows).
- **Test Account**: Use a test Firebase Auth phone number (if available) or mock OTP for test environment.

## Test Flow (Each step must have explicit assertions)
1. **Authentication Flow**
   - Open app → verify splash screen renders
   - Enter phone number → verify OTP screen appears
   - Enter OTP → verify home screen with categories loads
2. **Catalog Browsing**
   - Verify 3+ categories visible (Dry Cleaning, Steam Press, Sofa/Household, Shoe Cleaning if seeded)
   - Tap a category → verify service list loads from Firestore
   - Toggle starch add-on on a shirt → verify price updates in real-time
3. **Cart Operations**
   - Add item to cart → verify cart badge increments
   - Use "Buy Now" on another item → verify direct checkout flow bypasses cart
4. **Checkout Flow**
   - Select saved address → verify address card highlights
   - Select pickup slot → verify 7-day rolling window with capacity indicators
   - Apply test coupon → verify discount applies to subtotal
   - Verify order summary shows: subtotal, delivery fee, taxes, estimated total
5. **Payment Flow (Razorpay Test Mode)**
   - Tap "Pay Now" → verify Razorpay sheet opens
   - Select UPI → complete test payment
   - Verify "Payment Processing" screen appears
   - Wait for webhook → verify "Payment Success" screen with animation
6. **Order Tracking**
   - Navigate to Orders → verify new order appears
   - Open tracking screen → verify vertical timeline renders with pulsing animation
   - Verify real-time status updates via Firestore snapshot
7. **Edit/Cancel Window**
   - Within 3 minutes: tap "Edit Order" → verify items are editable
   - Tap "Cancel Order" → verify cancellation confirms and refund initiates
   - After 3 minutes: verify edit/cancel buttons disappear

## Output
- `production_artifacts/e2e_tests/safaikart.e2e.ts` — main test file
- `production_artifacts/e2e_tests/maestro-config.yaml` — Maestro flow alternative for native
- Run tests via terminal and capture pass/fail results
- Screenshot artifacts for each step

## Self-Verification
After generating tests, read them back and verify:
- Every `expect()` has a meaningful assertion (not just "element exists")
- No hardcoded sensitive data (API keys, real phone numbers)
- Test cleanup runs after suite (deletes test orders, resets cart)

# Operator Notes

This document contains instructions for the project maintainer or deployment operator to finalize the production deployment of SafaiKart once the Firebase billing blocks are removed.

## Post-Billing Deploy Checklist

1. **Client Action:** The client must submit the required verification documents in the Google Cloud / Firebase Billing console to restore the active billing account and upgrade to the Blaze plan.
2. **Deploy Cloud Functions:** After the Blaze plan is active, deploy the backend functions:
   ```bash
   npx firebase-tools deploy --only functions --project safaikart-6c4e4
   ```
3. **Configure Secrets:** Add the live Razorpay API secrets to Google Cloud Secret Manager (or via Firebase functions config) so the backend can process real payments.
4. **End-to-End Smoke Test:** Run a full manual smoke test of the order and payment flow using the live environment to ensure webhooks and firestore triggers are executing correctly.
5. **Clean Build:** Verify the typescript build is clean before generating the app bundle:
   ```bash
   npm run build # or tsc --noEmit
   ```
6. **Final Rules Retest:** Go through the manual retest checklist to ensure the hardened Firestore rules do not break any real-world edge cases.
7. **Release to Play Store:** Submit the signed `.aab` file to the Google Play Console for closed testing.

## App Configuration (Firestore `appConfig` schema)
The `appConfig` collection contains a single document `public` which dictates global app state.
- **Path:** `appConfig/public`
- **Fields:**
  - `minAppVersion` (string): e.g. `"1.0.0"`. If the user's app version is lower than this, they will be forced to update. This is handled by `checkUpdates.ts`.

## Emulator Instructions
To run tests locally, the Firebase Emulator Suite is required.
1. Start the emulator:
   ```bash
   npx firebase emulators:start --only firestore
   ```
2. Stop the emulator: Use `Ctrl+C` in the terminal where it is running.

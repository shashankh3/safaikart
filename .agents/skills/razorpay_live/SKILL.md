---
name: razorpay_live
description: Safely switch the SafaiKart backend from Razorpay Test mode to Live mode.
---
# Skill: Switch Razorpay to Live Mode

## Objective
Safely switch the SafaiKart backend from Razorpay Test mode to Live mode.

## Rules of Engagement
- **NEVER hardcode API keys in source code.**
- All secrets must live in Google Secret Manager.
- **Pre-flight Check**: Before switching, run a test transaction in test mode and confirm it succeeds.

## Instructions
1. Read current Razorpay config in `functions/src/config.ts` or wherever the key IDs are referenced.
2. Verify which Secret Manager secrets exist:
   gcloud secrets list --filter="razorpay"
3. Create new live-mode secrets:
   echo -n "rzp_live_XXXXX" | gcloud secrets create razorpay-key-id-live --data-file=-
   echo -n "XXXXX" | gcloud secrets create razorpay-key-secret-live --data-file=-
   echo -n "XXXXX" | gcloud secrets create razorpay-webhook-secret-live --data-file=-
4. Update Cloud Functions to reference live secrets (via `process.env` or Secret Manager access).
5. Deploy the updated Cloud Functions:
   firebase deploy --only functions
6. Update the Razorpay webhook URL in the Razorpay Dashboard to point to the production function endpoint.
7. Run a single ₹1 test transaction in LIVE mode to verify end-to-end.
8. Verify the webhook fires and the HMAC signature validates.

## Output
- Save a deployment checklist to `production_artifacts/razorpay_live_switch.md`
- Include the test transaction ID and webhook verification result

## Self-Verification
- Confirm no `rzp_test_` strings remain anywhere in the codebase: `grep -r "rzp_test_" .`
- Confirm webhook secret is NOT logged in any Cloud Function console output

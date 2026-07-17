---
name: safaikart_launch
description: Run the complete SafaiKart production readiness pipeline.
---
# Skill: SafaiKart Launch Orchestrator

## Objective
Orchestrate the production readiness pipeline strictly using the predefined skills in `.agents/skills/`.

## Execution Sequence

### Phase 1: Data & Content (Parallel)
1. Act as the **Firestore Engineer** and execute the `seed_shoe_cleaning` skill.
   *(Wait for user to approve the price list before executing the seed script.)*

### Phase 2: Security Audit
2. Act as the **QA Architect** and execute the `audit_rules` skill.
   *(Review the security audit report. If CRITICAL issues are found, fix firestore.rules immediately before proceeding.)*

### Phase 3: E2E Test Generation & Execution
3. Act as the **QA Architect** and execute the `e2e_test` skill.
   *(Run the generated test suite. Fix any failures by reading the error, identifying the root cause, and patching the code. Loop until all tests pass.)*

### Phase 4: Push Notifications
4. Act as the **DevOps Deployer** and execute the `fcm_apns` skill.
   *(Guide the user through the Apple Developer Console steps that require manual action. Test via Firebase Console.)*

### Phase 5: Build & Deploy
5. Act as the **DevOps Deployer** and execute the `eas_build` skill.
   *(Run Android and iOS builds in parallel if possible. Wait for both to finish before submitting to stores.)*

### Phase 6: Payment Production Switch (FINAL)
6. Act as the **DevOps Deployer** and execute the `razorpay_live` skill.
   *(Only after all tests pass and builds are submitted. Verify the ₹1 test transaction succeeds before confirming the switch.)*

## Final Output
Generate a consolidated report at `production_artifacts/LAUNCH_REPORT.md` containing:
- Shoe Cleaning: seeded ✅/❌ (count of services)
- Security Audit: passed ✅/❌ (count of issues fixed)
- E2E Tests: passed ✅/❌ (count of tests passing)
- FCM/APNs: configured ✅/❌
- EAS Builds: Android ✅/❌ | iOS ✅/❌ (build URLs)
- Store Submissions: Google Play ✅/❌ | App Store ✅/❌
- Razorpay Live: verified ✅/❌ (test transaction ID)

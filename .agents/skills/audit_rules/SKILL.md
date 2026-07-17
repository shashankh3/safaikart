---
name: audit_rules
description: Perform a comprehensive security audit of firestore.rules.
---
# Skill: Audit Firebase Security Rules

## Objective
Perform a comprehensive security audit of `firestore.rules` and produce a vulnerability report with fixes.

## Rules of Engagement
- **Artifact Output**: Save the audit report to `production_artifacts/security_audit_report.md`.
- **Context Files**: Use `//@context firestore.rules` and `//@context functions/src/index.ts` to load relevant files.

## Audit Checklist
1. **User Data Isolation**: Verify `users/{userId}` documents can only be read/written by the authenticated owner. Rule should be `request.auth.uid == userId`.
2. **Order Scoping**: Orders must only be readable by the user who placed them. Check `orders/{orderId}` has `resource.data.userId == request.auth.uid`.
3. **Cart Isolation**: Cart documents must be user-scoped. Verify no wildcard reads.
4. **Coupon Validation**: Coupons should be readable by authenticated users but NOT writable from client.
5. **Admin Console Access**: If admin paths exist, verify they require custom claims (e.g., `request.auth.token.admin == true`).
6. **3-Minute Edit Window**: Verify the `editOrderItems` Cloud Function validates the timestamp SERVER-SIDE, not trusting client-sent timestamps.
7. **Razorpay Webhook HMAC**: Verify the `paymentWebhook` function validates the `X-Razorpay-Signature` header against the raw body using the webhook secret from Secret Manager. No timing-attack-vulnerable comparisons.
8. **No Wildcard Reads**: Search for `allow read, write: if` without conditions — flag any as CRITICAL.
9. **No Anonymous Access**: Ensure no collection allows `request.auth == null` reads (except public config).

## Output Format
For each finding:
[SEVERITY] Title
File: <path>
Line: <number>
Issue: <description>
Exploit Scenario: <how an attacker could abuse this>
Fix:
<corrected rule>

## Self-Verification
After generating the report, re-read `firestore.rules` and cross-reference each rule against the checklist. Confirm zero false negatives.

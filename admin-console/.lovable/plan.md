Shipping everything non-security from the backlog in two batches. Security stays deferred per your instruction.

## Batch A — Ops & Money depth

**Orders / fulfillment**
- Re-attempt flow: mark delivery failed with reason + reschedule slot, tracked on the order doc (`attempts[]`, `lastFailureReason`) with audit log entry.
- Tip tracking: `tipMinor` field on orders, editable in detail sheet, rolled into settlement totals.
- GST-ready invoice: update `src/lib/invoice.ts` to show CGST/SGST split, GSTIN field from App Config, HSN column per line item.

**Catalog**
- Add-ons and bundles: new `addons[]` and `bundles[]` sections in `catalog.tsx` with CRUD.
- Inventory: optional `stock` counter per service, low-stock chip.
- CSV import: upload CSV of services/customers, preview diff, batched Firestore write.

**Finance**
- Expense tracker: new route `/_authenticated/expenses.tsx` with categories (fuel, packaging, salary, misc), monthly totals, netted into settlement page.

## Batch B — Growth, analytics, polish

**Growth**
- Auto customer tags: derived on the fly in CRM (VIP >10 orders, At-risk 45d inactive, New <7d, Complainer >=1 ticket).
- Win-back campaigns: new route `/_authenticated/winback.tsx` — pick a tag segment, compose message, log broadcast.
- In-app inbox: `/_authenticated/inbox.tsx` — per-order thread stored in `orderMessages`, admin reply UI.

**Analytics**
- Revenue heatmap (weekday x hour) on analytics page.
- Rider scorecards: per-runner orders delivered, avg SLA, on-time %, complaints.
- Funnel: created -> paid -> picked -> delivered conversion.

**Search & UX polish**
- Global search in ⌘K: fuzzy match across orders (id, phone, address), users, drivers — not just navigation.
- Keyboard shortcuts help modal (press `?`).
- Empty-state illustrations across list pages.
- Mobile table pass: horizontal scroll cues + condensed columns under 768px.
- Editable profile in Settings (name, photo upload to Storage).

## Backend automations (Cloud Functions, asia-south1)

Scaffolded as `functions/` with clear deploy instructions — you deploy from CLI:
- Scheduled SLA-breach notifier (writes to `notifications` collection every 15m).
- Auto-cancel unpaid orders after configurable hours (from App Config).
- Nightly settlement rollup document.
- Payment gateway webhook receiver stub (Razorpay-shaped, signature-verified).

## Technical notes

- All new routes registered in `app-sidebar.tsx` and `command-palette.tsx`.
- Reuse existing `logOrderChange` audit helper for every write.
- Zod schemas for CSV import and expense/inbox forms.
- Charts continue to use `recharts`.
- No new paid dependencies; `papaparse` (CSV) is the only new npm add.
- Security bypass in `auth-context.tsx` stays as-is per your instruction.

## Order of execution

Batch A first (ops/money is the highest-leverage), then Batch B (growth/polish), then Functions scaffold. Single continuous run — I'll ping you when done.

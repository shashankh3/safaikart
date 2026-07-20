# SafaiKart Cloud Functions

Region: **asia-south1**

## Functions

| Name | Trigger | Purpose |
|---|---|---|
| `slaBreachNotifier` | Every 15 min | Writes `/notifications/sla-{orderId}` for orders older than 24h still active. |
| `autoCancelUnpaid` | Every 60 min | Cancels PENDING-payment orders older than `config/app.autoCancelHours` (default 48). |
| `nightlySettlementRollup` | Daily 23:55 IST | Writes `/settlementDaily/{YYYY-MM-DD}` totals. |
| `razorpayWebhook` | HTTPS POST | Verifies Razorpay signature and updates order payment status. |

## Deploy

```bash
cd functions
npm install
npm run build

# One-time secret setup for the webhook:
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET

firebase deploy --only functions
```

Point Razorpay dashboard webhook at the deployed URL and pass `notes.orderId` when creating the payment on the client so the webhook can match it.

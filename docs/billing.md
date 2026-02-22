# Billing (Stripe Subscriptions)

This repo uses Stripe Subscriptions to set `User.plan` to `pro` (no pay-as-you-go).

## Environment variables

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY_ID`
- `STRIPE_PRICE_PRO_YEARLY_ID`
- `APP_URL` (or `NEXTAUTH_URL`)

## Routes

- `POST /api/billing/checkout` → returns `{ url }` for Stripe Checkout (subscription)
- `POST /api/billing/portal` → returns `{ url }` for Stripe Billing Portal
- `POST /api/billing/webhook` → Stripe webhook receiver (signature verified)

## Webhook events to enable

Minimum set:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Local testing

Use Stripe CLI to forward webhooks to your dev server:

```bash
stripe listen --forward-to http://localhost:3000/api/billing/webhook
```

Then copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.

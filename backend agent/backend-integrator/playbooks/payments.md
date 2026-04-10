# Payments Playbook

This playbook guides the integration of secure, production-grade payment systems based on frontend UI requirements and workflows.

---

## 1. What to Infer From Frontend

Identify these UI elements to determine the payment model and scope:

- **Checkout Page / Modal**: Implies one-time payment or subscription initiation.
- **Pricing Tables with tiers**: Different plans imply subscription management with Stripe Products + Prices.
- **Billing Settings / Portal**: Plan status, payment method update, invoice history.
- **"Upgrade" / "Downgrade" buttons**: Plan change flow with proration.
- **"Free Trial" badge**: Trial period handling — trial_end date, trial expiry notifications.
- **Invoice list / Download**: Transaction history and Stripe-hosted invoice PDF links.
- **Payment Success / Failure screens**: Async webhook-driven status updates required.
- **Credit / Usage Metering**: Implies usage-based billing with Stripe metered prices.

---

## 2. Payment Models

| Model | Description | Stripe Implementation |
|---|---|---|
| **One-Time Payment** | Single charge (e-commerce checkout) | `PaymentIntent` |
| **Subscription (Fixed)** | Recurring monthly/yearly plan | `Subscription` + fixed `Price` |
| **Subscription (Metered)** | Usage-based billing per cycle | `Subscription` + metered `Price` |
| **One-Time + Subscription** | Purchase + recurring (e.g., setup fee) | `Invoice` with multiple items |
| **Credits / Wallet** | Buy credits, deplete as used | Custom ledger + `PaymentIntent` |

---

## 3. Required Backend Entities

```
Customer
  - id
  - organization_id → Organization (or user_id → User)
  - stripe_customer_id (unique, indexed)
  - created_at

Subscription
  - id
  - customer_id → Customer
  - stripe_subscription_id (unique)
  - stripe_price_id
  - plan_name
  - status: trialing | active | past_due | canceled | unpaid | incomplete
  - trial_start (nullable)
  - trial_end (nullable)
  - current_period_start
  - current_period_end
  - cancel_at_period_end: boolean
  - canceled_at (nullable)
  - created_at, updated_at

PaymentEvent
  - id
  - customer_id → Customer
  - stripe_event_id (unique — idempotency key)
  - event_type (e.g., "invoice.paid", "payment_intent.failed")
  - amount (nullable)
  - currency (nullable)
  - status: succeeded | failed | refunded
  - metadata (JSON)
  - occurred_at
```

---

## 4. Required API Endpoints

### Checkout & Session

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | /billing/checkout-session | ✅ | Create Stripe Checkout session URL |
| GET | /billing/status | ✅ | Current plan, status, trial info |

### Subscription Management

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | /billing/change-plan | ✅ owner | Upgrade or downgrade subscription |
| POST | /billing/cancel-subscription | ✅ owner | Cancel at period end |
| POST | /billing/resume-subscription | ✅ owner | Resume a canceled subscription |
| GET | /billing/invoices | ✅ | Invoice list with download links |

### Stripe Portal (recommended)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | /billing/portal-session | ✅ | Create Stripe Customer Portal session |

The Stripe Customer Portal handles payment method updates, invoice history, and plan changes without custom UI.

### Webhooks

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | /webhooks/stripe | ❌ | Receive all Stripe events |

---

## 5. Checkout Flow

```
1. POST /billing/checkout-session { priceId, successUrl, cancelUrl }
2. Find or create Stripe Customer for this org
3. Create Stripe Checkout Session (mode: subscription | payment)
4. Return { checkoutUrl }
5. Frontend redirects to checkoutUrl
6. User completes payment on Stripe-hosted page
7. Stripe redirects to successUrl
8. Stripe fires webhook: checkout.session.completed
9. Webhook handler creates Subscription record in DB
10. Grant access to features
```

**Never** rely on the redirect URL alone to grant access — only trust webhooks.

---

## 6. Webhook Handling (Critical)

Apply the `webhooks` playbook for all implementation details.

### Must-Handle Events

| Event | Action |
|---|---|
| `checkout.session.completed` | Create local Subscription record |
| `invoice.paid` | Extend subscription period, send receipt email |
| `invoice.payment_failed` | Set `status: past_due`, start dunning |
| `customer.subscription.updated` | Sync plan, status, trial_end |
| `customer.subscription.deleted` | Set `status: canceled`, revoke access |
| `customer.subscription.trial_will_end` | Send trial expiry warning email (3 days before) |

### Webhook Security

```typescript
const event = stripe.webhooks.constructEvent(
  rawBody,         // Buffer — NOT parsed JSON
  req.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET
)
```

Always read the raw body — never parse with `express.json()` before verifying.

---

## 7. Trial Period

When a pricing table shows a free trial:

```
1. On checkout → pass `trial_period_days` to Stripe Checkout Session
2. Stripe creates subscription with status: trialing
3. Store trial_start + trial_end from webhook
4. 3 days before trial_end → send warning email (webhook: customer.subscription.trial_will_end)
5. On trial_end → Stripe charges card, status → active
   OR if no card → status → incomplete_expired
```

---

## 8. Plan Changes (Proration)

```typescript
// Upgrade immediately with proration
await stripe.subscriptions.update(subscriptionId, {
  items: [{ id: currentItemId, price: newPriceId }],
  proration_behavior: 'create_prorations',
})

// Downgrade at period end (no immediate charge)
await stripe.subscriptions.update(subscriptionId, {
  items: [{ id: currentItemId, price: newPriceId }],
  proration_behavior: 'none',
  billing_cycle_anchor: 'unchanged',
})
```

---

## 9. Refunds

```typescript
// Full refund of a charge
await stripe.refunds.create({ charge: chargeId })

// Partial refund
await stripe.refunds.create({ charge: chargeId, amount: 5000 }) // in cents
```

Always log the refund as a `PaymentEvent` with `status: refunded`.

---

## 10. Access Control (Feature Gating)

Check subscription status before granting access to paid features:

```typescript
function hasActiveSubscription(subscription: Subscription): boolean {
  return ['active', 'trialing'].includes(subscription.status)
}

// In middleware or service
if (!hasActiveSubscription(org.subscription)) {
  throw new ForbiddenError('Subscription required')
}
```

---

## 11. Security Rules

- **Never store card numbers** — all PCI-scoped data stays in Stripe.
- **Validate webhook signatures** — always with `stripe.webhooks.constructEvent()`.
- **Idempotency** — check `stripe_event_id` before processing webhooks.
- **Fail gracefully** — if Stripe API is down, queue retry; never throw 500 to customer.
- **Proration preview** — show users the cost before applying a plan change.
- **Audit log** — log all billing events (see `audit-log` playbook).

---

## 12. Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...    # for frontend

# Plans (Stripe Price IDs)
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# App URLs
FRONTEND_URL=https://app.yourapp.com
BILLING_SUCCESS_URL=https://app.yourapp.com/billing?success=true
BILLING_CANCEL_URL=https://app.yourapp.com/billing?canceled=true

# Queue
REDIS_URL=redis://localhost:6379
```

---

## 13. File Structure

```
src/
  billing/
    billing.controller.ts
    billing.service.ts
    billing.module.ts
    dto/
      create-checkout.dto.ts
      change-plan.dto.ts
    entities/
      customer.entity.ts
      subscription.entity.ts
      payment-event.entity.ts
    adapters/
      stripe.adapter.ts             ← Wraps all Stripe SDK calls
    helpers/
      subscription.helper.ts        ← hasActiveSubscription, planName, etc.
    workers/
      billing-email.worker.ts
  webhooks/
    webhooks.controller.ts
    handlers/
      stripe/
        invoice-paid.handler.ts
        subscription-updated.handler.ts
        subscription-deleted.handler.ts
        trial-will-end.handler.ts
```

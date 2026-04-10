# Webhook Consumer & Producer Playbook

This playbook guides the Backend Integrator Agent when implementing webhook handling (both consuming webhooks from third-party providers and emitting webhooks to customer systems).

---

## 1. What to Infer From Frontend

**Webhook Consumer (receiving from providers):**
- Payment pages → Stripe / Paddle webhooks
- Email automation → SendGrid / Mailchimp event hooks
- CI/CD integrations → GitHub / GitLab webhooks
- Any "real-time sync" feature driven by an external service

**Webhook Producer (sending to customers):**
- "Webhook Settings" page in app → customers configure endpoint URLs
- "Event Subscriptions" toggles → customers choose which events to receive
- Developer API / integration hub → implies platform-style webhook delivery

---

## 2. Webhook Consumer Architecture

### Core Principles

1. **Verify signature immediately** — reject anything that fails.
2. **Return `200` in under 3 seconds** — acknowledge receipt, process asynchronously.
3. **Idempotency** — the same event can arrive multiple times; guard against duplicate processing.
4. **Log everything** — raw payload, headers, processing result.

### Required Entities

```
WebhookEvent (Consumer)
  - id
  - provider           (e.g., "stripe", "github")
  - event_id           (provider's event ID — for idempotency)
  - event_type         (e.g., "invoice.paid")
  - payload            (JSON — raw body)
  - status:            received | processing | processed | failed
  - error_message      (nullable)
  - received_at
  - processed_at       (nullable)
```

### Required API Endpoints

- `POST /webhooks/stripe` — Stripe event receiver
- `POST /webhooks/github` — GitHub event receiver
- `POST /webhooks/:provider` — Generic receiver pattern

Each endpoint:
1. Reads the raw body as `Buffer` (do not parse before verifying signature).
2. Verifies signature using provider SDK.
3. Persists the event record with `status: received`.
4. Enqueues processing job.
5. Returns `200 OK` immediately.

### Signature Verification Examples

```typescript
// Stripe
const event = stripe.webhooks.constructEvent(
  rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET
)

// GitHub
const signature = req.headers['x-hub-signature-256']
const isValid = crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(`sha256=${hmac.digest('hex')}`)
)
```

### Processing (Background Worker)

```
Worker picks up job → check if event_id already processed → run handler → update status
```

**Event Router Pattern:**
```typescript
switch (event.type) {
  case 'invoice.paid':       return this.handleInvoicePaid(event)
  case 'customer.deleted':   return this.handleCustomerDeleted(event)
  default:                   logger.warn(`Unhandled event: ${event.type}`)
}
```

### Retry & Dead Letter Queue

- If handler throws → retry up to 3× with exponential backoff.
- After all retries fail → set `status: failed`, alert ops team.
- Store `error_message` for debugging.

---

## 3. Webhook Producer Architecture

When the app sends webhooks to customers:

### Core Principles

1. **Deliver reliably** — retry on customer endpoint failures.
2. **Sign your payloads** — customers should be able to verify authenticity.
3. **Log all deliveries** — success, failure, response codes.
4. **Respect customer endpoint health** — disable after repeated failures.

### Required Entities

```
WebhookEndpoint
  - id
  - organization_id
  - url
  - secret             (for signing payloads — generated at creation)
  - events:            string[]  (subscribed event types)
  - is_active:         boolean
  - created_at

WebhookDelivery
  - id
  - endpoint_id
  - event_type
  - payload            (JSON)
  - status:            pending | delivered | failed
  - http_status_code   (nullable)
  - response_body      (nullable, truncated)
  - attempt_count
  - next_retry_at      (nullable)
  - delivered_at       (nullable)
```

### Required API Endpoints

- `GET /webhooks/endpoints` — List customer's configured endpoints
- `POST /webhooks/endpoints` — Register a new webhook URL
- `PATCH /webhooks/endpoints/:id` — Update URL, secret, or subscriptions
- `DELETE /webhooks/endpoints/:id` — Remove endpoint
- `POST /webhooks/endpoints/:id/test` — Send a test event
- `GET /webhooks/deliveries` — Delivery history with status

### Delivery Worker

```
Domain event fires → find active endpoints subscribed to this event type
  → for each endpoint → create WebhookDelivery record → enqueue delivery job

Worker → sign payload with HMAC → POST to customer URL → record result
  → if failure → schedule retry (backoff: 5s, 30s, 5m, 30m, 4h)
  → if endpoint fails 10× in a row → mark is_active = false, notify org admin
```

### Payload Signing (Producer Side)

```typescript
const signature = crypto
  .createHmac('sha256', endpoint.secret)
  .update(JSON.stringify(payload))
  .digest('hex')

headers['X-Webhook-Signature'] = `sha256=${signature}`
headers['X-Webhook-Timestamp'] = Date.now().toString()
```

---

## 4. Environment Variables

```bash
# Consumer: Provider secrets
STRIPE_WEBHOOK_SECRET=whsec_...
GITHUB_WEBHOOK_SECRET=ghsec_...

# Producer: Signing
WEBHOOK_DELIVERY_TIMEOUT_MS=5000  # max wait for customer response
WEBHOOK_MAX_RETRIES=5
WEBHOOK_DISABLE_AFTER_FAILURES=10

# Queue
REDIS_URL=redis://localhost:6379
WEBHOOK_QUEUE_NAME=webhooks
WEBHOOK_DELIVERY_QUEUE_NAME=webhook-deliveries
```

---

## 5. File Structure

```
src/
  webhooks/
    webhooks.controller.ts           ← Consumer endpoints
    webhooks.service.ts
    webhooks.module.ts
    consumers/
      stripe.consumer.ts
      github.consumer.ts
    handlers/
      invoice-paid.handler.ts
      subscription-deleted.handler.ts
    producer/
      webhook-producer.service.ts
      webhook-delivery.worker.ts
    endpoints/
      endpoints.controller.ts        ← CRUD for customer endpoints
      endpoints.service.ts
    dto/
      create-endpoint.dto.ts
    entities/
      webhook-event.entity.ts
      webhook-endpoint.entity.ts
      webhook-delivery.entity.ts
    workers/
      webhook-processor.worker.ts
```

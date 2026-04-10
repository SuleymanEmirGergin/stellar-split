# Idempotency Playbook

Apply this playbook when the project includes operations that must produce the same result regardless of how many times they are retried: payment charges, job dispatches, webhook processing, or any state-changing API endpoint exposed to unreliable networks or retry loops.

Triggers:
- Payment or refund API calls (Stripe, Paddle)
- Background job dispatch from an HTTP handler
- Webhook event processing (Stripe, GitHub, Daily.co)
- Mobile or IoT clients that auto-retry on network failure
- "Submit" buttons without client-side disable-after-click
- Import or bulk mutation endpoints
- Distributed transactions across 2+ services

---

## 1. What to Infer From Frontend

| Frontend Signal | Idempotency Implication |
|---|---|
| Checkout / pay button | Payment charge must be idempotent — Section 3 |
| "Retry" or "Resend" button | Client explicitly retries — endpoint must be safe |
| File import / CSV upload | Large import must not double-insert on retry — Section 5 |
| Background job trigger button | Job dispatch must be at-most-once — Section 4 |
| Webhook delivery log page | Inbound webhooks need deduplication — Section 6 |
| `externalTriggers[]` with `payment-webhook` | HMAC + idempotency key on webhook — Section 6 |
| Multi-step wizard with "Submit" at end | Final step must not re-execute on browser back+resubmit |
| Any form with no client-side debounce | Double-submit race condition possible |

---

## 2. Idempotency Strategies

Three patterns — choose based on operation type:

| Pattern | When to Use | Guarantee |
|---|---|---|
| **Idempotency Key (client-provided)** | Payment charges, user-facing mutations | At-most-once: same key → same result |
| **Natural Key Deduplication** | Webhook events, import rows | Exactly-once: unique constraint on event_id or row hash |
| **Conditional Write (optimistic lock)** | Inventory decrement, seat reservation, status transitions | Exactly-once: DB-level version check |

---

## 3. Idempotency Key Pattern (Payment APIs)

The client generates a unique key per intended operation. The server uses it as a cache key: first request executes, subsequent requests with the same key return the cached result.

```typescript
// POST /payments/charge — Stripe-style idempotency key
import { createHash } from "crypto";

@Post('/payments/charge')
async charge(
  @Headers('Idempotency-Key') idempotencyKey: string,
  @Body() dto: ChargeDto,
  @CurrentUser() user: User,
) {
  if (!idempotencyKey) {
    throw new BadRequestException('Idempotency-Key header is required');
  }

  // 1. Check cache — return cached result if key already used
  const cached = await this.redis.get(`idem:charge:${idempotencyKey}`);
  if (cached) {
    return JSON.parse(cached); // Identical response, no Stripe call
  }

  // 2. Execute the operation
  const result = await this.stripeService.charge(dto);

  // 3. Cache result — TTL should cover client retry window (24h recommended)
  await this.redis.setex(
    `idem:charge:${idempotencyKey}`,
    86400, // 24 hours
    JSON.stringify(result)
  );

  return result;
}
```

**Key generation (client-side):**
```typescript
// Client generates key per intent, not per request
const idempotencyKey = `charge-${userId}-${cartId}-${Date.now()}`;
// Or use UUID v4: crypto.randomUUID()
```

**Rules:**
- Key must be unique per logical operation, not per HTTP call
- Server stores result for 24h minimum (covers all client retry windows)
- If the cached request had an error: return the same error — do not retry the operation
- Key format: `{operation}-{userId}-{resourceId}-{timestamp}` or UUID v4
- Use Redis with `SETEX` for automatic TTL expiry

---

## 4. Job Dispatch Idempotency

Background jobs dispatched from HTTP handlers must not be enqueued twice on double-submit or retry.

```typescript
// BullMQ — deduplication via jobId
import { Queue } from "bullmq";

const emailQueue = new Queue('email', { connection: redis });

@Post('/invitations')
async sendInvitation(@Body() dto: InvitationDto) {
  const invitation = await this.invitationRepo.create(dto);

  // jobId makes this idempotent — BullMQ ignores duplicate jobIds
  await emailQueue.add(
    'send-invitation-email',
    { invitationId: invitation.id, email: dto.email },
    {
      jobId: `invitation-email-${invitation.id}`, // Deterministic, unique per invitation
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    }
  );

  return invitation;
}
```

**Natural deduplication via DB record:**
```typescript
// Pattern: create DB record first, dispatch job referencing its ID
// If HTTP handler retries → DB insert fails (unique constraint) → job already enqueued
// The job processor checks record status before acting

// Job processor
async process(job: Job<{ invitationId: string }>) {
  const invitation = await db.invitation.findUniqueOrThrow({
    where: { id: job.data.invitationId }
  });

  // Guard: skip if already processed
  if (invitation.emailSentAt) {
    return; // Idempotent — already done
  }

  await emailService.send(invitation.email, 'invitation');

  await db.invitation.update({
    where: { id: invitation.id },
    data: { emailSentAt: new Date() },
  });
}
```

---

## 5. Import Deduplication (Bulk Operations)

CSV/Excel imports must not double-insert rows on file re-upload or job retry.

```typescript
// Strategy 1: Hash-based row deduplication
import { createHash } from "crypto";

function rowHash(row: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(row))
    .digest("hex");
}

// Prisma — upsert on row hash
await prisma.importedRow.upsert({
  where: { rowHash: rowHash(row) },
  create: { ...row, rowHash: rowHash(row), importJobId: job.id },
  update: {}, // No-op if already exists — idempotent
});

// Strategy 2: Natural key upsert (email, SKU, external ID)
await prisma.contact.upsert({
  where: { email: row.email },
  create: { email: row.email, name: row.name },
  update: { name: row.name }, // Update if changed — safe to re-run
});
```

**Import job idempotency via status tracking:**
```typescript
// ImportJob entity
model ImportJob {
  id          String      @id @default(uuid())
  fileHash    String      @unique    // SHA-256 of uploaded file
  status      ImportStatus @default(PENDING)
  totalRows   Int         @default(0)
  processedRows Int       @default(0)
  failedRows  Int         @default(0)
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime    @default(now())
}

enum ImportStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

// Before processing: check if identical file was already imported
const fileHash = sha256(fileBuffer);
const existing = await db.importJob.findUnique({ where: { fileHash } });
if (existing?.status === 'COMPLETED') {
  throw new ConflictException('This file has already been imported successfully');
}
```

---

## 6. Webhook Event Deduplication

Webhook providers (Stripe, GitHub, Daily.co) may deliver the same event more than once. Store processed event IDs and skip duplicates.

```typescript
// WebhookEvent entity — deduplication table
model WebhookEvent {
  id          String   @id @default(uuid())
  provider    String                          // "stripe", "github", "daily"
  eventId     String                          // Provider's event ID
  type        String                          // "payment_intent.succeeded"
  payload     Json
  processedAt DateTime @default(now())

  @@unique([provider, eventId])               // Unique constraint = deduplication
}

// Webhook handler
@Post('/webhooks/stripe')
async stripeWebhook(
  @Headers('stripe-signature') sig: string,
  @RawBody() rawBody: Buffer,
) {
  // 1. Verify signature first — always
  const event = this.stripe.webhooks.constructEvent(
    rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET
  );

  // 2. Deduplicate — skip if already processed
  try {
    await db.webhookEvent.create({
      data: {
        provider: 'stripe',
        eventId: event.id,
        type: event.type,
        payload: event.data,
      }
    });
  } catch (e) {
    if (e.code === 'P2002') {
      // Prisma unique constraint violation — already processed
      return { received: true, duplicate: true };
    }
    throw e;
  }

  // 3. Process event — only reached if not duplicate
  await this.stripeEventQueue.add(event.type, event.data.object);

  return { received: true };
}
```

---

## 7. Conditional Write (Optimistic Locking)

For inventory, seat reservations, or status transitions — prevent two concurrent requests from both succeeding.

```typescript
// Prisma — conditional update with version field
model Product {
  id       String @id @default(uuid())
  stock    Int
  version  Int    @default(0)          // Optimistic lock version
}

// Decrement stock only if version matches
const updated = await prisma.product.updateMany({
  where: {
    id: productId,
    version: currentVersion,  // Condition: must match what we read
    stock: { gte: quantity }, // Condition: must have enough stock
  },
  data: {
    stock: { decrement: quantity },
    version: { increment: 1 },
  },
});

if (updated.count === 0) {
  throw new ConflictException('Stock changed since last read — please retry');
}
```

**Status transition guard:**
```typescript
// Only allow valid state transitions
const updated = await prisma.order.updateMany({
  where: {
    id: orderId,
    status: 'pending',           // Must be in 'pending' state — not already fulfilled
  },
  data: { status: 'fulfilled' },
});

if (updated.count === 0) {
  throw new ConflictException('Order is not in pending state');
}
```

---

## 8. Required API Endpoints

| Method | Route | Idempotency Requirement |
|---|---|---|
| POST | /payments/charge | `Idempotency-Key` header required |
| POST | /invitations | Job dispatch via deterministic `jobId` |
| POST | /imports | File hash check before processing |
| POST | /webhooks/:provider | Event ID deduplication via `WebhookEvent` table |
| POST | /orders/:id/fulfill | Conditional write on `status = 'pending'` |
| PATCH | /inventory/decrement | Optimistic lock on `version` field |

---

## 9. Security Rules

- `Idempotency-Key` header must be validated: minimum 8 chars, maximum 128 chars, alphanumeric + hyphen
- Cache idempotency key results for minimum 24 hours — Stripe's retry window is up to 24h
- Webhook event ID uniqueness must be enforced via DB unique constraint, not in-memory — crash-safe
- Never use client IP or timestamp alone as idempotency key — must be client-generated UUID or equivalent
- If an idempotency key is reused with a different request body: return `422 Unprocessable Entity` — do not execute the new request body
- Log all idempotency key collisions for debugging: `idem:collision:{operation}:{key}` counter in Redis

---

## 10. Environment Variables

```bash
# Redis (required for idempotency key cache)
REDIS_URL=redis://localhost:6379

# Idempotency key TTL (seconds)
IDEMPOTENCY_KEY_TTL=86400          # 24 hours — covers all client retry windows

# Webhook deduplication window
WEBHOOK_DEDUP_DAYS=7               # Keep processed event IDs for 7 days
```

---

## 11. File Structure

```
src/
├── common/
│   └── idempotency/
│       ├── idempotency.guard.ts       ← Decorator-based: @UseIdempotency() on endpoints
│       ├── idempotency.service.ts     ← Redis get/set with TTL
│       └── idempotency.decorator.ts   ← @IdempotencyKey() param decorator
├── modules/
│   └── webhooks/
│       ├── webhook-event.entity.ts    ← WebhookEvent model (deduplication table)
│       └── webhook.service.ts         ← Event deduplication logic
└── prisma/
    └── schema.prisma                  ← WebhookEvent + ImportJob models
```

**`IdempotencyGuard` pattern:**
```typescript
@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(private redis: Redis) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest();
    const key = request.headers['idempotency-key'];

    if (!key) return true; // Guard is opt-in per route

    const cached = await this.redis.get(`idem:${key}`);
    if (cached) {
      const response = ctx.switchToHttp().getResponse();
      const { status, body } = JSON.parse(cached);
      response.status(status).json(body);
      return false; // Short-circuit — response already sent
    }

    // Store key with placeholder — will be overwritten by response interceptor
    await this.redis.setex(`idem:${key}`, 86400, JSON.stringify({ pending: true }));
    return true;
  }
}
```

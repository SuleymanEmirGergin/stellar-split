# Background Jobs Playbook

This playbook guides the Backend Integrator Agent when identifying and implementing background job queues and scheduled tasks derived from frontend UI flows.

---

## 1. What to Infer From Frontend

Identify these UI patterns that imply background processing is needed:

- **"Processing..." / Progress spinner after submit**: Heavy operation — must not block HTTP.
- **Email confirmations**: Registration, invite, reset, receipt — always async.
- **"Export" button with file download**: CSV/PDF generation — background + signed URL.
- **Image / video processing**: Resize, transcode, thumbnail — never synchronous.
- **Bulk operations**: "Delete all", "Import CSV", "Send to all users" — always background.
- **Scheduled reports / digests**: "Weekly summary" email — cron job.
- **Webhook delivery**: Sending events to customer endpoints — async with retry.
- **Payment / billing events**: Dunning, trial expiry — triggered by webhooks, processed async.
- **Analytics aggregation**: Nightly rollup of usage data — cron job.
- **"Sync" features**: "Sync with Google Calendar" — background pull/push.
- **Push notifications**: After a trigger event — fire and forget.

---

## 2. Background Job Types

| Type | Trigger | Example |
|---|---|---|
| **Immediate job** | API request completes | Send welcome email after register |
| **Delayed job** | After specific duration | Send "trial ending soon" 3 days before |
| **Scheduled (cron)** | Time-based | Nightly analytics aggregation |
| **Recurring** | On interval | Sync external data every 30 min |
| **Chained job** | Previous job output | Upload → resize → generate thumbnail |
| **Batch job** | Large dataset | Send newsletter to 50,000 users |
| **Fan-out job** | One trigger → many tasks | Org event → notify all N members |

---

## 3. Queue Architecture

### Recommended: BullMQ (Node.js) + Redis

**Never** process background work inside the HTTP server process — use a separate worker process.

```
HTTP API process        →  adds jobs to Redis queue
Worker process          →  reads jobs, processes, retries on failure
```

### Queue Design Principles

- **One queue per concern** — separate queues for email, webhooks, exports, etc.
- **Priority queues** — use BullMQ priority for time-sensitive jobs (auth emails over newsletters).
- **Dead Letter Queue** — jobs that fail all retries go to a failed queue for inspection.
- **Rate limiting at job level** — BullMQ can rate-limit how fast jobs are consumed.

---

## 4. Required Queue Definitions

Define queues based on inferred frontend features:

| Queue Name | Jobs | Priority |
|---|---|---|
| `emails` | welcome, reset-password, invitation, receipt | High |
| `notifications` | push, SMS, in-app | High |
| `exports` | csv-export, pdf-generate | Normal |
| `media` | image-resize, video-transcode, thumbnail | Normal |
| `webhooks` | deliver-webhook, retry-webhook | Normal |
| `imports` | csv-import, data-sync | Low |
| `billing` | dunning, subscription-sync, trial-expiry | High |
| `analytics` | aggregate-daily, recompute-metrics | Low |
| `broadcasts` | send-newsletter, notify-all-users | Low |

---

## 5. Job Definitions

Every job must have:

```typescript
interface JobPayload {
  // All data needed to process the job independently
  // Never rely on external state — embed all required info in the payload
}

interface JobResult {
  success: boolean
  processedAt: string
  data?: unknown
}
```

### Example — Email Job

```typescript
interface SendEmailJobPayload {
  to: string
  subject: string
  templateId: string
  templateVariables: Record<string, string>
  organizationId?: string
}

// Producer (in AuthService)
await emailQueue.add(
  'send-welcome',
  { to: user.email, subject: 'Welcome!', templateId: 'welcome', templateVariables: { name: user.name } },
  { priority: 1, attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
)

// Consumer (in EmailWorker)
@Process('send-welcome')
async handleWelcome(job: Job<SendEmailJobPayload>) {
  await emailAdapter.send(job.data)
}
```

---

## 6. Retry Strategy

Always configure retry behavior per job type:

| Job Type | Attempts | Backoff | Strategy |
|---|---|---|---|
| Email send | 3 | Exponential (2s, 4s, 8s) | Email providers are usually reliable |
| Webhook delivery | 5 | Exponential (5s, 30s, 5m, 30m, 4h) | Customer endpoints may be flaky |
| File export | 2 | Fixed (30s) | Likely a code bug if it fails |
| Payment sync | 3 | Exponential (5s, 30s, 5m) | Stripe API may be temporarily down |
| Analytics aggregate | 1 | None | Idempotent — safe to re-run manually |

```typescript
await queue.add('job-name', payload, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 100,          // keep last 100 completed jobs for debugging
  removeOnFail: 500,              // keep last 500 failed jobs for inspection
})
```

---

## 7. Delayed & Scheduled Jobs

### Delayed (run after N seconds)

```typescript
// Send "trial ending" email 3 days before trial_end
const delayMs = trialEndDate.getTime() - Date.now() - (3 * 24 * 60 * 60 * 1000)
await billingQueue.add('trial-ending-soon', { userId }, { delay: delayMs })
```

### Scheduled (cron)

```typescript
// Nightly analytics aggregation at 02:00 UTC
await analyticsQueue.add(
  'aggregate-daily',
  {},
  { repeat: { cron: '0 2 * * *' }, jobId: 'aggregate-daily-cron' }
)
```

Always assign a fixed `jobId` to cron jobs to prevent duplicates on restart.

---

## 8. Fan-Out Pattern

When one event must trigger jobs for many recipients:

```typescript
// WRONG — N database reads inside one job
async function notifyAllMembers(orgId: string) {
  const members = await db.members.findMany({ where: { orgId } })
  for (const member of members) {
    await notifyMember(member)  // blocking loop
  }
}

// RIGHT — fan-out into individual jobs
async function fanOutMemberNotifications(orgId: string) {
  const memberIds = await db.members.findIds({ where: { orgId } })
  const jobs = memberIds.map(memberId => ({
    name: 'notify-member',
    data: { memberId, orgId },
  }))
  await notificationQueue.addBulk(jobs)
}
```

---

## 9. Idempotency

Every job must be idempotent — safe to run multiple times without side effects:

```typescript
// BAD — double-processing sends double email
async function sendWelcomeEmail(userId: string) {
  await emailAdapter.send(...)  // will send twice if job retried
}

// GOOD — guard against re-processing
async function sendWelcomeEmail(userId: string) {
  const alreadySent = await redis.get(`job:welcome-email:${userId}`)
  if (alreadySent) return

  await emailAdapter.send(...)
  await redis.setex(`job:welcome-email:${userId}`, 86400, '1')
}
```

---

## 10. Job Monitoring

Always expose visibility into job queues:

- **BullMQ Dashboard** (Bull Board): mount at `/admin/queues` (admin-only route).
- **Metrics**: expose queue depth (`waiting`, `active`, `failed`) to monitoring (Prometheus / Datadog).
- **Alerts**: alert ops when `failed` count exceeds threshold or DLQ is non-empty.

```typescript
// Bull Board (Express)
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'

const serverAdapter = new ExpressAdapter()
createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter })
app.use('/admin/queues', requireAuth, requireRole('admin'), serverAdapter.getRouter())
```

---

## 11. Environment Variables

```bash
# Redis (shared with cache and rate limiting)
REDIS_URL=redis://localhost:6379

# Worker concurrency (per queue)
EMAIL_QUEUE_CONCURRENCY=5
WEBHOOK_QUEUE_CONCURRENCY=10
MEDIA_QUEUE_CONCURRENCY=2        # CPU-heavy — keep low
EXPORT_QUEUE_CONCURRENCY=3

# Job retention
JOB_KEEP_COMPLETED=100
JOB_KEEP_FAILED=500

# Queue names
EMAIL_QUEUE_NAME=emails
NOTIFICATION_QUEUE_NAME=notifications
EXPORT_QUEUE_NAME=exports
WEBHOOK_QUEUE_NAME=webhooks
ANALYTICS_QUEUE_NAME=analytics
```

---

## 12. File Structure

```
src/
  queues/
    queue.module.ts              ← Registers all BullMQ queues
    queue.constants.ts           ← Queue name constants
    queues/
      email.queue.ts
      notification.queue.ts
      export.queue.ts
      webhook.queue.ts
      analytics.queue.ts

apps/
  worker/                        ← Separate process
    main.ts                      ← Worker entry point (no HTTP server)
    worker.module.ts
    processors/
      email.processor.ts
      notification.processor.ts
      export.processor.ts
      webhook-delivery.processor.ts
      analytics.processor.ts
    crons/
      analytics-aggregation.cron.ts
      audit-retention.cron.ts
      trial-expiry.cron.ts
```

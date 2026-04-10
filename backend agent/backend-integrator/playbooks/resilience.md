# Resilience Playbook

This playbook guides the Backend Integrator Agent when implementing resilience patterns that protect production backends from cascading failures caused by transient errors, overload, or unresponsive external services (Stripe, SendGrid, Twilio, OpenAI, internal microservices, 3rd-party APIs).

---

## 1. What to Infer From Frontend

Identify these UI signals that indicate external service calls requiring resilience patterns:

- **Payment forms / checkout** → calls Stripe/Paddle — needs circuit breaker + retry with idempotency key
- **"Send Code" / "Verify Email" / "Notify" buttons** → calls SendGrid/Resend/Twilio — needs retry + rate limit
- **AI-powered features** ("Generate with AI", "Search with AI") → calls OpenAI/Claude — needs timeout + circuit breaker + bulkhead
- **Social login buttons** (Google, GitHub OAuth) → calls OAuth providers — needs timeout + retry
- **File upload / export** with 3rd-party storage → calls S3/GCS/R2 — needs retry + timeout
- **Any loading spinner lasting > 2 seconds** → underlying call needs explicit timeout policy
- **"Retry" button on error state** → the upstream call needs retry at the service layer, not the client
- **"Service temporarily unavailable" error states** → circuit breaker pattern needed
- **Webhook delivery status** (sent / failed / retrying) → retry + DLQ pattern (see `webhooks.md`)
- **Health check dashboard or status page** → circuit breaker state must be exposed via `/health/ready`

**If none of these signals are present**: apply only basic timeout policy (Section 5) to all external HTTP calls. Skip circuit breaker and retry for database queries — the ORM connection pool already handles transient DB errors.

---

## 2. Resilience Patterns Overview

| Pattern | Problem Solved | When to Apply | Key Parameter |
|---|---|---|---|
| **Circuit Breaker** | Prevents hammering a failing service | External APIs with unreliable uptime | Failure rate threshold (e.g. 50% in 10s) |
| **Retry + Backoff** | Recovers from transient failures | Idempotent or idempotency-key-protected calls | Max retries, base delay |
| **Timeout** | Prevents thread/connection starvation | Every external HTTP call | Wall-clock limit (e.g. 5s) |
| **Bulkhead** | Isolates one integration from exhausting all workers | Multiple slow integrations sharing a pool | Max concurrent calls |

**Layering order** (outermost → innermost around the external call):

```
request → Bulkhead → Circuit Breaker → Retry → Timeout → [External Service]
```

A failed timeout increments the circuit breaker counter. A tripped circuit breaker blocks before retry is attempted. Bulkhead prevents saturation before any of the above.

---

## 3. Circuit Breaker

### Node.js — `opossum`

```typescript
// src/lib/circuit-breaker.ts
import CircuitBreaker from 'opossum'

export function createBreaker<T>(
  fn: (...args: unknown[]) => Promise<T>,
  options?: Partial<CircuitBreaker.Options>,
): CircuitBreaker {
  return new CircuitBreaker(fn, {
    timeout: 5000,                  // Call times out after 5s → counts as failure
    errorThresholdPercentage: 50,   // Trip at 50% failure rate
    resetTimeout: 30_000,           // Half-open probe after 30s
    volumeThreshold: 5,             // Min calls before tripping (avoid false trips)
    ...options,
  })
}

// Per-integration breaker instances:
export const stripeBreaker = createBreaker(
  (params: Stripe.ChargeCreateParams) => stripeClient.charges.create(params),
  { timeout: 8000, resetTimeout: 60_000 },
)

export const resendBreaker = createBreaker(
  (params: ResendEmailParams) => resendClient.emails.send(params),
  { timeout: 5000, resetTimeout: 30_000 },
)

// In service layer:
export class PaymentService {
  async charge(params: ChargeParams): Promise<ChargeResult> {
    try {
      return await stripeBreaker.fire(params)
    } catch (err) {
      if (stripeBreaker.opened) {
        throw new ServiceUnavailableException('Payment provider temporarily unavailable')
      }
      throw err
    }
  }
}
```

### Python — `pybreaker`

```python
# src/lib/circuit_breaker.py
import pybreaker

stripe_breaker = pybreaker.CircuitBreaker(
    fail_max=5,           # Trip after 5 consecutive failures
    reset_timeout=30,     # Attempt reset after 30s
    name='stripe',
)

resend_breaker = pybreaker.CircuitBreaker(
    fail_max=3,
    reset_timeout=60,
    name='resend',
)

# Usage — decorator on the adapter method:
@stripe_breaker
async def _stripe_charge(amount: int, customer_id: str, idempotency_key: str) -> dict:
    return await stripe_client.charges.create(
        amount=amount,
        currency='usd',
        customer=customer_id,
        idempotency_key=idempotency_key,
    )

# In service:
async def process_payment(amount: int, customer_id: str, idempotency_key: str):
    try:
        return await _stripe_charge(amount, customer_id, idempotency_key)
    except pybreaker.CircuitBreakerError:
        raise ServiceUnavailableError('Payment provider temporarily unavailable')
```

### Circuit Breaker State Machine

```
         [failure rate > threshold]
CLOSED ──────────────────────────────▶ OPEN
  ▲                                      │
  │ [probe succeeds]        [reset       │
  │                          timeout]    ▼
CLOSED ◀──────────────────── HALF-OPEN ──┘
                              │
                    [probe fails]
                              ▼
                            OPEN
```

- **CLOSED**: Normal operation — all calls pass through.
- **OPEN**: Every call immediately raises `ServiceUnavailableException` — no network attempt is made.
- **HALF-OPEN**: One probe call is allowed — success closes the breaker, failure re-opens it.

---

## 4. Retry with Exponential Backoff + Jitter

### Node.js — `p-retry`

```typescript
// src/lib/retry.ts
import pRetry, { AbortError } from 'p-retry'

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; maxTimeout?: number } = {},
): Promise<T> {
  return pRetry(fn, {
    retries: options.retries ?? 3,
    minTimeout: 500,                    // Start at 500ms
    maxTimeout: options.maxTimeout ?? 10_000,
    factor: 2,                          // Exponential: 500 → 1000 → 2000ms
    randomize: true,                    // ±50% jitter — prevents thundering herd
    onFailedAttempt: (error) => {
      // Abort retries for deterministic failures — retrying won't help
      const status = (error as { response?: { status?: number } }).response?.status
      if (status && [400, 401, 403, 404, 422].includes(status)) {
        throw new AbortError(error)
      }
      console.warn(
        `[retry] Attempt ${error.attemptNumber} failed (${error.retriesLeft} left): ${error.message}`
      )
    },
  })
}

// Usage in service:
export class EmailService {
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    await withRetry(
      () => resendBreaker.fire({ to, subject: 'Verify your email', html: buildEmailHtml(token) }),
      { retries: 3, maxTimeout: 5_000 },
    )
  }
}
```

### Python — `tenacity`

```python
# src/lib/retry.py
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential_jitter,
    retry_if_exception_type,
    before_sleep_log,
)
import logging
import httpx

logger = logging.getLogger(__name__)

def transient_retry(retries: int = 3, max_wait: float = 10.0):
    """Decorator for retrying transient network errors only."""
    return retry(
        stop=stop_after_attempt(retries),
        wait=wait_exponential_jitter(initial=0.5, max=max_wait, jitter=1.0),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )

# Usage:
class EmailService:
    @transient_retry(retries=3)
    async def send_verification_email(self, to: str, token: str) -> None:
        async with resend_breaker:
            response = await self.http_client.post(
                'https://api.resend.com/emails',
                headers={'Authorization': f'Bearer {self.api_key}'},
                json={'to': to, 'subject': 'Verify your email', 'html': build_html(token)},
                timeout=5.0,
            )
            response.raise_for_status()
```

### Jitter — Why It Matters

Without jitter, every retrying client hits the recovering service at the same moment after each delay interval — amplifying load at exactly the worst time.

| Strategy | Formula | Use Case |
|---|---|---|
| **Full Jitter** | `random(0, base × 2^n)` | Most APIs — maximum spread |
| **Decorrelated Jitter** | `min(cap, random(base, prev × 3))` | High-concurrency systems |

**Never retry**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `422 Unprocessable Entity` — these are deterministic failures.

**Always retry** (with jitter): `429 Too Many Requests` (honor `Retry-After`), `500`, `502`, `503`, `504`, connection resets, timeouts.

---

## 5. Timeout Policy

Every external HTTP call must have an explicit timeout. Never rely on the client's default (often 120s or infinite).

### Node.js — `AbortController`

```typescript
// src/lib/http-client.ts
export async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 5_000, ...fetchOptions } = options
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, { ...fetchOptions, signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json() as Promise<T>
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new GatewayTimeoutException(`${url} timed out after ${timeoutMs}ms`)
    }
    throw err
  } finally {
    clearTimeout(id)
  }
}

// With axios — set global + per-call timeout:
const client = axios.create({ timeout: 5_000 })
await client.post('/charge', payload, { timeout: 10_000 }) // override
```

### Python — `httpx` Timeout Config

```python
# src/lib/http_client.py
import httpx

DEFAULT_TIMEOUT = httpx.Timeout(
    connect=3.0,   # TCP handshake max
    read=5.0,      # Response read max
    write=3.0,     # Request write max
    pool=1.0,      # Wait for pool slot max
)

http_client = httpx.AsyncClient(timeout=DEFAULT_TIMEOUT)

# Override per-call for slow services:
await http_client.post('/generate', json=payload, timeout=httpx.Timeout(read=60.0))
```

### Recommended Timeout Values

| Service Type | Timeout |
|---|---|
| Internal service (same datacenter / cluster) | 1–2s |
| External REST API (Stripe, Resend, Twilio) | 5–8s |
| AI / LLM API (non-streaming) | 30s |
| AI / LLM API (streaming response) | 120s |
| File upload to S3 / presigned PUT | 30–60s |
| PostgreSQL query (read) | 5s |
| PostgreSQL query (write, no transaction) | 10s |

**Rule:** Application timeout must be shorter than the load balancer / reverse proxy timeout. If Nginx or your LB drops connections at 30s, your service timeout must be < 30s so the app error handler runs before the connection is dropped.

---

## 6. Bulkhead / Concurrency Limiting

Prevents one slow integration from consuming all available event loop workers or connection slots.

### Node.js — `p-limit`

```typescript
// src/lib/bulkhead.ts
import pLimit from 'p-limit'

// Per-integration concurrency caps
export const stripeLimiter = pLimit(10)   // Max 10 concurrent Stripe calls
export const s3Limiter = pLimit(20)       // Max 20 concurrent S3 operations
export const emailLimiter = pLimit(5)     // Max 5 concurrent email sends
export const llmLimiter = pLimit(3)       // Max 3 concurrent LLM calls (expensive + slow)

// Usage in service:
export class StorageService {
  async uploadMany(files: Buffer[]): Promise<string[]> {
    return Promise.all(
      files.map((file, i) =>
        s3Limiter(() =>
          this.s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: `file-${i}`, Body: file }))
        )
      )
    )
  }
}
```

### Python — `asyncio.Semaphore`

```python
# src/lib/bulkhead.py
import asyncio
from contextlib import asynccontextmanager

class Bulkhead:
    def __init__(self, max_concurrent: int, name: str):
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self.name = name

    @asynccontextmanager
    async def acquire(self):
        async with self._semaphore:
            yield

# Module-level singletons:
stripe_bulkhead = Bulkhead(max_concurrent=10, name='stripe')
s3_bulkhead = Bulkhead(max_concurrent=20, name='s3')
email_bulkhead = Bulkhead(max_concurrent=5, name='email')
llm_bulkhead = Bulkhead(max_concurrent=3, name='llm')

# Usage:
async def upload_file(content: bytes, key: str) -> None:
    async with s3_bulkhead.acquire():
        await s3_client.put_object(Bucket=BUCKET, Key=key, Body=content)
```

---

## 7. Combining Patterns

Apply the full pattern chain for payment and AI integrations. For email and simple REST calls, retry + timeout is usually sufficient.

```typescript
// src/services/payment.service.ts — Full chain (Node.js)
import { stripeBreaker } from '../lib/circuit-breaker'
import { withRetry } from '../lib/retry'
import { stripeLimiter } from '../lib/bulkhead'

export class PaymentService {
  async charge(params: ChargeParams): Promise<ChargeResult> {
    // Order: Bulkhead → Circuit Breaker → Retry → Timeout (set inside breaker)
    return stripeLimiter(() =>
      withRetry(
        () => stripeBreaker.fire(params),
        { retries: 2, maxTimeout: 10_000 },
      )
    )
  }
}
```

```python
# src/services/payment_service.py — Full chain (Python)
from src.lib.circuit_breaker import stripe_breaker
from src.lib.retry import transient_retry
from src.lib.bulkhead import stripe_bulkhead

class PaymentService:
    @transient_retry(retries=2)
    @stripe_breaker
    async def charge(self, amount: int, customer_id: str, idempotency_key: str) -> dict:
        async with stripe_bulkhead.acquire():
            return await stripe_adapter.charge(amount, customer_id, idempotency_key)
```

### Pattern Selection Matrix

| Integration | Circuit Breaker | Retry | Timeout | Bulkhead |
|---|---|---|---|---|
| Stripe / payments | ✅ 60s reset | ✅ 2 retries + idempotency key | ✅ 8s | ✅ 10 concurrent |
| SendGrid / Resend | ✅ 30s reset | ✅ 3 retries | ✅ 5s | ✅ 5 concurrent |
| Twilio / SMS | ✅ 30s reset | ✅ 2 retries | ✅ 5s | ✅ 5 concurrent |
| OpenAI / Claude | ✅ 120s reset | ✅ 2 retries | ✅ 60s (streaming: 120s) | ✅ 3 concurrent |
| AWS S3 / R2 | ❌ rarely needed | ✅ 3 retries | ✅ 30s (upload) | ✅ 20 concurrent |
| Internal service (same cluster) | ⚠️ optional | ✅ 2 retries | ✅ 2s | ❌ not needed |
| PostgreSQL (via ORM) | ❌ pool handles | ❌ pool handles | ✅ query timeout | ❌ pool handles |

---

## 8. Health Check Integration

Circuit breaker state must be visible in the `/health/ready` endpoint. A tripped breaker means the service is degraded — the health check must return `503` so the load balancer can route around it.

```typescript
// src/health/health.controller.ts (NestJS)
import { stripeBreaker, resendBreaker } from '../lib/circuit-breaker'

@Get('ready')
async ready() {
  const stripe = { opened: stripeBreaker.opened, state: stripeBreaker.status.state }
  const email = { opened: resendBreaker.opened, state: resendBreaker.status.state }
  const degraded = stripeBreaker.opened || resendBreaker.opened

  if (degraded) {
    throw new ServiceUnavailableException({
      status: 'degraded',
      integrations: { stripe, email },
    })
  }

  return {
    status: 'ok',
    db: await this.dbPing(),
    redis: await this.redisPing(),
    integrations: { stripe, email },
  }
}
```

```python
# src/health/router.py (FastAPI)
from src.lib.circuit_breaker import stripe_breaker, resend_breaker
import pybreaker

@router.get('/health/ready')
async def health_ready():
    integrations = {
        'stripe': stripe_breaker.current_state,
        'email': resend_breaker.current_state,
    }
    degraded = any(
        s == pybreaker.STATE_OPEN
        for s in integrations.values()
    )
    return JSONResponse(
        status_code=503 if degraded else 200,
        content={
            'status': 'degraded' if degraded else 'ok',
            'integrations': integrations,
        },
    )
```

Sample degraded response (HTTP 503):
```json
{
  "status": "degraded",
  "integrations": {
    "stripe": "open",
    "email": "closed"
  }
}
```

---

## 9. Required API Endpoints

No new user-facing endpoints are introduced. Existing endpoints are modified:

| Endpoint | Change | Notes |
|---|---|---|
| `GET /health/ready` | Add `integrations{}` block | Shows circuit breaker state per integration |
| `GET /health/live` | No change | Liveness probe stays minimal — no breaker state |

---

## 10. Environment Variables

```bash
# Circuit Breaker Thresholds (optional — expose only if runtime tunability is needed)
CIRCUIT_BREAKER_TIMEOUT_MS=5000          # Per-call timeout before counting as failure
CIRCUIT_BREAKER_ERROR_THRESHOLD=50       # % failures that trip the breaker
CIRCUIT_BREAKER_RESET_TIMEOUT_MS=30000  # Milliseconds before half-open probe

# Per-integration timeout overrides
STRIPE_TIMEOUT_MS=8000
EMAIL_TIMEOUT_MS=5000
LLM_TIMEOUT_MS=60000

# Retry configuration
MAX_RETRY_ATTEMPTS=3
RETRY_BASE_DELAY_MS=500
```

**Note:** Hardcoding reasonable defaults is acceptable for most projects. Expose as env vars only when the team needs to tune without redeployment.

---

## 11. Security Rules

1. **Retry payment calls must include an idempotency key**: retrying a Stripe charge without `Idempotency-Key` can result in double charges. Generate the key before the first attempt and pass it through on every retry.
2. **Never retry 4xx errors**: `400`, `401`, `403`, `404`, `422` are deterministic failures — retrying generates unnecessary load and obscures real bugs.
3. **Circuit breaker fallback must not expose internal service names**: the error message shown to clients must not include service names, error details, or retry counts. Return generic `"Service temporarily unavailable"`.
4. **Application timeout < load balancer timeout**: if your LB/reverse proxy timeout is 30s, the application timeout must be < 30s so the app error handler runs before the LB drops the connection, avoiding misleading empty responses.
5. **Log retry attempts at WARN, circuit trips at ERROR**: avoid INFO-level retry logs that flood dashboards and mask real errors.
6. **Bulkhead limits must not be shared across tenants** in multi-tenant apps: per-tenant concurrency limits prevent one tenant's burst from degrading others.

---

## 12. Common Pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| Missing jitter on retry | "Thundering herd" — service recovers briefly then gets slammed by simultaneous retries | Use `randomize: true` in p-retry or `wait_exponential_jitter` in tenacity |
| Retrying non-idempotent payment calls | Double charges | Add `Idempotency-Key` header to Stripe; generate before first attempt and pass unchanged on retry |
| Circuit breaker timeout too high | 30s hangs before circuit opens; user waits for a timeout | Set `timeout ≤ 8s` for external APIs; set to less than LB timeout |
| No bulkhead on LLM calls | One batch LLM job consumes all Node.js worker capacity | Add `pLimit(3)` for LLM calls — they are slow, memory-heavy, and expensive |
| Swallowing `CircuitBreakerError` | `catch` block silences the error; request hangs or returns empty | Re-throw as `503 Service Unavailable` with `Retry-After` header |
| Applying retry to DB queries | Retry + ORM pool = lock contention and duplicate writes | Apply retry only to external HTTP calls; ORM pool + `maxWait` handles DB transient errors |
| Not exposing circuit breaker state in health check | Load balancer sends traffic to degraded instance | Return `503` from `/health/ready` when any circuit is `OPEN`; log the event |
| Global timeout that is too permissive | One slow call blocks all threads/workers | Set per-integration timeouts, not one global value |

# Rate Limiting Playbook

This playbook guides the Backend Integrator Agent when implementing rate limiting strategies to protect endpoints from abuse, brute-force attacks, and unintentional overload.

---

## 1. What to Infer From Frontend

Identify these UI elements and features that require rate limiting:

- **Login / Register forms**: Must be rate limited — primary brute-force attack surface.
- **Forgot Password / OTP forms**: Must be rate limited — prevents email bombing and enumeration.
- **Search bars with live results**: Debounce on frontend is not enough — backend must limit too.
- **Public API endpoints**: Any endpoint callable without auth needs rate limiting.
- **File upload endpoints**: Resource-intensive — limit concurrent and total requests.
- **Email / SMS send actions**: Direct cost — "Send Code" buttons must be strictly limited.
- **Payment initiation**: Prevent duplicate charge attempts.
- **Webhook receivers**: Protect from replay floods.
- **Admin "batch" actions**: Delete all, export all — must be limited to one-at-a-time per user.

---

## 2. Rate Limiting Strategies

| Strategy | How It Works | Best For |
|---|---|---|
| **Fixed Window** | Resets count every N minutes | Simple cases, API quotas |
| **Sliding Window** | Count over a rolling N-minute window | Smoother, fairer than fixed |
| **Token Bucket** | Tokens refill at a rate, consumed per request | Burst-tolerant APIs |
| **Leaky Bucket** | Requests queued, processed at fixed rate | Strict throughput control |
| **Concurrency Limit** | Max N requests in-flight simultaneously | File uploads, heavy jobs |

**Default recommendation**: Sliding window for auth endpoints; token bucket for general API endpoints.

---

## 3. Limit Tiers

Define rate limits by risk and resource cost:

| Endpoint Category | Limit | Window | Scope |
|---|---|---|---|
| Login / Auth | 10 req | 15 min | Per IP |
| Forgot password / OTP | 5 req | 1 hour | Per IP + Per email |
| Register | 5 req | 1 hour | Per IP |
| Public API (unauthenticated) | 60 req | 1 min | Per IP |
| Authenticated API | 300 req | 1 min | Per user |
| Search / autocomplete | 30 req | 1 min | Per user / IP |
| File upload | 20 req | 1 hour | Per user |
| Email / SMS send | 3 req | 10 min | Per user |
| Webhook receiver | 500 req | 1 min | Per IP |
| Admin batch operations | 1 req | concurrent | Per user |

---

## 4. Implementation Layers

Rate limiting should be applied at multiple layers:

```
Request arrives
   │
   ├─ Layer 1: Infrastructure (Nginx / API Gateway / Cloudflare)
   │    └─ Hard global cap — blocks obvious floods before hitting app
   │
   ├─ Layer 2: Application Middleware (Express / NestJS / FastAPI)
   │    └─ Per-endpoint, per-user/IP business logic limits
   │
   └─ Layer 3: Service Layer
        └─ Idempotency checks — prevent duplicate actions regardless of HTTP
```

---

## 5. Redis-Backed Rate Limiter

For distributed systems (multiple API instances), always use Redis — not in-memory:

### Key Design

```
rate-limit:{scope}:{identifier}:{endpoint}

Examples:
  rate-limit:ip:192.168.1.1:auth:login
  rate-limit:user:user_123:api:general
  rate-limit:email:user@test.com:auth:forgot-password
```

### Sliding Window Implementation

```typescript
async function isRateLimited(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ limited: boolean; remaining: number; resetAt: number }> {
  const now = Date.now()
  const windowStart = now - windowSeconds * 1000

  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(key, 0, windowStart)          // remove old entries
  pipeline.zadd(key, now, `${now}-${Math.random()}`)      // add current request
  pipeline.zcard(key)                                      // count in window
  pipeline.expire(key, windowSeconds)                      // auto-cleanup

  const results = await pipeline.exec()
  const count = results[2][1] as number

  return {
    limited: count > limit,
    remaining: Math.max(0, limit - count),
    resetAt: Math.ceil((now + windowSeconds * 1000) / 1000),
  }
}
```

---

## 6. Middleware Patterns

### Express.js (with `express-rate-limit` + Redis store)

```typescript
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,          // Return rate limit info in headers
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  keyGenerator: (req) => `${req.ip}:${req.path}`,
  handler: (req, res) => res.status(429).json({
    success: false,
    error: 'Too many requests. Please try again later.',
    data: null,
  }),
})

app.use('/api/auth/login', authLimiter)
app.use('/api/auth/forgot-password', authLimiter)
```

### NestJS (ThrottlerModule)

```typescript
// app.module.ts
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 5 },       // 5/second
  { name: 'medium', ttl: 60000, limit: 100 },    // 100/minute
  { name: 'long', ttl: 3600000, limit: 1000 },   // 1000/hour
])

// Controller
@Throttle({ short: { ttl: 60000, limit: 10 } })
@Post('login')
async login() {}
```

---

## 7. Response Headers

Always return standard rate limit headers so clients can adapt:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1711720800    (Unix timestamp)
Retry-After: 47                  (seconds until reset, on 429)
```

Return HTTP `429 Too Many Requests` with a `Retry-After` header when the limit is exceeded.

---

## 8. Per-User vs Per-IP

| Situation | Scope |
|---|---|
| Unauthenticated endpoints | Per IP |
| Authenticated endpoints | Per user ID (not IP — user may change IP) |
| Auth endpoints (login, register) | Per IP AND per email (double scope) |
| API keys | Per API key |
| Multi-tenant | Per organization (for shared rate limits across team) |

---

## 9. Bypass & Allowlist

Always provide a mechanism to bypass limits for trusted contexts:

```typescript
const RATE_LIMIT_BYPASS_IPS = process.env.RATE_LIMIT_BYPASS_IPS?.split(',') ?? []

const keyGenerator = (req: Request) => {
  if (RATE_LIMIT_BYPASS_IPS.includes(req.ip)) return null  // no limit
  return req.ip
}
```

Typical bypass list: internal health check IPs, monitoring services, CI/CD runners.

---

## 10. Idempotency Keys (Layer 3)

For payment and order endpoints, use idempotency keys to prevent duplicate operations even when rate limiting passes:

```typescript
// Client sends: X-Idempotency-Key: uuid-per-request
const idempotencyKey = req.headers['x-idempotency-key']

const existing = await redis.get(`idempotency:${idempotencyKey}`)
if (existing) {
  return res.json(JSON.parse(existing))   // return cached result
}

const result = await processPayment(req.body)
await redis.setex(`idempotency:${idempotencyKey}`, 86400, JSON.stringify(result))
return res.json(result)
```

---

## 11. Environment Variables

```bash
# Redis (shared with queue and cache)
REDIS_URL=redis://localhost:6379

# Rate limit bypass
RATE_LIMIT_BYPASS_IPS=127.0.0.1,10.0.0.1

# Limits (override defaults per environment)
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_AUTH_WINDOW_MS=900000     # 15 minutes
RATE_LIMIT_API_MAX=300
RATE_LIMIT_API_WINDOW_MS=60000       # 1 minute
```

---

## 12. File Structure

```
src/
  common/
    middleware/
      rate-limit.middleware.ts       ← Configurable limiter factory
    guards/
      throttle.guard.ts              ← NestJS throttle guard
    helpers/
      idempotency.helper.ts          ← Idempotency key check/store
  core/
    redis/
      redis.client.ts                ← Shared Redis connection
```

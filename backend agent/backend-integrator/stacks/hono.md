# Hono Stack Guide

Framework-specific patterns, conventions, and gotchas for the Backend Integrator Agent when the project uses **Hono** — an ultra-fast, edge-first web framework for Node.js, Cloudflare Workers, Deno, and Bun.

---

## 1. When to Choose Hono

| Factor | Hono | NestJS | Express |
|---|---|---|---|
| Performance | Fastest (< 1ms routing) | Moderate | Moderate |
| Bundle size | ~14KB | ~MB | ~MB |
| Edge / Serverless | ✅ Native | ❌ Poor | ❌ Poor |
| Cloudflare Workers | ✅ First-class | ❌ | ❌ |
| TypeScript experience | Excellent | Excellent | Good |
| Ecosystem / plugins | Growing | Mature | Mature |
| Built-in middleware | Extensive | Via decorators | Via npm |
| Learning curve | Low | High | Low |

**Choose Hono when**: Cloudflare Workers, edge deployments, Bun runtime, serverless with low cold-start requirements, or when maximum performance is the goal.

---

## 2. Project Structure

```
src/
  index.ts                   ← Entry point (runtime-specific)
  app.ts                     ← Hono app setup (shared across runtimes)
  routes/
    auth.route.ts
    users.route.ts
    products.route.ts
  middleware/
    auth.middleware.ts
    rate-limit.middleware.ts
    logger.middleware.ts
  services/
    auth.service.ts
    users.service.ts
  repositories/
    users.repository.ts
  schemas/
    auth.schema.ts            ← Zod schemas
    users.schema.ts
  lib/
    db.ts                     ← D1 / Drizzle / Prisma client
    env.ts                    ← Type-safe env (Zod)
```

---

## 3. App Setup

```typescript
// src/app.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { authRoute } from './routes/auth.route'
import { usersRoute } from './routes/users.route'

const app = new Hono()

// Built-in middleware
app.use('*', logger())
app.use('*', cors({ origin: process.env.FRONTEND_URL ?? '*' }))
app.use('*', secureHeaders())

// Routes
app.route('/auth', authRoute)
app.route('/users', usersRoute)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ success: false, error: err.message, data: null }, err.status)
  }
  console.error('[Unhandled Error]', err)
  return c.json({ success: false, error: 'Internal server error', data: null }, 500)
})

export { app }
```

### Runtime Entry Points

```typescript
// Node.js (src/index.ts)
import { serve } from '@hono/node-server'
import { app } from './app'
serve({ fetch: app.fetch, port: 3000 })

// Cloudflare Workers (src/worker.ts)
import { app } from './app'
export default { fetch: app.fetch }

// Bun (src/index.ts)
import { app } from './app'
export default { fetch: app.fetch, port: 3000 }
```

---

## 4. Request Validation (Zod Validator)

```typescript
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

authRoute.post(
  '/login',
  zValidator('json', LoginSchema),
  async (c) => {
    const { email, password } = c.req.valid('json')   // fully typed
    // ...
    return c.json({ success: true, data: { token } })
  }
)
```

Validation errors are automatically returned as `400` with structured error messages.

---

## 5. Context & Type-Safe Variables

Hono uses `c.set()` / `c.get()` for passing data between middleware:

```typescript
// Declare types
type Variables = {
  user: { id: string; email: string; role: string }
  organizationId: string
}

const app = new Hono<{ Variables: Variables }>()

// Auth middleware
app.use('/api/*', async (c, next) => {
  const token = c.req.header('Authorization')?.slice(7)
  if (!token) throw new HTTPException(401, { message: 'Unauthorized' })

  const payload = verifyJwt(token)
  c.set('user', payload)
  await next()
})

// Route handler — c.get('user') is fully typed
app.get('/profile', (c) => {
  const user = c.get('user')
  return c.json({ success: true, data: user })
})
```

---

## 6. Route Definition

```typescript
// src/routes/users.route.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { requireAuth, requireRole } from '../middleware/auth.middleware'

const usersRoute = new Hono()

usersRoute.get('/',       requireAuth, listUsersHandler)
usersRoute.post('/',      requireRole('admin'), zValidator('json', CreateUserSchema), createUserHandler)
usersRoute.get('/:id',   requireAuth, getUserHandler)
usersRoute.patch('/:id', requireAuth, zValidator('json', UpdateUserSchema), updateUserHandler)
usersRoute.delete('/:id',requireRole('admin'), deleteUserHandler)

export { usersRoute }
```

---

## 7. Middleware

```typescript
// src/middleware/auth.middleware.ts
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

export const requireAuth = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.slice(7)
  if (!token) throw new HTTPException(401, { message: 'Unauthorized' })

  const payload = verifyJwt(token, c.env.JWT_SECRET)
  if (!payload) throw new HTTPException(401, { message: 'Invalid token' })

  c.set('user', payload)
  await next()
})

export const requireRole = (role: string) =>
  createMiddleware(async (c, next) => {
    const user = c.get('user')
    if (user?.role !== role) throw new HTTPException(403, { message: 'Forbidden' })
    await next()
  })
```

---

## 8. Security Defaults

Apply to **every** Hono project. Registers security headers, CORS allowlist, rate limiting, and request ID tracing.

> **Runtime note:** Hono targets Cloudflare Workers (edge) as well as Node.js. Rate limiting strategy differs — Workers cannot open TCP connections to Redis directly.

### Security Headers (`secureHeaders`)

Replace the bare `secureHeaders()` call in Section 3 with a fully configured version:

```typescript
// src/app.ts
import { secureHeaders } from 'hono/secure-headers'

app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    frameAncestors: ["'none'"],
  },
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'camera=(), microphone=(), geolocation=()',
}))
```

### CORS Configuration

```typescript
// src/app.ts
import { cors } from 'hono/cors'

// Cloudflare Workers — env bindings via c.env
app.use('*', async (c, next) => {
  const allowed = (c.env.CORS_ALLOWED_ORIGINS ?? '').split(',').map((o: string) => o.trim())
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
    maxAge: 86400,
  })(c, next)
})

// Node.js — process.env
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '').split(',').map(o => o.trim())
app.use('*', cors({
  origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
  maxAge: 86400,
}))
```

**Rule:** Never use `origin: '*'` with `credentials: true` — browsers reject it. Always use an env-var-backed allowlist.

### Rate Limiting

**Cloudflare Workers** — no TCP Redis; use `@upstash/ratelimit` (REST API):

```typescript
// wrangler.toml bindings: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis/cloudflare'

// Global limiter — 300 req/min
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(300, '1 m'),
})

// Auth limiter — 10 req/15 min
const authLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '15 m'),
})

app.use('*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { success } = await ratelimit.limit(ip)
  if (!success) return c.json({ success: false, error: 'Too many requests', data: null }, 429)
  await next()
})

app.post('/auth/login', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const { success } = await authLimiter.limit(`login:${ip}`)
  if (!success) return c.json({ success: false, error: 'Too many requests', data: null }, 429)
  // ... auth logic
})
```

**Node.js** — standard Redis via `hono-rate-limiter`:

```typescript
import { rateLimiter } from 'hono-rate-limiter'
import { RedisStore } from 'rate-limit-redis'
import { createClient } from 'redis'

const redisClient = createClient({ url: process.env.REDIS_URL })
await redisClient.connect()

app.use('*', rateLimiter({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-6',
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? 'unknown',
  store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }),
}))
```

**Rule:** Never use `hono-rate-limiter` in Cloudflare Workers — it requires a TCP Redis connection that Workers do not support. Use `@upstash/ratelimit` instead.

### Request ID Middleware

```typescript
// src/middleware/request-id.middleware.ts
import { createMiddleware } from 'hono/factory'

export const requestIdMiddleware = createMiddleware(async (c, next) => {
  const requestId = c.req.header('x-request-id') ?? crypto.randomUUID()
  c.set('requestId', requestId)
  c.header('X-Request-Id', requestId)
  await next()
})

// src/app.ts
app.use('*', requestIdMiddleware)
```

Include `c.get('requestId')` in every log entry and error response.

---

## 9. Environment Variables (Type-Safe)

```typescript
// src/lib/env.ts
import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.coerce.number().default(900),
  REDIS_URL: z.string().optional(),
  FRONTEND_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

// For Node.js
const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Invalid env:', parsed.error.flatten())
  process.exit(1)
}
export const env = parsed.data

// For Cloudflare Workers — use c.env (passed as bindings)
// Declare in wrangler.toml + type via: type Bindings = z.infer<typeof EnvSchema>
```

---

## 10. Cloudflare Workers — D1 Database

Hono integrates natively with Cloudflare D1 (SQLite at the edge) via Drizzle:

```typescript
// wrangler.toml
// [[d1_databases]]
// binding = "DB"
// database_name = "myapp"
// database_id = "..."

// src/worker.ts
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './db/schema'

const app = new Hono<{ Bindings: { DB: D1Database } }>()

app.get('/users', async (c) => {
  const db = drizzle(c.env.DB, { schema })
  const users = await db.select().from(schema.users)
  return c.json({ success: true, data: users })
})

export default { fetch: app.fetch }
```

---

## 11. Testing

```typescript
// users.test.ts
import { describe, it, expect } from 'vitest'
import { app } from '../src/app'

describe('GET /users', () => {
  it('returns 401 without token', async () => {
    const res = await app.request('/users')
    expect(res.status).toBe(401)
  })

  it('returns users with valid token', async () => {
    const res = await app.request('/users', {
      headers: { Authorization: `Bearer ${testToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
```

No need for Supertest — Hono's `app.request()` works with the native `fetch` API.

---

## 12. Built-in Middleware Reference

| Middleware | Import | Purpose |
|---|---|---|
| `logger` | `hono/logger` | Request/response logging |
| `cors` | `hono/cors` | CORS headers |
| `secureHeaders` | `hono/secure-headers` | Security headers (CSP, HSTS) |
| `rateLimiter` | `@hono-rate-limiter/redis` | Redis-backed rate limiting |
| `bearerAuth` | `hono/bearer-auth` | Simple Bearer token validation |
| `basicAuth` | `hono/basic-auth` | HTTP Basic auth |
| `compress` | `hono/compress` | Gzip/Brotli compression |
| `cache` | `hono/cache` | Response caching (CF Workers) |
| `timing` | `hono/timing` | Server-Timing headers |

---

## 13. Common Pitfalls

| Pitfall | Solution |
|---|---|
| Using `process.env` in Cloudflare Workers | Use `c.env` (bindings) instead |
| Blocking async in handler without await | All handlers must be `async` |
| Forgetting to export `{ fetch: app.fetch }` in Workers | Required for CF Workers runtime |
| Using Node.js APIs in CF Workers | CF Workers runtime has no `fs`, `path`, etc. |
| Missing `.route()` prefix in nested routers | Use `app.route('/prefix', subrouter)` |
| Unhandled errors without `app.onError()` | Always register global error handler |

# Cloudflare Workers Deployment Guide

Deployment guide for the Repo Builder Agent when the target platform is **Cloudflare Workers**.

Cloudflare Workers is an edge-computing runtime based on V8 isolates — not containers, not VMs. Workers execute in 300+ Cloudflare PoPs worldwide with 0ms cold starts. The platform provides edge-native primitives: D1 (SQLite at the edge), KV (global key-value store), Queues (durable message queue), and Cron Triggers. Configuration is declared in `wrangler.toml` and deployed via `wrangler deploy`.

---

## 1. When to Choose Cloudflare Workers

| ✅ Good For | ❌ Not Ideal For |
|---|---|
| URL shorteners, redirectors, link-in-bio | Long-running CPU tasks (50ms CPU limit per request) |
| Read-heavy APIs with aggressive caching | Applications requiring TCP connections (standard Redis, raw Postgres) |
| Low-latency global APIs (0ms cold start) | Projects requiring persistent disk or filesystem |
| Geo-routing, A/B testing, edge middleware | Workloads needing full Linux process model |
| Webhook handlers, lightweight public APIs | Multi-database transactions across services |
| Edge caching with TTL invalidation (KV) | Teams unfamiliar with SQLite / D1 constraints |
| Analytics hot paths with fire-and-forget queues | Projects needing `npm` packages with native Node.js binaries |

---

## 2. Edge Runtime Constraints

**Critical differences from traditional server deployments:**

| Concern | Traditional Server | Cloudflare Workers |
|---|---|---|
| Cold start | 100–500ms | 0ms (V8 isolate, always warm) |
| CPU budget | Unlimited | 50ms CPU time per request |
| Memory | 512MB+ | 128MB per isolate |
| Filesystem | Full POSIX | None — no disk access |
| TCP connections | ✅ Full support | ❌ Not available |
| Redis | TCP (`ioredis`, `redis`) | ❌ — use Upstash REST API only |
| PostgreSQL | Direct connection | ❌ — use D1 or CF Hyperdrive |
| Background jobs | BullMQ, Celery, ARQ | CF Queues (consumer Worker) |
| Cron jobs | OS cron, BullMQ schedule | CF Cron Triggers |
| Secrets | `.env` / Docker env | `wrangler secret put` → `.dev.vars` local |
| Package support | All npm packages | No native binaries; Wasm ✅ |

---

## 3. Generated Infrastructure Files

```
src/
  index.ts                    ← Hono (or plain fetch handler) main Worker entry
  consumer.ts                 ← CF Queue consumer Worker
  cron.ts                     ← CF Cron Trigger handler
  routes/                     ← Route modules
  middleware/                 ← Auth, rate-limit, request-ID middleware
  lib/                        ← Shared helpers (jwt, password, nanoid)
  types.ts                    ← Env bindings type (Bindings interface)
migrations/
  0001_initial_schema.sql     ← D1 SQLite schema
  0002_indexes.sql            ← Secondary indexes
test/
  setup.ts                    ← Miniflare environment setup
  routes/                     ← Route-level tests
wrangler.toml                 ← CF Workers IaC: D1, KV, Queue, Cron, secrets
.dev.vars.example             ← Local dev secrets template (replaces .env)
.dev.vars                     ← Local secrets (gitignored)
.gitleaks.toml                ← Secret scanning (CF API tokens, Upstash tokens)
SECURITY.md
vitest.config.ts              ← Miniflare test environment
package.json
tsconfig.json
```

---

## 4. wrangler.toml

The `wrangler.toml` is the single source of truth for all CF Workers bindings.

```toml
name = "my-app"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# D1 Database (SQLite at the edge)
[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "YOUR_D1_DATABASE_ID"
migrations_dir = "migrations"

# KV Namespace (cache, session, feature flags)
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID"
preview_id = "YOUR_KV_PREVIEW_ID"

# Queue producer
[[queues.producers]]
binding = "TASK_QUEUE"
queue = "my-tasks"

# Queue consumer
[[queues.consumers]]
queue = "my-tasks"
max_batch_size = 100
max_batch_timeout = 5    # seconds
max_retries = 3
dead_letter_queue = "my-tasks-dlq"

# Cron Triggers
[triggers]
crons = ["0 * * * *"]   # hourly

# Secrets (set via CLI — never in wrangler.toml)
# Run: wrangler secret put JWT_SECRET
# Run: wrangler secret put UPSTASH_REDIS_REST_URL
# Run: wrangler secret put UPSTASH_REDIS_REST_TOKEN
# Run: wrangler secret put CORS_ALLOWED_ORIGINS

# Staging environment
[env.staging]
name = "my-app-staging"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "my-app-db-staging"
database_id = "YOUR_STAGING_D1_ID"
```

**Env bindings type** — always declare a `Bindings` interface in `src/types.ts`:

```typescript
export interface Bindings {
  // D1
  DB: D1Database
  // KV
  CACHE: KVNamespace
  // Queue
  TASK_QUEUE: Queue
  // Secrets
  JWT_SECRET: string
  UPSTASH_REDIS_REST_URL: string
  UPSTASH_REDIS_REST_TOKEN: string
  CORS_ALLOWED_ORIGINS: string
}
```

---

## 5. D1 Database (SQLite at the Edge)

D1 is CF's managed SQLite. Use integer Unix timestamps (not `TIMESTAMP` type), `TEXT` UUIDs, and `INTEGER` booleans.

```sql
-- migrations/0001_initial_schema.sql
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
```

**Apply migrations:**

```bash
# Local (Miniflare)
wrangler d1 migrations apply my-app-db --local

# Production
wrangler d1 migrations apply my-app-db --remote
```

**Migration tool:** Always use `wrangler-d1` or `drizzle-kit` (with D1 adapter).  
`prisma migrate` and `alembic` target PostgreSQL/MySQL — they do not work with D1.

---

## 6. Rate Limiting — Upstash REST API

TCP Redis (`ioredis`, `redis` npm package) is not available in CF Workers. Use **Upstash REST API** exclusively.

```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// src/middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis/cloudflare'
import type { Context } from 'hono'
import type { Bindings } from '../types'

export async function rateLimitMiddleware(c: Context<{ Bindings: Bindings }>, next: () => Promise<void>) {
  const ratelimit = new Ratelimit({
    redis: new Redis({
      url: c.env.UPSTASH_REDIS_REST_URL,
      token: c.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(100, '1 m'),
  })

  const ip = c.req.header('CF-Connecting-IP') ?? 'anonymous'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return c.json({ error: 'Too many requests' }, 429)
  }
  return next()
}
```

---

## 7. CF Queue Consumer Worker

```typescript
// src/consumer.ts
import type { MessageBatch } from '@cloudflare/workers-types'
import type { Bindings } from './types'

export default {
  async queue(batch: MessageBatch<unknown>, env: Bindings): Promise<void> {
    for (const message of batch.messages) {
      try {
        const payload = message.body as { type: string; data: unknown }
        await processMessage(payload, env)
        message.ack()
      } catch (err) {
        console.error('Queue processing error:', err)
        message.retry()
      }
    }
  },
}

async function processMessage(payload: { type: string; data: unknown }, env: Bindings) {
  // handle payload.type
}
```

---

## 8. Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy secrets template
cp .dev.vars.example .dev.vars
# Edit .dev.vars — this file is gitignored

# 3. Apply D1 migrations locally (Miniflare)
wrangler d1 migrations apply my-app-db --local

# 4. Start local dev server (hot-reload)
wrangler dev

# 5. Run tests (Miniflare-based — no Node.js http server needed)
npm test
```

**`.dev.vars.example`:**
```
JWT_SECRET=local-dev-secret-min-32-characters!!
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=dev-token
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

`.dev.vars` is the CF Workers equivalent of `.env`. It is automatically loaded by `wrangler dev` and never committed.

---

## 9. Testing — Vitest + Miniflare

Standard Node.js test runners (Jest + Supertest) cannot simulate CF Workers bindings (D1, KV, Queue). Use **Vitest + Miniflare** which emulates the full CF Workers runtime.

```bash
npm install -D vitest @cloudflare/vitest-pool-workers
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'miniflare',
    environmentOptions: {
      d1Databases: ['DB'],
      kvNamespaces: ['CACHE'],
      queues: { TASK_QUEUE: 'my-tasks' },
      bindings: {
        JWT_SECRET: 'test-secret-min-32-characters-long!',
        UPSTASH_REDIS_REST_URL: 'http://mock-upstash',
        UPSTASH_REDIS_REST_TOKEN: 'mock-token',
        CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
      },
    },
  },
})
```

```typescript
// test/routes/health.test.ts
import { describe, it, expect } from 'vitest'
import { env } from 'cloudflare:test'
import app from '../../src/index'

describe('GET /health', () => {
  it('returns 200', async () => {
    const res = await app.request('/health', {}, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })
})
```

**Security boundary tests** (mandatory per QA Agent Rule 10):

```typescript
// test/routes/auth-boundary.test.ts
describe('Auth boundary', () => {
  it('returns 401 without token', async () => {
    const res = await app.request('/api/links', {}, env)
    expect(res.status).toBe(401)
  })

  it('returns 200 with valid token', async () => {
    const token = await signTestToken(env.JWT_SECRET)
    const res = await app.request('/api/links', {
      headers: { Authorization: `Bearer ${token}` },
    }, env)
    expect(res.status).toBe(200)
  })
})
```

---

## 10. CI/CD — GitHub Actions + Wrangler Deploy

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Security audit
        run: npm audit --audit-level=high

      - run: npm run lint
      - run: npm run type-check
      - run: npm test

  deploy:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Apply D1 migrations
        run: npx wrangler d1 migrations apply my-app-db --remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Deploy to Cloudflare Workers
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Smoke test
        run: |
          sleep 10
          curl -f https://my-app.workers.dev/health || exit 1
```

**Required GitHub secrets:**
- `CLOUDFLARE_API_TOKEN` — API token with Workers + D1 + KV edit permissions
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID

**No Docker.** CF Workers bundles via `wrangler deploy` — there is no container runtime, no Dockerfile, no `docker-compose.yml`.

---

## 11. Secrets Management

```bash
# Set production secrets (stored in Cloudflare — not in wrangler.toml)
wrangler secret put JWT_SECRET
wrangler secret put UPSTASH_REDIS_REST_URL
wrangler secret put UPSTASH_REDIS_REST_TOKEN
wrangler secret put CORS_ALLOWED_ORIGINS

# List secrets (names only — values are not shown)
wrangler secret list

# Delete a secret
wrangler secret delete OLD_SECRET
```

Secrets set via `wrangler secret put` are encrypted at rest by Cloudflare and available as `env.SECRET_NAME` inside Worker code. They are never visible in `wrangler.toml` or in the dashboard after upload.

---

## 12. Security Files

```toml
# .gitleaks.toml
[extend]
useDefault = true

[[rules]]
description = "Cloudflare API Token"
regex = '''cf[a-zA-Z0-9_\-]{40,}'''
tags = ["cloudflare", "api-token"]

[[rules]]
description = "Upstash REST Token"
regex = '''AX[A-Za-z0-9_\-]{40,}'''
tags = ["upstash", "redis"]

[[rules]]
description = "Wrangler secret in dev.vars"
path = ".dev.vars"
tags = ["secrets", "workers"]
```

Always add `.dev.vars` to `.gitignore`. Only `.dev.vars.example` (with placeholder values) is committed.

---

## 13. package.json Scripts

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "deploy:staging": "wrangler deploy --env staging",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts",
    "type-check": "tsc --noEmit",
    "db:migrate:local": "wrangler d1 migrations apply my-app-db --local",
    "db:migrate:remote": "wrangler d1 migrations apply my-app-db --remote"
  }
}
```

---

## 14. Common Pitfalls

| Pitfall | Problem | Fix |
|---|---|---|
| `ioredis` / `redis` npm package | TCP sockets not supported in CF Workers | Replace with Upstash REST API (`@upstash/redis/cloudflare`) |
| `prisma migrate deploy` | Prisma targets PostgreSQL — does not understand D1 SQLite | Use `wrangler d1 migrations apply` or `drizzle-kit` with D1 adapter |
| `bcrypt` / `argon2` (native binary) | Native Node.js binaries don't run in V8 isolates | Use `@node-rs/argon2` (Wasm) or `bcryptjs` (pure JS) |
| Direct PostgreSQL connection | CF Workers has no TCP — `pg` / `node-postgres` will hang | Use D1 for edge data, or Hyperdrive for proxied Postgres access |
| `.env` file for secrets | `wrangler dev` ignores `.env` — uses `.dev.vars` | Rename to `.dev.vars` and update `.gitignore` |
| `setTimeout` / long `await` for background work | CPU limit is 50ms per request — long awaits are billed differently | Use `ctx.waitUntil()` for post-response work, or enqueue to CF Queue |
| Dockerfile in CF Workers project | CF Workers is not containerized — `wrangler deploy` bundles and uploads | Remove Dockerfile; no Docker layer is needed |
| `console.log` in production | CF Workers `console.log` is visible in Cloudflare dashboard logs (not stderr) | Use structured JSON logging and Cloudflare Logpush for production observability |

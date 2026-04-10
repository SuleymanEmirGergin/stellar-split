# Migration Guide — Express.js → Hono (Cloudflare Workers)

Migrate a Node.js Express API to Hono running on Cloudflare Workers edge runtime.

**When to use this guide:**
- The existing system is Express.js running on a traditional server (Railway, Render, Heroku)
- You want sub-10ms cold starts globally with zero infrastructure management
- The API is stateless and doesn't rely on long-lived connections (TCP Redis, direct Postgres)

---

## 1. Compatibility Assessment

Run this checklist before starting:

| Item | Express | Hono CF Workers | Action |
|---|---|---|---|
| Runtime | Node.js | V8 (no Node.js APIs) | Audit Node-only packages |
| TCP Redis | `ioredis` / `redis` | ❌ Not supported | Replace with Upstash REST |
| Direct Postgres | `pg` / `mysql2` | ❌ No TCP socket | Use Hyperdrive or Supabase/Neon HTTP |
| File system access | `fs`, `path` | ❌ No file system | Move assets to KV/R2/CDN |
| `setTimeout` > 30s | ✅ | ❌ 30s CPU limit | Move long jobs to CF Queues |
| `process.env` | ✅ | Use `c.env` bindings | Update all env reads |
| `require()` CJS | ✅ | ESM only | Convert to `import` |
| Middleware (Express) | `(req, res, next)` | `(c, next)` | Rewrite shape |
| `app.listen(port)` | ✅ | ❌ Not needed | Remove — use `export default app` |

---

## 2. Project Setup

```bash
# Install Hono and Wrangler
npm create hono@latest my-api -- --template cloudflare-workers
cd my-api
npm install

# Or add to existing project
npm install hono
npm install --save-dev wrangler @cloudflare/workers-types
```

**`wrangler.toml`:**
```toml
name            = "my-api"
main            = "src/index.ts"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id      = "your-kv-id"

[[d1_databases]]   # if using D1 instead of Postgres
binding      = "DB"
database_id  = "your-d1-id"
```

**Worker env type (`src/types/env.d.ts`):**
```typescript
export interface CloudflareBindings {
  // KV namespaces
  RATE_LIMIT_KV: KVNamespace;
  // D1
  DB: D1Database;
  // Secrets (set via `wrangler secret put`)
  DATABASE_URL: string;
  JWT_SECRET: string;
  STRIPE_WEBHOOK_SECRET: string;
  ALLOWED_ORIGIN: string;
}
```

---

## 3. Entry Point Migration

**Before (Express `src/app.js`):**
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use(helmet());
app.use(express.json());

app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));

app.listen(3000, () => console.log('Server running on :3000'));
module.exports = app;
```

**After (Hono `src/index.ts`):**
```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { CloudflareBindings } from './types/env';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: (origin, c) => c.env.ALLOWED_ORIGIN,  // from Worker binding
}));

// Health endpoints (required by Validator Rule 15)
app.get('/health/live',  (c) => c.json({ status: 'ok' }));
app.get('/health/ready', async (c) => {
  // Quick Supabase/D1 ping
  return c.json({ status: 'ok' });
});

app.route('/auth', authRouter);
app.route('/users', usersRouter);

// CF Workers export — replaces app.listen()
export default app;
```

---

## 4. Middleware Migration

**Express middleware shape:**
```javascript
// Express: (req, res, next)
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = verifyJwt(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

**Hono middleware shape:**
```typescript
// Hono: (c, next) — c.env contains Worker bindings
import { createMiddleware } from 'hono/factory';

export const authMiddleware = createMiddleware<{ Bindings: CloudflareBindings }>(
  async (c, next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return c.json({ error: 'Unauthorized' }, 401);
    try {
      const payload = await verifyJwt(token, c.env.JWT_SECRET);
      c.set('user', payload);
      await next();
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
  }
);
```

---

## 5. Route Handler Migration

**Express route:**
```javascript
router.get('/users/:id', authMiddleware, async (req, res) => {
  try {
    const user = await db.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Hono route:**
```typescript
usersRouter.get('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');  // set by middleware

  const result = await getUser(id, c.env);  // DB call via c.env bindings
  if (!result) return c.json({ error: 'Not found' }, 404);
  return c.json(result);
});
```

**Key differences:**
- `req.params.id` → `c.req.param('id')`
- `req.body` → `await c.req.json()`
- `req.query.page` → `c.req.query('page')`
- `res.json(data)` → `return c.json(data)`
- `res.status(404).json(...)` → `return c.json(..., 404)`
- `req.headers['x-foo']` → `c.req.header('x-foo')`

---

## 6. Database Migration

### From `pg` / Prisma (TCP) → Supabase (HTTP)

```typescript
// Before (Express + pg — TCP socket, FAILS in CF Workers)
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

// After (Hono + Supabase JS — HTTP, works at edge)
import { createClient } from '@supabase/supabase-js';

export function getSupabase(env: CloudflareBindings) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

// In route:
const supabase = getSupabase(c.env);
const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
```

### From `ioredis` (TCP) → Upstash (REST)

```typescript
// Before (ioredis — TCP socket, FAILS in CF Workers)
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
await redis.set('key', 'value', 'EX', 300);

// After (Upstash REST — works at edge)
import { Redis } from '@upstash/redis/cloudflare';

export function getRedis(env: CloudflareBindings) {
  return Redis.fromEnv(env);  // reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
}

// In route:
const redis = getRedis(c.env);
await redis.set('key', 'value', { ex: 300 });
```

---

## 7. Environment Variables

**Before (Express — `process.env`):**
```javascript
const secret = process.env.JWT_SECRET;
const dbUrl  = process.env.DATABASE_URL;
```

**After (Hono CF Workers — Worker bindings via `c.env`):**
```typescript
const secret = c.env.JWT_SECRET;   // set via wrangler.toml [vars] or wrangler secret put
const dbUrl  = c.env.DATABASE_URL; // declared in CloudflareBindings interface
```

Add secrets via CLI:
```bash
wrangler secret put JWT_SECRET
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Add non-secret vars in `wrangler.toml`:
```toml
[vars]
ALLOWED_ORIGIN = "https://myapp.com"
LOG_LEVEL = "info"
```

---

## 8. Testing Migration

**Before (Express + Supertest):**
```javascript
import request from 'supertest';
import app from '../src/app';

it('GET /users returns 200', async () => {
  const res = await request(app).get('/users').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
});
```

**After (Hono + Vitest + `app.request()`):**
```typescript
import { describe, it, expect } from 'vitest';
import app from '../src/index';

it('GET /users returns 200', async () => {
  const res = await app.request('/users', {
    headers: { Authorization: `Bearer ${token}` },
  }, { JWT_SECRET: 'test-secret', ALLOWED_ORIGIN: 'http://localhost' });
  expect(res.status).toBe(200);
});
```

Install:
```bash
npm install --save-dev vitest @cloudflare/vitest-pool-workers
```

**`vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',   // or 'miniflare' for full CF env simulation
    coverage: { provider: 'istanbul', reporter: ['text', 'lcov'] },
  },
});
```

---

## 9. CI/CD Migration

**Before (Express — Docker-based):**
```yaml
- run: docker build -t my-api .
- run: docker push registry/my-api
- run: railway up
```

**After (Hono — wrangler deploy):**
```yaml
- name: Deploy to Cloudflare Workers
  run: npx wrangler deploy --env production
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

No Dockerfile needed. No image registry. Cold start: ~5ms.

---

## 10. Migration Checklist

```
[ ] Audit all npm packages for Node.js-only APIs (fs, path, net, tls, crypto native)
[ ] Replace ioredis / redis with @upstash/redis
[ ] Replace pg / mysql2 / prisma with Supabase JS / Neon serverless / Hyperdrive
[ ] Convert all require() to import
[ ] Remove app.listen() — export default app instead
[ ] Update all process.env reads to c.env
[ ] Rewrite middleware signature from (req, res, next) to (c, next)
[ ] Rewrite route handlers (res.json → return c.json, req.params → c.req.param)
[ ] Create wrangler.toml with KV/D1 bindings
[ ] Replace supertest with vitest + app.request()
[ ] Replace Dockerfile-based CI with wrangler deploy
[ ] Run Validator CLI Rule 17 checks: node validator-cli/index.js validate repo <file>
```

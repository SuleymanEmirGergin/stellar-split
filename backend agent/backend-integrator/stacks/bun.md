# Bun Stack Guide

Framework-specific patterns for the Backend Integrator Agent when the project runs on **Bun** — a fast JavaScript runtime with built-in bundler, test runner, and package manager. Typically paired with **Elysia.js**, a Bun-native web framework.

---

## 1. When to Choose Bun

| Factor | Bun + Elysia | Node + NestJS | Node + Express |
|---|---|---|---|
| Startup time | < 10ms | ~300ms | ~100ms |
| Throughput (req/s) | Highest | Moderate | Moderate |
| TypeScript (native) | ✅ No transpile step | ❌ Requires ts-node | ❌ Requires ts-node |
| Package install speed | 10–30× faster than npm | npm/pnpm | npm/pnpm |
| Node.js compatibility | ~95% (improving) | ✅ Full | ✅ Full |
| Ecosystem maturity | Growing | Mature | Mature |
| Edge / serverless | Limited | Poor | Poor |
| Test runner | Built-in (`bun test`) | Jest | Jest |

**Choose Bun when**: maximum throughput, fast cold starts, TypeScript-first team, greenfield projects without legacy Node.js dependencies.

**Avoid Bun when**: heavy reliance on native Node.js addons (e.g., `canvas`, `sharp` in some configs), or when team needs a mature ecosystem with well-documented patterns.

---

## 2. Project Structure

```
src/
  index.ts               ← Entry point (Bun.serve or Elysia)
  app.ts                 ← Elysia app instance + plugin registration
  routes/
    auth.route.ts
    users.route.ts
  services/
    auth.service.ts
    users.service.ts
  repositories/
    users.repository.ts
  schemas/
    auth.schema.ts       ← TypeBox or Zod schemas
    users.schema.ts
  middleware/
    auth.middleware.ts
    logger.middleware.ts
  lib/
    db.ts                ← Prisma or Drizzle client
    env.ts               ← Bun.env with Zod validation
  plugins/
    cors.plugin.ts
    swagger.plugin.ts
```

---

## 3. Elysia.js App Setup

```ts
// src/app.ts
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { jwt } from '@elysiajs/jwt';
import { authRoutes } from './routes/auth.route';
import { userRoutes } from './routes/users.route';

export const app = new Elysia()
  .use(cors({
    origin: (process.env.CORS_ALLOWED_ORIGINS ?? '').split(',').map(o => o.trim()),
    credentials: true,
  }))
  .use(swagger({
    documentation: {
      info: { title: 'API', version: '1.0.0' },
    },
  }))
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET!,
  }))
  .use(authRoutes)
  .use(userRoutes)
  .listen(process.env.PORT ?? 3000);

console.log(`Server running at ${app.server?.hostname}:${app.server?.port}`);
```

---

## 4. Validation with TypeBox (recommended with Elysia)

Elysia uses TypeBox for schema validation — compile-time + runtime in one pass.

```ts
import { Elysia, t } from 'elysia';

const userRoutes = new Elysia({ prefix: '/users' })
  .post(
    '/register',
    async ({ body, set }) => {
      // body is fully typed and validated
      const user = await userService.create(body);
      set.status = 201;
      return user;
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
        name: t.String({ minLength: 1 }),
      }),
      response: {
        201: t.Object({ id: t.String(), email: t.String() }),
        409: t.Object({ message: t.String() }),
      },
    }
  );
```

---

## 5. Authentication Middleware

```ts
// src/middleware/auth.middleware.ts
import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

export const authPlugin = new Elysia({ name: 'auth' })
  .use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET! }))
  .derive(async ({ jwt, headers, set }) => {
    const token = headers.authorization?.replace('Bearer ', '');
    if (!token) {
      set.status = 401;
      throw new Error('Unauthorized');
    }

    const payload = await jwt.verify(token);
    if (!payload) {
      set.status = 401;
      throw new Error('Invalid token');
    }

    return { user: payload as { id: string; role: string } };
  });

// Usage in route
const protectedRoutes = new Elysia()
  .use(authPlugin)
  .get('/me', ({ user }) => ({ id: user.id, role: user.role }));
```

---

## 6. Database

### Prisma + Bun

```ts
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

// Singleton — Bun reuses module cache
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});
```

Prisma works fully with Bun. Use standard `prisma generate` and `prisma migrate`.

### Drizzle + Bun (alternative — faster cold start)

```ts
// src/lib/db.ts
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';

// SQLite (local dev / edge)
const sqlite = new Database('database.db');
export const db = drizzle(sqlite);

// PostgreSQL (production)
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!);
export const db = drizzlePg(sql);
```

---

## 7. Background Jobs (BullMQ on Bun)

BullMQ works on Bun with full Node.js compatibility:

```ts
// src/jobs/email.queue.ts
import { Queue, Worker } from 'bullmq';
import { redis } from '../lib/redis';

export const emailQueue = new Queue('email', { connection: redis });

// Worker process (separate entry point: src/worker.ts)
new Worker(
  'email',
  async (job) => {
    await emailService.send(job.data);
  },
  { connection: redis, concurrency: 5 }
);
```

```ts
// src/worker.ts (separate Bun process)
import './jobs/email.queue';
import './jobs/export.queue';
console.log('Worker started');
```

---

## 8. Security Defaults

### Security Headers (Custom Elysia Plugin)

Elysia does not bundle a Helmet equivalent — security headers are set via an `onAfterHandle` hook registered as a reusable plugin.

```ts
// src/plugins/security.plugin.ts
import { Elysia } from 'elysia'

export const securityPlugin = new Elysia({ name: 'security-headers' })
  .onAfterHandle(({ set }) => {
    set.headers['Content-Security-Policy'] =
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'"
    set.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
    set.headers['X-Frame-Options'] = 'DENY'
    set.headers['X-Content-Type-Options'] = 'nosniff'
    set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    set.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
  })
```

### CORS — Env-Var-Backed Allowlist

```ts
// src/app.ts
import { cors } from '@elysiajs/cors'
import { securityPlugin } from './plugins/security.plugin'

const allowedOrigins = (Bun.env.CORS_ALLOWED_ORIGINS ?? '').split(',').map(o => o.trim())

export const app = new Elysia()
  .use(securityPlugin)
  .use(cors({
    origin: (request) => {
      const origin = request.headers.get('origin') ?? ''
      return allowedOrigins.includes(origin)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
    maxAge: 86400,
  }))
```

`origin: true` (allow all) is forbidden in production. Always use an env-var-backed list.

### Rate Limiting — Redis-Backed

```ts
// Global rate limit: 300 req/min per IP
import { rateLimit } from 'elysia-rate-limit'

app.use(
  rateLimit({
    duration: 60_000,
    max: 300,
    generator: (req) => req.headers.get('x-forwarded-for') ?? 'unknown',
  })
)
```

```ts
// Auth endpoints — strict limiter: 10 req / 15 min
const authLimiter = rateLimit({
  duration: 900_000,
  max: 10,
  generator: (req) => `login:${req.headers.get('x-forwarded-for') ?? 'unknown'}`,
})

const authRoutes = new Elysia({ prefix: '/api/auth' })
  .use(authLimiter)
  .post('/login', ({ body }) => { /* ... */ })
  .post('/register', ({ body }) => { /* ... */ })
```

**Rule:** Never use in-memory rate limiting in production — state resets on pod restart and has no effect in multi-pod deployments. Use Redis-backed `elysia-rate-limit` with a `REDIS_URL`.

### Request ID

```ts
// src/app.ts — .derive() injects requestId into every handler context
app.derive(({ request, set }) => {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  set.headers['X-Request-Id'] = requestId
  return { requestId }
})

// Usage in any handler:
app.get('/ping', ({ requestId }) => ({ ok: true, requestId }))
```

---

## 9. Testing with Bun Test

No Jest configuration needed. Bun has a built-in test runner compatible with Jest's API.

```ts
// src/routes/users.route.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { app } from '../app';

describe('POST /users/register', () => {
  it('creates a new user', async () => {
    const res = await app.handle(
      new Request('http://localhost/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123', name: 'Test' }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.email).toBe('test@example.com');
  });

  it('rejects duplicate email', async () => {
    // seed first
    const res = await app.handle(/* same body */);
    expect(res.status).toBe(409);
  });
});
```

Run: `bun test` or `bun test --watch`

---

## 10. Environment Variables

```ts
// src/lib/env.ts
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url().optional(),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3001'),
});

export const env = schema.parse(Bun.env);
```

---

## 11. Dockerfile for Bun

```dockerfile
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build   # if using a build step

# ── Production image ─────────────────────────────────────────────
FROM oven/bun:1-alpine AS production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Generate Prisma client if using Prisma
COPY --from=builder /app/prisma ./prisma
RUN bunx prisma generate

ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
```

---

## 12. Common Pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| Native addons not supported | `Error: dlopen failed` | Replace `sharp` with `@squoosh/lib` or run in Node compat mode |
| `__dirname` undefined | `ReferenceError` | Use `import.meta.dir` instead |
| Prisma cold start | Slow first query | Use `prisma.$connect()` eagerly at startup |
| `process.env` vs `Bun.env` | Missing vars | Both work; prefer `Bun.env` for type safety with Zod |
| Worker threads (`worker_threads`) | Not available in all Bun versions | Use Bun Workers (`new Worker('./worker.ts')`) instead |
| Jest config not recognized | Tests don't run | Delete `jest.config.ts`; `bun test` needs no config |

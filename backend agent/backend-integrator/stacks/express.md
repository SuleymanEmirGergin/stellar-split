# Express.js Stack Guide

Framework-specific patterns, conventions, and gotchas for the Backend Integrator Agent when the project uses Express.js (Node.js / TypeScript).

---

## 1. Project Structure

Express has no enforced structure. Always use a feature-based layout:

```
src/
  app.ts                     ← Express app setup (no listen here)
  server.ts                  ← Entry point: app.listen()
  core/
    config.ts                ← Zod env validation (fail fast at startup)
    database.ts              ← Prisma client singleton
    middleware/
      auth.middleware.ts     ← requireAuth, requireRole
      error.middleware.ts    ← 4-argument global error handler
      request-id.middleware.ts ← X-Request-Id correlation header
      validate.middleware.ts ← Zod schema validator factory
  common/
    errors.ts                ← AppError hierarchy
    async-handler.ts         ← Promise rejection bridge to next()
  users/
    users.router.ts          ← express.Router()
    users.service.ts
    users.repository.ts
    users.dto.ts             ← Zod schemas + inferred types
  auth/
    auth.router.ts
    auth.service.ts
    auth.dto.ts
  ...
```

Register routers in `app.ts`:

```typescript
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { corsConfig } from './core/cors.config'
import { requestIdMiddleware } from './core/middleware/request-id.middleware'
import { errorHandler } from './core/middleware/error.middleware'
import { usersRouter } from './users/users.router'
import { authRouter } from './auth/auth.router'

const app = express()

// Security — must be first
app.use(helmet(helmetConfig))
app.use(cors(corsConfig))
app.use(requestIdMiddleware)
app.use(express.json({ limit: '1mb' }))

// Routes
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)

// Error handler — must be last
app.use(errorHandler)

export { app }
```

---

## 2. Request Validation (Zod)

Use [Zod](https://zod.dev) for runtime schema validation — it replaces NestJS `class-validator`:

```typescript
import { z } from 'zod'

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).trim(),
})

export type CreateUserDto = z.infer<typeof CreateUserSchema>
```

### Validation Middleware

```typescript
import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

export const validate = (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(422).json({
        success: false,
        error: result.error.flatten().fieldErrors,
        data: null,
      })
    }
    req.body = result.data     // parsed and typed
    next()
  }

// Usage
router.post('/users', validate(CreateUserSchema), createUserHandler)
```

---

## 3. Authentication Middleware

```typescript
import jwt from 'jsonwebtoken'
import { config } from '../core/config'

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized', data: null })
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token', data: null })
  }
}
```

### Role Guard

```typescript
export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden', data: null })
    }
    next()
  }

// Usage
router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(deleteProductHandler))
```

### JWT Signing Defaults

```typescript
// auth.service.ts
import jwt from 'jsonwebtoken'

export function signAccessToken(userId: string, role: string): string {
  return jwt.sign(
    { sub: userId, role },
    config.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: config.JWT_EXPIRES_IN,   // 900 (15 min)
      issuer: config.APP_DOMAIN,
    }
  )
}

export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    config.JWT_REFRESH_SECRET,
    { algorithm: 'HS256', expiresIn: '7d', issuer: config.APP_DOMAIN }
  )
}
```

**Rule:** Never use `algorithm: 'none'`. Always specify `HS256` (symmetric) or `RS256` (asymmetric). Validate `iss` claim on verify.

---

## 4. Router Pattern

```typescript
import { Router } from 'express'
import { asyncHandler } from '../common/async-handler'

const router = Router()

router.get('/',      asyncHandler(listUsersHandler))
router.post('/',     validate(CreateUserSchema), asyncHandler(createUserHandler))
router.get('/:id',   requireAuth, asyncHandler(getUserHandler))
router.patch('/:id', requireAuth, validate(UpdateUserSchema), asyncHandler(updateUserHandler))
router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(deleteUserHandler))

export { router as usersRouter }
```

---

## 5. Service Layer

Services handle business logic — never put logic in route handlers:

```typescript
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepo.findByEmail(dto.email)
    if (existing) throw new ConflictError('Email already in use')

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      parallelism: 1,
    })
    return this.usersRepo.create({ ...dto, passwordHash })
  }
}
```

---

## 6. Repository Layer (Prisma)

```typescript
export class UsersRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data })
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  }

  async findMany(skip: number, take: number) {
    return prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, createdAt: true },
    })
  }
}
```

---

## 7. Global Error Handler

Always register a 4-argument error middleware **last** in `app.ts`:

```typescript
import { ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const requestId = req.headers['x-request-id'] ?? 'unknown'

  if (err instanceof ZodError) {
    return res.status(422).json({ success: false, error: err.flatten(), data: null })
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message, data: null })
  }

  // Unhandled — do not leak stack trace in production
  const message = config.NODE_ENV === 'production' ? 'Internal server error' : err.message
  logger.error({ requestId, err }, 'Unhandled error')
  return res.status(500).json({ success: false, error: message, data: null })
}
```

### Custom Error Classes

```typescript
export class AppError extends Error {
  constructor(public message: string, public statusCode: number) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
export class NotFoundError extends AppError {
  constructor(msg = 'Not found') { super(msg, 404) }
}
export class ConflictError extends AppError {
  constructor(msg = 'Conflict') { super(msg, 409) }
}
export class ForbiddenError extends AppError {
  constructor(msg = 'Forbidden') { super(msg, 403) }
}
export class UnauthorizedError extends AppError {
  constructor(msg = 'Unauthorized') { super(msg, 401) }
}
```

### Async Handler Wrapper

Prevents unhandled promise rejections from bypassing the error handler:

```typescript
import { RequestHandler } from 'express'

export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next)
```

---

## 8. Security Defaults

Apply to **every** Express project. Registers security headers, CORS whitelist, rate limiting, and request ID tracing.

### Helmet.js (Security Headers)

```typescript
// src/core/helmet.config.ts
import { HelmetOptions } from 'helmet'

export const helmetConfig: HelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
}

// In app.ts
import helmet from 'helmet'
app.use(helmet(helmetConfig))
```

### CORS Configuration

```typescript
// src/core/cors.config.ts
import { CorsOptions } from 'cors'
import { config } from './config'

const allowedOrigins = config.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin) in non-production
    if (!origin && config.NODE_ENV !== 'production') return callback(null, true)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin '${origin}' not allowed`))
  },
  credentials: true,              // Required for cookies / Authorization header
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
  maxAge: 86400,                  // Preflight cache: 24 hours
}

// In app.ts
import cors from 'cors'
app.use(cors(corsConfig))
```

**Rule:** Never use `origin: '*'` when `credentials: true` — browsers reject it. Always use an env-var-backed allowlist.

### Rate Limiting

```typescript
// src/core/rate-limit.config.ts
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { redisClient } from './redis'

// Global limiter — all routes
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,    // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }),
})

// Strict limiter — auth routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  message: { success: false, error: 'Too many requests', data: null },
  store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }),
})

// Apply in app.ts
app.use(globalLimiter)
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/forgot-password', authLimiter)
app.use('/api/auth/verify-otp', authLimiter)
```

**Rule:** Use Redis-backed store (`rate-limit-redis`), not in-memory — in-memory resets on pod restart and doesn't work across multiple instances.

### Request ID Middleware

```typescript
// src/core/middleware/request-id.middleware.ts
import { randomUUID } from 'crypto'
import { Request, Response, NextFunction } from 'express'

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) ?? randomUUID()
  req.headers['x-request-id'] = requestId
  res.setHeader('X-Request-Id', requestId)
  next()
}
```

Include `requestId` in every log entry and error response for distributed tracing.

---

## 9. BullMQ Integration (Background Jobs)

```typescript
import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'
import { config } from '../core/config'

const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null })

// Producer — define once, export for use in services
export const notificationQueue = new Queue('notifications', { connection })

// Enqueue from a service
await notificationQueue.add(
  'send-email',
  { to, subject, body },
  {
    jobId: `email-${userId}-${templateId}`,   // Deterministic: prevents double-dispatch
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  }
)

// Worker (separate process: src/worker.ts)
new Worker(
  'notifications',
  async (job) => {
    if (job.name === 'send-email') {
      await emailAdapter.send(job.data)
    }
  },
  {
    connection,
    concurrency: 5,
  }
)
```

**Rule:** `maxRetriesPerRequest: null` is required for BullMQ — without it, ioredis throws on blocked commands.

---

## 10. Config Management (Zod)

Validate all environment variables at startup — fail fast before the server starts:

```typescript
// src/core/config.ts
import { z } from 'zod'

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.coerce.number().default(900),   // 15 minutes
  APP_DOMAIN: z.string().default('localhost'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
})

const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten())
  process.exit(1)
}

export const config = parsed.data
```

---

## 11. Testing Setup (Vitest + Supertest)

### Unit Tests (Vitest)

```typescript
// src/users/users.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UsersService } from './users.service'
import { ConflictError } from '../common/errors'

describe('UsersService.createUser', () => {
  let service: UsersService
  let mockRepo: any

  beforeEach(() => {
    mockRepo = {
      findByEmail: vi.fn(),
      create: vi.fn(),
    }
    service = new UsersService(mockRepo)
  })

  it('throws ConflictError when email already exists', async () => {
    mockRepo.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com' })

    await expect(
      service.createUser({ email: 'a@b.com', password: 'pass1234!', name: 'Alice' })
    ).rejects.toThrow(ConflictError)
  })

  it('creates user with hashed password', async () => {
    mockRepo.findByEmail.mockResolvedValue(null)
    mockRepo.create.mockResolvedValue({ id: '2', email: 'b@c.com', name: 'Bob' })

    const result = await service.createUser({ email: 'b@c.com', password: 'pass1234!', name: 'Bob' })
    expect(result.id).toBe('2')
    expect(mockRepo.create.mock.calls[0][0].passwordHash).toBeDefined()
  })
})
```

### E2E Tests (Supertest)

```typescript
// src/auth/auth.e2e.test.ts
import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { app } from '../app'
import { prisma } from '../core/database'

beforeAll(async () => {
  // Seed test user
  await prisma.user.create({
    data: { email: 'test@example.com', passwordHash: await argon2.hash('Test1234!') }
  })
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@example.com' } } })
  await prisma.$disconnect()
})

describe('POST /api/auth/login', () => {
  it('returns 200 with tokens for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Test1234!' })

    expect(res.status).toBe(200)
    expect(res.body.data.accessToken).toBeDefined()
  })

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })
})
```

Run: `vitest` (watch) or `vitest run --coverage`

---

## 12. Common Pitfalls

| Pitfall | Solution |
|---|---|
| Logic in route handlers | Move all logic to service layer |
| Missing `asyncHandler` wrapper | Uncaught async rejections bypass `errorHandler` — always wrap |
| No global error handler | Register 4-arg middleware **last** in `app.ts` |
| `origin: '*'` with `credentials: true` | Use allowlist from `CORS_ALLOWED_ORIGINS` env var |
| In-memory rate limiter | Use `rate-limit-redis` — in-memory resets on restart and breaks multi-instance |
| JWT `algorithm: 'none'` | Always specify `HS256` or `RS256` explicitly |
| Secrets in code | Validate all env vars with Zod at startup; `process.exit(1)` on failure |
| Raw `req.body` without validation | Always use `validate(ZodSchema)` middleware |
| Untyped `req.user` | Extend `Express.Request` via declaration merging in `src/types/express.d.ts` |
| Missing `Object.setPrototypeOf` in custom errors | `instanceof` checks fail without it — always set in `AppError` constructor |
| BullMQ Redis without `maxRetriesPerRequest: null` | Worker throws `BLPOP` timeout errors on blocked commands |
| Stack traces in production error responses | Check `NODE_ENV` in `errorHandler`; return generic message in production |

# NestJS Stack Guide

Framework-specific patterns for the Backend Integrator Agent when the project uses **NestJS** — the opinionated Node.js framework built on TypeScript-first design, decorators, and dependency injection.

---

## 1. Project Structure

Feature-module layout: each domain owns its module, controller, service, DTOs, and tests.

```
src/
  app.module.ts                   ← Root module — imports feature modules
  main.ts                         ← Bootstrap (Helmet, CORS, Throttler, pipes, filters)
  common/
    decorators/
      current-user.decorator.ts
      roles.decorator.ts
    filters/
      http-exception.filter.ts
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
    interceptors/
      response.interceptor.ts
    middleware/
      request-id.middleware.ts
    pipes/
      zod-validation.pipe.ts      ← optional: Zod instead of class-validator
  config/
    config.module.ts
    config.schema.ts              ← Joi / Zod env validation
  database/
    prisma.service.ts
    prisma.module.ts
  users/
    users.module.ts
    users.controller.ts
    users.service.ts
    dto/
      create-user.dto.ts
      update-user.dto.ts
    entities/
      user.entity.ts              ← type alias for Prisma model (optional)
    __tests__/
      users.service.spec.ts
      users.controller.spec.ts
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    strategies/
      jwt.strategy.ts
      refresh.strategy.ts
    dto/
      login.dto.ts
      register.dto.ts
test/
  app.e2e-spec.ts
  jest-e2e.json
```

**Rule:** Never register feature services directly in `AppModule.providers`. Every feature lives in its own module.

---

## 2. Validation (DTOs)

Use `class-validator` + `class-transformer` with the global `ValidationPipe`. Every input shape is a DTO class.

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,              // strip properties not in the DTO
  forbidNonWhitelisted: true,   // throw 400 on unknown properties
  transform: true,              // auto-transform payload to DTO instance
  transformOptions: {
    enableImplicitConversion: true,
  },
}))
```

```typescript
// users/dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, IsOptional, IsUrl } from 'class-validator'

export class CreateUserDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  password: string

  @IsString()
  @MinLength(1)
  name: string

  @IsUrl()
  @IsOptional()
  avatarUrl?: string
}
```

```typescript
// Partial DTOs — avoid repeating decorators
import { PartialType } from '@nestjs/mapped-types'
import { CreateUserDto } from './create-user.dto'

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

**Rule:** Always use `whitelist: true`. Without it, extra fields pass through to the service layer silently.

---

## 3. Guards & Interceptors

### JWT Auth Guard

```typescript
// common/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

```typescript
// auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET'),
      algorithms: ['HS256'],    // never allow 'none'
      ignoreExpiration: false,
    })
  }

  validate(payload: { sub: string; email: string; role: string }) {
    return { id: payload.sub, email: payload.email, role: payload.role }
  }
}
```

### Roles Guard

```typescript
// common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required) return true
    const { user } = context.switchToHttp().getRequest()
    return required.includes(user?.role)
  }
}
```

```typescript
// common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common'
export const ROLES_KEY = 'roles'
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)

// common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common'
export const CurrentUser = createParamDecorator(
  (_, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user
)
```

```typescript
// Usage in controller
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('admin-only')
getAdminData(@CurrentUser() user: AuthUser) { ... }
```

### Response Interceptor

```typescript
// common/interceptors/response.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { map } from 'rxjs/operators'

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map(data => ({ success: true, data, error: null }))
    )
  }
}

// main.ts
app.useGlobalInterceptors(new ResponseInterceptor())
```

---

## 4. Database Access (Prisma)

```typescript
// database/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
```

```typescript
// database/prisma.module.ts — export as global so every module can inject it
import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

### Transactions

```typescript
// Use $transaction for multi-step writes
const [user, profile] = await this.prisma.$transaction([
  this.prisma.user.create({ data: createUserDto }),
  this.prisma.profile.create({ data: { userId: '...' } }),
])

// Interactive transaction for conditional writes
await this.prisma.$transaction(async (tx) => {
  const user = await tx.user.findUniqueOrThrow({ where: { id } })
  if (user.credits < amount) throw new BadRequestException('Insufficient credits')
  await tx.user.update({ where: { id }, data: { credits: { decrement: amount } } })
})
```

### N+1 Prevention

```typescript
// Use include/select — never loop + await
const orders = await this.prisma.order.findMany({
  where: { userId },
  include: {
    items: { include: { product: true } },   // eager load relations
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
  cursor: cursor ? { id: cursor } : undefined,
})
```

---

## 5. Migrations

```bash
# Development — generate and apply a migration
npx prisma migrate dev --name add_user_role

# Production — apply existing migrations only (no schema drift)
npx prisma migrate deploy

# Reset dev database (destroys data — dev only)
npx prisma migrate reset
```

```typescript
// Dockerfile / CI — run migrate before starting the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

```yaml
# GitHub Actions — migration step
- name: Run DB migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Rule:** Never run `prisma migrate dev` in production — it can prompt interactively and modify the schema. Use `prisma migrate deploy` in all automated environments.

---

## 6. Background Jobs (BullMQ)

```typescript
// Install: @nestjs/bullmq bullmq ioredis
// Module registration
BullModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    connection: {
      host: new URL(config.get('REDIS_URL')).hostname,
      port: Number(new URL(config.get('REDIS_URL')).port) || 6379,
      maxRetriesPerRequest: null,   // REQUIRED for BullMQ — do not omit
    },
  }),
  inject: [ConfigService],
})

BullModule.registerQueue({ name: 'notifications' })
```

```typescript
// Producer (service)
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

@Injectable()
export class NotificationService {
  constructor(@InjectQueue('notifications') private queue: Queue) {}

  async sendWelcomeEmail(userId: string, email: string) {
    await this.queue.add(
      'send-welcome',
      { userId, email },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      }
    )
  }
}
```

```typescript
// Consumer (worker)
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'

@Processor('notifications')
export class NotificationWorker extends WorkerHost {
  async process(job: Job) {
    switch (job.name) {
      case 'send-welcome':
        await this.emailService.sendWelcome(job.data.email)
        break
      default:
        throw new Error(`Unknown job: ${job.name}`)
    }
  }
}
```

**Rule:** Always set `maxRetriesPerRequest: null` in the ioredis connection options — BullMQ requires it; omitting it causes `MaxRetriesPerRequestError` on queue operations.

---

## 7. Error Handling

### AppException Hierarchy

```typescript
// common/exceptions/app.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common'

export class AppException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly code?: string,
  ) {
    super({ message, code: code ?? 'APP_ERROR' }, status)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NotFoundException extends AppException {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} '${id}' not found` : `${resource} not found`,
      HttpStatus.NOT_FOUND,
      'NOT_FOUND',
    )
  }
}

export class ConflictException extends AppException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT, 'CONFLICT')
  }
}
```

### Global Exception Filter

```typescript
// common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()
    const req = ctx.getRequest<Request>()
    const requestId = req.headers['x-request-id'] as string

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    const message = exception instanceof HttpException
      ? (exception.getResponse() as any).message ?? exception.message
      : 'Internal server error'

    if (status >= 500) {
      this.logger.error({ requestId, path: req.url, error: String(exception) })
    }

    res.status(status).json({
      success: false,
      error: message,
      data: null,
      requestId,
      // never expose stack trace in production
      ...(process.env.NODE_ENV !== 'production' && exception instanceof Error
        ? { stack: exception.stack }
        : {}),
    })
  }
}

// main.ts
app.useGlobalFilters(new GlobalExceptionFilter())
```

---

## 8. Security Defaults

Apply to **every** NestJS project. Registers security headers, CORS allowlist, Redis-backed throttling, and request ID tracing.

### Helmet (Security Headers)

```typescript
// main.ts
import helmet from 'helmet'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  }))
```

### CORS Configuration

```typescript
  // Env-var-backed allowlist — in bootstrap() after helmet
  const configService = app.get(ConfigService)
  const allowedOrigins = configService
    .get<string>('CORS_ALLOWED_ORIGINS')
    .split(',')
    .map(o => o.trim())

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
      callback(new Error(`CORS: origin '${origin}' not allowed`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
    maxAge: 86400,
  })
```

**Rule:** Never pass `origin: true` or `origin: '*'` when `credentials: true` — browsers reject it.

### Rate Limiting (Redis-backed Throttler)

```typescript
// app.module.ts — install: @nestjs/throttler ioredis
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis'
import { APP_GUARD } from '@nestjs/core'

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          { name: 'global', ttl: 60_000, limit: 300 },   // 300 req/min default
        ],
        storage: new ThrottlerStorageRedisService(config.get('REDIS_URL')),
      }),
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },     // apply globally
  ],
})
export class AppModule {}
```

```typescript
// Auth routes — strict override (10 req / 15 min)
import { Throttle } from '@nestjs/throttler'

@Controller('auth')
export class AuthController {
  @Throttle({ global: { ttl: 900_000, limit: 10 } })
  @Post('login')
  login(@Body() dto: LoginDto) { ... }

  @Throttle({ global: { ttl: 900_000, limit: 10 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) { ... }
}
```

**Rule:** Use Redis-backed storage (`nestjs-throttler-storage-redis`) — in-memory throttler resets on pod restart and doesn't work across multiple instances.

### Request ID Middleware

```typescript
// common/middleware/request-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) ?? randomUUID()
    req.headers['x-request-id'] = requestId
    res.setHeader('X-Request-Id', requestId)
    next()
  }
}

// app.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*')
  }
}
```

Include `requestId` (`req.headers['x-request-id']`) in every log entry and error response.

---

## 9. Config Management

```typescript
// Install: @nestjs/config joi
// config/config.schema.ts
import * as Joi from 'joi'

export const configSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  CORS_ALLOWED_ORIGINS: Joi.string().required(),
})
```

```typescript
// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',
  validationSchema: configSchema,
  validationOptions: { abortEarly: false },  // show all errors at once
})
```

```typescript
// Inject in any service
@Injectable()
export class AuthService {
  constructor(private config: ConfigService) {}

  private get jwtSecret() {
    return this.config.getOrThrow<string>('JWT_SECRET')   // throws if missing
  }
}
```

```bash
# .env.example
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://user:pass@localhost:5432/myapp
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=change-me-at-least-32-chars-long
JWT_EXPIRES_IN=15m
CORS_ALLOWED_ORIGINS=http://localhost:3001
```

---

## 10. Testing Setup

```
test/
  app.e2e-spec.ts          ← full E2E: real DB + real Redis
  jest-e2e.json
src/
  users/
    __tests__/
      users.service.spec.ts     ← unit: mock PrismaService
      users.controller.spec.ts  ← unit: mock UsersService
```

### E2E Test (Supertest + real database)

```typescript
// test/app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/database/prisma.service'

describe('Auth (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()

    prisma = module.get(PrismaService)
  })

  beforeEach(async () => {
    // Seed: create a fresh user per test
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.user.deleteMany()
    await app.close()
  })

  it('POST /auth/register — creates user and returns 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123', name: 'Test User' })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.email).toBe('test@example.com')
    expect(res.body.data.password).toBeUndefined()   // never expose hash
  })

  it('POST /auth/login — returns 401 on wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123', name: 'Test User' })

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' })

    expect(res.status).toBe(401)
  })
})
```

### Unit Test (mocked Prisma)

```typescript
// users/tests/users.service.spec.ts
import { Test } from '@nestjs/testing'
import { UsersService } from '../users.service'
import { PrismaService } from '../../database/prisma.service'

describe('UsersService', () => {
  let service: UsersService
  let prisma: jest.Mocked<PrismaService>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUniqueOrThrow: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile()

    service = module.get(UsersService)
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>
  })

  it('findById — throws NotFoundException when user missing', async () => {
    prisma.user.findUniqueOrThrow.mockRejectedValue(new Error('Not found'))
    await expect(service.findById('nonexistent-id')).rejects.toThrow()
  })
})
```

---

## 11. Common Pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| `AppModule.providers` contains feature services | Services not injectable in sibling modules | Move to feature module `providers` + `exports` |
| `forwardRef()` overused | Hard-to-trace circular deps | Restructure: extract shared logic into a third module |
| `ValidationPipe` missing `whitelist: true` | Extra payload fields pass to service | Always enable `whitelist: true` |
| `transform: true` missing on `ValidationPipe` | String query params never become numbers | Enable `transform: true` with `enableImplicitConversion` |
| JWT `algorithms: ['none']` or missing | Auth bypass vulnerability | Always specify `algorithms: ['HS256']` in `JwtStrategy` |
| `maxRetriesPerRequest` not set for BullMQ ioredis | `MaxRetriesPerRequestError` on queue operations | Set `maxRetriesPerRequest: null` in ioredis connection |
| In-memory throttler | Rate limit resets on restart; ineffective in multi-pod | Use `nestjs-throttler-storage-redis` |
| `prisma migrate dev` in production | Interactive prompt; schema drift | Use `prisma migrate deploy` in CI/CD and Docker CMD |
| N+1 in `findAll` | Hundreds of queries per request | Use `include`/`select` at query time, never in a loop |
| Global filter not registered | Exceptions return raw NestJS default shape | `app.useGlobalFilters(new GlobalExceptionFilter())` in `main.ts` |
| Stack trace in production response | Leaks internal file paths | Gate `stack` behind `NODE_ENV !== 'production'` |
| CORS with `origin: true` + `credentials: true` | Browsers reject preflight | Use explicit allowlist array or allowlist callback |

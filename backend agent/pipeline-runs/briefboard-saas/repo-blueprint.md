# BriefBoard — Repository Blueprint

**Command:** `/blueprint`  
**Input:** `repo-handoff.json` (validated — PASS, 11/11 checks)  
**Stack guides applied:** `stacks/turborepo.md`, `stacks/pnpm-workspace.md`, `stacks/github-actions.md`, `deployments/railway.md`

---

## 1. Repository Structure Decision

**Type:** Monorepo  
**Reason:** 3 separate runtimes (Next.js web, NestJS API, BullMQ worker) + 2 shared packages. Monorepo reduces duplication of TypeScript types and config.

**Tooling:**
- Package manager: **pnpm** (workspace:* linking)
- Task runner: **Turborepo** (build caching, parallel dev)
- CI: **GitHub Actions** (apply `stacks/github-actions.md`)
- Deployment: **Railway** (apply `deployments/railway.md`)

---

## 2. Repository Tree

```
briefboard/
│
├── apps/
│   ├── web/                          ← Next.js 14 (App Router)
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tsconfig.json             → extends @briefboard/config/tsconfig/nextjs
│   │   ├── .env.example
│   │   └── src/
│   │       ├── app/                  ← App Router pages
│   │       ├── components/
│   │       └── lib/
│   │
│   ├── api/                          ← NestJS API
│   │   ├── package.json
│   │   ├── tsconfig.json             → extends @briefboard/config/tsconfig/base
│   │   ├── .env.example
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── modules/
│   │       ├── integrations/
│   │       ├── common/
│   │       └── prisma/
│   │           └── prisma.service.ts
│   │
│   └── worker/                       ← BullMQ Worker
│       ├── package.json
│       ├── tsconfig.json             → extends @briefboard/config/tsconfig/base
│       ├── .env.example
│       ├── Dockerfile
│       └── src/
│           ├── main.ts
│           └── processors/
│               ├── email.processor.ts
│               └── billing.processor.ts
│
├── packages/
│   ├── types/                        ← @briefboard/types
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── api/                  ← request/response interfaces
│   │       ├── entities/             ← shared entity enums (Role, ProjectStatus…)
│   │       └── jobs/                 ← BullMQ job payload types
│   │
│   └── config/                       ← @briefboard/config
│       ├── package.json
│       ├── tsconfig/
│       │   ├── base.json
│       │   └── nextjs.json
│       └── src/
│           └── env/
│               ├── api.env.ts        ← zod schema for API env vars
│               └── worker.env.ts     ← zod schema for worker env vars
│
├── infra/
│   ├── docker/
│   │   ├── api.Dockerfile
│   │   └── worker.Dockerfile
│   ├── docker-compose.yml            ← local dev: postgres, redis, api, worker
│   ├── docker-compose.test.yml       ← test: postgres-test, redis-test
│   └── scripts/
│       ├── setup.sh                  ← install + migrate + seed
│       └── reset-db.sh               ← drop + recreate test DB
│
├── prisma/
│   ├── schema.prisma                 ← shared schema (consumed by api and worker)
│   ├── migrations/
│   └── seed.ts
│
├── docs/
│   ├── ARCHITECTURE.md               ← dependency diagram (Mermaid)
│   ├── API.md                        ← endpoint reference (generated)
│   └── DEPLOYMENT.md                 ← Railway setup guide
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    ← lint + test + build
│       └── deploy.yml                ← deploy to Railway on main push
│
├── .gitleaks.toml                    ← secret scanning
├── .gitignore                        ← Node, pnpm, .env, .turbo, dist, .next
├── .env.example                      ← root-level (shared vars only)
├── turbo.json
├── pnpm-workspace.yaml
├── package.json                      ← root workspace
├── README.md
├── SETUP.md
├── SECURITY.md
└── CONTRIBUTING.md
```

---

## 3. Shared Packages Detail

### `@briefboard/types`

Purpose: Single source of truth for TypeScript types shared across all apps.

```ts
// packages/types/src/entities/index.ts
export enum Role { Owner = 'owner', Member = 'member', Client = 'client' }
export enum ProjectStatus { Active = 'active', Paused = 'paused', Completed = 'completed', Archived = 'archived' }
export enum InvitationType { Team = 'team', Client = 'client' }
export enum SubscriptionStatus { Active = 'active', PastDue = 'past_due', Canceled = 'canceled', Trialing = 'trialing' }

// packages/types/src/api/index.ts
export interface CreateProjectDto { name: string; description?: string; clientId: string; status: ProjectStatus; ... }
export interface ProjectResponse { id: string; name: string; status: ProjectStatus; client: ClientSummary; ... }

// packages/types/src/jobs/index.ts
export interface SendEmailJobPayload { to: string; template: EmailTemplate; data: Record<string, unknown> }
export interface ProcessStripeWebhookPayload { eventId: string; eventType: string; raw: unknown }
```

### `@briefboard/config`

Purpose: Validate environment variables at startup. Prevent runtime crashes from missing vars.

```ts
// packages/config/src/env/api.env.ts
import { z } from 'zod';

export const apiEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  REDIS_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  RESEND_API_KEY: z.string().startsWith('re_'),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_S3_BUCKET: z.string(),
  POSTHOG_API_KEY: z.string().optional(),
  FRONTEND_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
```

---

## 4. Infrastructure Plan

### docker-compose.yml (local dev)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: briefboard_dev
      POSTGRES_USER: briefboard
      POSTGRES_PASSWORD: briefboard
    ports: ["5432:5432"]
    volumes: ["postgres_data:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  api:
    build: { context: ., dockerfile: infra/docker/api.Dockerfile }
    ports: ["3000:3000"]
    env_file: apps/api/.env
    depends_on: [postgres, redis]
    volumes: ["./apps/api/src:/app/src"]

  worker:
    build: { context: ., dockerfile: infra/docker/worker.Dockerfile }
    env_file: apps/worker/.env
    depends_on: [postgres, redis]

volumes:
  postgres_data:
```

### api.Dockerfile

```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter api build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

---

## 5. Environment Variable Structure

```bash
# .env.example (root — shared reference)
NODE_ENV=development

# apps/api/.env.example
DATABASE_URL=postgresql://briefboard:briefboard@localhost:5432/briefboard_dev
JWT_SECRET=change-me-min-32-chars
JWT_REFRESH_SECRET=change-me-min-32-chars
JWT_ACCESS_EXPIRES_IN=900
JWT_REFRESH_EXPIRES_IN=604800
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_AGENCY_PRICE_ID=price_...
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@briefboard.app
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=briefboard-files
STORAGE_SIGNED_URL_TTL=3600
POSTHOG_API_KEY=phc_...
POSTHOG_HOST=https://app.posthog.com
FRONTEND_URL=http://localhost:3001
PORT=3000

# apps/worker/.env.example (subset of api)
DATABASE_URL=postgresql://briefboard:briefboard@localhost:5432/briefboard_dev
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@briefboard.app
FRONTEND_URL=http://localhost:3001

# apps/web/.env.example
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_POSTHOG_KEY=phc_...
```

---

## 6. Development Scripts

```json
// package.json (root)
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean",

    "db:migrate": "pnpm --filter api exec prisma migrate dev",
    "db:migrate:prod": "pnpm --filter api exec prisma migrate deploy",
    "db:seed": "pnpm --filter api exec tsx prisma/seed.ts",
    "db:studio": "pnpm --filter api exec prisma studio",
    "db:generate": "pnpm --filter api exec prisma generate",

    "setup": "pnpm install && pnpm db:migrate && pnpm db:seed",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down"
  }
}
```

---

## 7. CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

jobs:
  ci:
    name: Lint, Type-check, Test, Build
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: briefboard_test
          POSTGRES_USER: briefboard
          POSTGRES_PASSWORD: briefboard
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports: ["5432:5432"]
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint
      - run: pnpm turbo type-check
      - run: pnpm turbo build
      - run: pnpm turbo test
        env:
          DATABASE_URL: postgresql://briefboard:briefboard@localhost:5432/briefboard_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: ci-test-secret-do-not-use
          JWT_REFRESH_SECRET: ci-test-refresh-secret
          NODE_ENV: test
      - run: pnpm audit --audit-level=high
```

---

## 8. Dependency Graph (ARCHITECTURE.md)

```mermaid
graph TD
  web["apps/web (Next.js)"]
  api["apps/api (NestJS)"]
  worker["apps/worker (BullMQ)"]
  types["packages/types (@briefboard/types)"]
  config["packages/config (@briefboard/config)"]
  prisma[("prisma/ (schema)")]
  postgres[("PostgreSQL")]
  redis[("Redis")]

  web --> types
  api --> types
  api --> config
  api --> prisma
  worker --> types
  worker --> config
  worker --> prisma
  api --> postgres
  worker --> postgres
  api --> redis
  worker --> redis
```

---

## 9. Implementation Order

1. `pnpm-workspace.yaml` + root `package.json` + `turbo.json`
2. `packages/config` — tsconfig base + nextjs + api env schema
3. `packages/types` — entity enums + API interfaces + job payloads
4. `prisma/schema.prisma` — full schema, all entities, indexes
5. `apps/api` — NestJS bootstrap, Prisma module, health check
6. `apps/worker` — BullMQ bootstrap, connect to Redis
7. `apps/web` — Next.js scaffold, connect to API
8. `infra/` — Dockerfiles + docker-compose
9. `.github/workflows/ci.yml` — CI pipeline
10. `.github/workflows/deploy.yml` — Railway deploy
11. `SECURITY.md`, `.gitleaks.toml`, `.gitignore`
12. `README.md`, `SETUP.md`, `docs/ARCHITECTURE.md`

---

## 10. Security Baseline

- ✅ `.gitleaks.toml` — prevent secret commits (Stripe keys, AWS keys pattern rules)
- ✅ `SECURITY.md` — vulnerability reporting at security@briefboard.io
- ✅ `.gitignore` — `.env`, `.env.local`, `dist/`, `.next/`, `.turbo/`, `node_modules/`
- ✅ CI security step: `pnpm audit --audit-level=high`
- ✅ `@briefboard/config` validates env at startup — crashes early on missing secrets

---

## 11. Risks & Edge Cases

| Risk | Mitigation |
|---|---|
| Prisma schema shared between api and worker | `prisma/` at root — both apps reference it via relative path |
| Worker rebuilds on API-only changes | Turborepo `--filter` + dependency graph prevents unnecessary rebuilds |
| Railway monorepo routing | Separate Railway services per Dockerfile with `rootDirectory` set |
| pnpm `workspace:*` not resolving in Docker | Use `pnpm deploy` for single-package Docker builds |
| Types out of sync across apps | `@briefboard/types` is the single source — all apps must update from it |

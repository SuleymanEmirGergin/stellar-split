# Render Deployment Guide

Deployment guide for the Repo Builder Agent when the target platform is **Render**.

Render is a managed cloud platform supporting Docker-based web services, background workers, cron jobs, and managed PostgreSQL — a popular Heroku replacement and Railway alternative with more granular service control, a free tier for prototyping, and Infrastructure as Code via `render.yaml`.

---

## 1. When to Choose Render

| ✅ Good For | ❌ Not Ideal For |
|---|---|
| Teams migrating from Heroku | Workloads needing persistent disk on free tier (sleep + ephemeral) |
| SaaS with API + Worker + Postgres + Cron | Enterprise VPC / private networking (requires paid plan) |
| Free-tier prototyping and MVPs | High-throughput apps where cold starts matter |
| Automatic deploys from Git push | Complex infrastructure requiring full VPC control (prefer AWS ECS) |
| Cron Jobs as a first-class platform service | Multi-region active-active (prefer Fly.io) |
| `render.yaml` Infrastructure as Code | Workloads already costing > $200/mo (Fly.io or AWS is cheaper at scale) |

---

## 2. Generated Infrastructure Files

```
infra/
  Dockerfile.api              ← Multi-stage production image for API service
  Dockerfile.worker           ← Multi-stage production image for background worker
  docker-compose.yml          ← Local development only (not used by Render)
render.yaml                   ← Infrastructure as Code — services + databases
.github/
  workflows/
    ci-render.yml             ← CI: audit → lint → test → build (Render auto-deploys on push)
.dockerignore                 ← Excludes node_modules/, .git/, test fixtures
```

**Note:** Render deploys automatically on push to the configured branch. GitHub Actions handles the test gate; Render handles deployment via `render.yaml`.

---

## 3. render.yaml (Infrastructure as Code)

```yaml
services:
  - type: web
    name: api
    runtime: docker
    dockerfilePath: ./infra/Dockerfile.api
    plan: starter          # $7/mo — no sleep, always on
    region: oregon
    branch: main
    healthCheckPath: /health/ready
    numInstances: 1
    envVars:
      - fromGroup: production-secrets
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000       # Render default — use process.env.PORT in app
    autoDeploy: true

  - type: worker
    name: worker
    runtime: docker
    dockerfilePath: ./infra/Dockerfile.worker
    plan: starter
    region: oregon
    branch: main
    envVars:
      - fromGroup: production-secrets
      - key: NODE_ENV
        value: production
    autoDeploy: true

  - type: cron
    name: cleanup-job
    runtime: docker
    dockerfilePath: ./infra/Dockerfile.worker
    schedule: "0 3 * * *"        # Daily at 03:00 UTC
    region: oregon
    startCommand: node dist/jobs/cleanup.js
    envVars:
      - fromGroup: production-secrets

databases:
  - name: postgres-db
    databaseName: appdb
    plan: starter
    region: oregon
```

---

## 4. Dockerfile (API Service)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production=false

COPY . .
RUN npm run build

# ── Production image ──────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

# Prisma: copy schema for migration
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma

USER appuser
EXPOSE 10000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

**Rule:** Always use `process.env.PORT` in the application — Render sets this to `10000` by default for web services.

---

## 5. Dockerfile (Worker Service)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production=false
COPY . .
RUN npm run build:worker

FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

USER appuser
CMD ["node", "dist/worker"]
```

---

## 6. PostgreSQL Managed Database

Render provides a managed PostgreSQL service. The connection string is injected automatically via `fromDatabase` in `render.yaml`.

```yaml
# In render.yaml — reference the database in service envVars:
services:
  - type: web
    name: api
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: postgres-db
          property: connectionString
```

```bash
# Local development — override in .env:
DATABASE_URL=postgresql://user:pass@localhost:5432/appdb

# Run migrations before app starts (already in Dockerfile CMD above)
npx prisma migrate deploy       # Node.js
# or:
alembic upgrade head            # Python
```

---

## 7. Environment Groups

Render's **Environment Groups** allow shared secrets across multiple services without duplication. Configure in the Render Dashboard, then reference in `render.yaml`.

```
Render Dashboard → Environment Groups → New Group: "production-secrets"

Variables to add:
  REDIS_URL                  ← Upstash, Redis Cloud, or Render Redis add-on
  JWT_SECRET                 ← min 32 characters
  CORS_ALLOWED_ORIGINS       ← comma-separated list of allowed origins
  RESEND_API_KEY             ← or other email provider key
  AWS_ACCESS_KEY_ID          ← S3 credentials
  AWS_SECRET_ACCESS_KEY
  AWS_S3_BUCKET
  AWS_S3_REGION
```

Attach the group in `render.yaml`:
```yaml
envVars:
  - fromGroup: production-secrets
```

**Rule:** Never add secrets directly to `render.yaml` committed to source control. Use Environment Groups or Dashboard-only variables for all credentials. Only non-sensitive config (NODE_ENV, PORT) belongs in `render.yaml`.

---

## 8. CI/CD (GitHub Actions)

Render auto-deploys on push to `main`. GitHub Actions provides the test gate — Render picks up the commit only after CI passes (enforced via branch protection rules).

```yaml
# .github/workflows/ci-render.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-retries 5
      redis:
        image: redis:7-alpine
        options: --health-cmd "redis-cli ping" --health-interval 10s --health-retries 5

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

      - name: Run tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret-minimum-32-chars-long!!
          NODE_ENV: test
        run: npm test

      - run: npm run build
```

**Branch protection rule** (GitHub Settings → Branches → Require status checks): require `test` job to pass before merging to `main`.

---

## 9. Health Checks + Zero-Downtime Deploy

Render waits for `/health/ready` to return `200` before routing traffic to a new deployment. If it never succeeds, Render automatically rolls back to the previous version.

```typescript
// src/health/health.controller.ts (NestJS example)
@Controller('health')
export class HealthController {
  @Get('live')
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }

  @Get('ready')
  async ready() {
    const [dbOk, redisOk] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      this.redis.ping().then(() => true).catch(() => false),
    ])

    if (!dbOk || !redisOk) {
      throw new ServiceUnavailableException({ status: 'degraded', db: dbOk, redis: redisOk })
    }

    return { status: 'ok', db: true, redis: true }
  }
}
```

In `render.yaml`: `healthCheckPath: /health/ready`

Render will not switch traffic until the health check passes. Failed deployments are automatically rolled back — no manual intervention needed.

---

## 10. Common Pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| Hardcoded port `3000` | Service starts but health check fails immediately | Use `process.env.PORT` — Render sets it to `10000` for web services |
| Migrations not in Docker CMD | App crashes on first request: "relation does not exist" | Run `npx prisma migrate deploy` (or `alembic upgrade head`) before app start in CMD |
| Secrets committed in `render.yaml` | Credentials in Git history | Use Environment Groups for all secrets; only non-sensitive config in `render.yaml` |
| Free tier service sleeping | Requests time out after 15+ minutes of inactivity | Upgrade API to Starter plan ($7/mo) for "Always On"; free tier sleeps after 15 min idle |
| Docker container running as root | Render warning; security risk | Add `RUN addgroup -S appgroup && adduser -S appuser -G appgroup` + `USER appuser` |
| Missing `.dockerignore` | Slow builds — `node_modules/` copied into build context | Add `.dockerignore` excluding `node_modules/`, `.git/`, `coverage/`, `*.test.*` |
| Worker deployed as `type: web` | Worker has no HTTP port to expose; service crashes | Use `type: worker` in `render.yaml` — workers don't have HTTP ports |
| Database in different region | 50–150ms of unnecessary latency per query | Always set `region` to the same value for all services and the database |

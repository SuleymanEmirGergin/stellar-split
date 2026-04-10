# Railway Deployment Guide

Deployment guide for the Repo Builder Agent when the target platform is **Railway**.

Railway is a managed platform that provisions Docker-based services alongside managed PostgreSQL and Redis — ideal for full-stack SaaS projects with minimal infrastructure overhead.

---

## 1. When to Choose Railway

| ✅ Good For | ❌ Not Ideal For |
|---|---|
| SaaS MVPs and early-stage products | Enterprises requiring VPC/private networking |
| Teams without DevOps expertise | Workloads > $500/month (cost scales fast) |
| Apps requiring Postgres + Redis + API | Highly custom infrastructure |
| Rapid iteration and preview deployments | Multi-region active-active setups |

---

## 2. Generated Infrastructure Files

```
infra/
  Dockerfile.api              ← Production image for NestJS/Express API
  Dockerfile.worker           ← Production image for BullMQ worker
  docker-compose.yml          ← Local development only (not used in Railway)
.github/
  workflows/
    deploy-railway.yml        ← CI/CD pipeline
.railwayignore                ← Equivalent of .dockerignore for Railway
```

---

## 3. Dockerfile (API)

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

USER appuser
EXPOSE 3000

CMD ["node", "dist/main"]
```

---

## 4. Dockerfile (Worker)

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
CMD ["node", "dist/apps/worker/main"]
```

---

## 5. CI/CD Workflow (GitHub Actions)

```yaml
# .github/workflows/deploy-railway.yml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --passWithNoTests --coverage
      - run: npm audit --audit-level=high

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy API service
        run: railway up --service api --detach
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Deploy Worker service
        run: railway up --service worker --detach
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## 6. Railway Project Setup

### Services to Create in Railway Dashboard

| Service | Source | Start Command |
|---|---|---|
| `api` | GitHub repo | `node dist/main` |
| `worker` | GitHub repo | `node dist/apps/worker/main` |
| `postgres` | Railway Plugin | Auto-managed |
| `redis` | Railway Plugin | Auto-managed |

### Environment Variables (set in Railway Dashboard)

```bash
# Auto-provided by Railway plugins
DATABASE_URL          ← From Postgres plugin
REDIS_URL             ← From Redis plugin

# App secrets
JWT_SECRET=<generate: openssl rand -hex 32>
JWT_REFRESH_SECRET=<generate: openssl rand -hex 32>

# Integrations
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENDGRID_API_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
AWS_REGION=us-east-1

# App URLs
FRONTEND_URL=https://app.yourproject.com
NODE_ENV=production
PORT=3000
```

---

## 7. Database Migrations

Run migrations as a Railway one-off command before each deployment:

```yaml
# In deploy job, before starting services:
- name: Run migrations
  run: railway run --service api npx prisma migrate deploy
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

Or configure a **Start Command** on the API service:

```
npx prisma migrate deploy && node dist/main
```

---

## 8. Custom Domain

1. Railway Dashboard → your project → Settings → Domains
2. Add custom domain → Railway provides CNAME target
3. Point your DNS CNAME to Railway's target
4. Railway auto-provisions SSL via Let's Encrypt

---

## 9. Health Check

Railway monitors service health. Wire both liveness and readiness probes (Rule 25):

```typescript
// NestJS — health controller
@Get('/health/live')
healthLive() {
  return { status: 'ok' }
}

@Get('/health/ready')
async healthReady() {
  const checks: Record<string, string> = {}
  try {
    await this.dataSource.query('SELECT 1')
    checks.db = 'ok'
  } catch {
    checks.db = 'fail'
  }
  try {
    await this.redis.ping()
    checks.redis = 'ok'
  } catch {
    checks.redis = 'fail'
  }
  const allOk = Object.values(checks).every(v => v === 'ok')
  if (!allOk) throw new HttpException({ status: 'degraded', checks }, 503)
  return { status: 'ok', checks }
}
```

Configure in Railway Dashboard:
- **API service** → Settings → Health Check Path → `/health/ready`
- Railway polls `/health/ready` every 30s; 3 consecutive failures → service restart

---

## 10. Cost Estimate

| Component | Railway Plan |
|---|---|
| API service | Hobby: ~$5/mo (512MB RAM) |
| Worker service | Hobby: ~$5/mo |
| PostgreSQL plugin | Hobby: ~$5/mo (1GB) |
| Redis plugin | Hobby: ~$5/mo (25MB) |
| **Total estimate** | **~$20/mo for MVP** |

Scale to Pro plan when traffic grows.

---

## 11. `.railwayignore`

```
node_modules/
.git/
.env
.env.*
*.test.ts
*.spec.ts
coverage/
dist/
```

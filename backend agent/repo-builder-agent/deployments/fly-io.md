# Fly.io Deployment Guide

Deployment guide for the Repo Builder Agent when the target platform is **Fly.io**.

Fly.io runs Docker containers as Firecracker micro-VMs, distributed across its global anycast network. It offers persistent volumes, multi-region support, and a straightforward CLI-driven workflow — a mature Railway alternative with more infrastructure control.

---

## 1. When to Choose Fly.io

| ✅ Good For | ❌ Not Ideal For |
|---|---|
| Full-stack apps needing persistent volumes | Serverless / function-only workloads |
| Multi-region, latency-sensitive APIs | Static site hosting (use Vercel/Cloudflare) |
| Long-running background workers | Teams wanting zero DevOps (Railway is simpler) |
| WebSockets and persistent connections | Very large-scale (100k+ req/s — prefer AWS) |
| Apps that outgrow Railway pricing | Teams unfamiliar with Docker |

**Fly.io vs Railway:**
- Fly.io: more control, multi-region, persistent volumes, cheaper at scale
- Railway: simpler setup, less config, better for early-stage MVPs

---

## 2. Generated Infrastructure Files

```
fly.toml                          ← Primary Fly.io config
fly.worker.toml                   ← Separate app config for BullMQ worker
Dockerfile                        ← Production container image
Dockerfile.worker                 ← Worker container image (if needed)
.dockerignore
.github/
  workflows/
    deploy-fly.yml                ← CI/CD pipeline
```

---

## 3. fly.toml (API)

```toml
# fly.toml — API service
app = "your-app-api"
primary_region = "ams"           # Amsterdam; or cdg, lax, sin, syd, etc.

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false     # keep warm — set true for dev/staging
  auto_start_machines = true
  min_machines_running = 1

  [http_service.concurrency]
    type = "requests"
    hard_limit = 200
    soft_limit = 150

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1

[checks]
  [checks.health]
    grace_period = "10s"
    interval = "15s"
    method = "GET"
    path = "/health/ready"
    port = 3000
    timeout = "5s"
    type = "http"
```

### Worker fly.toml

```toml
# fly.worker.toml — BullMQ worker (no HTTP service)
app = "your-app-worker"
primary_region = "ams"

[build]
  dockerfile = "Dockerfile.worker"

[env]
  NODE_ENV = "production"

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
```

---

## 4. Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production image ─────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 nodejs && adduser -S -u 1001 -G nodejs appuser

COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/package.json ./

# Prisma: copy schema + generated client
COPY --from=builder --chown=appuser:nodejs /app/prisma ./prisma
COPY --from=builder --chown=appuser:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER appuser
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Dockerfile.worker

```dockerfile
FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 nodejs && adduser -S -u 1001 -G nodejs appuser

COPY --chown=appuser:nodejs node_modules ./node_modules
COPY --chown=appuser:nodejs dist ./dist
COPY --chown=appuser:nodejs package.json ./

USER appuser
ENV NODE_ENV=production
CMD ["node", "dist/worker.js"]
```

---

## 5. Secrets Management

```bash
# Set secrets via Fly CLI — never in fly.toml or committed files
fly secrets set DATABASE_URL="postgres://..." --app your-app-api
fly secrets set REDIS_URL="redis://..." --app your-app-api
fly secrets set JWT_SECRET="..." --app your-app-api
fly secrets set STRIPE_SECRET_KEY="sk_live_..." --app your-app-api

# List secrets (values are hidden)
fly secrets list --app your-app-api

# Import from .env file (local dev only)
fly secrets import < .env --app your-app-api
```

Secrets are encrypted at rest and injected as environment variables at runtime. They never appear in image layers.

---

## 6. Persistent Volumes

For data that must survive container restarts (uploads cache, SQLite, etc.):

```bash
# Create volume in the same region as your app
fly volumes create app_data --region ams --size 10 --app your-app-api
```

```toml
# fly.toml — mount the volume
[[mounts]]
  source = "app_data"
  destination = "/app/data"
```

**Important:** Volumes are single-region and attached to one machine by default. Use object storage (S3/R2) for files that need to be shared across machines.

---

## 7. Database Setup

### Option A — Fly Postgres (managed on your account)

```bash
# Create a Postgres cluster (runs on your Fly account, not a managed service)
fly postgres create --name your-app-db --region ams --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 10

# Attach to your app (sets DATABASE_URL automatically)
fly postgres attach your-app-db --app your-app-api

# Connect for migrations
fly postgres connect -a your-app-db
```

**Fly Postgres is not fully managed** — you are responsible for backups and failover. For production-critical databases, consider Supabase or Neon instead.

### Option B — Neon (recommended for production)

```bash
# Use Neon's serverless Postgres — no ops burden, connection pooling built-in
fly secrets set DATABASE_URL="postgres://user:pass@ep-cool-fog.us-east-2.aws.neon.tech/dbname?sslmode=require"
```

### Database Migrations at Deploy

```toml
# fly.toml — run migrations before starting the app
[deploy]
  release_command = "node dist/prisma/migrate.js"
  # OR
  release_command = "npx prisma migrate deploy"
```

---

## 8. Multi-Region Deployment

```bash
# Add a region (machine runs closest to users)
fly machine clone --region sin --app your-app-api  # Singapore
fly machine clone --region lax --app your-app-api  # Los Angeles

# Scale to min 2 machines in primary region
fly scale count 2 --region ams --app your-app-api

# View machine status
fly status --app your-app-api
```

For multi-region databases, use Neon (global read replicas) or PlanetScale (distributed MySQL).

---

## 9. CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy-fly.yml
name: Deploy to Fly.io

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install & test
        run: |
          npm ci
          npm run test
          npm audit --audit-level=high

      - name: Deploy API
        uses: superfly/flyctl-actions/setup-flyctl@master
        with:
          version: latest
      - run: flyctl deploy --remote-only --app your-app-api
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Deploy Worker
        run: flyctl deploy --remote-only --config fly.worker.toml --app your-app-worker
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

---

## 10. Cost Estimate

| Component | Spec | Monthly Cost |
|---|---|---|
| API (1 machine, shared-cpu-1x, 512MB) | Always-on | ~$5–7 |
| Worker (1 machine, shared-cpu-1x, 256MB) | Always-on | ~$3–4 |
| Fly Postgres (shared-cpu-1x, 10GB volume) | Single node | ~$5–10 |
| Neon Postgres (serverless) | Free tier / Pro | $0–19/mo |
| Redis via Upstash | Consumption | $0–10 |
| Outbound bandwidth | 160GB free/month | ~$0–5 |
| **Total estimate** | | **~$10–50/month** |

Fly.io becomes cost-competitive with Railway at ~$40+/month. Below that, Railway's simplicity often wins.

---

## 11. Monitoring

```bash
# Live logs
fly logs --app your-app-api

# Metrics dashboard (built-in Prometheus/Grafana)
fly dashboard --app your-app-api

# SSH into running machine
fly ssh console --app your-app-api
```

Add Sentry for error tracking and Logtail/Better Stack for log aggregation (see `observability.md`).

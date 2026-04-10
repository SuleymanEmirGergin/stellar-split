# Deployment Guides Index

Platform-specific deployment guides for the Repo Builder Agent.

When a user specifies a deployment target in `/scaffold` or `/assemble`, read the appropriate guide and generate the matching infrastructure files, CI/CD workflows, and environment variable documentation.

---

## Available Platforms

| Platform | Best For | Guide |
|---|---|---|
| **Railway** | SaaS MVPs, full-stack with Postgres + Redis, minimal ops | [railway.md](./railway.md) |
| **Render** | Heroku replacement, Docker + Postgres + Cron, free-tier MVP | [render.md](./render.md) |
| **Vercel** | Next.js frontend, edge-first, serverless API routes | [vercel.md](./vercel.md) |
| **Fly.io** | Multi-region APIs, persistent volumes, Railway alternative at scale | [fly-io.md](./fly-io.md) |
| **AWS ECS** | Production SaaS, compliance, enterprise, full control | [aws.md](./aws.md) |
| **Cloudflare Workers** | Edge-native APIs, URL shorteners, redirectors, 0ms cold start | [cloudflare-workers.md](./cloudflare-workers.md) |

---

## How to Choose

```
Is it a Next.js-only app or JAMstack?
  → Vercel

Is it a URL shortener, redirect service, geo-router, or read-heavy edge API?
  → Cloudflare Workers

Is it an early-stage SaaS with API + Worker + Postgres + Redis?
  → Railway

Is it a Heroku migration or needs Cron Jobs + Postgres with a free tier?
  → Render

Has the project outgrown Railway/Render ($40+/month) or needs multi-region / persistent volumes?
  → Fly.io

Does the project have compliance requirements (SOC2, HIPAA)?
Or expect enterprise customers?
Or need full VPC control?
  → AWS ECS
```

---

## What Each Guide Generates

### Railway
- `infra/Dockerfile.api` + `infra/Dockerfile.worker`
- `infra/docker-compose.yml` (local dev)
- `.github/workflows/deploy-railway.yml`
- `.railwayignore`
- Environment variable documentation for Railway Dashboard

### Vercel
- `apps/web/vercel.json` (routing + headers)
- `.github/workflows/deploy-vercel.yml` (preview + production)
- `.vercelignore`
- `apps/web/.env.example` (Vercel-scoped variables)

### Render
- `infra/Dockerfile.api` + `infra/Dockerfile.worker`
- `render.yaml` (Infrastructure as Code)
- `.github/workflows/ci-render.yml`
- Environment Group variable list

### AWS ECS
- `infra/aws/task-definition.api.json`
- `infra/aws/task-definition.worker.json`
- `infra/docker/Dockerfile.api` + `Dockerfile.worker`
- `.github/workflows/deploy-aws.yml`
- AWS Secrets Manager key list

### Cloudflare Workers
- `wrangler.toml` (D1, KV, Queue, Cron Trigger, secrets declarations)
- `migrations/*.sql` (D1 SQLite schema + indexes)
- `vitest.config.ts` (Miniflare test environment)
- `.dev.vars.example` (replaces `.env` for Workers)
- `.gitleaks.toml` (CF API token + Upstash token patterns)
- `.github/workflows/ci.yml` (lint → type-check → test → wrangler deploy)
- No Dockerfile (CF Workers uses `wrangler deploy`, not containers)

---

## Cost Comparison

| Platform | MVP Estimate | Scales When |
|---|---|---|
| Cloudflare Workers | Free–$5/mo (100k req/day free) | Pay-per-request beyond free tier; very cheap at scale |
| Railway | ~$20/mo | > $40/mo → consider Render or Fly.io |
| Render | Free–$14/mo (Starter) | > $100/mo → consider Fly.io |
| Vercel | Free–$20/mo | Bandwidth or function limits |
| Fly.io | ~$10–50/mo | Multi-region or volume-heavy workloads |
| AWS ECS | ~$115/mo baseline | Already scales horizontally |

---

## Key Rules for All Platforms

1. **Never hardcode secrets** — use platform secret stores (Railway variables, Vercel env, AWS Secrets Manager).
2. **Run migrations before app start** — not inside the app, as a pre-deploy step.
3. **Dockerfiles must run as non-root** — security requirement (Rule 21).
4. **CI must include**: lint → test → security audit → build → deploy.
5. **Health check endpoint** (`GET /health`) must be configured on every platform.

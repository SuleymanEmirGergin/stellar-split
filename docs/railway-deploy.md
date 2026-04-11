# Railway Deployment Guide

## Services Required

| Service | Railway Template | Notes |
|---------|-----------------|-------|
| PostgreSQL | Railway Postgres | Auto-provides `DATABASE_URL` |
| Redis | Railway Redis | Auto-provides `REDIS_URL` |
| API | This repo (`backend/`) | Dockerfile build |

## Required Environment Variables

Set these in Railway → API service → Variables:

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `NODE_ENV` | ✅ | `production` | |
| `PORT` | ✅ | `3001` | Railway sets this automatically |
| `DATABASE_URL` | ✅ | Injected by Railway Postgres | |
| `REDIS_URL` | ✅ | Injected by Railway Redis | |
| `JWT_SECRET` | ✅ | 64+ random chars | Generate: `openssl rand -hex 32` |
| `JWT_ACCESS_TTL` | ✅ | `900` | Access token TTL in seconds |
| `JWT_REFRESH_TTL` | ✅ | `604800` | Refresh token TTL in seconds (7 days) |
| `FRONTEND_URL` | ✅ | `https://stellarsplit.vercel.app` | CORS origin |
| `STELLAR_NETWORK` | ✅ | `testnet` or `mainnet` | |
| `STELLAR_HORIZON_URL` | ✅ | `https://horizon-testnet.stellar.org` | |
| `SOROBAN_RPC_URL` | ✅ | `https://soroban-testnet.stellar.org` | |
| `SERVICE_NAME` | — | `stellarsplit-api` | For log labels |
| `LOG_LEVEL` | — | `info` | `debug`/`info`/`warn`/`error` |
| `SENTRY_DSN` | — | `https://xxx@sentry.io/xxx` | Leave empty to disable |
| `METRICS_SECRET` | — | Random string | Bearer token for `GET /metrics` |
| `SSE_HEARTBEAT_INTERVAL_MS` | — | `25000` | Prevents Railway proxy timeouts |
| `SOROBAN_CONTRACT_ID` | — | `C...` | Soroban contract address |
| `S3_ENDPOINT` | — | Cloudflare R2 / AWS S3 URL | For receipt uploads |
| `S3_ACCESS_KEY_ID` | — | | |
| `S3_SECRET_ACCESS_KEY` | — | | |
| `S3_BUCKET_NAME` | — | `stellarsplit-receipts` | |
| `S3_REGION` | — | `auto` | |
| `S3_PUBLIC_URL` | — | `https://receipts.stellarsplit.app` | |

## Deploy Steps

1. Create a new Railway project
2. Add a **PostgreSQL** service — Railway injects `DATABASE_URL`
3. Add a **Redis** service — Railway injects `REDIS_URL`
4. Add a **GitHub** service pointing to this repo
   - Set **Root Directory** to `backend`
   - Railway auto-detects `Dockerfile`
   - **Disable** Railway's automatic GitHub deploy (CI handles it instead)
5. Set all required env vars above
6. Deploy — `railway.toml` runs `prisma migrate deploy` as release command before the app starts

## CI/CD Auto-Deploy

The `deploy-railway` GitHub Actions job deploys to Railway automatically after all backend tests and build checks pass on `master` push.

### Required GitHub Secrets / Variables

| Name | Type | Value |
|------|------|-------|
| `RAILWAY_TOKEN` | Secret | Railway API token — *Settings → Tokens* in Railway dashboard |
| `RAILWAY_SERVICE_ID` | Variable | Service ID from Railway — *Service → Settings → Service ID* |

Add these in **GitHub → repo Settings → Secrets and variables → Actions**.

## Health Check

Railway uses `GET /health/live` — returns `200 OK` when the service is ready.

## Prisma Migrations

Migrations run automatically via `releaseCommand` in `railway.toml`:
```toml
releaseCommand = "npx prisma migrate deploy"
```
This runs **before** the new instance receives traffic, ensuring zero-downtime schema migrations.

## Frontend Environment Variables

Set these in your frontend hosting (Vercel/Netlify/etc.):

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Railway API service URL (e.g. `https://api.stellarsplit.app`) |
| `VITE_STELLAR_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` (testnet) or `Public Global Stellar Network ; September 2015` (mainnet) |
| `VITE_HORIZON_URL` | `https://horizon-testnet.stellar.org` |
| `VITE_SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` |

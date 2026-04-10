# Vercel Deployment Guide

Deployment guide for the Repo Builder Agent when the target platform is **Vercel**.

Vercel is optimized for Next.js and edge-first deployments. It excels at hosting frontend applications and lightweight serverless API routes. For heavier backend services (NestJS, BullMQ workers), pair Vercel with Railway or a separate API server.

---

## 1. When to Choose Vercel

| ✅ Good For | ❌ Not Ideal For |
|---|---|
| Next.js full-stack apps (App Router) | NestJS / Express long-lived processes |
| Static + SSR frontend | Background job workers (no persistent process) |
| Light serverless API routes | WebSocket servers |
| Edge middleware and CDN-first delivery | Jobs > 10 sec (serverless timeout limit) |
| Preview deployments per PR | Stateful connections |

### Common Hybrid Architecture

```
Vercel (frontend + light API)
    ↕  REST / tRPC
Railway / Render (NestJS API + BullMQ worker)
    ↕
Supabase / Neon (PostgreSQL) + Upstash (Redis)
```

---

## 2. Generated Files

```
apps/
  web/
    vercel.json               ← Vercel routing and config
    next.config.ts            ← Next.js config with env vars
.github/
  workflows/
    deploy-vercel.yml         ← CI/CD for Vercel
.vercelignore                 ← Files to exclude from build
```

---

## 3. `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/v1/:path*",
      "destination": "https://api.yourapp.com/api/v1/:path*"
    }
  ]
}
```

The `rewrites` rule proxies `/api/v1/*` to a separate backend — keeps CORS simple and hides the backend URL from clients.

---

## 4. Next.js API Routes (Serverless Pattern)

When backend logic lives inside Next.js App Router:

```typescript
// apps/web/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  // Business logic here (keep lightweight — serverless limit)
  return NextResponse.json({ success: true, data: result })
}

// Set max duration (Pro plan allows up to 300s)
export const maxDuration = 30
```

**Rule**: For operations > 10 seconds (exports, imports, emails), delegate to a separate async API.

---

## 5. Edge Middleware

```typescript
// apps/web/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access-token')

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*'],
}
```

---

## 6. Environment Variables

### Local Development (`.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001    # backend API for local dev
DATABASE_URL=postgresql://...               # if using Next.js API routes with DB
```

### Vercel Dashboard

```bash
# Public (exposed to browser)
NEXT_PUBLIC_API_URL=https://api.yourapp.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Private (server-side only)
DATABASE_URL=postgresql://...               # if using Vercel Postgres / Neon / Supabase
JWT_SECRET=...
STRIPE_SECRET_KEY=sk_live_...
SENDGRID_API_KEY=...
```

Vercel automatically scopes variables to `Development`, `Preview`, and `Production` environments.

---

## 7. CI/CD Workflow (GitHub Actions)

```yaml
# .github/workflows/deploy-vercel.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
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
      - run: npm run test -- --passWithNoTests
      - run: npm audit --audit-level=high

  deploy-preview:
    if: github.event_name == 'pull_request'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy Preview
        run: npx vercel --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy Production
        run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 8. Custom Domain

1. Vercel Dashboard → Project → Settings → Domains
2. Add domain → Vercel provides DNS records (A + CNAME)
3. Update DNS at your registrar
4. Vercel auto-provisions SSL

---

## 9. Preview Deployments

Every pull request automatically gets a unique preview URL:

```
https://yourapp-git-feature-branch-team.vercel.app
```

Configure environment variables for preview environments separately in the Vercel dashboard.

---

## 10. `.vercelignore`

```
node_modules/
.env
.env.*
*.test.ts
*.spec.ts
coverage/
apps/api/
apps/worker/
infra/
```

---

## 11. Cost Estimate

| Plan | Features | Price |
|---|---|---|
| Hobby | Personal projects, 100GB bandwidth | Free |
| Pro | Teams, preview deployments, 1TB bandwidth, 300s functions | $20/mo per member |
| Enterprise | SLA, SSO, advanced security | Custom |

For most SaaS MVPs: **Pro plan** for the team.

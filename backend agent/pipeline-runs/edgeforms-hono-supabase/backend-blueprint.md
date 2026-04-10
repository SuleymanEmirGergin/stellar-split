# Backend Architecture Blueprint — EdgeForms

**Pipeline Run #4** | Stack: Hono + Cloudflare Workers + Supabase  
**Generated:** 2026-04-05 | **Status:** ✅ Stage 0 + Stage 1 PASS

---

## Project Summary

**EdgeForms** is an edge-native form builder SaaS. Forms are served and submissions are collected at Cloudflare's edge (~130ms global p99 latency) with Supabase providing the persistence layer (Postgres + RLS + Auth + Storage + Realtime).

**Key design philosophy:** No traditional server. No connection pools to manage. Auth and multi-tenancy enforced at both the Hono middleware layer and Supabase RLS simultaneously.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Cloudflare Edge Network                    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │             Hono API Worker (apps/api)               │  │
│  │                                                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌───────────────┐  │  │
│  │  │ Auth MW    │  │ RBAC MW    │  │ Rate Limit MW │  │  │
│  │  │ (Supabase  │  │ (workspace │  │ (CF KV        │  │  │
│  │  │  JWT)      │  │  roles)    │  │  sliding win) │  │  │
│  │  └────────────┘  └────────────┘  └───────────────┘  │  │
│  │                                                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │  │
│  │  │ /auth    │  │ /forms   │  │ /webhooks/stripe  │  │  │
│  │  │ /workspace│ │ /billing │  │ (HMAC verified)  │  │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│  ┌────────────┐         │          ┌──────────────────┐    │
│  │ CF KV      │◄────────┤          │ CF Worker Secrets│    │
│  │ Rate Limit │         │          │ SUPABASE_SK      │    │
│  └────────────┘         │          │ STRIPE_WEBHOOK_SK│    │
└────────────────────────-┼──────────└──────────────────┘────┘
                          │
                    ┌─────▼──────────────────┐
                    │     Supabase           │
                    │                        │
                    │  ┌─────────────────┐   │
                    │  │   Postgres DB   │   │
                    │  │   (RLS enabled) │   │
                    │  └────────┬────────┘   │
                    │           │            │
                    │  ┌────────▼────────┐   │
                    │  │  Supabase Auth  │   │
                    │  └─────────────────┘   │
                    │  ┌─────────────────┐   │
                    │  │ Supabase Storage│   │
                    │  │ (CSV exports,   │   │
                    │  │  form logos)    │   │
                    │  └─────────────────┘   │
                    │  ┌─────────────────┐   │
                    │  │  Edge Functions │   │
                    │  │  (async export) │   │
                    │  └─────────────────┘   │
                    └────────────────────────┘
```

---

## Monorepo Structure

```
edgeforms/
├── apps/
│   ├── api/                          ← Hono CF Worker API
│   │   ├── src/
│   │   │   ├── index.ts              ← Hono app entry + wrangler export
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts           ← Supabase JWT validation
│   │   │   │   ├── rbac.ts           ← Workspace role enforcement
│   │   │   │   └── rate-limit.ts     ← CF KV sliding window
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts           ← /auth/*
│   │   │   │   ├── workspace.ts      ← /workspace/*
│   │   │   │   ├── forms.ts          ← /forms/* (protected)
│   │   │   │   ├── submit.ts         ← /forms/:slug/submit (public)
│   │   │   │   ├── billing.ts        ← /billing/*
│   │   │   │   └── webhooks.ts       ← /webhooks/stripe
│   │   │   ├── lib/
│   │   │   │   ├── supabase.ts       ← Supabase client factory (service + anon)
│   │   │   │   ├── stripe.ts         ← Stripe SDK init + webhook verification
│   │   │   │   └── resend.ts         ← Email sender
│   │   │   └── types/
│   │   │       └── env.d.ts          ← CF Worker env bindings type
│   │   ├── wrangler.toml             ← CF Worker config (routes, KV, secrets)
│   │   ├── vitest.config.ts          ← Test runner
│   │   └── tsconfig.json
│   │
│   └── web/                          ← Next.js 14 App Router
│       ├── app/
│       │   ├── (marketing)/          ← Landing, pricing (no auth)
│       │   ├── (auth)/               ← Login, register
│       │   └── (dashboard)/          ← Protected workspace pages
│       ├── middleware.ts             ← Supabase session refresh
│       └── next.config.mjs
│
├── packages/
│   ├── types/                        ← @edgeforms/types
│   │   └── src/index.ts              ← Form, Response, Workspace types
│   └── validators/                   ← @edgeforms/validators
│       └── src/index.ts              ← Zod schemas (reused API + UI)
│
├── supabase/
│   ├── migrations/                   ← SQL migration files
│   ├── seed.sql                      ← Dev seed data
│   └── config.toml                   ← Supabase CLI config
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    ← Test + lint + type check
│       └── deploy.yml                ← Wrangler deploy on merge to main
│
├── .gitleaks.toml                    ← Secret scanning config
├── SECURITY.md                       ← Vulnerability disclosure
├── .gitignore                        ← Comprehensive (env, dist, .wrangler)
└── package.json                      ← Workspaces root
```

---

## Database Schema

### Core Tables (Supabase Postgres, all with RLS)

```sql
-- Workspaces (top-level tenant)
CREATE TABLE workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata    JSONB DEFAULT '{}'
);

-- Workspace memberships (owner, editor, viewer)
CREATE TABLE workspace_memberships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  status       TEXT NOT NULL DEFAULT 'active',
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Forms
CREATE TABLE forms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  fields       JSONB NOT NULL DEFAULT '[]',    -- FormField[] serialized
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  slug         TEXT UNIQUE,                     -- generated on publish
  settings     JSONB NOT NULL DEFAULT '{}',     -- webhook_url, redirect_url, etc.
  created_by   UUID NOT NULL REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Responses (submissions)
CREATE TABLE responses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id           UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  workspace_id      UUID NOT NULL REFERENCES workspaces(id),
  data              JSONB NOT NULL,              -- { fieldId: value }
  completion_status TEXT NOT NULL DEFAULT 'complete',
  country           TEXT,                        -- from CF-IPCountry header
  ip_hash           TEXT,                        -- SHA-256(IP + salt)
  metadata          JSONB DEFAULT '{}',          -- browser, OS, referrer
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invitations
CREATE TABLE workspace_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  token        TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  accepted_at  TIMESTAMPTZ
);

-- Subscriptions (Stripe state)
CREATE TABLE subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL UNIQUE REFERENCES workspaces(id),
  stripe_customer_id  TEXT UNIQUE,
  stripe_price_id     TEXT,
  status              TEXT NOT NULL DEFAULT 'free',
  current_period_end  TIMESTAMPTZ
);

-- API Keys
CREATE TABLE api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL,                   -- bcrypt hash
  prefix       TEXT NOT NULL,                   -- first 8 chars for display
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ
);
```

### RLS Policies (Pattern)

```sql
-- Enable RLS on all tables
ALTER TABLE workspaces          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms               ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses           ENABLE ROW LEVEL SECURITY;

-- Example: forms are visible only to workspace members
CREATE POLICY "forms_select_workspace_members" ON forms
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Public: responses INSERT allowed for published forms only (no auth)
CREATE POLICY "responses_insert_public" ON responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms
      WHERE id = form_id AND status = 'published'
    )
  );
```

---

## Hono Middleware Stack

```typescript
// apps/api/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authMiddleware } from './middleware/auth'
import { rateLimitMiddleware } from './middleware/rate-limit'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Global middleware
app.use('*', logger())
app.use('*', cors({ origin: (origin, c) => c.env.ALLOWED_ORIGIN }))

// Public endpoints
app.get('/health/live', (c) => c.json({ status: 'ok' }))
app.get('/health/ready', async (c) => {
  // Ping Supabase — verify connection
  const { error } = await getSupabaseClient(c.env).from('workspaces').select('count').limit(1)
  return error ? c.json({ status: 'degraded' }, 503) : c.json({ status: 'ok' })
})

// Rate-limited public submission
app.use('/forms/:slug/submit', rateLimitMiddleware({ limit: 60, windowSeconds: 3600 }))
app.route('/forms', submitRouter)     // public router for /forms/:slug/submit

// Protected routes — auth middleware applied
app.use('/workspace/*', authMiddleware)
app.use('/forms/*', authMiddleware)
app.use('/billing/*', authMiddleware)

app.route('/auth', authRouter)
app.route('/workspace', workspaceRouter)
app.route('/forms', formsRouter)
app.route('/billing', billingRouter)
app.route('/webhooks', webhooksRouter)   // HMAC verified internally

export default app
```

---

## Security Implementation

### Webhook Signature Verification (Stripe)

```typescript
// apps/api/src/routes/webhooks.ts
import { Hono } from 'hono'
import Stripe from 'stripe'

const webhooks = new Hono<{ Bindings: CloudflareBindings }>()

webhooks.post('/stripe', async (c) => {
  const signature = c.req.header('stripe-signature')
  const body = await c.req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      c.env.STRIPE_WEBHOOK_SECRET
    )
  } catch {
    return c.json({ error: 'Invalid signature' }, 400)
  }

  // Process event...
  return c.json({ received: true })
})
```

### Rate Limiting (Cloudflare KV)

```typescript
// apps/api/src/middleware/rate-limit.ts
export function rateLimitMiddleware({ limit, windowSeconds }: Options) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || 'unknown'
    const key = `rl:${c.req.path}:${ip}`
    const current = Number(await c.env.RATE_LIMIT_KV.get(key) ?? '0')

    if (current >= limit) {
      return c.json({ error: 'Rate limit exceeded' }, 429)
    }

    await c.env.RATE_LIMIT_KV.put(key, String(current + 1), {
      expirationTtl: windowSeconds,
    })

    await next()
  }
}
```

---

## Environment Variables

### Cloudflare Worker Secrets (via `wrangler secret put`)

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
EMAIL_FROM
ALLOWED_ORIGIN
IP_HASH_SALT
```

### `wrangler.toml`

```toml
name = "edgeforms-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "your-kv-namespace-id"

[env.production]
routes = [{ pattern = "api.edgeforms.io/*", zone_name = "edgeforms.io" }]

[env.preview]
routes = [{ pattern = "api-preview.edgeforms.io/*", zone_name = "edgeforms.io" }]
```

---

## Test Strategy

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | Middleware logic, utility functions |
| Integration | Vitest + `app.request()` | All 34 API endpoints |
| E2E | Playwright | Critical flows: register, create form, submit, billing |
| Auth boundary | Vitest | 401 (no token) + 403 (wrong role) per protected endpoint |
| Mutation | Stryker + Vitest | Auth + webhook modules |

**Coverage target:** 80% global, 95% for `/auth/*`, `/webhooks/*`

**P0 endpoints:** `/auth/register`, `/auth/login`, `/forms/:slug/submit`, `/webhooks/stripe`

---

## CI/CD Pipeline

```
PR opened
  ↓
[CI] Type check → Lint → Vitest (unit + integration) → Coverage gate (80%)
  ↓
[CI] Secret scanning (gitleaks) → npm audit
  ↓
[Deploy] wrangler deploy --env preview
  ↓
[Smoke] GET /health/live + /health/ready → expect 200
  ↓ (on merge to main)
[Deploy] wrangler deploy --env production
  ↓
[Smoke] Production health check
```

---

## Trade-offs and Intentional Decisions

| Decision | Rationale |
|---|---|
| Hono on CF Workers vs NestJS on Railway | Sub-100ms cold start globally; no connection pool management; Cloudflare KV for stateless rate limiting |
| Supabase Auth instead of custom JWT | Removes auth infrastructure; MFA, OAuth, email verification all managed; RLS integration is native |
| JSONB for form fields instead of normalized table | Allows arbitrary field types without schema migrations; RLS on form level covers all fields |
| Supabase Edge Functions for exports instead of CF Scheduled | File writes to Supabase Storage are natively supported; no separate R2 bucket to manage |
| Distributed tracing deferred to v1.1 | Single-region Worker deployment; CF-Ray-ID provides adequate request correlation for MVP |

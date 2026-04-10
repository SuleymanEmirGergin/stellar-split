# Supabase Stack Guide

Framework-specific patterns for the Backend Integrator Agent when the project uses **Supabase** — an open-source Firebase alternative providing PostgreSQL, Auth, Storage, Realtime, and Edge Functions as a managed platform.

---

## 1. When to Choose Supabase

| Factor | Supabase | Custom NestJS/FastAPI | Firebase |
|---|---|---|---|
| Time to first API | Minutes (auto REST) | Hours | Minutes |
| Database | PostgreSQL (full power) | PostgreSQL / MySQL | Firestore (NoSQL) |
| Auth | Built-in (JWT, OAuth, MFA) | Custom | Built-in |
| Realtime | Built-in (pg_changes) | Custom (Socket.IO/SSE) | Built-in |
| Edge Functions | Deno-based | Not applicable | Firebase Functions |
| Self-hostable | ✅ Yes | ✅ Yes | ❌ No |
| Vendor lock-in | Medium | None | High |
| Complex business logic | Limited | ✅ Full control | Limited |
| SQL + full ORM features | ✅ Native | ✅ Via Prisma/Drizzle | ❌ |

**Choose Supabase when**: rapid prototyping, startup MVP, when you want PostgreSQL + Auth + Storage without building infrastructure, or when the team is small.

**Avoid Supabase when**: extremely complex business logic requiring a full service layer, custom auth flows not supported by Supabase Auth, or compliance requirements that prohibit managed services.

---

## 2. Architecture Patterns

### Pattern A — Pure Supabase (BaaS)
Client → Supabase REST/Realtime API directly. Row Level Security enforces access control.
- Best for: simple apps, prototypes, read-heavy dashboards
- Risk: business logic leaks to client; harder to test

### Pattern B — Supabase + Custom Backend (recommended for production)
Client → Your API (NestJS/FastAPI) → Supabase (DB + Auth + Storage)
- Your API enforces business logic
- Supabase is the infrastructure layer
- RLS as defense-in-depth, not primary access control

```
[Frontend]
    │
    ▼
[Your API — NestJS/FastAPI]   ← business logic, validation, complex queries
    │              │
    ▼              ▼
[Supabase DB]  [Supabase Storage]
(PostgreSQL +  (S3-compatible +
 RLS policies)  signed URLs)
```

### Pattern C — Edge Functions for Lightweight Endpoints
Supabase Edge Functions (Deno) for lightweight webhooks, cron triggers, and third-party callbacks.

---

## 3. Database + Row Level Security

### RLS Policy Patterns

```sql
-- Enable RLS on all tables (mandatory)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Users can only read their own posts
CREATE POLICY "users_own_posts_select"
  ON posts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert posts for themselves
CREATE POLICY "users_own_posts_insert"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update/delete only their own posts
CREATE POLICY "users_own_posts_modify"
  ON posts FOR UPDATE USING (auth.uid() = user_id)
           WITH CHECK (auth.uid() = user_id);

-- Admins can do everything (add role claim to JWT)
CREATE POLICY "admins_all"
  ON posts FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
```

### Multi-tenant RLS

```sql
-- Org-scoped access
CREATE POLICY "org_members_select"
  ON documents FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM memberships
      WHERE user_id = auth.uid()
    )
  );
```

### Custom Claims (for RBAC)

```sql
-- Function to add role to JWT (called via database hook)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  claims := event -> 'claims';
  SELECT role INTO user_role FROM public.users WHERE id = (event ->> 'user_id')::uuid;
  claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Supabase Client Setup

### Server-Side (Custom Backend)

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';  // generated types

// Service role — bypasses RLS, use only on server
export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // never expose to client
);

// Anon client — respects RLS, for user-context operations
export function createUserClient(userJwt: string) {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${userJwt}` } } },
  );
}
```

### Generate TypeScript Types

```bash
# Install CLI
npm install -g supabase

# Generate types from your schema
supabase gen types typescript --project-id <your-project-id> > src/lib/database.types.ts
```

---

## 5. Authentication

### Supabase Auth (built-in)

Handles: email/password, OAuth (Google, GitHub, etc.), Magic Link, OTP, MFA.

```ts
// Verify JWT in your custom backend middleware
import { createClient } from '@supabase/supabase-js';

async function verifyToken(token: string): Promise<User> {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new UnauthorizedException();
  return data.user;
}
```

### Custom JWT Validation (without Supabase Auth SDK)

```ts
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

async function verifySupabaseJWT(token: string) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `${process.env.SUPABASE_URL}/auth/v1`,
  });
  return payload;
}
```

---

## 6. Storage

```ts
// Upload file via your backend (server-side)
async function uploadAvatar(userId: string, file: Buffer, mimeType: string): Promise<string> {
  const path = `avatars/${userId}/profile.jpg`;

  const { error } = await supabaseAdmin.storage
    .from('user-uploads')
    .upload(path, file, {
      contentType: mimeType,
      upsert: true,  // overwrite if exists
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  // Generate signed URL (private bucket)
  const { data } = await supabaseAdmin.storage
    .from('user-uploads')
    .createSignedUrl(path, 3600);  // 1 hour

  return data!.signedUrl;
}
```

### Storage Bucket Policies

```sql
-- Public bucket: anyone can read
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'public-assets');

-- Private bucket: only owner can read
CREATE POLICY "owner_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 7. Edge Functions (Deno)

For lightweight logic: webhooks, email triggers, cron jobs, third-party callbacks.

```ts
// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!;
  const body = await req.text();

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
  );

  // Handle event...

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Deploy: `supabase functions deploy stripe-webhook`

---

## 8. Security Defaults

Supabase security operates at two levels: **platform-level** (RLS, dashboard settings) and **application-level** (Edge Function headers, key management).

### 1. Row Level Security — Always Enabled

`ENABLE ROW LEVEL SECURITY` is off by default on every new table. Opt in explicitly after every `CREATE TABLE`.

```sql
-- Run immediately after CREATE TABLE
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Default-deny: explicit RESTRICTIVE policy blocks everything, then allowlist
CREATE POLICY "deny_all" ON public.documents AS RESTRICTIVE
  USING (false);

-- Allow owners to read their own rows
CREATE POLICY "owner_read" ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

-- Allow owners to insert only for themselves
CREATE POLICY "owner_insert" ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Rule:** A table with RLS enabled but **no policies** is completely inaccessible — safe but broken. Always pair `ENABLE ROW LEVEL SECURITY` with explicit policies.

### 2. Anon Key vs Service Role Key

```ts
// ✅ Client-side (browser / mobile) — anon key, respects RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ✅ Server-side only (Edge Functions, backend API) — bypasses RLS
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ❌ NEVER: service_role key in a client bundle — all RLS is bypassed silently
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely. Treat it like a database root password — server-side only, never in a browser bundle or mobile app.

### 3. Edge Functions — Security Headers and CORS

```ts
// supabase/functions/_shared/security.ts
export function corsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id',
    'Access-Control-Max-Age': '86400',
  }
}

export function securityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }
}
```

```ts
// supabase/functions/api/index.ts
import { corsHeaders, securityHeaders } from '../_shared/security.ts'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? ''

Deno.serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(ALLOWED_ORIGIN) })
  }

  const data = await handleRequest(req)
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(ALLOWED_ORIGIN),
      ...securityHeaders(),
    },
  })
})
```

**Rule:** Never set `Access-Control-Allow-Origin: *` — always use an `ALLOWED_ORIGIN` env var pointing to your specific frontend domain.

### 4. Rate Limiting for Edge Functions (Upstash)

Edge Functions run on Deno — standard TCP Redis clients don't work. Use `@upstash/ratelimit` (REST API).

```ts
// supabase/functions/auth-login/index.ts
import { Ratelimit } from 'https://esm.sh/@upstash/ratelimit@1'
import { Redis } from 'https://esm.sh/@upstash/redis@1'

const ratelimit = new Ratelimit({
  redis: new Redis({
    url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
    token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
  }),
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'login',
})

Deno.serve(async (req) => {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const { success, reset } = await ratelimit.limit(ip)

  if (!success) {
    return new Response(
      JSON.stringify({ error: 'Too many requests', retryAfter: reset }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          ...corsHeaders(Deno.env.get('ALLOWED_ORIGIN') ?? ''),
        },
      }
    )
  }

  // handle login...
})
```

**Rule:** Standard `redis` npm / TCP-based clients do not work in Deno Edge Functions. Only REST-based clients (`@upstash/redis`) are supported.

---

## 9. Realtime Subscriptions

```ts
// Client-side realtime (frontend)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Subscribe to INSERT events on notifications table for current user
const channel = supabase
  .channel('user-notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      console.log('New notification:', payload.new);
    },
  )
  .subscribe();

// Cleanup
channel.unsubscribe();
```

Realtime requires `REPLICA IDENTITY FULL` on tables you subscribe to:

```sql
ALTER TABLE notifications REPLICA IDENTITY FULL;
```

---

## 10. Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...            # safe for client-side use
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # server-side ONLY — bypasses RLS
SUPABASE_JWT_SECRET=your-jwt-secret # for custom JWT verification

# Edge Functions (set via Supabase dashboard or CLI)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 11. When to Eject from Supabase

Consider moving to a custom backend when:

| Signal | Action |
|---|---|
| Business logic too complex for RLS + Functions | Add NestJS/FastAPI service layer |
| Need custom auth flows (SAML, enterprise SSO) | Move to custom Auth with Supabase DB |
| Realtime subscriptions causing cost issues | Replace with custom SSE/WebSocket |
| Edge Function cold starts affecting UX | Move to persistent API server |
| Compliance requirements forbid managed services | Self-host Supabase or migrate to raw PostgreSQL |

Supabase is fully self-hostable via Docker — migration path exists without data loss.

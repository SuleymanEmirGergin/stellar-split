# QUICKSTART — Backend Agent System

**Hangı stack, hangi playbook, hangi platforma?** 3 soruyla yanıt.

---

## 🧭 Karar Ağacı

```
┌── 1. Verin regulated (HIPAA / PCI) mi?
│
│   YES → HIPAA (Medical / Health)
│   └── Stack  : Django 5 + PostgreSQL + Celery
│       Deploy : Fly.io (HIPAA BAA available)
│       Playbook: backend-integrator/playbooks/django.md
│                 backend-integrator/playbooks/hipaa-compliance.md
│                 backend-integrator/playbooks/resilience.md
│       ─────────────────────────────────────────────────────────
│       YES → PCI (Payment / FinTech — no health data)
│       └── Stack  : NestJS + PostgreSQL + BullMQ + Stripe
│           Deploy : Railway
│           Playbook: backend-integrator/playbooks/nestjs.md
│                     backend-integrator/playbooks/stripe-payments.md
│                     backend-integrator/playbooks/resilience.md
│
│   NO  → gidin 2. soruya ↓
│
└── 2. Gecikme kritik mi? (< 50ms global, CDN edge, serverless fetch)
│
│   YES → Edge-Native
│   └── Stack  : Hono + Cloudflare Workers + Supabase (veya D1)
│       Deploy : Cloudflare Workers (wrangler deploy)
│       Playbook: backend-integrator/playbooks/hono.md
│                 backend-integrator/playbooks/supabase.md
│                 backend-integrator/playbooks/resilience.md
│       Validator: Rule 17 (Edge Runtime Checks) aktif
│
│   NO  → gidin 3. soruya ↓
│
└── 3. API ağırlıklı mı, data-heavy/ML mi?
    │
    ├── API-ağırlıklı (CRUD, auth, billing, multi-tenant SaaS)
    │   └── Stack  : NestJS + PostgreSQL + Prisma + BullMQ
    │       Deploy : Railway
    │       Playbook: backend-integrator/playbooks/nestjs.md
    │                 backend-integrator/playbooks/stripe-payments.md
    │
    └── Data-heavy / ML / async (veri pipeline, AI, analitik)
        └── Stack  : FastAPI + PostgreSQL + SQLAlchemy + ARQ
            Deploy : Railway (veya Fly.io)
            Playbook: backend-integrator/playbooks/fastapi.md
                      backend-integrator/playbooks/resilience.md
```

---

## 📦 Stack Reference Kartları

### 🏥 HIPAA / Medical SaaS
```
Language   : Python 3.12
Framework  : Django 5 + Django REST Framework
Database   : PostgreSQL 16 (RDS / Supabase with BAA)
ORM        : Django ORM
Queue      : Celery + Redis (ARQ for async-native)
Auth       : djoser + JWT (djangorestframework-simplejwt)
Storage    : S3 (HIPAA BAA signed with AWS)
Email      : SendGrid / Resend
Deploy     : Fly.io (Machine + Managed Postgres)
CI         : GitHub Actions → pytest + coverage → fly deploy
Playbooks  : django.md, hipaa-compliance.md, resilience.md
```

**Zorunlu Rule'lar:** Rule 14 (PHI), Rule 13 (Security Playbook), Rule 16 (Resilience)  
**Pipeline örneği:** `pipeline-runs/hipaa-telemed/`

---

### ⚡ Edge-Native SaaS (Low Latency / Global)
```
Language   : TypeScript
Framework  : Hono (Cloudflare Workers)
Database   : Supabase Postgres (PostgREST HTTP) veya D1 (SQLite)
ORM        : supabase-js (RLS) veya Drizzle ORM (D1)
Queue      : Supabase Edge Functions veya CF Queues
Auth       : Supabase Auth (JWT) veya CF Access
Storage    : Supabase Storage veya Cloudflare R2
Rate Limit : Cloudflare KV (sliding window — Redis değil!)
Email      : Resend
Deploy     : wrangler deploy → Cloudflare Workers
CI         : GitHub Actions → Vitest (+Miniflare) → wrangler deploy
Playbooks  : hono.md, supabase.md, resilience.md
```

**Zorunlu Rule'lar:** Rule 17 (Edge Runtime), Rule 16 (Resilience)  
**Yasak:** `REDIS_URL` (TCP Redis — CF Workers'da çalışmaz!)  
**Pipeline örneği:** `pipeline-runs/edgeforms-hono-supabase/`, `pipeline-runs/snaplink-hono-workers/`

---

### 🏢 Standard SaaS (CRUD + Auth + Billing)
```
Language   : TypeScript
Framework  : NestJS 10
Database   : PostgreSQL 16
ORM        : Prisma 5
Queue      : BullMQ + Redis
Auth       : Passport JWT + refresh tokens
Storage    : S3 / Supabase Storage
Email      : Resend
Payments   : Stripe
Deploy     : Railway (Docker veya Native)
CI         : GitHub Actions → Jest + coverage → railway up
Playbooks  : nestjs.md, stripe-payments.md, resilience.md
```

**Zorunlu Rule'lar:** Rule 16 (Resilience + idempotency), Rule 13 (Security Playbook)  
**Pipeline örneği:** `pipeline-runs/briefboard-saas/`

---

### 📊 Data-Heavy / ML / Async API
```
Language   : Python 3.12
Framework  : FastAPI + Uvicorn / Gunicorn
Database   : PostgreSQL 16
ORM        : SQLAlchemy 2 (async) + Alembic
Queue      : ARQ (Redis) veya Celery
Auth       : fastapi-users veya custom JWT
Storage    : S3 / MinIO
Email      : Resend / SendGrid
Deploy     : Railway veya Fly.io
CI         : GitHub Actions → pytest + coverage → deploy
Playbooks  : fastapi.md, resilience.md
```

**Zorunlu Rule'lar:** Rule 16 (Resilience)  
**Pipeline örneği:** `pipeline-runs/linkpulse-fastapi/`

---

## ✅ Validator CLI — Komutlar

```bash
# Stage 0: Frontend → Backend handoff validate
node tools/validator-cli/index.js validate frontend-backend <handoff.json>

# Stage 1: Repo handoff validate (Rule 17 otomatik aktif olur — CF Workers ise)
node tools/validator-cli/index.js validate repo <repo-handoff.json>

# Fix hints ile
node tools/validator-cli/index.js validate repo <file.json> --fix-hints

# JSON rapor kaydet
node tools/validator-cli/index.js validate repo <file.json> --report --output ./report.json
```

**Exit Codes:**
- `0` → Tüm checkler geçti
- `1` → Warning var — ilerleyebilirsin ama dikkat
- `2` → Blocking failure — pipeline durdu

---

## 📂 Playbook Eşleşme Tablosu

| Senaryo | Zorunlu Playbook'lar |
|---|---|
| Auth (login, register, JWT) | `nestjs.md` veya `fastapi.md` + `security.md` |
| Stripe ödemeleri | `stripe-payments.md` + `resilience.md` |
| HIPAA / PHI verisi | `hipaa-compliance.md` + `security.md` + `resilience.md` |
| Cloudflare Workers deploy | `hono.md` + Rule 17 validator check |
| Render.com deploy | `repo-builder-agent/deployments/render.md` |
| Fly.io deploy | `repo-builder-agent/deployments/fly-io.md` |
| Railway deploy | `repo-builder-agent/deployments/railway.md` |
| Resilience (retry/circuit) | `resilience.md` (Rule 16 zorunlu kılar) |

---

## 🚀 0'dan Başlıyorum — Adım Adım

```
1. Bu QUICKSTART ile stack seç
2. Backend Integrator Agent'ı çalıştır → frontend-backend-handoff.json üret
3. Validator CLI Stage 0: node tools/validator-cli/index.js validate frontend-backend <file>
4. Hatalar varsa --fix-hints ile düzelt
5. Repo Builder Agent → repo-handoff.json üret
6. Validator CLI Stage 1: node tools/validator-cli/index.js validate repo <file>
7. Geçince: backend-blueprint.md okunmaya hazır
8. QA Agent → /plan → test-strategy.md
9. QA Agent → /generate → test suite
10. Deploy playbook → CI pipeline
```

---

## ⚠️ Sık Yapılan Hatalar

| Hata | Doğru Yaklaşım |
|---|---|
| CF Workers'da `REDIS_URL` kullanmak | Upstash REST API (`UPSTASH_REDIS_REST_URL`) kullan |
| HIPAA projesinde `compliance.scope` koymamak | `"scope": "HIPAA"` zorunlu — Rule 14 blocking failure |
| Payment entegrasyonunda idempotency key yazmamak | assumptions'a ekle — Rule 16 warning |
| `securityMdIncluded: false` | SECURITY.md zorunlu — Rule 13 blocking failure |
| Monorepo'da `packages[]` boş bırakmak | En az 1 package tanımla — Rule 5 blocking failure |
| `authFlows[]` var ama `"login"` tipi yok | Login flow ekle — Rule 6 blocking failure |

---

*Son güncelleme: 2026-04-05 | Pipeline v4.3.0*

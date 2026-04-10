# Backend Agent System

> **v4.4.0** — A four-agent, gate-enforced pipeline for generating production-ready backend architectures from frontend UI flows.

---

## What This Is

Four specialized AI agents that work in a gated sequence — each agent validates the previous agent's output before proceeding:

| Agent | Role | Input | Output |
|---|---|---|---|
| **Backend Integrator** | Converts frontend UI flows into a full backend architecture plan | Frontend pages, forms, tables, actions | `frontend-backend-handoff.json` |
| **Validator Agent** | Validates handoff files across 9 check categories + 17 rules | Any handoff JSON | `validation-report.json` |
| **Repo Builder** | Converts backend architecture into a production-ready repository structure | `repo-handoff.json` + stack preferences | Repo tree + `repo-handoff.json` |
| **QA Agent** | Generates a complete, stack-aware test suite for the produced repository | `repo-handoff.json` + stack | Test files, fixtures, CI config |

**→ New to the system? Start with [QUICKSTART.md](./QUICKSTART.md)**

---

## Agent Pipeline

```
[Frontend Designs / Screens]
          │
          ▼  /handoff
[Backend Integrator Agent]
          │ frontend-backend-handoff.json
          ▼
[Validator Agent]           ← Stage 0: 9-category gate
          │ status: pass / warn / fail        (exit 0 / 1 / 2)
          ▼
[Backend Integrator Agent]  ← proceeds only on pass/warn
          │
          ▼  /handoff (repo)
[Repo Builder Agent]
          │ repo-handoff.json
          ▼
[Validator Agent]           ← Stage 1: 9-category gate
          │ status: pass / warn / fail
          ▼
[Repo Builder Agent]        ← produces production repo structure
          │
          ▼  /generate
[QA Agent]                  ← stack-aware test suite
          │ test files + fixtures + CI config
          ▼
[Production Repository + Test Suite]
```

Full pipeline → [pipeline.md](./pipeline.md)

---

## Quick Start

### Option 1 — Read QUICKSTART.md (recommended for new users)

[QUICKSTART.md](./QUICKSTART.md) answers: **which stack, which playbook, which platform** in 3 questions.

```
→ HIPAA / medical data?   → Django + Fly.io + HIPAA playbook
→ Edge / low-latency?     → Hono + Cloudflare Workers
→ Standard SaaS?          → NestJS + Railway
→ Data-heavy / ML / async → FastAPI + Railway
```

### Option 2 — Use Agent Starter Prompts

| Agent | Starter Prompts |
|---|---|
| Backend Integrator | `backend-integrator/starter-prompts.md` |
| Validator Agent | `validator-agent/starter-prompts.md` |
| Repo Builder | `repo-builder-agent/starter-prompts.md` |
| QA Agent | `qa-agent/starter-prompts.md` |

### Option 3 — Run the Validator CLI Directly

```bash
cd tools/validator-cli
npm install

# Stage 0: validate frontend-backend handoff
node index.js validate frontend-backend path/to/frontend-backend-handoff.json

# Stage 1: validate repo handoff
node index.js validate repo path/to/repo-handoff.json

# With fix hints on failure
node index.js validate repo path/to/repo-handoff.json --fix-hints

# Save JSON report
node index.js validate repo path/to/repo-handoff.json --report --output ./report.json
```

**Exit codes:** `0` = PASS · `1` = WARN (proceed with caution) · `2` = FAIL (pipeline stops)

---

## Validator CLI — 9 Check Categories

The CLI (`tools/validator-cli/`) enforces all 17 validation rules programmatically:

| # | Category | Rules | Applies To | Severity |
|---|---|---|---|---|
| 1 | **Schema Compliance** | Rule 1 | Both | 🚫 Blocking |
| 2 | **Semantic Cross-Reference** | Rule 5 | Both | 🚫 Blocking |
| 3 | **Security Baseline** | Rule 6 | Both | ⚠️ Warning/Blocking |
| 4 | **Completeness** | Rules 4, 7 | Both | ⚠️ Warning |
| 5 | **Security Playbook** | Rule 13 | Both | 🚫 Blocking |
| 6 | **Data Classification** | Rule 14 | Both | 🚫 Blocking (PHI) |
| 7 | **Observability Baseline** | Rule 15 | `repo` | ⚠️ Warning |
| 8 | **Resilience Baseline** | Rule 16 | Both | ⚠️ Warning |
| 9 | **Edge Runtime Checks** | Rule 17 | `repo` (CF Workers only) | 🚫 Blocking (TCP Redis) |

### Cat 9 — Edge Runtime (Rule 17)

Auto-activates when `project.deploymentTarget` or `project.runtime` = `cloudflare-workers`:

| Check | Severity |
|---|---|
| `REDIS_URL` in envVars (TCP Redis) | 🚫 **BLOCKING** — incompatible with CF Workers |
| PostgreSQL without Hyperdrive binding | ⚠️ Warning |
| Dockerfile declared (Docker not used in CF Workers) | ℹ️ Info |
| Prisma/Alembic migration tool for D1 database | ⚠️ Warning |
| `wrangler.toml` not referenced | ⚠️ Warning |

---

## Directory Structure

```
backend-agent/
├── README.md                            ← You are here
├── QUICKSTART.md                        ← Stack decision guide (3 questions)
├── CHANGELOG.md                         ← Version history (v4.4.0)
├── CONTRIBUTING.md                      ← How to extend this system
├── pipeline.md                          ← Orchestration protocol
│
├── tools/
│   └── validator-cli/                   ← Validator CLI v2.0.0
│       ├── index.js                     ← CLI entry point (validate + report commands)
│       ├── package.json                 ← v2.0.0, commander + ajv
│       ├── README.md                    ← CLI usage guide
│       └── lib/
│           ├── engine.js                ← Orchestrates all 9 categories
│           ├── reporter.js              ← Coloured terminal output
│           ├── fix-hints.js             ← 32 actionable fix hints
│           └── rules/
│               ├── cat1-schema.js       ← JSON schema compliance (AJV)
│               ├── cat2-semantic.js     ← Cross-reference checks
│               ├── cat3-security.js     ← Security baseline
│               ├── cat4-completeness.js ← Assumptions, project name
│               ├── cat5-playbook.js     ← Security playbook baseline (Rule 13)
│               ├── cat6-data-class.js   ← PHI / PCI detection (Rule 14)
│               ├── cat7-observability.js← Health endpoints, tracing (Rule 15)
│               ├── cat8-resilience.js   ← Retry, circuit breaker, idempotency (Rule 16)
│               └── cat9-edge-runtime.js ← CF Workers edge checks (Rule 17)
│
├── backend-integrator/
│   ├── agent.md                         ← Agent identity & commands
│   ├── system-prompt.md                 ← Full system prompt (16-step thinking model)
│   ├── rules.md                         ← Mandatory constraints (Rules 1–23)
│   ├── starter-prompts.md               ← Ready-to-use prompts
│   ├── starter-playbooks.md             ← Domain playbook index (25 playbooks)
│   ├── frontend-backend-handoff.schema.json
│   ├── checklists/
│   │   ├── backend-delivery.md
│   │   ├── security-audit.md
│   │   ├── testing-strategy.md
│   │   └── repo-delivery.md
│   ├── playbooks/                       ← 25 domain playbooks
│   │   ├── auth.md                      ← JWT, OAuth, 2FA, email verification
│   │   ├── payments.md                  ← Stripe subscriptions, webhooks
│   │   ├── uploads.md                   ← S3, signed URLs, import flows
│   │   ├── notifications.md             ← Email, SMS, push, in-app alerts
│   │   ├── analytics.md                 ← Charts, KPIs, event tracking
│   │   ├── search.md                    ← Full-text, filters, autocomplete
│   │   ├── multi-tenancy.md             ← Org scoping, TenantGuard, RBAC
│   │   ├── webhooks.md                  ← Consumer + producer, signing, DLQ
│   │   ├── caching.md                   ← 5 strategies, Redis patterns
│   │   ├── audit-log.md                 ← AuditLog entity, scrubbing, retention
│   │   ├── rate-limiting.md             ← Sliding window, per-IP, per-user
│   │   ├── background-jobs.md           ← BullMQ, retry, fan-out, idempotency
│   │   ├── api-versioning.md            ← URL path strategy, deprecation
│   │   ├── feature-flags.md             ← 5 flag types, Redis, plan gating
│   │   ├── realtime.md                  ← SSE, WebSocket, Redis pub/sub
│   │   ├── api-keys.md                  ← Prefix design, hash storage, rotation
│   │   ├── testing.md                   ← Jest/Supertest + Pytest strategies
│   │   ├── gdpr-data-export.md          ← Data export, erasure, consent
│   │   ├── llm-integration.md           ← LLM adapter, chat, RAG, embeddings
│   │   ├── file-processing.md           ← Image, PDF, video, CSV, OCR pipeline
│   │   ├── security.md                  ← Headers, CORS, encryption, anomaly detection
│   │   ├── compliance.md                ← SOC2, HIPAA, data classification, incidents
│   │   ├── observability.md             ← Structured logging, OTel, health checks, metrics
│   │   ├── idempotency.md               ← Idempotency keys, deduplication, at-least-once
│   │   ├── file-storage.md              ← S3/GCS/R2, pre-signed URLs, CDN, lifecycle
│   │   └── resilience.md               ← Circuit breaker, retry+jitter, timeout, bulkhead
│   └── stacks/
│       ├── nestjs.md, fastapi.md, express.md
│       ├── prisma.md, drizzle.md
│       ├── hono.md, bun.md, django.md, supabase.md
│
├── repo-builder-agent/
│   ├── agent.md, system-prompt.md, rules.md
│   ├── repo-handoff.schema.json         ← Handoff schema v2.1.0
│   ├── deployments/
│   │   ├── index.md                     ← Platform decision guide
│   │   ├── railway.md, vercel.md, aws.md
│   │   ├── fly-io.md, render.md
│   │   └── cloudflare-workers.md        ← wrangler.toml, D1, KV, Queue
│   └── stacks/
│       ├── turborepo.md, pnpm-workspace.md
│       └── github-actions.md, gitlab-ci.md
│
├── validator-agent/
│   ├── agent.md, system-prompt.md
│   ├── rules.md                         ← 17 validation rules
│   ├── examples.md                      ← 8 worked examples (all stacks)
│   └── validation-report.schema.json
│
├── qa-agent/
│   ├── agent.md, system-prompt.md, rules.md
│   ├── examples.md                      ← 5 worked examples
│   └── playbooks/
│       ├── coverage-thresholds.md       ← Min thresholds by stack + config templates
│       ├── mutation-testing.md          ← Stryker + mutmut setup + CI integration
│       └── ci-test-matrix.md            ← GitHub Actions templates (5 stacks)
│
└── pipeline-runs/                       ← 6 complete end-to-end examples
    ├── briefboard-saas/                 ← NestJS + Railway (multi-tenant SaaS)
    ├── hipaa-telemed/                   ← Django + Fly.io (HIPAA regulated)
    ├── linkpulse-fastapi/               ← FastAPI + Railway (analytics + idempotency)
    ├── snaplink-hono-workers/           ← Hono + CF Workers + D1 (edge-native)
    ├── pollpulse-bun-render/            ← Bun + Elysia + Render.com
    └── edgeforms-hono-supabase/         ← Hono + CF Workers + Supabase (BaaS)
```

---

## Validation Gate System

| Status | Meaning | Pipeline Action | CLI Exit Code |
|---|---|---|---|
| `pass` | All 9 categories passed | Downstream agent proceeds | `0` |
| `warn` | Non-blocking issues | Proceed with acknowledgment | `1` |
| `fail` | Blocking failures | Pipeline stops; fix-hints generated | `2` |

---

## 25 Playbooks

Domain-specific implementation guides for the Backend Integrator:

| Playbook | Trigger Signal |
|---|---|
| [Authentication](./backend-integrator/playbooks/auth.md) | Login, register, OAuth, 2FA, protected routes |
| [Payments](./backend-integrator/playbooks/payments.md) | Checkout, billing, subscriptions, Stripe |
| [File Uploads](./backend-integrator/playbooks/uploads.md) | File inputs, galleries, import flows |
| [Notifications](./backend-integrator/playbooks/notifications.md) | Email, SMS, push, in-app alerts |
| [Analytics](./backend-integrator/playbooks/analytics.md) | Charts, KPIs, event tracking |
| [Search](./backend-integrator/playbooks/search.md) | Search bar, filters, autocomplete |
| [Multi-Tenancy](./backend-integrator/playbooks/multi-tenancy.md) | Organizations, workspaces, teams |
| [Webhooks](./backend-integrator/playbooks/webhooks.md) | Webhook settings, delivery log |
| [Caching](./backend-integrator/playbooks/caching.md) | Live data, KPI aggregation |
| [Audit Log](./backend-integrator/playbooks/audit-log.md) | Activity feed, admin panel |
| [Rate Limiting](./backend-integrator/playbooks/rate-limiting.md) | Login forms, OTP, public API |
| [Background Jobs](./backend-integrator/playbooks/background-jobs.md) | Progress spinners, bulk ops, exports |
| [API Versioning](./backend-integrator/playbooks/api-versioning.md) | Mobile apps, multiple client types |
| [Feature Flags](./backend-integrator/playbooks/feature-flags.md) | Beta badges, plan gating, A/B tests |
| [Real-Time](./backend-integrator/playbooks/realtime.md) | Live chat, presence, live feeds |
| [API Keys](./backend-integrator/playbooks/api-keys.md) | Developer portal, API key settings |
| [Testing](./backend-integrator/playbooks/testing.md) | Any project with 2+ endpoints, auth, or payments |
| [GDPR & Data Export](./backend-integrator/playbooks/gdpr-data-export.md) | "Download my data", account deletion |
| [LLM Integration](./backend-integrator/playbooks/llm-integration.md) | AI chat, "Generate with AI", semantic search |
| [File Processing](./backend-integrator/playbooks/file-processing.md) | Video upload, PDF viewer, image resize, CSV import |
| [Security](./backend-integrator/playbooks/security.md) | Every project — headers, CORS, encryption |
| [Compliance](./backend-integrator/playbooks/compliance.md) | SOC2, HIPAA, ISO 27001, enterprise |
| [Observability](./backend-integrator/playbooks/observability.md) | Any production deployment |
| [Idempotency](./backend-integrator/playbooks/idempotency.md) | Payment retries, webhook dedup, import jobs |
| [Resilience](./backend-integrator/playbooks/resilience.md) | External API calls, payment integrations, email/LLM |

---

## 6 Pipeline Runs

Complete end-to-end examples across different stacks, deployment targets, and compliance requirements:

| Run | Stack | Deploy | Compliance | Stage 0 | Stage 1 |
|---|---|---|---|---|---|
| [briefboard-saas](./pipeline-runs/briefboard-saas/) | NestJS + Prisma + BullMQ | Railway | None | ✅ PASS | ✅ PASS |
| [hipaa-telemed](./pipeline-runs/hipaa-telemed/) | Django + Celery | Fly.io | HIPAA | ✅ PASS | ⚠️ WARN |
| [linkpulse-fastapi](./pipeline-runs/linkpulse-fastapi/) | FastAPI + ARQ | Railway | None | ✅ PASS | ⚠️ WARN |
| [snaplink-hono-workers](./pipeline-runs/snaplink-hono-workers/) | Hono + D1 + KV | CF Workers | None | ✅ PASS | ✅ PASS |
| [pollpulse-bun-render](./pipeline-runs/pollpulse-bun-render/) | Bun + Elysia | Render.com | None | ✅ PASS | ✅ PASS |
| [edgeforms-hono-supabase](./pipeline-runs/edgeforms-hono-supabase/) | Hono + Supabase | CF Workers | None | ✅ PASS | ✅ PASS |

---

## Core Principles

- **Contract First** — Define API shapes before writing logic.
- **Gate Enforced** — Every handoff file passes a 9-category validator before consumption.
- **Security Mandatory** — Every output includes `.gitleaks.toml`, `SECURITY.md`, and a CI security step.
- **Adapter Pattern** — External services are always isolated behind adapters.
- **Resilience Required** — Payment/email/LLM integrations must declare retry, timeout, and idempotency strategy.
- **Edge-Aware** — CF Workers projects are validated for TCP Redis, Hyperdrive, wrangler.toml, and D1 migration tools.
- **No Hardcoded Secrets** — All credentials use environment variables. Secret scanning is mandatory.
- **Observability** — Logging, health checks, and tracing are defined at planning stage — not bolted on after.

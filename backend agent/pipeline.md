# Agent Pipeline — Backend System

This document defines the official orchestration protocol between the agents in this workspace.

---

## Pipeline Overview

```
[Frontend Agent / Designer]
          │
          ▼  frontend-backend-handoff.json
[Validator Agent]           ← /validate frontend-backend
          │  pass / warn / fail
          ▼
[Backend Integrator Agent]
          │
          ▼  repo-handoff.json
[Validator Agent]           ← /validate repo
          │  pass / warn / fail
          ▼
[Repo Builder Agent]
          │
          ▼  /generate
[QA Agent]                  ← stack-aware test suite
          │
          ▼
[Production Repository + Test Suite]
```

Each agent receives a structured handoff file from the agent before it and produces its own handoff file as output. No agent should rely on prose or informal descriptions between steps.

Before any handoff file is consumed by a downstream agent, the **Validator Agent** must inspect and approve it. A handoff with status `fail` blocks the pipeline. A handoff with status `warn` may proceed with explicit acknowledgment.

---

## Stage 0 — Validator Agent Gate (Frontend-to-Backend)

**Trigger:** `frontend-backend-handoff.json` is produced by the Frontend or Backend Integrator Agent.

**Command to invoke:**
```
/validate frontend-backend  →  Validate frontend-backend-handoff.json
/fix-hints                  →  Get fix suggestions for failures
/report                     →  Show last validation report
```

**Output artifact:**
- `validation-report.json` (validated against `validator-agent/validation-report.schema.json`)

**Pipeline Gate Rules:**
- Status `fail` → Backend Integrator Agent must not proceed.
- Status `warn` → Backend Integrator Agent may proceed with explicit acknowledgment.
- Status `pass` → Backend Integrator Agent proceeds normally.

---

## Stage 1 — Frontend Agent → Backend Integrator

**Trigger:** Frontend flows (pages, forms, tables, auth) are finalized AND Validator Agent has approved.

**Input:**
- Frontend screens, component trees, or a pre-filled `frontend-backend-handoff.json`
- Passing `validation-report.json` from Stage 0

**Command to invoke:**
```
/blueprint  →  Architecture only
/scaffold   →  Skeleton code
/assemble   →  Full implementation
/handoff    →  Generate frontend-backend-handoff.json
/validate   →  Validate produced output (delegates to Validator Agent)
```

**Output artifact:**
- `frontend-backend-handoff.json` (validated against `frontend-backend-handoff.schema.json`)

**Schema location:**
```
backend-integrator/frontend-backend-handoff.schema.json
```

**Responsibilities at this stage:**
- Infer all entities, endpoints, and integrations from the UI
- Define API contracts (method, route, request, response, validation)
- Define auth strategy and RBAC
- Define background jobs and webhooks
- Apply `security.md` (mandatory on every project): headers, CORS, injection prevention, field-level encryption, anomaly detection
- Apply `compliance.md` (if PHI, SOC2, or regulated data detected): data classification, HIPAA safeguards, retention policy
- Apply `observability.md` (mandatory on every production project): structured logging, health endpoints, correlation IDs
- Produce security hardening checklist (Rule 21)
- Produce observability requirements (Rule 23)

---

## Stage 1.5 — Validator Agent Gate (Backend-to-Repo)

**Trigger:** `repo-handoff.json` is produced by the Repo Builder Agent.

**Command to invoke:**
```
/validate repo   →  Validate repo-handoff.json
/fix-hints       →  Get fix suggestions for failures
/report          →  Show last validation report
```

**Output artifact:**
- `validation-report.json`

**Pipeline Gate Rules:**
- Status `fail` → Repo Builder Agent must not proceed.
- Status `warn` → Repo Builder Agent may proceed with explicit acknowledgment.
- Status `pass` → Repo Builder Agent proceeds normally.

---

## Stage 2 — Backend Integrator → Repo Builder

**Trigger:** Backend architecture is finalized AND Validator Agent has approved `frontend-backend-handoff.json`.

**Input:**
- `frontend-backend-handoff.json`
- Stack preferences (framework, database, ORM, infra)
- Passing `validation-report.json` from Stage 1.5

**Command to invoke:**
```
/blueprint  →  Repo tree and plan only
/scaffold   →  Root configs, Docker, CI skeleton
/assemble   →  Full repo structure
/handoff    →  Generate repo-handoff.json
/validate   →  Validate produced output (delegates to Validator Agent)
/audit      →  Validate repo against rules
```

**Output artifact:**
- `repo-handoff.json` (validated against `repo-handoff.schema.json`)

**Schema location:**
```
repo-builder-agent/repo-handoff.schema.json
```

**Responsibilities at this stage:**
- Design monorepo or single-app layout
- Separate apps, packages, and infra cleanly
- Generate Docker, docker-compose, and CI skeleton
- Generate `.env.example` for all services
- Include `SECURITY.md`, `.gitleaks.toml` (Rule 21)
- Include `ARCHITECTURE.md` with Mermaid dependency diagram (Rule 23)
- Include health check endpoints (`/health/live`, `/health/ready`) and wire them to deployment health probe config (Rule 25)
- Include structured logging setup (`src/common/observability/logger.ts`) and correlation ID middleware (Rule 25)
- Consult deployment guide matching `project.deploymentTarget` (Rule 24): Railway, Vercel, AWS, Fly.io, Render, or Cloudflare Workers

---

## Stage 3 — Repo Builder → QA Agent

**Trigger:** Repo Builder has produced the production-ready repository structure.

**Command to invoke:**
```
/plan      →  Test plan (toolchain selection, coverage targets, test categories)
/generate  →  Full test suite (unit + integration + e2e + fixtures + CI config)
/coverage  →  Coverage report and gap analysis
/review    →  Review existing tests for gaps or anti-patterns
```

**Output artifact:**
- Test files, fixtures, `conftest.py` / `setup.ts` / `vitest.config.ts`
- CI test configuration (GitHub Actions test job)
- Coverage targets declared per module

**Toolchain selection (auto-detected from `repo-handoff.json`):**

| Stack | Test Runner | HTTP Client |
|---|---|---|
| NestJS | Jest + `@nestjs/testing` | Supertest |
| FastAPI | pytest + `pytest-asyncio` | HTTPX AsyncClient |
| Django | pytest + `pytest-django` | DRF APIClient |
| Hono / Bun | Vitest + Miniflare | `app.request()` |
| Express | Jest | Supertest |

**Security boundary tests are mandatory** for every project: 401 (unauthenticated), 403 (wrong role), 200 (correct role), 429 (rate limit hit).

---

## Stage 4 — QA Agent → Engineers

**Output:**
- Production-ready repository structure with full test suite
- `README.md`, `SETUP.md`, `ARCHITECTURE.md`
- All services wired and runnable locally with passing tests

---

## Handoff File Locations

| File | Producer | Consumer | Schema |
|---|---|---|---|
| `frontend-backend-handoff.json` | Frontend Agent | Backend Integrator | `backend-integrator/frontend-backend-handoff.schema.json` |
| `repo-handoff.json` | Repo Builder | Engineers / CI | `repo-builder-agent/repo-handoff.schema.json` |
| `validation-report.json` | Validator Agent | All downstream agents | `validator-agent/validation-report.schema.json` |

---

## Validation Rules

Before consuming a handoff file, the receiving agent must:

1. Validate the JSON against the schema.
2. Check for required fields.
3. State any missing fields as assumptions.
4. Never proceed silently with incomplete data.

The Validator Agent enforces 17 mandatory rules (see `validator-agent/rules.md`):

| Rules | Category |
|---|---|
| 1–4 | Schema, reporting, blocking, warnings |
| 5–6 | Semantic cross-references, security baseline |
| 7–12 | Assumptions, fix hints, report format, separation of concerns, idempotency, completeness |
| 13 | Security playbook baseline (PII encryption assumption, CORS, admin anomaly detection) |
| 14 | Data classification (PHI entities require compliance assumption) |
| 15 | Observability baseline (health endpoints, structured logging, distributed tracing) |
| 16 | Resilience baseline (circuit breaker / retry / timeout declared for external integrations) |
| 17 | Edge runtime checks (TCP Redis blocker for CF Workers, D1 migration tool, wrangler.toml) |

---

## Command Compatibility Matrix

| Command | Backend Integrator | Repo Builder | Validator Agent | QA Agent |
|---|---|---|---|---|
| `/blueprint` | ✅ | ✅ | ❌ | ❌ |
| `/scaffold` | ✅ | ✅ | ❌ | ❌ |
| `/assemble` | ✅ | ✅ | ❌ | ❌ |
| `/audit` | ✅ | ✅ | ❌ | ❌ |
| `/handoff` | ✅ | ✅ | ❌ | ❌ |
| `/validate` | ✅ (delegates) | ✅ (delegates) | ✅ (executes) | ❌ |
| `/validate frontend-backend` | ❌ | ❌ | ✅ | ❌ |
| `/validate repo` | ❌ | ❌ | ✅ | ❌ |
| `/validate all` | ❌ | ❌ | ✅ | ❌ |
| `/report` | ❌ | ❌ | ✅ | ❌ |
| `/fix-hints` | ❌ | ❌ | ✅ | ❌ |
| `/plan` | ❌ | ❌ | ❌ | ✅ |
| `/generate` | ❌ | ❌ | ❌ | ✅ |
| `/coverage` | ❌ | ❌ | ❌ | ✅ |
| `/review` | ❌ | ❌ | ❌ | ✅ |

---

## Parallel Execution

Some stages can run in parallel when components are independent:

```
[Backend Integrator: /blueprint]
         │
         ├────────────────────────┐
         ▼                        ▼
[/scaffold: API module]   [/scaffold: Worker module]
         │                        │
         └────────────┬───────────┘
                      ▼
            [Repo Builder: /assemble]
```

This is valid when the API and Worker modules have no shared state that the other must read first.

---

## Error Protocol

If a handoff file is invalid or missing required fields:

- The receiving agent must **stop** and report the missing fields.
- It must **not** infer silently beyond what the schema allows.
- It must produce an **assumption block** listing all defaults it applied.

---

## File Structure

```
backend agent/
├── pipeline.md                          ← This file
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── backend-integrator/
│   ├── agent.md
│   ├── rules.md                         ← Rules 1–23
│   ├── system-prompt.md
│   ├── skill.md
│   ├── examples.md
│   ├── starter-prompts.md
│   ├── starter-playbooks.md
│   ├── frontend-backend-handoff.schema.json
│   ├── checklists/
│   │   ├── backend-delivery.md          ← 10 sections (incl. security, observability, compliance)
│   │   ├── security-audit.md            ← 11 sections (incl. field encryption, compliance)
│   │   ├── testing-strategy.md
│   │   └── repo-delivery.md
│   ├── playbooks/                       ← 25 domain playbooks
│   │   ├── auth.md, payments.md, uploads.md, notifications.md
│   │   ├── analytics.md, search.md, multi-tenancy.md, webhooks.md
│   │   ├── caching.md, audit-log.md, rate-limiting.md, background-jobs.md
│   │   ├── api-versioning.md, feature-flags.md, realtime.md, api-keys.md
│   │   ├── testing.md, gdpr-data-export.md, llm-integration.md, file-processing.md
│   │   ├── security.md, compliance.md, observability.md
│   │   ├── idempotency.md, file-storage.md, resilience.md
│   └── stacks/                          ← 9 framework/tool guides
│       ├── nestjs.md, fastapi.md, express.md, hono.md
│       ├── prisma.md, drizzle.md
│       ├── bun.md, django.md, supabase.md
├── repo-builder-agent/
│   ├── agent.md
│   ├── rules.md                         ← Rules 1–25
│   ├── system-prompt.md
│   ├── skill.md
│   ├── examples.md
│   ├── repo-handoff.schema.json
│   ├── deployments/                     ← 6 platform guides
│   │   ├── index.md, railway.md, vercel.md, aws.md, fly-io.md
│   │   ├── render.md, cloudflare-workers.md
│   └── stacks/
│       ├── turborepo.md, pnpm-workspace.md, github-actions.md, gitlab-ci.md
├── validator-agent/
│   ├── agent.md
│   ├── system-prompt.md
│   ├── rules.md                         ← 17 validation rules
│   ├── skill.md
│   ├── starter-prompts.md
│   ├── examples.md                      ← 8 worked examples
│   └── validation-report.schema.json
├── qa-agent/
│   ├── agent.md
│   ├── system-prompt.md                 ← Stack-aware toolchain detection, 11 rules
│   ├── rules.md                         ← 11 mandatory constraints
│   ├── skill.md
│   ├── starter-prompts.md
│   └── examples.md                      ← 5 worked examples (NestJS, FastAPI, Django, Hono, Bun)
└── pipeline-runs/
    ├── briefboard-saas/                 ← NestJS + Railway + multi-tenant SaaS
    ├── hipaa-telemed/                   ← Django + Fly.io + HIPAA compliance
    ├── linkpulse-fastapi/               ← FastAPI + Railway + idempotency + analytics
    └── snaplink-hono-workers/           ← Hono + CF Workers + D1/KV/Queue (edge-native)
```

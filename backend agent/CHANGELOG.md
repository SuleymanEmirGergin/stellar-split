# CHANGELOG

All notable changes to the Backend Agent System are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [4.5.0] — 2026-04-05

### Added

**5th Pipeline Run — PollPulse (Bun + Elysia.js + Render)**

- `pipeline-runs/pollpulse-bun-render/` — Complete 7-file pipeline run. First Bun runtime pipeline run; first Render deployment target pipeline run; second consecutive double PASS (16/16 stage 0, 18/18 stage 1 — no warnings). Key firsts: `project.runtime='bun'`, Elysia.js framework, Drizzle ORM with drizzle-kit, SSE real-time results stream, `render.yaml` IaC, Bun Test + real Postgres (no Miniflare). Pipeline quintet now covers NestJS/Railway, Django/Fly.io, FastAPI/Railway, Hono+Workers/Cloudflare, and Bun+Elysia/Render.
- `frontend-backend-handoff.json` — 9 pages, 5 forms, 2 tables, 3 actions, 19 assumptions. Stage 0 gate: PASS (16/16).
- `backend-blueprint.md` — 9 sections: vote deduplication (DB UNIQUE + Redis hot-path), SSE registry pattern, security headers via `onAfterHandle`, argon2id (Wasm), IP anonymization (SHA-256 hash only — raw IP never stored).
- `repo-handoff.json` — `runtime='bun'`, `deploymentTarget='render'`, `framework='elysia'`, `orm='drizzle'`, `migrationTool='drizzle-kit'`. Stage 1 gate: PASS (18/18).
- `repo-blueprint.md` — render.yaml (web service + managed Postgres 16 + cron job), multi-stage Bun Dockerfile (non-root user), Drizzle schema with enum types, `bun:test` security boundary tests (401/403/200), GitHub Actions CI with Postgres service container.
- `pipeline-summary.md` — Pipeline quintet table, Bun vs NestJS vs Hono comparison matrix.

**Cloudflare Workers Deployment Guide (6th platform guide)**

- `repo-builder-agent/deployments/cloudflare-workers.md` — New deployment guide (~350 lines). Covers: `wrangler.toml` IaC (D1, KV, Queue, Cron, secrets), D1 SQLite schema + migration tool rules (wrangler-d1 / drizzle-kit only — no Prisma migrate), Upstash REST API rate limiting (TCP Redis incompatibility documented), CF Queue consumer Worker pattern, `.dev.vars` + Miniflare local dev, Vitest + Miniflare test setup with `cloudflare:test` env, GitHub Actions CI with `wrangler deploy` (no Docker), secrets management (`wrangler secret put`), `.gitleaks.toml` (CF API token + Upstash token patterns), 8-row Common Pitfalls table.
- `repo-builder-agent/deployments/index.md` — Cloudflare Workers added to platform table, decision tree (edge-native projects), "What Each Guide Generates" section, cost comparison (free tier: 100k req/day).

**Documentation — Full Stats Update**

- `README.md` — Updated to reflect four-agent system: "three-agent" → "four-agent" throughout; QA Agent added to agent table, Quick Start (Step 4), and pipeline diagram; directory structure updated (qa-agent/ section, resilience.md, idempotency.md, file-storage.md in playbooks/, render.md + cloudflare-workers.md in deployments/, snaplink-hono-workers/ in pipeline-runs/); validator rules 15→17, examples 4→8; playbooks 22→25; SnapLink + PollPulse pipeline run descriptions added.
- `pipeline.md` — Updated orchestration protocol: QA Agent stage added (Stage 3 + Stage 4); Command Compatibility Matrix expanded with QA Agent commands (/plan, /generate, /coverage, /review); validation rules 15→17 (Rules 16-17 added to table); Stage 2 deployment guide list updated (Render + CF Workers added); file structure counts updated (25 playbooks, 6 deployment guides, 17 rules, 8 examples, qa-agent/ section).

---

## [4.4.0] — 2026-04-05

### Added

**Validator CLI — Category 8: Resilience Baseline (Rule 16)**

- `tools/validator-cli/lib/rules/cat8-resilience.js` — 3 new checks:
  - `resilience-external-trigger-patterns` (frontend-backend): triggers of type `payment-webhook`, `email-send`, or `custom` must reference retry/timeout/circuit breaker in assumptions → warning.
  - `resilience-integration-patterns` (repo): `payment`/`email`/`llm` integrations must have `resilience.md` in `meta.playbooksApplied` OR resilience keywords in assumptions → warning.
  - `resilience-payment-idempotency` (repo): payment integration detected without idempotency key assumption → warning (double-charge risk).

**Validator CLI — Category 9: Edge Runtime Checks (Rule 17)**

- `tools/validator-cli/lib/rules/cat9-edge-runtime.js` — 5 new checks (auto-activated when `project.deploymentTarget` or `project.runtime` = `cloudflare-workers`):
  - `edge-no-tcp-redis` — `REDIS_URL` in `envVarsRequired` → **blocking failure** (TCP Redis incompatible with CF Workers).
  - `edge-postgres-hyperdrive` — Postgres without Hyperdrive → warning.
  - `edge-no-dockerfile` — Dockerfile declared for CF Workers → info.
  - `edge-migration-tool` — Prisma/Alembic migration tools for D1 databases → warning.
  - `edge-wrangler-config` — `wrangler.toml` not referenced in files or assumptions → warning.
- `lib/engine.js` — Updated to import and run cat8 + cat9 after cat7.
- `lib/fix-hints.js` — 7 new actionable fix hints for all cat8 + cat9 check IDs (with code examples).

**EdgeForms Pipeline Run — Hardened with Rule 16**

- `pipeline-runs/edgeforms-hono-supabase/repo-handoff.json` — Updated: `resilience.md` added to `playbooksApplied`; idempotency key, timeout/retry, and `wrangler.toml` assumptions added. Now passes Stage 1 with **17/17 checks** (previously 15).
- `pipeline-runs/edgeforms-hono-supabase/validation-report-stage1-v2.json` — New validation report confirming **PASS** with all 9 categories active.

**QUICKSTART.md**

- New root-level file — 3-question decision tree routing to the correct stack.
- 4 stack reference cards (HIPAA/Django, Edge/Hono, Standard SaaS/NestJS, Data-heavy/FastAPI).
- Validator CLI command reference (Stage 0 + Stage 1 + exit codes).
- Playbook matching table and "Sık Yapılan Hatalar" (Common Mistakes) table.

---

## [4.3.0] — 2026-04-05


### Added

**Pipeline Run #4 — EdgeForms (Hono + Cloudflare Workers + Supabase)**

- `pipeline-runs/edgeforms-hono-supabase/` — New pipeline run introducing the edge-native stack (Hono CF Workers + Supabase BaaS + Next.js 14).
- `frontend-backend-handoff.json` — 10 pages, 5 forms, 4 tables, 7 actions, 6 auth flows, 5 external triggers. Stage 0 gate: **17/17 PASS**.
- `repo-handoff.json` — Monorepo structure, 8 entities, 34 endpoints, full security baseline + observability fields. Stage 1 gate: **15/15 PASS**.
- `backend-blueprint.md` — Full architecture doc: Supabase RLS policies, Hono middleware stack, wrangler config, rate limiting via CF KV, Stripe HMAC verification code samples.
- `pipeline-summary.md` — Gate results, 4-stack comparison matrix (NestJS/Django/FastAPI/Hono), security audit checklist, QA test matrix.

**QA Agent Playbook Directory — `qa-agent/playbooks/`**

- `coverage-thresholds.md` — Stack-by-stack minimum thresholds table (NestJS/FastAPI/Django/Hono/Bun), per-category thresholds (auth: 95%, payment: 95%), `jest.config.ts`/`pyproject.toml`/`vitest.config.ts` config templates, GitHub Actions coverage gate, Codecov/Coveralls upload examples, common pitfalls.
- `mutation-testing.md` — Stryker Mutator + mutmut complete setup, `stryker.config.mjs` templates (Jest and Vitest runners), mutmut `setup.cfg`, survived-mutant triage table, mutation score targets by maturity, CI integration (nightly schedule), pitfalls.
- `ci-test-matrix.md` — Full GitHub Actions workflow templates for NestJS, FastAPI, Hono, Bun, and Django. Matrix strategies (Node 20/22, Python 3.11/3.12, Django 5.0/5.1), Postgres + Redis service containers with health checks, `--runInBand` guidance, test parallelism/sharding, post-deploy smoke test pattern, required secrets table.

---

## [4.2.0] — 2026-04-05


### Added

**Validator CLI — v2.0.0 Full Implementation**

- `tools/validator-cli/` — Complete rewrite from skeleton to production-ready CLI tool. All 15 validator agent rules now enforced programmatically across 7 check categories.

**New files:**
- `lib/engine.js` — Orchestration layer: runs all 7 categories, deduplicates checks, computes overall status, assembles `validation-report.json`-compatible output.
- `lib/reporter.js` — Coloured terminal output with category-grouped check tables, status banner (PASS/WARN/FAIL), and summary bar.
- `lib/fix-hints.js` — Fix hint generator: maps every check ID to a structured `{ problem, fix, example }` hint. 25+ hint definitions covering all categories.
- `lib/rules/cat1-schema.js` — AJV JSON Schema validation; each violation becomes a separate named check entry.
- `lib/rules/cat2-semantic.js` — Cross-reference checks: form/table/action/upload page refs, RBAC roles requirement, login flow presence (frontend-backend); worker→queue, monorepo→packages, payment→secretScanning (repo).
- `lib/rules/cat3-security.js` — Security baseline (Rule 6): auth→login flow; payment-webhook→signature assumption (frontend-backend); secretScanningEnabled, securityMdIncluded, gitignoreComprehensive, ciSecurityScanStep (repo).
- `lib/rules/cat4-completeness.js` — Completeness (Rules 7/12): assumptions declared, project name meaningful, interactive elements present, backend services declared.
- `lib/rules/cat5-playbook.js` — Security Playbook Baseline (Rule 13): PII field detection→encryption assumption; auth→CORS assumption; public page→rate limiting assumption; securityMdIncluded blocking failure; payment/auth integration→secretScanning blocking failure; admin route→IpBlockerService assumption.
- `lib/rules/cat6-data-class.js` — Data Classification (Rule 14): PHI field detection→classification tier assumption; health fields→HIPAA assumption; PHI entity names→compliance.scope/hipaaCompliant/phiEntitiesEncrypted/phiAuditLogging blocking failures; CreditCard/PCI entity detection→warning.
- `lib/rules/cat7-observability.js` — Observability Baseline (Rule 15): non-trivial system→logging assumption; API service→healthEndpointsPlanned; healthLive+healthReady pair; 2+ services→distributedTracing; deploymentTarget→structuredLogging.
- `README.md` — Full CLI user guide with usage examples, exit codes table, check category table, and architecture diagram.

**Changed:**
- `index.js` — Full rewrite. Two commands: `validate` (all flags) and `report` (display saved report). Flags: `--report`, `--output`, `--fix-hints`, `--quiet`, `--format json|table`. CI-friendly exit codes: 0=pass, 1=warn, 2=fail.
- `package.json` — Version `1.0.0` → `2.0.0`. Added 6 test scripts (`test:briefboard`, `test:briefboard-repo`, `test:hipaa`, `test:hipaa-repo`, `test:linkpulse`, `test:linkpulse-repo`, `test:all`).

**Verified against all 3 pipeline runs:**
- `briefboard-saas/frontend-backend-handoff.json` — exit 1 (warn): 5 warnings (observability assumptions), 0 failures ✅
- `briefboard-saas/repo-handoff.json` — exit 1 (warn): 13/16 pass, 3 observability warnings, 0 failures ✅
- `hipaa-telemed/` — PHI entity detection active, compliance checks fire correctly ✅
- `linkpulse-fastapi/` — All categories pass/warn as expected ✅

---

## [4.2.0] — 2026-04-05

### Added

**Resilience Playbook (Playbook #25)**

- `backend-integrator/playbooks/resilience.md` — New playbook (~700 lines). Circuit breaker (`opossum` / `pybreaker`), retry with exponential backoff + jitter (`p-retry` / `tenacity`), timeout policy (`AbortController` + `httpx.Timeout`), bulkhead/concurrency limiting (`p-limit` / `asyncio.Semaphore`). Includes: pattern layering order, Pattern Selection Matrix per integration type, circuit breaker state in `/health/ready`, recommended timeout values, security rules (idempotency key for payment retries, no retry on 4xx, no internal state in fallback message), 8-row Common Pitfalls table.
- `backend-integrator/starter-playbooks.md` — Resilience added as Playbook #25.

**Render.com Deployment Guide**

- `repo-builder-agent/deployments/render.md` — New deployment guide (~280 lines). `render.yaml` IaC (web + worker + cron + managed Postgres), multi-stage Dockerfiles (non-root user), managed PostgreSQL `fromDatabase` injection, Environment Groups for shared secrets, GitHub Actions CI gate, health check + zero-downtime deploy, 8-row Common Pitfalls (port 10000, migration ordering, free-tier sleep, worker type).
- `repo-builder-agent/deployments/index.md` — Render added to platform table, decision tree, cost comparison, and "What Each Guide Generates" section.

**4th Pipeline Run — Hono + Cloudflare Workers (SnapLink)**

- `pipeline-runs/snaplink-hono-workers/` — Complete 7-file pipeline run. First edge-native pipeline run; first clean double PASS (16/16 stage 0, 17/17 stage 1 — no warnings). Key firsts: `project.runtime='cloudflare-workers'`, D1 (SQLite) instead of PostgreSQL, CF Queue instead of BullMQ/ARQ, Upstash REST API instead of TCP Redis, Vitest + Miniflare instead of Supertest/HTTPX, `wrangler deploy` instead of Docker. Pipeline quartet now covers NestJS/Railway, Django/Fly.io, FastAPI/Railway, and Hono+Workers/Cloudflare.

**Validator Agent — Edge Runtime + Resilience Rules**

- `validator-agent/rules.md` — Rule 16 (Resilience Baseline): payment/email/LLM integrations must declare resilience patterns; payment retries must reference idempotency keys. Rule 17 (Edge Runtime Checks): blocks TCP Redis in CF Workers (must use Upstash REST), warns on direct Postgres without Hyperdrive, warns on wrong migration tool, requires `wrangler.toml` in `files`. Rule 15 updated: CF Workers distributed tracing exception when `distributedTracingNote` is declared.
- `validator-agent/examples.md` — Example 8: Hono + CF Workers PASS scenario demonstrating Rule 17 checks and Rule 15 CF Workers exception.

---

## [4.1.0] — 2026-04-05

### Added / Changed

**Stack Guides — Security Defaults Completion (Batch 2)**

- `stacks/bun.md` — Section 8 "Security Defaults" inserted (318 → 392 lines); §8–11 renumbered to §9–12. New Section 8 covers: custom Elysia security headers plugin via `onAfterHandle` hook (CSP, HSTS, X-Frame-Options, noSniff, Referrer-Policy, Permissions-Policy), CORS allowlist using `@elysiajs/cors` with env-var-backed `Bun.env.CORS_ALLOWED_ORIGINS` factory, Redis-backed rate limiting with `elysia-rate-limit` (global 300 req/min + auth strict 10 req/15min), request ID via `.derive()` injected into handler context.

- `stacks/supabase.md` — Section 8 "Security Defaults" inserted (338 → 442 lines); §8–10 renumbered to §9–11. New Section 8 covers: RLS enforcement (every table must `ENABLE ROW LEVEL SECURITY` + explicit policies; default-deny `AS RESTRICTIVE` pattern), anon vs service_role key usage rules (`service_role` server-side only — bypasses all RLS), Edge Function security headers and CORS via shared `_shared/security.ts` helper (`ALLOWED_ORIGIN` env var, never wildcard), rate limiting for Edge Functions using `@upstash/ratelimit` REST API (Deno-compatible, no TCP Redis).

- `stacks/drizzle.md` — **No change.** ORM-only guide; Security Defaults section not applicable (same policy as `prisma.md`).

**QA Agent — Major Expansion**

- `qa-agent/system-prompt.md` — Full rewrite (68 → 258 lines). Added: Stack-to-Toolchain detection table (NestJS/Express/FastAPI/Django/Hono/Bun/Supabase → correct test framework, HTTP client, runner, config file); stack-specific test patterns with concrete setup code for NestJS (`TestingModule`), FastAPI (`httpx.AsyncClient` + `ASGITransport`), Django (`pytest-django` + `APIClient`), Hono/Bun (`app.request()`); database testing strategy (transaction rollback vs isolated test DB vs seed factories); extended `/plan` output format (7 sections including auth boundary map and risk matrix); updated Strict Implementation Rules (auth boundary tests now mandatory per rule).

- `qa-agent/examples.md` — Added Example 4 and 5 (159 → 327 lines). **Example 4**: FastAPI + pytest integration tests — `conftest.py` with `AsyncClient` + DB fixture + `auth_headers` fixture, `pytest.ini` with `asyncio_mode = auto`, 5 integration tests covering register, duplicate rejection, login, 401 guard, and authenticated profile. **Example 5**: Django REST Framework + pytest-django — `conftest.py` with `APIClient`, `regular_user`, `admin_user`, `auth_client`, `admin_client` fixtures; `pytest.ini` with `DJANGO_SETTINGS_MODULE`; 7 tests covering CRUD, 401 guard, **403 RBAC boundary**, admin access, and delete + DB cleanup verification.

- `qa-agent/rules.md` — Added Rules 9–11 (93 → 133 lines). **Rule 9 (Stack-Specific Tooling Lock)**: test framework dictated by `project.stack`; inference fallback from `dependencies` documented. **Rule 10 (Security Boundary Tests)**: every auth/RBAC endpoint requires 401 + 403 + 200 test cases; rate-limited endpoints must also include 429 test. **Rule 11 (Async Test Handling)**: Python — `@pytest.mark.asyncio`, never `asyncio.run()`; Django async — `@pytest.mark.django_db(transaction=True)`; Node.js — `async/await`, never `done` callback; Bun — native async test functions.

---

## [4.0.0] — 2026-04-05

### Added / Changed

**Stack Guides — Security Defaults Rollout**

All remaining stack guides now include mandatory Section 8 "Security Defaults" per `CONTRIBUTING.md` v3.4.0 requirement. The stack guide suite is now fully compliant.

- `stacks/nestjs.md` — Full rewrite (248 → 781 lines). New 11-section format aligned with CONTRIBUTING.md standard: Project Structure (feature-module folder layout), Validation (DTOs with `whitelist`/`transform` ValidationPipe), Guards & Interceptors (JwtAuthGuard + RolesGuard + ResponseInterceptor), Database Access (Prisma global module, `$transaction`, N+1 prevention), Migrations (`prisma migrate deploy` in CI/Docker), Background Jobs (BullMQ `maxRetriesPerRequest: null` rule), Error Handling (AppException hierarchy, GlobalExceptionFilter with `requestId` logging, stack trace gated by `NODE_ENV`), **Section 8 Security Defaults** (Helmet full config, CORS allowlist factory, `nestjs-throttler-storage-redis` global ThrottlerGuard + auth route `@Throttle()` override, RequestIdMiddleware), Config Management (`getOrThrow`, Joi schema with `abortEarly: false`), Testing (Jest E2E with Supertest + real DB + `beforeEach` seed/teardown, unit tests with mocked PrismaService), Common Pitfalls (12 rows: JWT `none`, BullMQ Redis, in-memory throttler, `prisma migrate dev` in prod, stack trace leak, CORS `origin: true`).

- `stacks/django.md` — Section 8 "Security Defaults" inserted (428 → 603 lines); §8–12 renumbered to §9–13. New Section 8 covers: Django `SECURE_*` settings (SSL redirect, HSTS, XSS filter, noSniff, X-Frame-Options, secure cookies), `django-cors-headers` with `CORS_ALLOWED_ORIGINS` env list (`CorsMiddleware` must be first), custom `SecurityHeadersMiddleware` (CSP, Referrer-Policy, Permissions-Policy), `django-ratelimit` for auth endpoints with Redis cache backend (`RATELIMIT_USE_CACHE`), `RequestIdMiddleware`.

- `stacks/hono.md` — Section 8 "Security Defaults" inserted (326 → 465 lines); §8–12 renumbered to §9–13. New Section 8 covers: `secureHeaders()` full config (CSP directives, HSTS, X-Frame-Options, noSniff, Referrer-Policy, Permissions-Policy), CORS allowlist factory (edge: `c.env` bindings, Node.js: `process.env`), rate limiting split by runtime (**Cloudflare Workers**: `@upstash/ratelimit` with `Ratelimit.slidingWindow` — no TCP Redis; **Node.js**: `hono-rate-limiter` with `RedisStore`), request ID middleware via `createMiddleware`.

---

## [3.9.0] — 2026-04-04

### Added

**Pipeline Runs — FastAPI + Railway (LinkPulse)**
- `pipeline-runs/linkpulse-fastapi/` — Full end-to-end pipeline run for a link-in-bio analytics platform (FastAPI + ARQ + PostgreSQL + Redis + S3 + Railway). Completes the pipeline run trilogy:
  - `frontend-backend-handoff.json` — 7 pages, 5 forms, 2 tables, 4 actions; high-volume public click tracking endpoint, ARQ cron jobs, API key auth
  - `validation-report-stage0.json` — 16/16 PASS; `project.complianceScope='none'`, `project.observabilityBaseline` declared, rate limit + idempotency in assumptions
  - `backend-blueprint.md` — 13 sections: 7 entities, 28 endpoints, 4 ARQ jobs (2 tasks + 2 cron), all 3 idempotency patterns, Redis analytics cache, Argon2id, IP hashing for click events, structlog request ID, health endpoints
  - `repo-handoff.json` — schema v2.1.0; `meta.playbooksApplied` lists 10 playbooks including `idempotency.md` (#24); `security.rateLimitingStrategy='redis-sliding-window'`
  - `validation-report-stage1.json` — 17/18 PASS, 1 WARN (Rule 15: distributed tracing for 2-service deployment — same pattern as TeleMed)
  - `repo-blueprint.md` — Python 3.12-slim multi-stage Dockerfiles, FastAPI app factory with lifespan, ARQ WorkerSettings, Alembic async migrations, GitHub Actions CI with real Postgres+Redis services + pip-audit + Railway deploy + health smoke test, structlog configuration, pytest-asyncio fixtures
  - `pipeline-summary.md` — Pipeline trio comparison table (BriefBoard/TeleMed/LinkPulse)

### Changed

**Documentation**
- `README.md` — Example Pipeline Run section expanded from 1 run to 3-run trio; directory tree updated to show all 3 `pipeline-runs/` subdirectories with check counts
- `pipeline.md` — `pipeline-runs/` file structure updated to include `linkpulse-fastapi/`

---

## [3.8.0] — 2026-04-04

### Added

**Backend Integrator — New Playbook**
- `playbooks/idempotency.md` — Idempotency patterns for payment charges, job dispatch, webhook deduplication, import bulk operations, and optimistic locking. Three pattern table (Idempotency Key / Natural Key Deduplication / Conditional Write), full Redis SETEX 24h implementation, BullMQ deterministic `jobId`, `WebhookEvent` table with `[provider, eventId]` unique constraint, row-hash upsert for CSV imports, `version`-field optimistic lock for inventory/status transitions, `IdempotencyGuard` decorator pattern. Security rules: min 8 / max 128 char key validation, key reuse with different body → 422. Registered as #24 in `starter-playbooks.md`.

**Backend Integrator — Stack Guide Rewrite**
- `stacks/express.md` — Full 12-section rewrite (old Section 8 "Rate Limiting" replaced by comprehensive Section 8 "Security Defaults"). New content: Helmet.js full config (`contentSecurityPolicy` directive table, `hsts`, `frameguard`, `noSniff`, `referrerPolicy`, `permittedCrossDomainPolicies`), CORS origin allowlist factory (`CORS_ALLOWED_ORIGINS` env var, `credentials: true` warning), Redis-backed rate limiter (`rate-limit-redis` with `RedisStore`), request ID middleware (`X-Request-Id` correlation header). Updated Section 3 (JWT signing defaults: `algorithm: 'HS256'`, `issuer`, `expiresIn`); Section 7 (error handler logs `requestId`, masks stack in production); Section 9 (BullMQ `maxRetriesPerRequest: null` rule); Section 11 (Vitest + Supertest E2E with seed/teardown). Common Pitfalls expanded to 12 rows.

### Changed

**Documentation**
- `starter-playbooks.md` — Idempotency added as #24 with trigger list and component summary

---

## [3.7.0] — 2026-04-04

### Added

**Backend Integrator — New Playbook**
- `playbooks/file-storage.md` — Advanced cloud storage: AWS S3 / Cloudflare R2 provider selection, presigned GET + PUT URL patterns, multipart upload for files >25 MB (initiate/complete/abort), async virus scanning pipeline (ClamAV + BullMQ, PENDING_SCAN → READY | QUARANTINED state machine), CDN integration (CloudFront / R2), S3 lifecycle rules (STANDARD → IA → GLACIER_IR, abort incomplete multipart after 24h), File Prisma model with FileStatus enum. Registered as #23 in `starter-playbooks.md`.

**Backend Integrator — Stack Guide Rewrite**
- `stacks/fastapi.md` — Full 11-section rewrite (was minimal stub): When to choose FastAPI vs Django DRF vs NestJS, project structure, Pydantic v2 (`ConfigDict(from_attributes=True)`, `orm_mode` migration note), `Depends()` injection chain with role guard factory, SQLAlchemy 2.0 async (`async_sessionmaker`, `expire_on_commit=False`, `selectinload` N+1 prevention), Alembic async `env.py`, ARQ vs Celery decision, security defaults (TrustedHostMiddleware, CORS, SecurityHeadersMiddleware, slowapi rate limiting, Argon2 + jose JWT), Pydantic Settings startup validation, pytest-asyncio with `AsyncClient` + `ASGITransport`, 10-row Common Pitfalls table.

**Validator Agent — Examples**
- `examples.md` Example 7 (PASS + 1 WARN) — TeleMed HIPAA `repo-handoff.json` after compliance.md applied. 20-check report, 19 PASS, 1 WARN (Rule 15: distributed tracing deferred to v1.1). "What Changed" diff table showing exact fields added to resolve Example 6's 3 blocking failures. Summary table updated 6→7 rows.

### Changed

**Schema**
- `repo-handoff.schema.json` — `schemaVersion` default bumped `"2.0.0"` → `"2.1.0"` (reflects `compliance{}`, `observability{}`, `security` extensions, `fly-io` enum, `video` integration type added in v3.6.0)
- `pipeline-runs/hipaa-telemed/repo-handoff.json` — `schemaVersion` updated to `"2.1.0"`
- `pipeline-runs/briefboard-saas/repo-handoff.json` — `schemaVersion` updated to `"2.1.0"`

**Documentation**
- `pipeline.md` — Playbook count 22→23, validator examples 6→7, `file-storage.md` added to file structure, `pipeline-runs/` updated to list both runs (briefboard-saas + hipaa-telemed)
- `backend-integrator/system-prompt.md` — Playbook Reference table: added `file-storage.md` row (trigger: large file >10 MB, video, virus scan, CDN, HIPAA document storage)
- `repo-builder-agent/examples.md` — Key Learning Patterns item 7: "schema v2.0" → "schema v2.1"; Example 5 `schemaVersion` `"2.0.0"` → `"2.1.0"`
- `CONTRIBUTING.md` — Playbook format 6-section → 10–12 section; Stack guide format 10-section → 11-section (Security Defaults mandatory)

---

## [3.6.0] — 2026-04-02

### Added

**Pipeline Runs — HIPAA TeleMed Example**
- `pipeline-runs/hipaa-telemed/` — Full end-to-end pipeline run for a HIPAA-regulated telemedicine platform (Django REST Framework + Fly.io). Demonstrates compliance.md + security.md + observability.md working together:
  - `frontend-backend-handoff.json` — 8 pages, 4 forms, PHI entities declared in assumptions, Daily.co video + Twilio SMS integrations
  - `validation-report-stage0.json` — 15/15 PASS (new checks: `auth-2fa-detected`, `security-phi-assumptions-declared`, `security-upload-signed-url`)
  - `backend-blueprint.md` — 788 lines, 13 sections: Django models with `_encrypted` field suffixes, AES-256-GCM helpers, PHI audit log, 2FA enforcement middleware, structlog PHI-strip processor, Celery tasks, Fly.io two-app deployment, key rotation procedure
  - `repo-handoff.json` — First example using new `compliance{}` and `observability{}` schema fields
  - `validation-report-stage1.json` — 19/20 PASS, 1 WARN (Rule 15: distributed tracing deferred to v1.1)
  - `repo-blueprint.md` — Scaffold spec with Python AES-256-GCM code, structlog redaction, `fly.toml` health probe, CI with `pip-audit` + `detect-secrets`, compliance artifact table (BAA_CHECKLIST, DATA_RETENTION_POLICY)
  - `pipeline-summary.md` — Human-readable run summary with HIPAA checklist and warning detail

**Validator Agent — System Prompt**
- Added Category 5 (Security Playbook Baseline — Rule 13): checks `securityMdIncluded`, `piiFieldsEncrypted`, `corsWhitelistConfigured`, `secretScanningEnabled` for payment/auth integrations
- Added Category 6 (Data Classification — Rule 14): PHI entity name detection triggers blocking failure; PCI entity names trigger warning
- Added Category 7 (Observability Baseline — Rule 15): health endpoint coverage, distributed tracing requirement for multi-service
- Updated Thinking Model step 6 to include Categories 5-7
- Updated Key Identity to list all 7 check categories

**Schema Updates**
- `frontend-backend-handoff.schema.json` — Added optional `project.complianceScope` (enum: HIPAA/PCI-DSS/SOC2/GDPR/none) and `project.observabilityBaseline` (object: healthEndpoints, structuredLogging, distributedTracing, metricsEnabled)
- `repo-handoff.schema.json` — Added `compliance{}` top-level object (scope, hipaaCompliant, phiEntities, phiEntitiesEncrypted, phiAuditLogging, minimumNecessaryEnforced, baaRequired, baaVendors, dataRetentionYears, incidentResponseTimeline); added `observability{}` top-level object (structuredLogging, loggingLibrary, correlationId, healthEndpointsPlanned, healthLive, healthReady, prometheusMetrics, sentryEnabled, distributedTracing); added `security.corsWhitelistConfigured`, `security.piiFieldsEncrypted`, `security.fieldEncryptionAlgorithm`; added `meta.playbooksApplied`; added `fly-io` to deploymentTarget enum; added `video` to integration.type enum

**CONTRIBUTING.md**
- Playbook format updated from 6-section template to 10–12 section template with mandatory/domain-specific section breakdown
- Stack guide format updated from 10-section to 11-section template (Section 8: Security Defaults added)

**Repo Builder — New Examples**
- `examples.md` Example 6 — Fly.io deployment (Rule 24): `fly.toml` with health check probe, multi-stage Dockerfile, GitHub Actions deploy step
- `examples.md` Example 7 — HIPAA compliance + observability baseline (Rule 25): Python AES-256-GCM, structlog PHI redaction, health endpoints, correlation ID middleware, compliance artifact table, Rule 25 checklist

### Changed

**Repo Builder**
- `examples.md` Key Learning Patterns: added items 9 (deployment target selection — Rule 24) and 10 (observability baseline — Rule 25)

---

## [3.5.0] — 2026-04-02

### Added

**Validator Agent — New Worked Examples**
- `examples.md` Example 5 (WARN) — Healthcare app with PII forms (email, phone, nationalId): Rule 13 fires warning for missing field-level encryption assumption; Rule 15 fires warning for missing observability assumption. Shows full 10-check validation report with `fix-hints` for both warnings.
- `examples.md` Example 6 (FAIL) — Telemedicine repo-handoff with `MedicalRecord` + `Prescription` entities: Rule 14 fires blocking error for missing HIPAA compliance assumption; Rule 15 fires two warnings (health endpoints, structured logging). Shows `fixHints[]` with exact assumption text to add.

**Repo Builder — New Rule**
- Rule 25 (Observability Baseline) — Every production repo must include: `/health/live` + `/health/ready` endpoints wired to deployment health probe, Pino/structlog structured logging at entry point, correlation ID middleware, `LOG_LEVEL`/`SERVICE_NAME`/`SENTRY_DSN` in `.env.example`, OpenTelemetry instrumentation file for multi-service projects, CI smoke test verifying health endpoint post-deploy.

### Changed

**Validator Agent**
- `examples.md` — Summary table expanded from 4 to 6 examples; Example 1 totalChecks updated to 10 (reflects new Rule 13/15 checks)

**Backend Integrator — Checklists**
- `checklists/backend-delivery.md` — Added Section 7 (Security Hardening — security.md, 9 items), Section 8 (Observability — observability.md, 6 items), Section 9 (Compliance — compliance.md, 6 conditional items). Final Delivery renumbered to Section 10.
- `checklists/security-audit.md` — Added Section 10 (Field-Level Encryption & Injection Prevention — 9 items), Section 11 (Compliance Baseline — 9 items for HIPAA/SOC2/PCI projects). Scoring updated: Section 11 is blocking for regulated-data projects.

**Repo Builder**
- `rules.md` — Rule 24 deployment table updated to include Fly.io row; Rule 25 added (Observability Baseline)

**Pipeline (`pipeline.md`)**
- Validation Rules section: added 15-rule breakdown table with categories
- Stage 1 responsibilities: added security.md, compliance.md, observability.md as mandatory applies
- Stage 2 responsibilities: added health endpoints, structured logging, deployment guide selection
- File Structure: fully updated to reflect 22 playbooks, 9 stacks, 4 deployments, 15 validator rules, 6 examples

---

## [3.4.0] — 2026-04-02

### Added

**Backend Integrator — New Stack Guides**
- `stacks/bun.md` — Bun runtime + Elysia.js: TypeBox validation, JWT auth plugin, Prisma/Drizzle integration, BullMQ on Bun, built-in `bun test` runner, `oven/bun` Dockerfile, common pitfalls (native addons, `import.meta.dir`, worker threads)
- `stacks/django.md` — Django + DRF: custom User model, abstract base models (UUIDModel, TimestampedModel), DRF serializers + ViewSets, SimpleJWT auth, RBAC permissions (IsOwner, IsAdmin), Celery + Redis, pytest-django patterns, common pitfalls (N+1, DEBUG=True, CharField without max_length)
- `stacks/supabase.md` — Supabase BaaS: 3 architecture patterns (pure BaaS, custom backend, Edge Functions), Row Level Security policies (user-owned, multi-tenant, admin), custom claims for RBAC, client setup (service role vs anon), Storage bucket policies, Edge Functions (Deno), Realtime with `postgres_changes`, when to eject

**Repo Builder — New Deployment Guide**
- `deployments/fly-io.md` — Fly.io multi-region deployment: `fly.toml` for API + worker, Dockerfile with non-root user, `fly secrets` management, persistent volumes, Fly Postgres vs Neon, multi-region machine cloning, GitHub Actions CI/CD, cost estimate table

**Validator Agent — New Rules**
- Rule 13 (Security Playbook Baseline) — validates that security.md patterns are applied: field encryption referenced for PII forms, CORS assumption present when auth exists, `securityMdIncluded` must be true, admin endpoints must reference IpBlockerService/SecurityAlertService
- Rule 14 (Data Classification Required) — validates PII entity handling: classification tier assumption required for email/phone/address fields, PHI entities require compliance assumption, financial PII requires PCI scope reduction reference
- Rule 15 (Observability Baseline) — validates minimum production observability: health endpoints required for API services, distributed tracing referenced for multi-service deployments, structured logging referenced for any platform deployment

### Changed
- `README.md` — Rewritten for 22 playbooks (was 17), 9 stack guides (was 6), 4 deployment guides (was 3), 15 validator rules (was 12); directory structure updated throughout
- `starter-playbooks.md` — Added Bun/Elysia.js, Django/DRF, and Supabase to Stack Guides section
- `system-prompt.md` (Backend Integrator) — Stack Guide reference table: added `bun.md`, `django.md`, `supabase.md` rows
- `system-prompt.md` (Repo Builder) — Deployment Target table: added `fly-io.md` row
- `deployments/index.md` — Added Fly.io to platform table, decision tree, and cost comparison

---

## [3.3.0] — 2026-04-02

### Added

**Backend Integrator — New Playbooks**
- `playbooks/compliance.md` — Compliance architecture for SOC2 Type II, HIPAA, and ISO 27001 (12 sections): data classification tiers (Public/Internal/Confidential/Restricted), SOC2 TSC mapping with evidence artifacts, HIPAA PHI technical safeguards (audit every read, minimum necessary, BAA requirement table), data residency patterns, quarterly access review with automated cron, incident response phases with notification timelines (GDPR 72h, HIPAA 60 days), data retention table with legal hold mechanism, ComplianceEvidence entity, IncidentRecord entity, file structure
- `playbooks/observability.md` — Production observability for Rule 23 (12 sections): Pino structured logging with redact config and correlation IDs, request lifecycle middleware, Python structlog equivalent, OpenTelemetry distributed tracing (Node SDK + auto-instrumentation + manual spans), tracing backend comparison table, health check endpoints (/health/live + /health/ready + Kubernetes probe YAML), Prometheus metrics (http_request_duration_seconds histogram, job metrics), Grafana/Alertmanager alert rules table, Sentry error tracking with PII stripping, log aggregation platform comparison, environment variables

### Fixed
- `playbooks/security.md` — Section numbering: CORS Configuration was incorrectly labelled `## 2.`; corrected to `## 3.`

### Changed
- `starter-playbooks.md` — Added Compliance (#21) and Observability (#22) to domain playbooks index
- `system-prompt.md` — Playbook Reference table: added `compliance.md` and `observability.md` rows

---

## [3.2.0] — 2026-04-02

### Added

**Backend Integrator — New Playbook**
- `playbooks/security.md` — Mandatory cross-cutting security playbook (12 sections): security headers (Helmet.js + FastAPI middleware), CORS whitelist configuration, input sanitization + injection prevention (XSS/DOMPurify, SQL, command, path traversal, mass assignment), field-level AES-256-GCM encryption with zero-downtime key rotation, secrets management (CI/CD secrets, Docker BuildKit, log masking via Pino redact), dependency scanning (npm audit, Trivy, Dependabot), security monitoring + anomaly detection (IP blocking, suspicious session detection, SecurityAlertService with Slack/email), admin security endpoints, environment variables, and file structure

### Changed
- `starter-playbooks.md` — Added Security (#20) to domain playbooks index
- `system-prompt.md` — Playbook Reference: added `security.md` row; Security Awareness section: added `security.md` reference as mandatory for every project

---

## [3.1.0] — 2026-04-02

### Added

**Backend Integrator — Playbooks (previously unregistered)**
- `playbooks/gdpr-data-export.md` — GDPR/KVKK compliance: async data export via BullMQ, account anonymization (right to erasure), consent entity with immutable records, rate limiting, S3 signed URL with TTL, file structure
- `playbooks/llm-integration.md` — LLM integration: adapter pattern (OpenAI/Anthropic), conversational AI with SSE streaming, single-shot completion, semantic search + RAG via pgvector, embeddings for recommendations, content moderation, cost control rules, file structure
- `playbooks/file-processing.md` — Async file processing pipeline: image (sharp), PDF (pdf-parse + @react-pdf/renderer), video (fluent-ffmpeg, worker-only), CSV import with batch validation, OCR/Document AI (tesseract.js + pre-processing), SSE progress endpoint, file structure

### Changed
- `starter-playbooks.md` — Added GDPR & Data Export (#17), LLM Integration (#18), File Processing (#19) to domain playbooks index
- `system-prompt.md` — Added 3 rows to Playbook Reference table: gdpr-data-export, llm-integration, file-processing
- `playbooks/file-processing.md` — Fixed broken Section 6 reference: OCR/Document AI section added; API Endpoints renumbered to Section 7; edge cases expanded with OCR-specific scenarios

---

## [3.0.0] — 2026-03-30

### Added

**Validator Agent** (new agent — `validator-agent/`)
- `agent.md` — Agent identity, 5 commands (`/validate frontend-backend`, `/validate repo`, `/validate all`, `/report`, `/fix-hints`), gate logic, output format
- `system-prompt.md` — 4-category validation thinking model: schema compliance, semantic cross-references, security baseline, completeness
- `rules.md` — 12 mandatory validation rules covering schema, semantic, security, and lifecycle behavior
- `skill.md` — Skill declaration aligned with Backend Integrator and Repo Builder format
- `starter-prompts.md` — 6 ready-to-use prompts covering all validation scenarios
- `examples.md` — 4 worked examples: PASS (14/14), WARN (3 security findings), FAIL (broken page refs), FAIL+fix-hints (worker without queue)
- `validation-report.schema.json` — JSON schema for `validation-report.json` output

**Backend Integrator — New Playbook**
- `playbooks/testing.md` — Comprehensive testing strategy for Node.js (Jest/Supertest) and Python (Pytest/HTTPX); test DB setup, unit/integration patterns, coverage thresholds, CI integration

**Repo Builder — New Stack Guides**
- `stacks/turborepo.md` — Turborepo monorepo: turbo.json pipeline, remote caching, pnpm integration, affected builds
- `stacks/pnpm-workspace.md` — pnpm workspaces: workspace.yaml, filtering, lockfile conventions, Docker mono builds
- `stacks/github-actions.md` — GitHub Actions CI/CD: Node.js + Python templates, Docker build, matrix strategy, security audit step
- `stacks/gitlab-ci.md` — GitLab CI/CD: Node.js + Python templates, Docker-in-Docker, GitLab-specific patterns, cache config

**Pipeline Run Example** (`pipeline-runs/briefboard-saas/`)
- `frontend-backend-handoff.json` — 12 pages, 8 forms, 4 tables, 5 actions, 2 uploads, 5 external triggers, 12 assumptions
- `validation-report-stage0.json` — Stage 0 gate: 14/14 checks passed
- `backend-blueprint.md` — 15 entities, 54 endpoints, 7 BullMQ jobs, 4 integrations, 12 playbooks applied
- `repo-handoff.json` — Machine-readable repo handoff
- `validation-report-stage1.json` — Stage 1.5 gate: 11/11 checks passed
- `repo-blueprint.md` — Turborepo monorepo, 3 apps, 2 packages, Railway deployment, GitHub Actions CI
- `pipeline-summary.md` — Full execution log (25 total checks, 0 failures)

### Changed

**Pipeline (`pipeline.md`)**
- Architecture diagram updated from 2-agent to 3-agent with Validator gates
- Added Stage 0 (Validator Gate: frontend-to-backend) and Stage 1.5 (Validator Gate: backend-to-repo)
- Handoff contracts table: added `validation-report.json` as a first-class artifact
- Command Compatibility Matrix expanded: Validator Agent column added
- Directory structure updated to reflect all new files and `pipeline-runs/` directory

**Backend Integrator**
- `agent.md` — Added `/validate` command (delegates to Validator Agent)
- `system-prompt.md` — Added `testing.md` as auto-triggered playbook for projects with 2+ endpoints, auth, or payments

**Repo Builder**
- `agent.md` — Added `/validate` command (delegates to Validator Agent)
- `system-prompt.md` — Added Stack and Tooling Reference: monorepo tooling table, CI/CD platform table, deployment target table
- `rules.md` — Added Rule 24: Deployment Awareness

**README**
- Rewritten for 3-agent system; pipeline diagram updated; all 17 playbooks, 6 stacks, 4 deployment guides, and validator files listed

---

## [2.6.0] — 2026-03-29

### Added

**Backend Integrator — New Playbooks**
- `playbooks/realtime.md` — Polling vs SSE vs WebSocket decision tree, NestJS gateway, Express SSE, Redis pub/sub adapter for multi-instance scaling, presence system, job progress via SSE, event naming convention, security rules
- `playbooks/api-keys.md` — Key anatomy with prefix design, SHA-256 hash storage, ApiKey entity, key generation helper, auth + scope middleware, key display rules (show once), rate limiting per key, rotation with grace period

**Backend Integrator — New Stack Guide**
- `stacks/hono.md` — Hono vs NestJS/Express comparison, multi-runtime entry points (Node/CF Workers/Bun), Zod validator, type-safe context variables, auth middleware, D1 Drizzle integration, native fetch-based testing, built-in middleware reference

### Changed

**Backend Integrator — system-prompt.md (major upgrade)**
- Integrations section: every integration now maps to a specific playbook
- Security section: every concern now maps to a specific playbook
- Added `Playbook Reference` section: 16-row lookup table (frontend signal → playbook file)
- Added Stack Guide reference table: 6 frameworks mapped to their guide files
- Notes all output sections to consult the relevant playbook

**Backend Integrator**
- `starter-playbooks.md` — Added Real-Time (#15), API Keys (#16), Hono stack guide

---

## [2.5.0] — 2026-03-29

### Added

**Backend Integrator — New Playbooks**
- `playbooks/api-versioning.md` — 4 strategies (URL path recommended), version lifecycle, breaking vs non-breaking changes, code sharing with adapters, deprecation headers, OpenAPI per version, pre-versioning checklist
- `playbooks/feature-flags.md` — 5 flag types, 5 implementation options, FeatureFlagService evaluation engine, deterministic % rollout, Redis caching, NestJS guard, frontend flag delivery, plan-based gating

**Backend Integrator — New Stack Guide**
- `stacks/drizzle.md` — Drizzle vs Prisma comparison, TypeScript schema + relations, postgres/Neon drivers, full query examples, transactions, cursor pagination, drizzle-kit, full-text search, common pitfalls

### Changed
- `starter-playbooks.md` — Added Rate Limiting (#11), Background Jobs (#12), API Versioning (#13), Feature Flags (#14) to domain playbooks; added Drizzle ORM to Stack Guides

---

## [2.4.0] — 2026-03-29

### Added

**Backend Integrator — New Playbooks**
- `playbooks/rate-limiting.md` — 5 strategies, limit tier table, Redis sliding window, Express/NestJS patterns, response headers, per-IP vs per-user scoping, idempotency keys, bypass allowlist
- `playbooks/background-jobs.md` — 7 job types, BullMQ queue design, retry strategy per job type, delayed/scheduled jobs, fan-out pattern, idempotency, Bull Board monitoring, separate worker process

**Repo Builder — Deployment Guides (split into individual files)**
- `deployments/railway.md` — Full Railway setup: Dockerfiles, CI/CD, env vars, migration strategy, cost estimate
- `deployments/vercel.md` — Vercel setup: vercel.json, Next.js API routes, Edge Middleware, preview deploys, cost estimate
- `deployments/aws.md` — AWS ECS setup: architecture diagram, task definitions, Secrets Manager, ALB, full CI/CD, cost estimate
- `deployments/index.md` — Rewritten as navigation index with decision tree and platform comparison

---

## [2.3.0] — 2026-03-29

### Added

**Backend Integrator — New Playbooks**
- `playbooks/caching.md` — 5 caching strategies, TTL table, cache key design, 4 invalidation patterns, CacheService interface, Redis data structures, distributed lock pattern
- `playbooks/audit-log.md` — AuditLog entity, AuditService interface, sensitive field scrubbing, action vocabulary, retention policy, async vs sync tradeoffs

**Backend Integrator — New Stack Guide**
- `stacks/prisma.md` — Schema design, ID strategies, 1:N and M:M relationships, FK indexes, soft deletes, transactions, offset/cursor pagination, select/include, migrations, seeding, common pitfalls

### Changed

**Backend Integrator — Upgraded Playbooks**
- `playbooks/auth.md` — Added OAuth2 social login flow, 2FA/TOTP, email verification, refresh token rotation, multi-device sessions, full endpoint tables, detailed security rules
- `playbooks/payments.md` — Added payment model comparison table, Subscription entity, Stripe portal, trial period handling, plan change/proration, refunds, feature gating, full Stripe event table

**Backend Integrator**
- `starter-playbooks.md` — Added Caching (#9) and Audit Log (#10) to domain playbooks; added Prisma ORM to Stack Guides

---

## [2.2.0] — 2026-03-29

### Added

**Backend Integrator — New Stack Guide**
- `stacks/express.md` — Zod validation, auth/role middleware, Router pattern, global error handler with custom error classes, BullMQ integration, Zod config validation, Supertest E2E testing, `asyncHandler` wrapper

**System Level**
- `CONTRIBUTING.md` — Full contribution guide: how to add playbooks, stack guides, checklists, rules, schemas; writing style rules; versioning policy; quality checklist

### Changed
- `starter-playbooks.md` — Added FastAPI and Express.js entries to the Stack Guides section

---

## [2.1.0] — 2026-03-29

### Added

**Backend Integrator — New Playbooks**
- `playbooks/search.md` — Full-text search, filtering, autocomplete, and external engine strategies
- `playbooks/multi-tenancy.md` — Multi-tenant architecture, TenantGuard, RBAC matrix, invitation flow
- `playbooks/webhooks.md` — Webhook consumer + producer patterns, signing, idempotency, DLQ

**Backend Integrator — Stack Guides**
- `stacks/nestjs.md` — Modules, Guards, Pipes, Interceptors, BullMQ, Prisma, testing
- `stacks/fastapi.md` — Project structure, Pydantic v2, async SQLAlchemy, Alembic, Celery, testing

**Backend Integrator — New Checklists**
- `checklists/security-audit.md` — 9-section security review (50+ items)
- `checklists/testing-strategy.md` — Testing pyramid, unit/integration/E2E requirements, CI integration
- `checklists/repo-delivery.md` — Repository readiness validation (10 sections, 45+ items)

**Repo Builder — New Files**
- `starter-prompts.md` — Ready-to-use prompts for all 5 commands
- `deployments/index.md` — Railway, Vercel, and AWS ECS deployment guides with CI/CD workflows

**System Level**
- `pipeline.md` — Formal orchestration protocol between all agents
- `README.md` — Root-level system overview, quick start, and directory map

### Changed

**Backend Integrator**
- `agent.md` — Operation modes formalized into `/blueprint`, `/scaffold`, `/assemble`, `/audit`, `/handoff` commands
- `rules.md` — Added Rule 21 (Security Hardening), Rule 22 (Handoff Automation), Rule 23 (Observability)
- `system-prompt.md` — Thinking model expanded to 16 steps; output structure updated
- `starter-prompts.md` — All prompts updated to `/command` syntax; `/audit` and `/handoff` prompts added
- `starter-playbooks.md` — Expanded from 5 to 8 playbooks; stack guides and checklists sections added
- `examples.md` — Fully rewritten: new `/command` format, structured endpoint tables, security notes per example

**Repo Builder**
- `agent.md` — Operation modes formalized into `/blueprint`, `/scaffold`, `/assemble`, `/audit`, `/handoff` commands
- `rules.md` — Added Rule 21 (Security Baseline), Rule 22 (Handoff Automation), Rule 23 (Dependency Graphing)
- `system-prompt.md` — Thinking model expanded; output structure updated
- `examples.md` — Added Example 5 with Mermaid diagram, security baseline, and `repo-handoff.json` sample
- `repo-handoff.schema.json` — Upgraded from v1 (minimal) to v2.0.0 with `meta`, `security`, `packages`, `deploymentTarget` fields

---

## [2.0.0] — 2026-03-29

### Added

**Backend Integrator — New Playbooks**
- `playbooks/uploads.md` — File storage, StorageAdapter pattern, signed URLs, import flows
- `playbooks/notifications.md` — Channel adapters, queue/DLQ strategy, preference gating, broadcast

**Repo Builder — Starter Prompts**
- `repo-builder-agent/starter-prompts.md` — First version of command-based starter prompts

**System Level**
- `pipeline.md` — Initial pipeline orchestration document
- `README.md` — Root system overview

### Changed

- `repo-handoff.schema.json` — Initial v1 → v2 upgrade

---

## [1.0.0] — 2026-03-12

### Added

**Backend Integrator Agent** (initial release)
- `agent.md` — Agent identity, mission, responsibilities, operation modes
- `rules.md` — 20 mandatory rules (API Contract First through Implementation Completeness)
- `system-prompt.md` — Full system prompt with thinking model and output structure
- `skill.md` — Skill declaration
- `examples.md` — 5 worked examples (auth, e-commerce, SaaS, file upload, notifications)
- `starter-prompts.md` — Initial starter prompts (Mode A/B/C format)
- `starter-playbooks.md` — Initial 5 playbook references
- `frontend-backend-handoff.schema.json` — Full JSON schema for frontend → backend handoff
- `checklists/backend-delivery.md` — Initial delivery checklist
- `playbooks/auth.md` — Authentication playbook
- `playbooks/payments.md` — Payments and billing playbook

**Repo Builder Agent** (initial release)
- `agent.md` — Agent identity, mission, responsibilities, operation modes
- `rules.md` — 20 mandatory rules (Repository Clarity through Production Awareness)
- `system-prompt.md` — Full system prompt
- `skill.md` — Skill declaration
- `examples.md` — 4 worked examples
- `repo-handoff.schema.json` — Minimal v1 schema

---

## Versioning Policy

- **Major (X.0.0)**: Breaking changes to schemas or agent identity
- **Minor (X.Y.0)**: New playbooks, stack guides, checklists, or commands added
- **Patch (X.Y.Z)**: Content corrections, typo fixes, clarification updates

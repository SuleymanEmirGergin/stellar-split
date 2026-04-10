# Pipeline Run: TeleMed

**Date:** 2026-04-02
**Pipeline Version:** v3.5.0
**Status:** PASS (1 warning)

---

## Project Snapshot

| Field | Value |
|---|---|
| **Name** | TeleMed |
| **Description** | Telemedicine platform — video consultations, prescriptions, and medical records for patients and doctors |
| **API Framework** | Django 5.0 + Django REST Framework 3.15 |
| **Database** | PostgreSQL 16 (Fly Postgres dedicated cluster) |
| **Task Queue** | Celery 5.3 + Redis (Upstash Enterprise) |
| **Deployment** | Fly.io — `telemed-api` and `telemed-worker` as separate Fly apps |
| **Repo Type** | Monorepo |
| **Compliance Scope** | HIPAA |
| **PHI Entities** | MedicalRecord, Prescription, Diagnosis |
| **Encryption** | AES-256-GCM (all PHI fields) + HMAC-SHA256 (searchable lookups) |
| **Authentication** | JWT (15-min access tokens) + TOTP/2FA mandatory for doctor and admin roles |
| **Video Provider** | Daily.co (no video stored on TeleMed servers) |

---

## Pipeline Execution Log

| Stage | Agent | Input | Status | Output | Checks |
|---|---|---|---|---|---|
| Stage 0 | Validator Agent | `frontend-backend-handoff.json` | PASS | `validation-report-stage0.json` | 15/15 |
| Stage 1 | Backend Integrator | `validation-report-stage0.json` | Complete | `backend-blueprint.md` | 6 playbooks applied |
| Stage 1 | Backend Integrator | `backend-blueprint.md` | Complete | `repo-handoff.json` | Handoff generated |
| Stage 2 | Validator Agent | `repo-handoff.json` | PASS (1 warn) | `validation-report-stage1.json` | 19/20 |
| Stage 3 | Repo Builder | `validation-report-stage1.json` | Complete | `repo-blueprint.md` | Rule 25 applied |

**Total checks run:** 35 (15 + 20)
**Failures:** 0
**Warnings:** 1 (non-blocking)

---

## Playbooks Applied

| Playbook | Contribution |
|---|---|
| `playbooks/security.md` | AES-256-GCM field encryption; HMAC-SHA256 searchable hashes; key rotation pattern with `_PREV` fallback; `django-ratelimit` on auth endpoints; `detect-secrets` + `.gitleaks.toml` in CI; security headers middleware (HSTS, CSP, X-Frame-Options) |
| `playbooks/compliance.md` | PHI entity identification; AuditLog model (append-only, no update/delete); `log_phi_access()` helper wired to all PHI views; HIPAA_BAA_CHECKLIST.md; DATA_RETENTION_POLICY.md (7-year retention); 60-day breach notification timeline in SECURITY.md |
| `playbooks/observability.md` | structlog structured JSON logging with PHI redaction filter; `X-Request-ID` correlation ID middleware; Sentry `before_send` hook strips PHI before transmission; `/health/live` + `/health/ready` endpoints probing DB and Redis; `django-prometheus` for Fly.io metrics |
| `playbooks/auth.md` | JWT with 15-minute access token lifetime; refresh token rotation (7-day); `django-otp` TOTP device management; `TOTPEnforcementMiddleware` blocks doctor/admin requests without verified 2FA session; JWT claim carries `totp_verified` flag |
| `playbooks/storage.md` | AWS S3 for medical record file storage; signed URLs with 5-minute TTL for PHI file access; `django-storages` S3 backend; `AWS_S3_BUCKET` isolated to production account; BAA required with AWS before launch |
| `playbooks/video.md` | Daily.co room creation via API at appointment scheduling; per-participant meeting tokens with expiry; HMAC-SHA256 webhook signature verification for Daily.co events; no video recorded or stored on TeleMed infrastructure; BAA required with Daily.co before launch |

---

## Validator Summary

### Stage 0 — `frontend-backend-handoff.json` (15/15 PASS)

| Check Category | Result |
|---|---|
| Schema compliance | PASS |
| PHI entity declarations present | PASS |
| Auth requirements specified (JWT + TOTP) | PASS |
| Integration list complete (Daily.co, S3, Resend, Twilio) | PASS |
| Deployment target declared (Fly.io) | PASS |

All 15 checks passed. No warnings. Handoff cleared for Backend Integrator.

### Stage 2 — `repo-handoff.json` (19/20 PASS, 1 WARNING)

| Check Category | Checks | Result |
|---|---|---|
| Schema compliance | 5 | PASS |
| PHI encryption coverage | 4 | PASS |
| Audit log wiring | 3 | PASS |
| Auth + 2FA enforcement | 3 | PASS |
| Security baseline (secrets scanning, headers) | 2 | PASS |
| Compliance artifacts present | 2 | PASS |
| Observability | 1 | WARN — distributed tracing deferred |

**Blocking failures:** 0
**Warnings:** 1 (see Warning Detail below)

---

## Key Decisions Made by Backend Integrator

- **Django chosen for HIPAA context** — mature security ecosystem (`django-otp`, `django-ratelimit`, `django-otp`), strict ORM preventing raw SQL PHI leaks, well-understood compliance posture in healthcare industry
- **Fly.io with dedicated Postgres cluster** — shared Fly Postgres explicitly rejected; dedicated cluster required for PHI data isolation and to satisfy HIPAA technical safeguards
- **3 PHI entities identified** — MedicalRecord, Prescription, Diagnosis; all other entities (User, Appointment) do not contain PHI and are stored in plaintext
- **AES-256-GCM applied to all PHI fields** — per-field encryption using `cryptography` hazmat primitives; 96-bit random nonce prepended to each ciphertext; nonce+ciphertext base64-encoded for PostgreSQL TEXT column storage
- **Searchable HMAC-SHA256 for email and SSN lookups** — deterministic hash stored alongside encrypted value enables O(1) indexed lookup without decryption; separate `HMAC_KEY` ensures hash cannot be reversed even if encryption key is leaked
- **structlog with PHI redaction filter** — known PHI field names (`notes`, `diagnosis_text`, `drug`, `dosage`, `narrative`) added to structlog deny-list; log records never contain PHI in plaintext
- **Sentry `before_send` strips PHI** — error reports sanitized before leaving TeleMed infrastructure; PHI field names removed from exception context, request body, and extra data
- **Daily.co for video — no storage** — telemedicine sessions conducted via Daily.co; no video is recorded or stored on TeleMed servers; eliminates an entire category of PHI storage compliance risk
- **Upstash Redis enterprise plan** — enterprise tier provides BAA; required because Celery task payloads may transiently contain appointment context
- **Distributed tracing deferred to v1.1** — low cross-service call volume in v1 (only two Fly apps); `X-Request-ID` correlation IDs provide sufficient request tracing for the initial release; OpenTelemetry/Tempo deferred

---

## HIPAA Compliance Checklist

- [x] PHI entities identified (MedicalRecord, Prescription, Diagnosis)
- [x] PHI fields encrypted at rest — AES-256-GCM, per-field, with random nonce
- [x] PHI audit logging wired — `log_phi_access()` called on every read, write, delete of PHI
- [x] Minimum necessary principle enforced in serializers — non-owner roles receive redacted representations
- [x] BAA vendor list documented — `HIPAA_BAA_CHECKLIST.md` lists AWS S3, Daily.co, Resend, Twilio
- [x] Data retention policy documented — `DATA_RETENTION_POLICY.md` specifies 7-year PHI retention and legal hold procedure
- [x] Incident response timeline noted — 60-day HIPAA breach notification timeline in `SECURITY.md`
- [x] Sentry PHI strip configured — `before_send` hook prevents PHI transmission to Sentry cloud
- [x] structlog PHI redaction configured — deny-list prevents PHI appearing in log output
- [x] Key rotation path designed — `FIELD_ENCRYPTION_KEY_PREV` fallback in `decrypt_field_with_fallback()`
- [ ] BAA signatures pending — must be completed before onboarding any patients (pre-launch action)
- [ ] Penetration test — required before production patient data entry (pre-launch action)

---

## Warning Detail

**Warning ID:** W-19
**Check:** Distributed tracing coverage
**Validator message:** `repo-handoff.json` declares `observability.tracing = deferred` — no OpenTelemetry or equivalent distributed trace propagation configured across `telemed-api` and `telemed-worker`.
**Severity:** Non-blocking (warning only — does not prevent scaffold generation or deployment)

**Why it was deferred:**
In TeleMed v1, the only cross-service boundary is the Celery task queue between the API and the worker. Call volume is low and all requests originate from a single API app. The operational cost of configuring and maintaining an OpenTelemetry collector + trace backend (e.g., Grafana Tempo or Honeycomb) was judged disproportionate to the observability benefit at this stage.

**What is in place instead:**
The `X-Request-ID` correlation ID middleware attaches a UUID to every inbound HTTP request and propagates it through structlog's context. Celery tasks enqueued by the API receive the correlation ID as a task header, making it possible to manually trace a request across the API and worker logs by searching for the shared ID.

**Fix for v1.1:**
1. Add `opentelemetry-sdk`, `opentelemetry-instrumentation-django`, `opentelemetry-instrumentation-celery` to `requirements/production.txt`
2. Configure an OTLP exporter pointing to a Grafana Tempo or Honeycomb endpoint
3. Propagate trace context into Celery task headers via a custom `on_message` signal
4. Update `validation-report-stage1.json` check W-19 to PASS

---

## Files in This Pipeline Run

```
pipeline-runs/hipaa-telemed/
├── frontend-backend-handoff.json      ← Stage 0 input
├── validation-report-stage0.json      ← Stage 0 gate: PASS 15/15
├── repo-handoff.json                  ← Stage 1 handoff (Backend Integrator output)
├── validation-report-stage1.json      ← Stage 2 gate: PASS 19/20 (1 warn)
├── repo-blueprint.md                  ← Stage 3 output (this pipeline run's scaffold spec)
└── pipeline-summary.md                ← This file
```

---

## Next Steps

1. **Review `repo-blueprint.md`** — confirm scaffold structure, key file contents, and implementation order with the engineering team
2. **Sign BAAs** — AWS, Daily.co, Resend, and Twilio must be signed before any patient data enters the system; use `HIPAA_BAA_CHECKLIST.md` to track progress
3. **Clone and scaffold the repository** — follow the implementation order in `repo-blueprint.md` Section 9
4. **Generate encryption keys** — run `openssl rand -hex 32` twice (once for `FIELD_ENCRYPTION_KEY`, once for `HMAC_KEY`); set both as Fly secrets immediately, never commit them
5. **Provision Fly infrastructure** — create dedicated Postgres cluster (`fly postgres create --name telemed-db --vm-size dedicated-cpu-1x`); create Upstash Redis enterprise instance; set all secrets via `flyctl secrets set`
6. **Run initial migrations and create superuser** — `python manage.py migrate && python manage.py createsuperuser`
7. **Deploy to Fly.io staging** — `flyctl deploy --app telemed-api` and `flyctl deploy --app telemed-worker`; confirm `/health/ready` returns HTTP 200
8. **Complete post-scaffold checklist** — all items in `repo-blueprint.md` Section 11 must be checked off before production patient onboarding
9. **Schedule penetration test** — engage a HIPAA-experienced security firm; scope should include PHI encryption verification, auth bypass attempts, and audit log integrity
10. **Plan distributed tracing (v1.1)** — address warning W-19 by adding OpenTelemetry instrumentation in the next release cycle

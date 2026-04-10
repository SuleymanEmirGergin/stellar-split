# TeleMed — Repository Blueprint

**Command:** `/blueprint`
**Input:** `repo-handoff.json` (validated — PASS with 1 warning, 19/20 checks)
**Stack guides applied:** `stacks/django.md`, `stacks/celery.md`, `stacks/github-actions.md`, `deployments/fly.md`
**Compliance guides applied:** `playbooks/security.md`, `playbooks/compliance.md`, `playbooks/observability.md`, `playbooks/auth.md`, `playbooks/storage.md`, `playbooks/video.md`

---

## 1. Repository Structure Decision

**Type:** Monorepo
**Reason:** Two separate Fly.io apps (API + Worker) share PHI encryption logic, audit helpers, and Celery task definitions. Monorepo keeps PHI-handling code in one auditable location and prevents duplication of compliance-critical utilities.

**Tooling:**
- Language: **Python 3.12**
- API framework: **Django 5.0 + Django REST Framework 3.15**
- Task queue: **Celery 5.3 + Redis**
- Database: **PostgreSQL 16** (Fly Postgres dedicated cluster)
- Package manager: **pip** (per-app `requirements/` split by environment)
- CI: **GitHub Actions** (apply `stacks/github-actions.md`)
- Deployment: **Fly.io** (apply `deployments/fly.md`) — `telemed-api` and `telemed-worker` as separate Fly apps

---

## 2. Repository Tree

```
telemed/
│
├── .github/
│   └── workflows/
│       ├── ci.yml                   ← pip-audit, detect-secrets, pytest, fly deploy
│       └── security-scan.yml        ← detect-secrets scan on every PR
│
├── apps/
│   │
│   ├── api/                         ← Django REST Framework API (Fly app: telemed-api)
│   │   ├── telemed/                 ← Django project package
│   │   │   ├── settings/
│   │   │   │   ├── base.py          ← Django base settings (shared by all envs)
│   │   │   │   ├── production.py    ← Production overrides (DEBUG=False, HSTS, etc.)
│   │   │   │   └── test.py          ← Test settings (SQLite, faster hashing)
│   │   │   ├── urls.py              ← Root URL conf — mounts all app routers + health
│   │   │   └── wsgi.py              ← WSGI entrypoint for gunicorn
│   │   │
│   │   ├── core/                    ← Shared Django app — compliance utilities
│   │   │   ├── middleware/
│   │   │   │   ├── correlation_id.py      ← Attach/propagate X-Request-ID header
│   │   │   │   ├── security_headers.py    ← CSP, HSTS, X-Frame-Options, Referrer-Policy
│   │   │   │   └── totp_enforcement.py    ← Block doctor/admin requests if 2FA not verified
│   │   │   ├── encryption.py        ← AES-256-GCM encrypt/decrypt + HMAC-SHA256 helpers
│   │   │   ├── audit.py             ← log_phi_access() — writes immutable AuditLog rows
│   │   │   └── health.py            ← /health/live + /health/ready views (DB + Redis checks)
│   │   │
│   │   ├── apps/
│   │   │   ├── users/
│   │   │   │   ├── models.py        ← User (AbstractUser), Patient, Doctor
│   │   │   │   ├── serializers.py   ← minimum-necessary field exposure per role
│   │   │   │   ├── views.py         ← registration, profile, TOTP setup endpoints
│   │   │   │   └── urls.py
│   │   │   │
│   │   │   ├── appointments/
│   │   │   │   ├── models.py        ← Appointment (links Patient ↔ Doctor, Daily.co room)
│   │   │   │   ├── serializers.py
│   │   │   │   ├── views.py         ← create/list/cancel + Daily.co room token vend
│   │   │   │   └── urls.py
│   │   │   │
│   │   │   ├── records/
│   │   │   │   ├── models.py        ← MedicalRecord (PHI) — encrypted text + S3 file ref
│   │   │   │   ├── serializers.py   ← strips PHI fields for non-owner roles
│   │   │   │   ├── views.py         ← list/retrieve behind doctor/patient permission
│   │   │   │   └── urls.py
│   │   │   │
│   │   │   ├── prescriptions/
│   │   │   │   ├── models.py        ← Prescription (PHI) — drug, dosage, notes encrypted
│   │   │   │   ├── serializers.py
│   │   │   │   ├── views.py
│   │   │   │   └── urls.py
│   │   │   │
│   │   │   ├── diagnoses/
│   │   │   │   ├── models.py        ← Diagnosis (PHI) — ICD-10 code + narrative encrypted
│   │   │   │   ├── serializers.py
│   │   │   │   ├── views.py
│   │   │   │   └── urls.py
│   │   │   │
│   │   │   ├── audit_log/
│   │   │   │   ├── models.py        ← AuditLog — immutable (no update/delete permissions)
│   │   │   │   ├── serializers.py   ← read-only serializer
│   │   │   │   └── views.py         ← admin-only read-only list/retrieve view
│   │   │   │
│   │   │   └── webhooks/
│   │   │       ├── views.py         ← Daily.co webhook — HMAC-SHA256 signature verified
│   │   │       └── urls.py
│   │   │
│   │   ├── requirements/
│   │   │   ├── base.txt             ← Core dependencies (Django, DRF, cryptography, etc.)
│   │   │   ├── production.txt       ← base.txt + gunicorn, sentry-sdk, django-storages
│   │   │   └── test.txt             ← base.txt + pytest, pytest-django, factory-boy, coverage
│   │   │
│   │   ├── tests/
│   │   │   ├── conftest.py          ← pytest fixtures: api_client, doctor_user, patient_user
│   │   │   ├── test_auth.py         ← JWT issue/refresh, TOTP enforcement, token expiry
│   │   │   ├── test_appointments.py ← CRUD, permission matrix (patient can't read others')
│   │   │   ├── test_records.py      ← PHI create/read, audit log written, role gating
│   │   │   ├── test_prescriptions.py← PHI create/read, minimum-necessary serializer check
│   │   │   ├── test_health.py       ← /health/live returns 200, /health/ready probes DB+Redis
│   │   │   └── test_encryption.py   ← Unit tests for encrypt_field / decrypt_field round-trip
│   │   │
│   │   ├── fly.toml                 ← API Fly config — health checks, force_https, min 1 machine
│   │   ├── Dockerfile               ← Multi-stage Python build (builder → runtime)
│   │   ├── .env.example             ← All required env vars with comments
│   │   └── manage.py
│   │
│   ├── web/
│   │   └── (Next.js 14 — scaffolded separately)
│   │
│   └── worker/                      ← Celery worker + Beat (Fly app: telemed-worker)
│       ├── tasks/
│       │   ├── notifications.py     ← send_appointment_reminder, send_prescription_ready
│       │   ├── webhooks.py          ← process_daily_webhook (async Daily.co event handling)
│       │   └── cleanup.py           ← cleanup_expired_tokens (runs nightly via Beat)
│       ├── beat_schedule.py         ← Celery Beat periodic task schedule definition
│       ├── celery_app.py            ← Celery app factory, broker/backend config
│       ├── fly.toml                 ← Worker Fly config (no HTTP service, cmd = celery worker)
│       ├── Dockerfile               ← Python build — CMD runs celery worker + beat
│       └── .env.example
│
├── packages/
│   ├── types/
│   │   └── index.ts                 ← Shared TypeScript types (consumed by Next.js web app)
│   └── config/
│       └── env.ts                   ← Shared Zod env schemas for frontend validation
│
├── infra/
│   ├── docker-compose.yml           ← Local dev: postgres, redis, api, worker
│   └── docker-compose.test.yml      ← CI: postgres-test, redis-test (ephemeral)
│
├── docs/
│   ├── ARCHITECTURE.md              ← Mermaid dependency diagram
│   └── DEPLOYMENT.md                ← Fly.io setup guide (Postgres cluster, secrets, deploy)
│
├── SECURITY.md                      ← Vulnerability disclosure, 60-day HIPAA breach timeline
├── HIPAA_BAA_CHECKLIST.md           ← Vendors requiring BAA: AWS S3, Daily.co, Resend, Twilio
├── DATA_RETENTION_POLICY.md         ← 7-year PHI retention, legal hold procedure
├── .gitleaks.toml                   ← Custom rules for medical record patterns + API keys
├── .secrets.baseline                ← detect-secrets baseline for CI comparison
└── .gitignore                       ← Python, .env, __pycache__, *.pyc, dist/, .coverage
```

---

## 3. Key File Contents

### `apps/api/core/encryption.py` — AES-256-GCM PHI field encryption

```python
import os
import base64
import hmac
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

FIELD_ENCRYPTION_KEY = bytes.fromhex(os.environ["FIELD_ENCRYPTION_KEY"])

def encrypt_field(plaintext: str) -> str:
    """Encrypt a string field. Returns base64-encoded nonce+ciphertext."""
    nonce = os.urandom(12)  # 96-bit nonce for AES-GCM
    aesgcm = AESGCM(FIELD_ENCRYPTION_KEY)
    ct = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ct).decode()

def decrypt_field(ciphertext_b64: str) -> str:
    """Decrypt a field encrypted with encrypt_field."""
    data = base64.b64decode(ciphertext_b64)
    nonce, ct = data[:12], data[12:]
    aesgcm = AESGCM(FIELD_ENCRYPTION_KEY)
    return aesgcm.decrypt(nonce, ct, None).decode()

def decrypt_field_with_fallback(ciphertext_b64: str) -> str:
    """Try current key first, fall back to FIELD_ENCRYPTION_KEY_PREV during rotation."""
    try:
        return decrypt_field(ciphertext_b64)
    except Exception:
        prev_key_hex = os.environ.get("FIELD_ENCRYPTION_KEY_PREV")
        if not prev_key_hex:
            raise
        prev_key = bytes.fromhex(prev_key_hex)
        data = base64.b64decode(ciphertext_b64)
        nonce, ct = data[:12], data[12:]
        return AESGCM(prev_key).decrypt(nonce, ct, None).decode()

HMAC_KEY = os.environ["HMAC_KEY"].encode()

def hmac_field(value: str) -> str:
    """Deterministic HMAC-SHA256 hash for searchable lookups without decryption."""
    return hmac.new(HMAC_KEY, value.encode(), hashlib.sha256).hexdigest()
```

### `apps/api/core/audit.py` — PHI audit log helper

```python
import structlog
from apps.audit_log.models import AuditLog

logger = structlog.get_logger(__name__)

def log_phi_access(actor_id, action, entity_type, entity_id=None, request=None, metadata=None):
    """
    Write an immutable audit log entry for every PHI access.
    action examples: 'phi.read', 'phi.write', 'phi.delete'
    entity_type examples: 'MedicalRecord', 'Prescription', 'Diagnosis'
    """
    ip = _get_client_ip(request)
    AuditLog.objects.create(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        ip_address=ip,
        user_agent=request.META.get("HTTP_USER_AGENT", "") if request else "",
        metadata=metadata or {},
    )
    logger.info(
        "phi_access",
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        ip=ip,
    )

def _get_client_ip(request):
    if not request:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    return forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")
```

### `apps/api/core/health.py` — /health/live + /health/ready

```python
from django.conf import settings
from django.http import JsonResponse
from django.db import connection
import redis

def health_live(request):
    """Liveness — always returns 200 if the process is running."""
    return JsonResponse({"status": "ok"})

def health_ready(request):
    """Readiness — verifies DB + Redis connectivity before accepting traffic."""
    checks = {}

    try:
        connection.ensure_connection()
        checks["db"] = "ok"
    except Exception:
        checks["db"] = "fail"

    try:
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "fail"

    all_ok = all(v == "ok" for v in checks.values())
    return JsonResponse(
        {"status": "ok" if all_ok else "degraded", "checks": checks},
        status=200 if all_ok else 503,
    )
```

### `apps/api/core/middleware/totp_enforcement.py` — 2FA enforcement

```python
from django.http import JsonResponse

TOTP_REQUIRED_ROLES = {"doctor", "admin"}

class TOTPEnforcementMiddleware:
    """
    Block requests from doctor/admin users whose TOTP device
    has not been verified in this session.
    Applies after JWT authentication — reads request.user.role
    and request.user.totp_verified (set by JWT claim).
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        if (
            user
            and user.is_authenticated
            and getattr(user, "role", None) in TOTP_REQUIRED_ROLES
            and not getattr(user, "totp_verified", False)
        ):
            return JsonResponse(
                {"detail": "2FA verification required.", "code": "totp_required"},
                status=403,
            )
        return self.get_response(request)
```

### `apps/api/fly.toml` — API Fly.io configuration

```toml
app = "telemed-api"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"
  DJANGO_SETTINGS_MODULE = "telemed.settings.production"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

  [[http_service.checks]]
    grace_period = "10s"
    interval = "30s"
    method = "GET"
    path = "/health/ready"
    timeout = "5s"

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

### `apps/worker/fly.toml` — Worker Fly.io configuration

```toml
app = "telemed-worker"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  DJANGO_SETTINGS_MODULE = "telemed.settings.production"

# No [http_service] — worker does not serve HTTP traffic

[processes]
  worker = "celery -A celery_app worker --loglevel=info --concurrency=4"
  beat   = "celery -A celery_app beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler"

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

### `apps/api/.env.example` — All environment variables

```bash
# ─── Django Core ────────────────────────────────────────────────────────────
SECRET_KEY=change-me-in-production                    # 50+ char random string
DEBUG=false
ALLOWED_HOSTS=telemed-api.fly.dev,yourdomain.com
DATABASE_URL=postgres://user:pass@host:5432/telemed
DJANGO_SETTINGS_MODULE=telemed.settings.production

# ─── Auth ───────────────────────────────────────────────────────────────────
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# ─── PHI Encryption (HIPAA) ─────────────────────────────────────────────────
FIELD_ENCRYPTION_KEY=          # 32-byte hex — generate: openssl rand -hex 32
FIELD_ENCRYPTION_KEY_PREV=     # previous key during rotation (optional)
HMAC_KEY=                      # separate 32-byte hex for HMAC-SHA256 lookups

# ─── CORS ───────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS=https://telemed.com,https://www.telemed.com

# ─── Redis / Celery ─────────────────────────────────────────────────────────
REDIS_URL=redis://default:password@host:6379

# ─── AWS S3 (medical record file storage) ───────────────────────────────────
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=telemed-records-prod
STORAGE_SIGNED_URL_TTL=300     # 5 min signed URLs for PHI file access

# ─── Daily.co (video sessions) ──────────────────────────────────────────────
DAILY_API_KEY=
DAILY_WEBHOOK_SECRET=          # for HMAC verification of Daily.co webhook payloads

# ─── Email (Resend) ─────────────────────────────────────────────────────────
RESEND_API_KEY=
EMAIL_FROM=noreply@telemed.com

# ─── SMS (Twilio) ───────────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# ─── Observability ──────────────────────────────────────────────────────────
LOG_LEVEL=info
SERVICE_NAME=telemed-api
SENTRY_DSN=
```

### `apps/api/Dockerfile` — Multi-stage Python build

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements/production.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r production.txt

FROM python:3.12-slim AS runtime
WORKDIR /app

# Create non-root user
RUN addgroup --system telemed && adduser --system --ingroup telemed telemed

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY . .

RUN chown -R telemed:telemed /app
USER telemed

EXPOSE 8080
CMD ["gunicorn", "telemed.wsgi:application", \
     "--bind", "0.0.0.0:8080", \
     "--workers", "2", \
     "--threads", "4", \
     "--timeout", "30", \
     "--access-logfile", "-"]
```

---

## 4. Requirements Files

### `requirements/base.txt`

```
Django==5.0.4
djangorestframework==3.15.1
djangorestframework-simplejwt==5.3.1
django-cors-headers==4.3.1
django-otp==1.3.0              # TOTP 2FA device management
django-ratelimit==4.1.0        # per-IP rate limiting on auth endpoints
django-prometheus==2.3.1       # /metrics endpoint for Fly.io monitoring
cryptography==42.0.5           # AES-256-GCM via hazmat.primitives
structlog==24.1.0              # structured JSON logging with PHI redaction
boto3==1.34.69                 # S3 signed URL generation
django-storages==1.14.2        # S3 storage backend
celery==5.3.6
redis==5.0.3
psycopg2-binary==2.9.9
sentry-sdk==1.44.1
```

### `requirements/production.txt`

```
-r base.txt
gunicorn==21.2.0
django-celery-beat==2.6.0      # DB-backed Beat scheduler
whitenoise==6.6.0              # static file serving
```

### `requirements/test.txt`

```
-r base.txt
pytest==8.1.1
pytest-django==4.8.0
factory-boy==3.3.0
coverage==7.4.4
freezegun==1.4.0               # freeze time for token expiry tests
responses==0.25.0              # mock external HTTP calls (Daily.co, Twilio)
```

---

## 5. Infrastructure — Local Dev

### `infra/docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: telemed_dev
      POSTGRES_USER: telemed
      POSTGRES_PASSWORD: telemed
    ports: ["5432:5432"]
    volumes: ["postgres_data:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    ports: ["8080:8080"]
    env_file: apps/api/.env
    environment:
      DATABASE_URL: postgres://telemed:telemed@postgres:5432/telemed_dev
      REDIS_URL: redis://redis:6379
    depends_on: [postgres, redis]
    volumes: ["./apps/api:/app"]

  worker:
    build:
      context: ./apps/worker
      dockerfile: Dockerfile
    env_file: apps/worker/.env
    environment:
      DATABASE_URL: postgres://telemed:telemed@postgres:5432/telemed_dev
      REDIS_URL: redis://redis:6379
    depends_on: [postgres, redis]

volumes:
  postgres_data:
```

---

## 6. CI/CD Pipeline

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  security:
    name: Security Scans
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install detect-secrets pip-audit
      - name: detect-secrets
        run: detect-secrets scan --baseline .secrets.baseline
      - name: pip-audit
        run: pip-audit -r apps/api/requirements/production.txt --fail-on HIGH

  test:
    name: Test Suite
    runs-on: ubuntu-latest
    needs: security

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: telemed_test
          POSTGRES_USER: telemed
          POSTGRES_PASSWORD: telemed
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports: ["5432:5432"]
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install -r apps/api/requirements/test.txt
      - name: Run tests with coverage
        run: |
          cd apps/api
          pytest --cov=. --cov-fail-under=80 --cov-report=xml
        env:
          DJANGO_SETTINGS_MODULE: telemed.settings.test
          FIELD_ENCRYPTION_KEY: "0000000000000000000000000000000000000000000000000000000000000000"
          HMAC_KEY: "0000000000000000000000000000000000000000000000000000000000000000"
      - name: Health smoke test
        run: cd apps/api && pytest tests/test_health.py -v
      - name: Encryption unit tests
        run: cd apps/api && pytest tests/test_encryption.py -v

  deploy:
    name: Deploy to Fly.io
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - name: Deploy API
        run: flyctl deploy --app telemed-api --config apps/api/fly.toml --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
      - name: Deploy Worker
        run: flyctl deploy --app telemed-worker --config apps/worker/fly.toml --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### `.github/workflows/security-scan.yml`

```yaml
name: Security Scan (PR)

on:
  pull_request:
    branches: [main, develop]

jobs:
  secrets:
    name: detect-secrets
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install detect-secrets
      - run: detect-secrets scan --baseline .secrets.baseline
        # Fails if any new secrets are detected that aren't in the baseline
```

---

## 7. Dependency Graph

```mermaid
graph TD
  web["apps/web (Next.js 14)"]
  api["apps/api (Django REST Framework)"]
  worker["apps/worker (Celery + Beat)"]
  types["packages/types (shared TS types)"]
  config["packages/config (Zod env schemas)"]
  postgres[("PostgreSQL — Fly Postgres dedicated")]
  redis[("Redis — Upstash Enterprise")]
  s3[("AWS S3 — telemed-records-prod")]
  daily["Daily.co (video rooms)"]
  resend["Resend (email)"]
  twilio["Twilio (SMS)"]

  web --> types
  web --> config
  api --> postgres
  api --> redis
  api --> s3
  api --> daily
  worker --> postgres
  worker --> redis
  worker --> resend
  worker --> twilio
  api -.->|"enqueues tasks"| redis
  redis -.->|"delivers jobs"| worker
```

---

## 8. Compliance Artifacts

| File | Purpose |
|---|---|
| `SECURITY.md` | Vulnerability disclosure policy; 60-day HIPAA breach notification timeline; security contact |
| `.gitleaks.toml` | Custom detection rules for medical record ID patterns, AES key hex strings, and standard API key formats |
| `.secrets.baseline` | detect-secrets baseline — CI fails if new secrets appear outside this baseline |
| `HIPAA_BAA_CHECKLIST.md` | Vendors requiring BAA: AWS S3, Daily.co, Resend, Twilio. Status column, signatory contact, date signed |
| `DATA_RETENTION_POLICY.md` | 7-year PHI retention schedule; legal hold procedure; S3 lifecycle rules; deletion audit trail |

---

## 9. Implementation Order

1. Root structure — `.gitignore`, `.gitleaks.toml`, `.secrets.baseline`
2. `apps/api/requirements/` — pin all dependencies before writing any code
3. `apps/api/telemed/settings/` — base, production, test settings
4. `core/encryption.py` — AES-256-GCM helpers (unit-tested before use)
5. `core/audit.py` — PHI audit log helper
6. `apps/audit_log/models.py` — immutable AuditLog model (migrations)
7. `apps/users/models.py` — User, Patient, Doctor + initial migration
8. `apps/appointments/`, `apps/records/`, `apps/prescriptions/`, `apps/diagnoses/` — PHI models (encrypted fields wired to encryption.py)
9. `core/middleware/` — correlation_id, security_headers, totp_enforcement
10. `core/health.py` + URL mount — /health/live, /health/ready
11. `apps/api/telemed/urls.py` — mount all app routers
12. `apps/worker/` — Celery app factory, tasks, Beat schedule
13. `infra/docker-compose.yml` — local dev stack
14. `.github/workflows/ci.yml` + `security-scan.yml` — CI pipeline
15. `apps/api/fly.toml` + `apps/worker/fly.toml` — Fly configs
16. `SECURITY.md`, `HIPAA_BAA_CHECKLIST.md`, `DATA_RETENTION_POLICY.md`
17. `tests/` — full test suite (target: >80% coverage)

---

## 10. Security Baseline

- AES-256-GCM applied to all PHI fields in MedicalRecord, Prescription, Diagnosis
- HMAC-SHA256 deterministic hashes stored alongside encrypted fields for O(1) lookup without decryption
- Key rotation supported via `FIELD_ENCRYPTION_KEY_PREV` fallback in `decrypt_field_with_fallback()`
- TOTP enforcement middleware blocks doctor/admin requests if 2FA not verified in current session
- `django-ratelimit` applied to `/api/auth/token/` and `/api/auth/token/refresh/` endpoints
- Sentry `before_send` hook strips PHI fields before sending error reports off-premises
- structlog configured with PHI field redaction filter (drops `notes`, `diagnosis_text`, `drug`, `dosage` from log records)
- `force_https = true` in fly.toml — no plaintext HTTP in production
- Security headers middleware sets `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`
- `.gitleaks.toml` + `detect-secrets` in CI — blocks secret commits
- AuditLog model has no `update` or `delete` Django permissions — append-only by design

---

## 11. Post-Scaffold Checklist

Items the Repo Builder scaffold does NOT complete — must be done before production launch:

- [ ] Sign BAA with **AWS** (S3 for medical record files)
- [ ] Sign BAA with **Daily.co** (video session provider)
- [ ] Sign BAA with **Resend** (transactional email for appointment reminders)
- [ ] Sign BAA with **Twilio** (SMS notifications)
- [ ] Generate `FIELD_ENCRYPTION_KEY`: `openssl rand -hex 32`
- [ ] Generate `HMAC_KEY`: `openssl rand -hex 32`
- [ ] Set all secrets in Fly: `flyctl secrets set FIELD_ENCRYPTION_KEY=... --app telemed-api`
- [ ] Run initial migrations: `python manage.py migrate`
- [ ] Create superuser: `python manage.py createsuperuser`
- [ ] Configure Fly Postgres **dedicated cluster** (not shared — required for PHI isolation)
- [ ] Configure **Upstash Redis enterprise plan** (enterprise tier includes BAA)
- [ ] Verify `/health/ready` returns HTTP 200 after first deploy
- [ ] Run `detect-secrets scan --baseline .secrets.baseline` to establish clean baseline
- [ ] Schedule penetration test before patient onboarding

---

## 12. Risks and Edge Cases

| Risk | Mitigation |
|---|---|
| PHI leaked in Sentry error reports | `before_send` hook strips known PHI field names before transmission |
| PHI logged via structlog | PHI redaction filter configured in `LOGGING` settings; field names in deny-list |
| AES key exposed in env var leak | Keys stored only as Fly secrets; never committed; `.env` in `.gitignore` |
| Key rotation without downtime | `decrypt_field_with_fallback()` tries current key, falls back to `_PREV`; re-encrypt in background task |
| AuditLog rows deleted by accident | Django model `Meta` removes `delete` from default permissions; DB role has no DELETE on audit_log table |
| Daily.co webhook spoofing | HMAC-SHA256 signature verified before processing; `DAILY_WEBHOOK_SECRET` required |
| Fly shared Postgres used by mistake | `fly.toml` comment + DEPLOYMENT.md explicitly require dedicated cluster for PHI |
| Distributed tracing not implemented | Deferred to v1.1 — correlation IDs propagated via `X-Request-ID` header as interim measure |

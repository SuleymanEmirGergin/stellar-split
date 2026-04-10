# TeleMed — Backend Blueprint

**Command:** `/blueprint`  
**Stack:** Django REST Framework + PostgreSQL + Celery + Redis  
**Compliance:** HIPAA — PHI encryption, audit logging, BAA required  
**Input:** `frontend-backend-handoff.json` (validated — PASS)

---

## 1. Project Overview

**Name:** TeleMed  
**Type:** HIPAA-regulated telemedicine platform

### Stack Choices & Rationale

| Component | Choice | Rationale |
|---|---|---|
| Framework | Django REST Framework | Mature ecosystem, built-in admin, strong ORM for relational PHI data |
| Database | PostgreSQL | ACID guarantees, row-level security, pgcrypto support |
| Task queue | Celery + Celery Beat | Battle-tested async jobs; Beat handles scheduled reminders |
| Message broker | Redis (Upstash Enterprise) | Low-latency broker + rate-limit store; Enterprise plan provides BAA |
| Auth | SimpleJWT + django-otp | JWT token pairs; django-otp provides TOTP/2FA for privileged roles |
| File storage | AWS S3 (private bucket) | Pre-signed URLs, server-side encryption, S3 BAA available |
| Video | Daily.co | HIPAA-eligible plan, room-based video, webhook events |
| Email | Resend | Transactional delivery; BAA available |
| SMS | Twilio | Appointment reminders; BAA available |
| Deployment | Fly.io | Regional isolation, secrets management, separate api + worker apps |

**Playbooks applied:** `security.md`, `compliance.md`, `observability.md`, `auth.md`, `storage.md`, `video.md`

### Monorepo Structure

```
telemed/
├── apps/
│   ├── api/          # Django project (DRF)
│   ├── web/          # Next.js 14 frontend
│   └── worker/       # Celery worker (separate Fly app)
└── packages/
    ├── types/        # Shared TypeScript types (consumed by web)
    └── config/       # Shared Zod schemas (consumed by web)
```

---

## 2. Data Models (Django)

All PHI fields are stored encrypted (AES-256-GCM). Fields suffixed `_encrypted` are never stored in plaintext. Decryption occurs only at the serializer layer on read.

### User *(AbstractUser extension)*

```python
class User(AbstractUser):
    id             = UUIDField(primary_key=True, default=uuid4)
    email          = EmailField(unique=True)
    username       = None                          # disabled — email is identifier
    role           = CharField(choices=["patient","doctor","admin"], max_length=10)
    totp_secret    = TextField(blank=True)         # AES-256-GCM encrypted
    totp_enabled   = BooleanField(default=False)
    is_active      = BooleanField(default=True)
    created_at     = DateTimeField(auto_now_add=True)
    updated_at     = DateTimeField(auto_now=True)

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = []
```

### Patient *(PHI — links to User)*

```python
class Patient(Model):
    id                      = UUIDField(primary_key=True, default=uuid4)
    user                    = OneToOneField(User, on_delete=CASCADE)
    name_encrypted          = TextField()          # PHI — AES-256-GCM
    date_of_birth_encrypted = TextField()          # PHI — AES-256-GCM
    ssn_hash                = CharField(max_length=64)  # HMAC-SHA256 — lookup only
    ssn_encrypted           = TextField()          # PHI — AES-256-GCM
    phone_encrypted         = TextField()          # PHI — AES-256-GCM
    created_at              = DateTimeField(auto_now_add=True)
```

> `ssn_hash` enables exact-match lookups (`Patient.objects.filter(ssn_hash=hmac(ssn))`) without ever decrypting the SSN. The raw SSN is never stored.

### Doctor

```python
class Doctor(Model):
    id             = UUIDField(primary_key=True, default=uuid4)
    user           = OneToOneField(User, on_delete=CASCADE)
    full_name      = CharField(max_length=200)
    specialty      = CharField(max_length=100)
    license_number = CharField(max_length=50)
    bio            = TextField(blank=True)
    is_available   = BooleanField(default=True)
```

### Appointment

```python
class Appointment(Model):
    STATUS_CHOICES = ["scheduled","completed","cancelled","no_show"]

    id               = UUIDField(primary_key=True, default=uuid4)
    patient          = ForeignKey(Patient, on_delete=PROTECT)
    doctor           = ForeignKey(Doctor,  on_delete=PROTECT)
    scheduled_at     = DateTimeField()
    duration_minutes = IntegerField(default=30)
    reason_encrypted = TextField()                 # PHI — patient's stated reason
    status           = CharField(choices=STATUS_CHOICES, max_length=15)
    daily_room_url   = TextField(blank=True)       # Daily.co room URL
    daily_session_id = TextField(blank=True)
    created_at       = DateTimeField(auto_now_add=True)
```

### MedicalRecord *(PHI entity)*

```python
class MedicalRecord(Model):
    RECORD_TYPES = ["lab_result","imaging","discharge_summary","consultation_note"]

    id                = UUIDField(primary_key=True, default=uuid4)
    patient           = ForeignKey(Patient, on_delete=PROTECT)
    doctor            = ForeignKey(Doctor,  on_delete=PROTECT)
    record_type       = CharField(choices=RECORD_TYPES, max_length=30)
    title             = CharField(max_length=255)
    content_encrypted = TextField()                # PHI — clinical content
    s3_key            = TextField(blank=True)      # path in private S3 bucket
    s3_bucket         = TextField(blank=True)
    created_at        = DateTimeField(auto_now_add=True)
```

### Prescription *(PHI entity)*

```python
class Prescription(Model):
    STATUS_CHOICES = ["active","expired","cancelled"]

    id                       = UUIDField(primary_key=True, default=uuid4)
    patient                  = ForeignKey(Patient, on_delete=PROTECT)
    doctor                   = ForeignKey(Doctor,  on_delete=PROTECT)
    medication_name_encrypted = TextField()        # PHI
    dosage_encrypted         = TextField()         # PHI
    instructions_encrypted   = TextField()         # PHI
    refills_remaining        = IntegerField(default=0)
    status                   = CharField(choices=STATUS_CHOICES, max_length=10)
    prescribed_at            = DateTimeField(auto_now_add=True)
```

### Diagnosis *(PHI entity — linked to Appointment)*

```python
class Diagnosis(Model):
    SEVERITY_CHOICES = ["mild","moderate","severe"]

    id                    = UUIDField(primary_key=True, default=uuid4)
    appointment           = ForeignKey(Appointment, on_delete=PROTECT)
    patient               = ForeignKey(Patient, on_delete=PROTECT)
    icd10_code_encrypted  = TextField()            # PHI — ICD-10 code
    description_encrypted = TextField()            # PHI — clinical description
    severity              = CharField(choices=SEVERITY_CHOICES, max_length=10)
    diagnosed_at          = DateTimeField(auto_now_add=True)
```

### AuditLog *(immutable — no update/delete permitted)*

```python
class AuditLog(Model):
    id          = UUIDField(primary_key=True, default=uuid4)
    actor_id    = UUIDField()                      # user who performed action
    action      = CharField(max_length=100)        # e.g. "phi.read", "auth.2fa_failed"
    entity_type = CharField(max_length=100)
    entity_id   = UUIDField(null=True, blank=True)
    ip_address  = GenericIPAddressField()
    user_agent  = TextField(blank=True)
    metadata    = JSONField(default=dict)          # additional context, PHI-stripped
    created_at  = DateTimeField(auto_now_add=True)

    class Meta:
        # Enforce immutability at the model layer
        def save(self, *args, **kwargs):
            if self.pk:
                raise PermissionError("AuditLog records are immutable.")
            super().save(*args, **kwargs)
```

**Key Indexes:**

| Index | Purpose |
|---|---|
| `audit_log.actor_id, created_at` | User activity lookup |
| `audit_log.entity_type, entity_id` | PHI access history per record |
| `appointment.patient_id, scheduled_at` | Patient schedule queries |
| `appointment.doctor_id, scheduled_at` | Doctor schedule queries |
| `appointment.status` | Filter by status |
| `prescription.patient_id, status` | Active prescriptions per patient |
| `patient.ssn_hash` | SSN exact-match lookup |

---

## 3. API Endpoints

### Auth (`/api/auth/`)

| Method | Route | Auth | Roles | Summary |
|---|---|---|---|---|
| POST | `/auth/login` | No | — | Email + password + optional TOTP code; returns access token + sets HttpOnly refresh cookie |
| POST | `/auth/refresh` | No | — | Silent refresh — reads HttpOnly cookie, returns new access token |
| POST | `/auth/logout` | Yes | any | Revoke refresh token (blacklist in Redis) |
| POST | `/auth/forgot-password` | No | — | Send password reset email (rate limited: 3/15min per email) |
| POST | `/auth/reset-password/:token` | No | — | Consume single-use token, set new password |
| POST | `/auth/totp/setup` | Yes | doctor, admin | Generate TOTP secret; returns provisioning URI for authenticator app |
| POST | `/auth/totp/verify` | Yes | doctor, admin | Verify TOTP code + enable 2FA on account |

### Patients (`/api/patients/`)

| Method | Route | Auth | Roles | Summary |
|---|---|---|---|---|
| GET | `/patients/me` | Yes | patient | Own decrypted profile (PHI audit logged) |
| PATCH | `/patients/me` | Yes | patient | Update own profile (re-encrypts changed fields) |

### Doctors (`/api/doctors/`)

| Method | Route | Auth | Roles | Summary |
|---|---|---|---|---|
| GET | `/doctors/` | Yes | any | List available doctors — name, specialty, bio only. No PHI. |
| GET | `/doctors/:id` | Yes | any | Doctor detail |

### Appointments (`/api/appointments/`)

| Method | Route | Auth | Roles | Summary |
|---|---|---|---|---|
| GET | `/appointments/` | Yes | patient, doctor | Patient sees own; doctor sees own schedule |
| POST | `/appointments/` | Yes | patient | Book appointment; creates Daily.co room |
| GET | `/appointments/:id` | Yes | patient, doctor | Detail (PHI audit logged) |
| PATCH | `/appointments/:id` | Yes | patient, doctor | Patient: cancel. Doctor: update status |
| GET | `/appointments/:id/join` | Yes | patient, doctor | Get Daily.co room token (scoped to this user) |

### Medical Records (`/api/records/`)

| Method | Route | Auth | Roles | Summary |
|---|---|---|---|---|
| GET | `/records/` | Yes | patient, doctor | Patient: own records. Doctor: records they created |
| POST | `/records/` | Yes | doctor | Create record + optional S3 file attachment |
| GET | `/records/:id` | Yes | patient, doctor | Detail + 5min pre-signed S3 download URL (PHI audit logged) |
| GET | `/records/:id/download` | Yes | patient, doctor | Redirect to fresh S3 pre-signed URL |

### Prescriptions (`/api/prescriptions/`)

| Method | Route | Auth | Roles | Summary |
|---|---|---|---|---|
| GET | `/prescriptions/` | Yes | patient, doctor | Patient: own. Doctor: own patients' |
| POST | `/prescriptions/` | Yes | doctor | Create prescription |
| GET | `/prescriptions/:id` | Yes | patient, doctor | Detail (PHI audit logged) |
| PATCH | `/prescriptions/:id` | Yes | doctor | Update refills or status |
| POST | `/prescriptions/:id/request-refill` | Yes | patient | Patient requests refill; notifies doctor |

### Webhooks (`/api/webhooks/`)

| Method | Route | Auth | Roles | Summary |
|---|---|---|---|---|
| POST | `/webhooks/daily` | No (HMAC) | — | Daily.co session events — HMAC-SHA256 verified; processed async |

### Admin (`/api/admin/`)

| Method | Route | Auth | Roles | Summary |
|---|---|---|---|---|
| GET | `/admin/users/` | Yes | admin | List all users with pagination |
| PATCH | `/admin/users/:id` | Yes | admin | Activate or deactivate account |
| GET | `/admin/audit-log/` | Yes | admin | Paginated audit log (filter by actor, action, date range) |

### Health (`/api/health/`)

| Method | Route | Auth | Summary |
|---|---|---|---|
| GET | `/health/live` | No | Liveness — always 200 if process is up |
| GET | `/health/ready` | No | Readiness — checks DB + Redis + Celery; 200 or 503 |

---

## 4. HIPAA Compliance Measures

### PHI Field Encryption

All PHI fields use **AES-256-GCM** via a custom `EncryptedField` descriptor backed by `core/encryption.py`.

```python
# core/encryption.py (interface)
def encrypt(plaintext: str, key: bytes) -> str:
    """Returns base64(nonce + ciphertext + tag) — unique nonce per call."""

def decrypt(ciphertext: str, key: bytes) -> str:
    """Decrypts base64-encoded AES-256-GCM blob."""

def hmac_sha256(value: str, key: bytes) -> str:
    """HMAC-SHA256 hex digest — used for searchable hashes."""
```

- `FIELD_ENCRYPTION_KEY` — 32-byte hex in environment. Never in source code.
- `FIELD_ENCRYPTION_KEY_PREV` — previous key for rotation window.
- Decryption runs only in serializer `to_representation()`. Never cached in model instances.
- Nonce is unique per encryption call — ciphertext is never deterministic.

### Searchable PHI

For fields that require exact-match lookups (SSN, future email dedup), an HMAC-SHA256 digest is stored alongside the encrypted value:

```
Patient.ssn_hash  = HMAC-SHA256(ssn, HMAC_KEY)
Patient.ssn_encrypted = AES-256-GCM(ssn, FIELD_ENCRYPTION_KEY)
```

This allows `Patient.objects.filter(ssn_hash=hmac_sha256(input_ssn, HMAC_KEY))` without ever decrypting stored values.

### PHI Audit Log

Every read or write on a PHI entity automatically writes an `AuditLog` row. This is enforced via a DRF mixin applied to all PHI viewsets:

| Trigger | Action logged |
|---|---|
| GET MedicalRecord | `phi.read` |
| POST MedicalRecord | `phi.write` |
| GET/PATCH Patient (own) | `phi.read` / `phi.write` |
| GET/POST/PATCH Prescription | `phi.read` / `phi.write` |
| GET/POST Diagnosis | `phi.read` / `phi.write` |
| Failed TOTP attempt | `auth.2fa_failed` |
| Login success/failure | `auth.login` / `auth.login_failed` |

### Minimum Necessary (Role-Scoped Serializers)

```
PatientSerializer          → patient viewing own profile (all decrypted PHI)
DoctorPatientSerializer    → doctor viewing a patient (name + DOB only; no SSN)
PublicDoctorSerializer     → anonymous listing (name, specialty, bio — no PHI)
AdminUserSerializer        → admin user management (no PHI fields)
```

No serializer returns PHI to a role that does not have clinical need.

### Business Associate Agreements (BAA)

The following BAAs **must be signed before production launch**:

| Vendor | Purpose | BAA status |
|---|---|---|
| AWS S3 | PHI file storage | Required |
| Daily.co | Video sessions | Required (HIPAA-eligible plan) |
| Resend | Appointment notifications | Required |
| Twilio | SMS reminders | Required |
| Upstash Redis | Session + rate-limit store | Required (Enterprise plan) |

### Data Retention

- PHI records retained **7 years** per HIPAA minimum standard.
- Hard deletion requires an explicit legal-hold check via `core/retention.py`.
- Soft-delete flag `deleted_at` used for patient-initiated removal requests; physical deletion deferred to retention scheduler.

### Incident Response

- HIPAA requires breach notification within **60 days** of discovery.
- Sentry alert fires if error rate > 1% over 5 minutes — triggers on-call runbook.
- `AuditLog` provides forensic trail for breach scope assessment.

### Log & Telemetry PHI Stripping

```python
# structlog processor — runs before every log emission
REDACTED_KEYS = {"password", "token", "ssn", "diagnosis",
                 "medication_name", "patient_name", "date_of_birth"}

def strip_phi(logger, method, event_dict):
    for key in REDACTED_KEYS:
        if key in event_dict:
            event_dict[key] = "[REDACTED]"
    return event_dict
```

Sentry `before_send` hook removes `patient_name`, `ssn`, `diagnosis`, `medication` from exception contexts before transmission.

---

## 5. Security Measures

### HTTP Security Headers

Custom `SecurityHeadersMiddleware` sets:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; frame-ancestors 'none'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### CORS

`django-cors-headers` with `CORS_ALLOWED_ORIGINS` sourced from environment variable. No wildcard origins in production.

### Rate Limiting

`django-ratelimit` applied at view level:

| Endpoint | Limit | Key |
|---|---|---|
| `POST /auth/login` | 10 req/min | IP |
| `POST /auth/forgot-password` | 3 req/15min | Email |
| `POST /auth/totp/verify` | 5 req/min | IP + user_id |
| All other `/auth/` | 20 req/min | IP |

### 2FA Enforcement

- `django-otp` TOTP via `TOTPDevice` model.
- `TOTPEnforcementMiddleware` checks every authenticated request: if `user.role in ["doctor","admin"]` and `user.totp_enabled is False`, returns `403` with `{"code": "2fa_required"}`.
- IP blocking: 5 consecutive TOTP failures → 1-hour block stored in Redis key `ip_block:{ip}`.

### Password Security

- `Argon2id` hashing via `django[argon2]`.
- Minimum requirements: 8 chars, mixed case, at least one digit.
- Reset tokens: HMAC-SHA256 stored hash, single-use, 1-hour expiry.

### Dependency & Secret Scanning

| Tool | Trigger | Action on failure |
|---|---|---|
| `pip-audit` | CI on every push | Block merge on HIGH/CRITICAL CVE |
| `detect-secrets` | Pre-commit + CI | Block commit/merge on new secret detected |
| `bandit` | CI | Warn on HIGH severity findings |

---

## 6. Observability

### Structured Logging

`structlog` configured for JSON output with mandatory fields on every log line:

```json
{
  "timestamp": "2026-04-02T14:23:01Z",
  "level": "info",
  "event": "phi.read",
  "request_id": "a1b2c3d4",
  "user_id": "uuid",
  "role": "doctor",
  "entity_type": "MedicalRecord",
  "entity_id": "uuid",
  "ip": "1.2.3.4"
}
```

PHI values (`patient_name`, `ssn`, `diagnosis`, `medication_name`) are never emitted to logs.

### Correlation ID

`CorrelationIdMiddleware` reads `X-Request-ID` header (or generates a UUID4 if absent), injects into structlog context, and echoes back in response headers. All downstream Celery tasks receive the correlation ID for end-to-end tracing.

### Health Checks

**`GET /health/live`** — Always `200 {"status": "ok"}`. Confirms process is running.

**`GET /health/ready`** — Checks all dependencies:

```python
checks = {
    "db":     db_ping(),       # SELECT 1
    "redis":  redis_ping(),    # PING
    "celery": celery_ping(),   # inspect().ping() with 2s timeout
}
# Returns 200 if all pass, 503 with failed checks listed if any fail
```

### Metrics

`django-prometheus` middleware exposes `/metrics` (Prometheus scrape endpoint):

| Metric | Type | Description |
|---|---|---|
| `http_request_duration_seconds` | Histogram | Latency by method + route + status |
| `http_requests_total` | Counter | Request count by method + route + status |
| `celery_task_total` | Counter | Task completions by name + state |
| `phi_access_total` | Counter | PHI reads/writes by entity type |

### Sentry

```python
sentry_sdk.init(
    dsn=env("SENTRY_DSN"),
    traces_sample_rate=0.1,
    before_send=strip_phi_from_event,   # removes PHI from exception context
)
```

Alert rule: Sentry issue alert fires when error rate exceeds 1% over any 5-minute window.

### Distributed Tracing

Deferred to v1.1. OpenTelemetry SDK (`opentelemetry-sdk` + `opentelemetry-instrumentation-django`) will be added then with traces exported to a self-hosted Tempo or Grafana Cloud endpoint.

---

## 7. Celery Tasks

All tasks are idempotent. Failed tasks retry with exponential backoff and move to a dead-letter queue after max retries.

| Task | Queue | Trigger | Retry | Description |
|---|---|---|---|---|
| `send_appointment_reminder` | `notifications` | Celery Beat: 24h + 1h before `scheduled_at` | 3x backoff | Sends Resend email + Twilio SMS to patient |
| `send_prescription_ready` | `notifications` | Prescription created | 3x backoff | Notifies patient via Resend email |
| `process_daily_webhook` | `webhooks` | `POST /webhooks/daily` received | 5x backoff | Handles session-completed events; updates Appointment status |
| `cleanup_expired_tokens` | `maintenance` | Celery Beat: daily at 02:00 UTC | 2x | Deletes expired password reset tokens + used 2FA setup tokens |

### Celery Beat Schedule

```python
CELERY_BEAT_SCHEDULE = {
    "reminder-24h": {
        "task": "worker.tasks.notifications.send_appointment_reminder",
        "schedule": crontab(minute="*/5"),   # scans for appointments in 24h window
    },
    "cleanup-tokens": {
        "task": "worker.tasks.cleanup.cleanup_expired_tokens",
        "schedule": crontab(hour=2, minute=0),
    },
}
```

---

## 8. Environment Variables

```bash
# Django Core
SECRET_KEY=
DEBUG=false
ALLOWED_HOSTS=
DATABASE_URL=

# Auth
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# Encryption (PHI)
FIELD_ENCRYPTION_KEY=          # 32-byte hex — AES-256-GCM encryption key
FIELD_ENCRYPTION_KEY_PREV=     # previous key — used during key rotation window
HMAC_KEY=                      # 32-byte hex — for searchable HMAC hashes (ssn_hash etc.)

# CORS
CORS_ALLOWED_ORIGINS=

# Redis / Celery
REDIS_URL=

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=
STORAGE_SIGNED_URL_TTL=300     # 5 minutes — pre-signed download URL TTL

# Daily.co
DAILY_API_KEY=
DAILY_WEBHOOK_SECRET=          # HMAC-SHA256 secret for webhook verification

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=

# SMS (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Observability
LOG_LEVEL=info
SERVICE_NAME=telemed-api
SENTRY_DSN=
```

> All sensitive vars must be set via `fly secrets set` — never committed to source control. `detect-secrets` baseline enforced in CI.

---

## 9. Deployment Notes (Fly.io)

### Apps

Two separate Fly apps share one Fly Postgres cluster and one Upstash Redis instance:

| App | Fly app name | Command | HTTP listener |
|---|---|---|---|
| API | `telemed-api` | `gunicorn telemed.wsgi` | Yes — port 8000 |
| Worker | `telemed-worker` | `celery -A celery_app worker -B -l info` | No |

### Fly Postgres

Use a **dedicated** Fly Postgres cluster (not the shared plan) for HIPAA isolation. Enable:
- Automated daily backups with 30-day retention.
- Private networking only — no public IP.

### Upstash Redis

**Enterprise plan** required for HIPAA BAA. Configure with TLS (`rediss://`) and eviction policy `noeviction` for the token blacklist keyspace.

### Health Checks (`fly.toml` — api app)

```toml
[[services.http_checks]]
  interval = "15s"
  timeout  = "5s"
  path     = "/api/health/ready"
  method   = "GET"
  headers  = {}
```

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml  (simplified)
steps:
  - pip-audit --requirement requirements/production.txt   # block on HIGH/CRITICAL
  - detect-secrets scan --baseline .secrets.baseline       # block on new secrets
  - pytest --cov=. --cov-fail-under=80                    # block below 80% coverage
  - fly deploy --app telemed-api    --config apps/api/fly.toml
  - fly deploy --app telemed-worker --config apps/worker/fly.toml
```

Deployments to `main` only. Feature branches run audit + test steps without deploying.

### Key Rotation Procedure

1. Generate new 32-byte hex key.
2. Set `FIELD_ENCRYPTION_KEY_PREV` = current `FIELD_ENCRYPTION_KEY`.
3. Set `FIELD_ENCRYPTION_KEY` = new key.
4. Run management command `manage.py rotate_phi_encryption` — re-encrypts all PHI fields with new key.
5. Clear `FIELD_ENCRYPTION_KEY_PREV` after successful rotation.

---

## 10. File Structure

```
telemed/
├── apps/
│   ├── api/                          # Django project
│   │   ├── telemed/
│   │   │   ├── settings/
│   │   │   │   ├── base.py
│   │   │   │   ├── production.py
│   │   │   │   └── test.py
│   │   │   ├── urls.py
│   │   │   └── wsgi.py
│   │   ├── core/
│   │   │   ├── middleware/
│   │   │   │   ├── correlation_id.py       # X-Request-ID injection
│   │   │   │   ├── security_headers.py     # CSP, HSTS, X-Frame-Options
│   │   │   │   └── totp_enforcement.py     # Blocks doctor/admin if 2FA not enrolled
│   │   │   ├── encryption.py               # AES-256-GCM encrypt/decrypt + HMAC
│   │   │   ├── audit.py                    # AuditLog write helpers + PHI mixin
│   │   │   ├── health.py                   # /health/live + /health/ready views
│   │   │   ├── permissions.py              # IsDoctor, IsPatient, IsAdmin DRF permissions
│   │   │   └── retention.py                # Legal hold check before hard delete
│   │   ├── apps/
│   │   │   ├── users/
│   │   │   │   ├── models.py               # User, Patient, Doctor
│   │   │   │   ├── serializers.py          # Role-scoped serializers
│   │   │   │   ├── views.py
│   │   │   │   └── urls.py
│   │   │   ├── appointments/
│   │   │   │   ├── models.py
│   │   │   │   ├── serializers.py
│   │   │   │   ├── views.py
│   │   │   │   └── urls.py
│   │   │   ├── records/                    # MedicalRecord
│   │   │   │   ├── models.py
│   │   │   │   ├── serializers.py
│   │   │   │   ├── views.py
│   │   │   │   └── urls.py
│   │   │   ├── prescriptions/
│   │   │   │   ├── models.py
│   │   │   │   ├── serializers.py
│   │   │   │   ├── views.py
│   │   │   │   └── urls.py
│   │   │   ├── diagnoses/
│   │   │   │   ├── models.py
│   │   │   │   ├── serializers.py
│   │   │   │   ├── views.py
│   │   │   │   └── urls.py
│   │   │   ├── webhooks/                   # Daily.co webhook consumer
│   │   │   │   ├── views.py
│   │   │   │   └── urls.py
│   │   │   └── admin_panel/
│   │   │       ├── views.py
│   │   │       └── urls.py
│   │   ├── requirements/
│   │   │   ├── base.txt
│   │   │   ├── production.txt
│   │   │   └── test.txt
│   │   ├── fly.toml                        # API app Fly.io config
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   ├── web/                                # Next.js 14
│   │   └── ...
│   │
│   └── worker/                             # Celery worker (separate Fly app)
│       ├── tasks/
│       │   ├── notifications.py            # send_appointment_reminder, send_prescription_ready
│       │   ├── webhooks.py                 # process_daily_webhook
│       │   └── cleanup.py                  # cleanup_expired_tokens
│       ├── fly.toml                        # Worker app Fly.io config
│       ├── Dockerfile
│       └── celery_app.py                   # Celery app init + Beat schedule
│
└── packages/
    ├── types/                              # Shared TypeScript types (consumed by web)
    └── config/                             # Shared Zod schemas
```

---

## 11. Implementation Order

1. **Database migrations** — all models, indexes, constraints
2. **Encryption layer** — `core/encryption.py`, `EncryptedField` descriptor, HMAC helper
3. **Auth module** — login, refresh, logout, forgot/reset password, JWT config
4. **2FA module** — TOTP setup + verify endpoints, `TOTPEnforcementMiddleware`
5. **User + Patient + Doctor models** — serializers, role-scoped views
6. **Security middleware** — `SecurityHeadersMiddleware`, `CorrelationIdMiddleware`
7. **Audit log infrastructure** — `AuditLog` model, write helper, PHI viewset mixin
8. **Appointments module** — CRUD, Daily.co room creation on book
9. **Medical Records module** — CRUD, S3 upload, 5-min pre-signed download URL
10. **Prescriptions module** — CRUD, refill request flow
11. **Diagnoses module** — CRUD, linked to appointment
12. **Daily.co webhook** — HMAC verification, async processing via Celery
13. **Celery worker** — notification tasks, cleanup task, Beat schedule
14. **Admin panel endpoints** — user management, audit log viewer
15. **Health checks** — `/health/live`, `/health/ready`
16. **Observability** — structlog JSON, Sentry init, django-prometheus
17. **CI pipeline** — pip-audit, detect-secrets, pytest --cov, fly deploy
18. **Test suite** — unit tests per app + integration tests for PHI encryption round-trip

---

## 12. Security & Compliance Checklist

### Security

- Rate limiting on all `/auth/` endpoints (django-ratelimit)
- Argon2id password hashing
- Refresh token rotation on every use; blacklist in Redis on logout
- TOTP mandatory for doctor + admin; IP block after 5 failures
- HMAC-SHA256 verification on Daily.co webhook before any processing
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options headers on all responses
- pip-audit blocks CI on HIGH/CRITICAL CVEs
- detect-secrets blocks CI on new detected secrets
- S3 bucket private — no public ACLs; all access via pre-signed URLs

### HIPAA Compliance

- AES-256-GCM encryption on all PHI fields at rest
- Unique nonce per encryption call — no deterministic ciphertext
- HMAC-SHA256 for searchable fields — no plaintext lookup
- `AuditLog` written on every PHI read/write — immutable rows
- Role-scoped serializers enforce minimum-necessary principle
- BAA required with AWS, Daily.co, Resend, Twilio, Upstash before go-live
- PHI never appears in logs or Sentry events (strip processor + beforeSend hook)
- 7-year data retention; hard delete blocked without legal-hold check
- 60-day breach notification SLA; on-call runbook triggered by Sentry alert

---

## 13. Risks & Edge Cases

| Risk | Mitigation |
|---|---|
| Encryption key compromise | Key rotation procedure; `FIELD_ENCRYPTION_KEY_PREV` for zero-downtime rotation |
| Doctor books with unavailable doctor | `is_available` check in appointment creation serializer |
| Concurrent refill requests | Database-level unique constraint + idempotency key on refill task |
| Daily.co room URL expired | Re-create room on join if session is stale; `daily_room_url` updated |
| Large file upload timeout | Use S3 multi-part pre-signed URL for files > 10MB |
| PHI in exception message | Sentry `before_send` strips known PHI keys; validated in test suite |
| Celery worker restarts mid-task | All tasks idempotent; Celery `acks_late=True` prevents double-processing |
| Admin views patient PHI | Admin PHI access audit-logged separately with `admin.phi_access` action tag |
| Token refresh race (concurrent tabs) | Refresh token family tracking; invalidate entire family on reuse detection |
| TOTP secret lost by doctor | Admin recovery flow: deactivate TOTP, force re-enroll; logged as `auth.totp_reset` |

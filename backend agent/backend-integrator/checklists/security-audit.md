# Security Audit Checklist

Use this checklist to validate that the backend design meets the mandatory security baseline before delivery.

Run this checklist after completing a `/blueprint` or `/scaffold` output, and before handing off to `/assemble`.

---

## 1. Authentication

- [ ] Authentication mechanism is explicitly defined (JWT / Session / OAuth2).
- [ ] Access tokens have a short expiration (≤ 15 minutes recommended).
- [ ] Refresh tokens are stored securely (HttpOnly Cookie or database-backed).
- [ ] Token invalidation strategy is defined (blacklist or session table).
- [ ] Logout endpoint revokes the active session/refresh token.
- [ ] Email verification flow is included (if registration is present).

---

## 2. Authorization & Access Control

- [ ] All protected routes are explicitly listed.
- [ ] All public (unauthenticated) endpoints are explicitly declared.
- [ ] Role-Based Access Control (RBAC) is defined if the UI has admin or privileged views.
- [ ] Permission checks are applied at the service layer — not just the route level.
- [ ] Multi-tenant queries are scoped by `workspace_id` / `organization_id` (if applicable).
- [ ] Users can only read/write data they own.

---

## 3. Input Validation

- [ ] All user-supplied inputs have DTOs / schema validation.
- [ ] No endpoint accepts raw, unvalidated input.
- [ ] Numeric bounds, string length limits, and enum constraints are defined.
- [ ] File uploads validate mime type server-side (not just extension).
- [ ] File size limits are enforced.

---

## 4. Secret Management

- [ ] No secrets or credentials are hardcoded in source code.
- [ ] All third-party integration credentials use environment variables.
- [ ] `.env.example` is present and documents all required variables.
- [ ] `.gitignore` includes `.env`, `.env.local`, `.env.production`.
- [ ] `.gitleaks.toml` or equivalent secret scanning config is present.

---

## 5. Endpoint Security

- [ ] Rate limiting is applied to:
  - [ ] Login / register endpoints (brute-force prevention)
  - [ ] Forgot password / OTP endpoints
  - [ ] Public search / listing endpoints
- [ ] Webhook endpoints verify provider signatures before processing.
- [ ] Idempotency keys are used for critical mutations (payments, orders).
- [ ] CORS policy is defined — not set to `*` in production.
- [ ] Sensitive operations require re-authentication or confirmation.

---

## 6. Data Protection

- [ ] Passwords are hashed with Argon2id or BCrypt (never MD5/SHA1).
- [ ] PII (Personal Identifiable Information) fields are identified.
- [ ] Soft delete is used where data must not be permanently erased immediately.
- [ ] Audit log is proposed for sensitive mutations (payment, role changes, deletes).
- [ ] Database connection uses SSL in production.

---

## 7. Integration Security

- [ ] External API calls are behind adapter/service layers.
- [ ] Provider-specific error handling is implemented inside adapters.
- [ ] Retry logic has limits (max 3 retries) to prevent thundering herd.
- [ ] Webhook payloads are logged before processing.
- [ ] Failed webhook events are moved to a Dead Letter Queue.

---

## 8. Infrastructure Security

- [ ] Dockerfiles do not run processes as root.
- [ ] Docker images use a minimal base (alpine or distroless where possible).
- [ ] CI pipeline includes a dependency vulnerability scan (`npm audit` / `trivy` / `snyk`).
- [ ] `SECURITY.md` file is present with vulnerability reporting instructions.
- [ ] Health check endpoint (`GET /health`) does not leak internal system state.

---

## 9. Observability Without Exposure

- [ ] Error responses do not leak stack traces in production.
- [ ] Logs do not include plaintext passwords, tokens, or PII.
- [ ] Log levels are environment-aware (verbose in dev, structured JSON in prod).
- [ ] Error tracking (Sentry / Datadog) is behind an adapter with env-var configuration.

---

## 10. Field-Level Encryption & Injection Prevention (security.md)

- [ ] PII fields are identified: email, phone, national ID, credit card data, health data.
- [ ] Field-level encryption (AES-256-GCM) is declared for all Tier 3+ PII fields.
- [ ] Searchable encrypted fields use a deterministic SHA-256 hash stored alongside ciphertext.
- [ ] Key rotation strategy is documented: `FIELD_ENCRYPTION_KEY` + `FIELD_ENCRYPTION_KEY_PREV`.
- [ ] `$queryRawUnsafe` is not used anywhere — all raw queries use parameterized `$queryRaw`.
- [ ] `child_process.exec` with user-derived input is not used — `execFile` with args array only.
- [ ] User-supplied file paths are validated with `path.resolve` + `startsWith(baseDir)`.
- [ ] Rich text / user-generated HTML is sanitized with DOMPurify before storage.
- [ ] Security headers middleware (Helmet.js / Starlette) is applied at the framework entry point.

---

## 11. Compliance Baseline (compliance.md — if applicable)

Apply this section when the project handles regulated data (health, financial, legal).

- [ ] Data classification tier is declared for every entity: Public / Internal / Confidential / Restricted.
- [ ] PHI-bearing entities (MedicalRecord, Prescription, Diagnosis) are explicitly identified.
- [ ] Every PHI read/write is logged via AuditService with `reason` field (treatment / payment / operations).
- [ ] Minimum necessary principle is applied — service methods select only required fields.
- [ ] BAA requirement is noted for every third-party service processing PHI.
- [ ] Data retention policy is defined per entity and automated deletion is proposed.
- [ ] Legal hold mechanism is declared if litigation risk exists.
- [ ] SOC2 evidence artifacts are declared: access review schedule, deployment log, vulnerability scan records.
- [ ] Incident response plan is referenced with notification timelines (GDPR: 72h, HIPAA: 60 days).

---

## Scoring

Count completed items. A backend plan is **not ready for implementation** if:

- Any item in sections 1, 2, 3, or 4 is unchecked.
- More than 2 items in sections 5, 6, or 7 are unchecked.
- Any item in section 11 is unchecked when the project handles PHI, PCI, or SOC2-scoped data.

Address all gaps before proceeding to `/assemble`.

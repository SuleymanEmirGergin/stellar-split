# Backend Delivery Checklist

Ensure that the backend design derived from frontend flows is production-ready and technically complete.

---

## 1. API Contracts
- [ ] All required endpoints are identified and listed.
- [ ] HTTP methods (GET, POST, PUT, PATCH, DELETE) are correctly assigned.
- [ ] Request body shapes (DTOs/Schemas) are defined for all mutations.
- [ ] Query parameters (filters, pagination, search) are defined for all GET routes.
- [ ] Success response shapes are consistent across the API.
- [ ] Validation rules are specified for every input field.
- [ ] Common error cases (400, 401, 403, 404, 409, 422, 500) are explicitly considered.

## 2. Data Modeling
- [ ] All primary and secondary entities are identified.
- [ ] Relationships (1:1, 1:N, N:M) are clearly defined.
- [ ] Primary keys and Foreign keys are identified.
- [ ] Proposed database indexes are listed for performance (Hot paths).
- [ ] Data ownership boundaries (User-owned vs Organization-owned) are explicit.
- [ ] Soft deletion or Audit tracking requirements are evaluated.

## 3. Security
- [ ] Authentication mechanism (JWT, Session, OAuth2) is clearly defined.
- [ ] Authorization / RBAC (Roles/Permissions) logic is mapped to actions.
- [ ] Protected vs Public routes are verified.
- [ ] Rate limiting strategy is considered for sensitive endpoints (Auth, Search).
- [ ] Data sanitation and protection against common vulnerabilities (SQLi, XSS) are implied.

## 4. Integrations
- [ ] External providers (Stripe, AWS, SendGrid, etc.) are isolated behind Adapter/Service layers.
- [ ] Webhook signature verification logic is defined.
- [ ] Retry and failure strategies for external API calls are considered.
- [ ] Idempotency keys are used for critical mutations (Payments, Orders).
- [ ] Provider-specific error handling is integrated into the service layer.

## 5. Async Processing
- [ ] Background jobs (Email, File processing, Notifications) are detected from frontend actions.
- [ ] Queue and Worker architecture is proposed (e.g., BullMQ, Redis).
- [ ] Heavy or long-running operations are removed from the request-response cycle.
- [ ] Job retry policies and dead-letter queue (DLQ) strategy are mentioned.

## 6. Operations / Infrastructure
- [ ] Comprehensive list of required Environment Variables is provided.
- [ ] Logging strategy for critical backend events is outlined.
- [ ] Database migration plan is mentioned.
- [ ] Testing strategy (Unit, Integration, E2E) is defined for critical flows.
- [ ] Health check and basic observability endpoints are included.

## 7. Security Hardening (security.md)
- [ ] Security headers (Helmet.js / Starlette middleware) are configured at the entry point.
- [ ] CORS policy uses an explicit origin whitelist — `origin: '*'` is not present.
- [ ] Input sanitization: DOMPurify for HTML content, `$queryRawUnsafe` banned, `execFile` used instead of `exec`.
- [ ] Path traversal prevention: `path.resolve` + `startsWith(baseDir)` applied to all user-supplied file paths.
- [ ] Mass assignment prevention: `whitelist: true` on global ValidationPipe (NestJS) or equivalent.
- [ ] PII fields identified and field-level AES-256-GCM encryption declared.
- [ ] Log masking configured: `password`, `token`, `secret`, `key`, `card` never appear in logs.
- [ ] Dependency scan step (`npm audit --audit-level=high` or `pip-audit`) included in CI.
- [ ] Anomaly detection declared for admin panel or high-sensitivity endpoints (IpBlockerService).

## 8. Observability (observability.md)
- [ ] Structured JSON logging configured (Pino / structlog) with service name and version in every log line.
- [ ] Correlation ID middleware generates/propagates `X-Request-ID` across all requests.
- [ ] `/health/live` and `/health/ready` endpoints defined and documented.
- [ ] Prometheus metrics declared for HTTP request duration and job duration (if background jobs exist).
- [ ] Error tracking configured (Sentry) with PII stripping in `beforeSend`.
- [ ] At minimum one alert rule defined: error rate or latency p99 threshold.

## 9. Compliance (compliance.md — if applicable)
- [ ] Data classification tier declared for every entity containing customer data (Public / Internal / Confidential / Restricted).
- [ ] PHI entities (health data, medical records) identified; HIPAA technical safeguards listed.
- [ ] BAA requirement noted for any third-party service that will process PHI.
- [ ] Data retention policy defined per entity type.
- [ ] Quarterly access review trigger declared (if SOC2 or HIPAA scope).
- [ ] Incident response plan referenced (if Tier 4 / Restricted data is present).

## 10. Final Delivery
- [ ] Full list of files/modules to be created is provided.
- [ ] Logical implementation order is defined (Dependencies first).
- [ ] All assumptions made during design are documented.
- [ ] Technical risks and edge cases are explicitly listed.
- [ ] Summary of frontend-to-backend field mapping is verified.

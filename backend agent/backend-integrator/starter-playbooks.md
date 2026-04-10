# Backend Architecture Playbooks

Domain-specific implementation guides for the `backend-integrator` agent. Use these to ensure consistent, production-grade implementation of complex backend systems.

---

## Domain Playbooks

### 1. [Authentication & Identity](./playbooks/auth.md)
- **Purpose**: User identity, session management, and access control.
- **Trigger**: Login, register, profile, password reset, protected routes, social login.
- **Components**: User entity, JWT/refresh tokens, auth guards, RBAC.

### 2. [Payments & Billing](./playbooks/payments.md)
- **Purpose**: External payment provider integration for one-time or recurring billing.
- **Trigger**: Checkout, pricing tables, billing settings, subscription management.
- **Components**: Customer/Subscription entities, Stripe adapter, webhook handlers.

### 3. [File Uploads & Storage](./playbooks/uploads.md)
- **Purpose**: File storage, metadata, and secure access management.
- **Trigger**: File/image inputs, galleries, avatar uploads, import flows, drag & drop zones.
- **Components**: File entity, StorageAdapter interface, signed URL generation, import workers.

### 4. [Notifications & Messaging](./playbooks/notifications.md)
- **Purpose**: Multi-channel notification delivery (email, SMS, push, in-app).
- **Trigger**: Notification bell, activity feeds, email confirmations, push subscriptions.
- **Components**: Notification entity, channel adapters, preference gating, broadcast workers.

### 5. [Analytics & Insights](./playbooks/analytics.md)
- **Purpose**: Event tracking, aggregation, and reporting.
- **Trigger**: Charts, KPI cards, date range pickers, funnel views, usage tracking.
- **Components**: AnalyticsEvent entity, aggregation cron jobs, export workers, Redis counters.

### 6. [Search & Discovery](./playbooks/search.md)
- **Purpose**: Full-text search, filtering, sorting, and autocomplete.
- **Trigger**: Search bars, filter panels, sort controls, autocomplete inputs, faceted results.
- **Components**: SearchQueryBuilder, PostgreSQL GIN index or external engine adapter, suggest cache.

### 7. [Multi-Tenancy](./playbooks/multi-tenancy.md)
- **Purpose**: Multi-tenant architecture with organization/workspace scoping.
- **Trigger**: "Organization", "Workspace", or "Team" concept, member management, invite flows, billing per org.
- **Components**: Organization + Membership entities, TenantGuard, RBAC matrix, invitation flow.

### 8. [Webhooks](./playbooks/webhooks.md)
- **Purpose**: Secure webhook consumption (from providers) and production (to customers).
- **Trigger**: Payment events, GitHub/external integrations, platform-style webhook delivery.
- **Components**: WebhookEvent entity, signature verification, idempotency, retry/DLQ, producer delivery workers.

### 9. [Caching](./playbooks/caching.md)
- **Purpose**: Redis-based caching strategies to reduce DB load and improve response times.
- **Trigger**: Dashboards, search results, autocomplete, public pages, expensive aggregations, rate-limited external APIs.
- **Components**: CacheService interface, TTL strategy table, cache key design, invalidation patterns, distributed lock.

### 10. [Audit Log](./playbooks/audit-log.md)
- **Purpose**: Immutable audit trail of all sensitive data mutations and security events.
- **Trigger**: "Activity log" page, admin panels, multi-tenant orgs, billing operations, GDPR/SOC2 compliance requirements.
- **Components**: AuditLog entity, AuditService, sensitive field scrubbing, action vocabulary, retention policy.

### 11. [Rate Limiting](./playbooks/rate-limiting.md)
- **Purpose**: Protect endpoints from brute-force, abuse, and unintentional overload.
- **Trigger**: Login/register forms, OTP/email actions, public APIs, file uploads, search endpoints.
- **Components**: Redis sliding window, limit tier table, Express/NestJS middleware, idempotency keys, bypass allowlist.

### 12. [Background Jobs](./playbooks/background-jobs.md)
- **Purpose**: Async processing of heavy or time-sensitive work outside the HTTP cycle.
- **Trigger**: Progress spinners, email sends, exports, bulk operations, scheduled reports, webhook delivery.
- **Components**: BullMQ queue definitions, retry strategy per job type, fan-out pattern, cron jobs, Bull Board monitoring.

### 13. [API Versioning](./playbooks/api-versioning.md)
- **Purpose**: Enable backward-compatible API evolution without breaking existing clients.
- **Trigger**: Multiple client types, public API/developer portal, mobile apps, enterprise clients.
- **Components**: URL path versioning, version lifecycle (current/deprecated/sunset), code sharing pattern, deprecation headers.

### 14. [Feature Flags](./playbooks/feature-flags.md)
- **Purpose**: Safe, gradual feature rollouts and plan-based gating without redeployment.
- **Trigger**: Beta banners, admin toggles, A/B tests, enterprise plan gating, kill switches.
- **Components**: FeatureFlag entity with overrides, FeatureFlagService evaluation engine, deterministic rollout, NestJS guard.

### 15. [Real-Time](./playbooks/realtime.md)
- **Purpose**: Live data delivery via WebSocket, SSE, or server-side push.
- **Trigger**: Chat UIs, live dashboards, notification bells, progress bars, presence indicators, typing status.
- **Components**: SSE endpoint, Socket.IO gateway, Redis pub/sub adapter, presence system, event naming convention.

### 16. [API Keys](./playbooks/api-keys.md)
- **Purpose**: Machine-to-machine authentication with scoped, rotatable API keys.
- **Trigger**: API Keys settings page, developer portal, CLI tool auth, external integrations section.
- **Components**: ApiKey entity (hash-only storage), key generator, scope middleware, rotation with grace period.

### 17. [GDPR & Data Export](./playbooks/gdpr-data-export.md)
- **Purpose**: GDPR/KVKK compliance: async data export, account anonymization, and consent management.
- **Trigger**: "Download my data" button, account deletion flow, privacy settings page, cookie consent banner.
- **Components**: DataExportRequest entity, Consent entity, generate-data-export BullMQ job, AccountDeletionService.

### 18. [LLM Integration](./playbooks/llm-integration.md)
- **Purpose**: LLM provider integration: conversational AI, single-shot completion, semantic search, and RAG.
- **Trigger**: AI chat widget, "Generate with AI" buttons, semantic search, "similar items" recommendations, content moderation.
- **Components**: LLMAdapter interface, OpenAIAdapter, Conversation + Message entities, pgvector semantic search, ModerationService.

### 19. [File Processing](./playbooks/file-processing.md)
- **Purpose**: Async file processing pipeline: image transformation, PDF extraction, video transcoding, CSV import, and OCR.
- **Trigger**: Video upload with player, PDF viewer, "Process/Convert/Resize" buttons, image galleries with thumbnails, CSV/Excel import with progress indicator.
- **Components**: FileProcessingJob entity, image/video/pdf/csv/ocr processors, SSE progress endpoint.

### 20. [Security](./playbooks/security.md)
- **Purpose**: Cross-cutting security hardening: headers, CORS, injection prevention, field-level encryption, secrets management, dependency scanning, anomaly detection.
- **Trigger**: Apply to every project. Priority for: PII forms, admin panels, public APIs, multi-tenant apps, payment flows.
- **Components**: EncryptionService (AES-256-GCM), IpBlockerService, SecurityAlertService, Helmet middleware, CORS config.

### 21. [Compliance](./playbooks/compliance.md)
- **Purpose**: Architecture patterns for SOC2 Type II, HIPAA, ISO 27001, and PCI-DSS compliance — produces audit evidence, not just policies.
- **Trigger**: SOC2 badge, health/medical data (PHI), enterprise contracts with security questionnaires, government/regulated-industry clients.
- **Components**: Data classification tiers, ComplianceEvidenceService, IncidentRecord entity, quarterly access review cron, data retention jobs, legal hold mechanism.

### 22. [Observability](./playbooks/observability.md)
- **Purpose**: Production visibility — structured logging, distributed tracing, health checks, Prometheus metrics, error tracking, alerting rules.
- **Trigger**: Any production deployment (minimum: structured logging + health checks). Multi-service architecture, SLA commitments, admin dashboards with error rates.
- **Components**: Pino structured logger with correlation IDs, OpenTelemetry SDK, `/health/live` + `/health/ready` endpoints, prom-client metrics, Sentry integration.

### 23. [File Storage (Advanced)](./playbooks/file-storage.md)
- **Purpose**: S3/R2 multipart upload for large files, virus scanning pipeline, CDN integration, and storage lifecycle management. Apply alongside `uploads.md`.
- **Trigger**: File uploads >10 MB, video uploads, `image/dicom` or `application/octet-stream` types, virus scan requirement, HIPAA document storage, CDN/edge delivery mentioned.
- **Components**: StorageService, MultipartService, VirusScanJob (ClamAV), S3Provider/R2Provider, File status state machine (PENDING_SCAN → READY | QUARANTINED), S3 lifecycle rules.

### 24. [Idempotency](./playbooks/idempotency.md)
- **Purpose**: Ensure state-changing operations produce the same result regardless of how many times they are retried — payment charges, job dispatches, webhook processing, and form double-submit protection.
- **Trigger**: Payment or refund endpoints (Stripe, Paddle), background job dispatch from HTTP handlers, webhook event processing, mobile/IoT auto-retry clients, "Submit" buttons without client-side debounce, import/bulk mutation endpoints, distributed transactions across 2+ services.
- **Components**: IdempotencyGuard (Redis SETEX 24h TTL), BullMQ deterministic `jobId`, WebhookEvent deduplication table (unique constraint on `[provider, eventId]`), row hash upsert for imports, optimistic lock (`version` field) for inventory/status transitions.

### 25. [Resilience](./playbooks/resilience.md)
- **Purpose**: Protect backends from cascading failures caused by transient errors or unresponsive external services — circuit breaker, retry with exponential backoff + jitter, timeout policy, and bulkhead / concurrency limiting.
- **Trigger**: Payment forms calling Stripe, notification buttons calling Twilio/SendGrid, AI features calling OpenAI/Claude, any loading spinner > 2 seconds, "Retry" buttons on error states, "Service temporarily unavailable" error states, webhook delivery status tracking.
- **Components**: `opossum` CircuitBreaker (Node.js) / `pybreaker` (Python), `p-retry` / `tenacity` retry with jitter, `AbortController` + `httpx.Timeout` timeout policies, `p-limit` / `asyncio.Semaphore` bulkhead, circuit breaker state exposed in `/health/ready`.

---

## Stack Guides

Framework-specific implementation patterns:

### [NestJS](./stacks/nestjs.md)
Modules, Guards, Pipes, Interceptors, BullMQ, Prisma, Config, testing setup, and common pitfalls.

### [FastAPI](./stacks/fastapi.md)
Pydantic v2 schemas, async SQLAlchemy, Alembic, Celery, Depends (DI pattern), exception handlers, and pytest setup.

### [Express.js](./stacks/express.md)
Zod validation middleware, auth/role guards, Router pattern, service/repository layers, global error handler, BullMQ, Zod config validation, and Supertest E2E testing.

### [Prisma ORM](./stacks/prisma.md)
Schema design, ID strategies, relationships, indexes, soft deletes, transactions, pagination patterns, migrations, seeding, and common pitfalls.

### [Drizzle ORM](./stacks/drizzle.md)
TypeScript-first SQL-like ORM. Drizzle vs Prisma comparison, schema + relations, postgres/Neon connection, full query examples, transactions, cursor pagination, drizzle-kit migrations, full-text search, common pitfalls.

### [Hono](./stacks/hono.md)
Edge-first, ultra-fast framework for Cloudflare Workers, Bun, and Node.js. Multi-runtime entry points, Zod validator, type-safe context, auth middleware, D1 database, native fetch testing, built-in middleware reference.

### [Bun / Elysia.js](./stacks/bun.md)
Bun runtime with Elysia.js framework. Native TypeScript, built-in test runner, TypeBox schema validation, Bun-native workers, Prisma/Drizzle integration, Dockerfile for `oven/bun` image.

### [Django / DRF](./stacks/django.md)
Django + Django REST Framework for Python backends. Custom User model, DRF serializers + ViewSets, SimpleJWT auth, Celery background tasks, pytest-django test patterns, common pitfalls.

### [Supabase](./stacks/supabase.md)
Supabase as BaaS or infrastructure layer. Row Level Security policy patterns, custom JWT verification, Storage bucket policies, Edge Functions (Deno), Realtime subscriptions, when to eject.

---

## Checklists

Use before delivering any backend work:

| Checklist | When to Use |
|---|---|
| [Backend Delivery](./checklists/backend-delivery.md) | Is the backend plan complete? |
| [Security Audit](./checklists/security-audit.md) | Are security rules applied correctly? |
| [Testing Strategy](./checklists/testing-strategy.md) | Is the test architecture defined? |
| [Repo Delivery](./checklists/repo-delivery.md) | Is the repository structure ready? |

---

## How to Use a Playbook

1. **Identify**: Use the trigger descriptions above to select relevant playbooks.
2. **Invoke**: When using the `backend-integrator`, mention the playbook:
   ```
   /blueprint — Apply the multi-tenancy playbook for this SaaS project
   ```
3. **Execute**: The agent reads the playbook and applies its entity, endpoint, security, and environment variable patterns to the project.

# Backend Integrator Agent Rules

These rules define the non-negotiable constraints for the Backend Integrator Agent.

The agent must always follow these rules when designing backend systems from frontend flows.

---

# 1. API Contract First

Never implement endpoints before defining the API contract.

Each endpoint must specify:

- HTTP method
- route path
- request body
- query parameters
- response shape
- validation rules
- possible error states

No endpoint should exist without a clearly defined contract.

---

# 2. Frontend Field Mapping

Every frontend form field must map to a validated backend input.

Rules:

- each field must appear in a DTO/schema
- each field must have validation
- optional vs required must be explicit
- types must match frontend expectations

Never accept unvalidated user input.

---

# 3. Integration Safety

External services must never be used directly inside controllers.

All integrations must go through:

- adapters
or
- service modules

Example:

Bad:
controller → Stripe API

Good:
controller → paymentService → stripeAdapter

---

# 4. Environment Variable Discipline

Secrets must never be hardcoded.

All external integrations must use environment variables.

Example env vars:

STRIPE_SECRET_KEY  
SENDGRID_API_KEY  
AWS_ACCESS_KEY  
AWS_SECRET_KEY  
REDIS_URL  

The agent must always list required environment variables.

---

# 5. Mutation Endpoint Safety

For any endpoint that modifies data:

- define validation rules
- define permission checks
- define error states
- define idempotency where needed

Mutation endpoints must never silently fail.

---

# 6. Authentication Awareness

If the frontend includes:

- login
- profile
- user dashboard
- protected routes

Then authentication must be implemented.

Auth flows must include:

- login
- token/session handling
- refresh mechanism
- logout
- password reset (if applicable)

---

# 7. Authorization / RBAC

If the frontend includes admin or privileged actions, define permissions.

Examples:

- admin dashboard
- product management
- user management
- billing control

Authorization must include:

- roles
- permission checks
- guard/middleware logic

---

# 8. File Upload Handling

If frontend includes file uploads:

The backend must define:

- storage provider
- file size limits
- accepted mime types
- upload endpoint
- storage path structure
- access control

Never allow unrestricted uploads.

---

# 9. Background Job Detection

If the frontend implies asynchronous work such as:

- email sending
- notifications
- image processing
- analytics generation
- payment confirmations
- imports/exports

Then define:

- queue system
- job worker
- retry strategy
- failure handling

Do not process heavy tasks in request handlers.

---

# 10. Webhook Safety

If payment or external services are used, webhook handling must include:

- signature verification
- idempotency protection
- retry handling
- logging

Never trust raw webhook payloads.

---

# 11. Pagination and Filtering

If frontend shows lists or tables, backend must support:

- pagination
- filtering
- sorting
- search (when implied)

Do not return unbounded datasets.

---

# 12. Indexing

For entities that are frequently queried:

- define database indexes
- consider composite indexes for filters
- identify hot query paths

Performance must be considered early.

---

# 13. Error Handling

Every endpoint must define:

- validation errors
- permission errors
- not found errors
- integration errors
- internal errors

Error responses must be consistent.

---

# 14. Response Consistency

All API responses must follow a consistent structure.

Example:

{
  "success": true,
  "data": {},
  "error": null
}

Avoid inconsistent response shapes.

---

# 15. Rate Limiting

If the API includes:

- authentication endpoints
- public endpoints
- search endpoints

Rate limiting must be considered.

---

# 16. Logging and Observability

Critical backend actions must include logging.

Examples:

- authentication attempts
- payment events
- webhook processing
- integration failures

Logs should allow production debugging.

---

# 17. Multi-Tenant Awareness

If the frontend implies:

- teams
- workspaces
- organizations

Then the backend must support multi-tenant structures.

This includes:

- tenant ownership
- tenant isolation
- tenant-aware queries

---

# 18. Data Ownership

Every entity must define ownership boundaries.

Example:

user → posts  
workspace → projects  
organization → teams

Ownership must be explicit.

---

# 19. Assumption Transparency

If information is missing:

- infer conservatively
- explicitly state assumptions
- avoid inventing features not implied by UI

---

# 20. Implementation Completeness

A backend plan is not complete unless it includes:

- entities
- API contracts
- validation
- integrations
- environment variables
- file/module structure
- implementation order
- edge cases

Partial solutions are not acceptable.

---

# 21. Security Hardening Checklist

Every backend plan must include a security baseline.

Rules:
- All auth endpoints must define rate limiting.
- All mutation endpoints must define permission checks.
- All integration credentials must use environment variables (never hardcoded).
- Webhook endpoints must verify signatures.
- File uploads must define mime type restrictions and size limits.
- All public or unauthenticated endpoints must be explicitly declared.

---

# 22. Handoff Automation

Backend output must be consumable by downstream agents.

Rules:
- Produce a `frontend-backend-handoff.json` file following the `frontend-backend-handoff.schema.json` upon task completion.
- The handoff file must include all pages, forms, tables, actions, auth flows, uploads, and external triggers that were analyzed.
- This file enables the Repo Builder Agent or a CI validation agent to proceed without re-reading prose.

---

# 23. Observability Requirements

Production backend systems must include observability hooks.

Rules:
- Define structured logging for: auth events, mutation endpoints, integration calls, and webhook processing.
- Define health check endpoint (`GET /health`).
- Define error tracking integration point (e.g., Sentry, Datadog) as an env-var-backed adapter.
- Propose metrics collection points for high-traffic endpoints.

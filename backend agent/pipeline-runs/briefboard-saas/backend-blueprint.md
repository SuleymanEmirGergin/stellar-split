# BriefBoard — Backend Blueprint

**Command:** `/blueprint`  
**Stack:** NestJS + PostgreSQL + Prisma + BullMQ + Redis  
**Input:** `frontend-backend-handoff.json` (validated — PASS, 14/14 checks)

---

## 1. Frontend Inference Summary

| Signal | Detected |
|---|---|
| Multi-tenancy | ✅ Organization-scoped. All data isolated by `organization_id` |
| Authentication | ✅ JWT + refresh token. Email verification required |
| RBAC | ✅ 3 roles: `owner`, `member`, `client` |
| File uploads | ✅ S3 private bucket, signed URL access, 50MB max |
| Email (async) | ✅ Invitations, password reset, update notifications |
| Payments | ✅ Stripe subscriptions + webhook consumer |
| Analytics | ✅ PostHog event tracking (isolated adapter) |
| Background jobs | ✅ Email delivery, Stripe webhook processing |
| Real-time | ❌ Not implied in v1 (comment threads are static) |
| Search | ✅ Project list search (name + client name) |
| Caching | ✅ Implied by KPI dashboard (aggregate queries) |
| Soft delete | ✅ Projects use soft delete |
| Audit log | ✅ Implied by privileged actions (remove member, revoke access) |

**Playbooks applied:** `auth.md`, `multi-tenancy.md`, `payments.md`, `uploads.md`, `notifications.md`, `webhooks.md`, `background-jobs.md`, `analytics.md`, `search.md`, `caching.md`, `audit-log.md`, `testing.md`

---

## 2. Entities & Relationships

```
Organization
  id, name, slug (unique), logo_url, stripe_customer_id, plan_id
  created_at, deleted_at

User
  id, email (unique), full_name, password_hash, email_verified_at
  created_at, updated_at

Membership                           ← agency team members
  id, organization_id → Organization
  user_id → User
  role: owner | member
  joined_at

Client                               ← client contact record
  id, organization_id → Organization
  name, email
  created_at

ClientAccess                         ← portal access per project
  id, client_id → Client
  project_id → Project
  user_id → User (nullable, set upon invite acceptance)
  status: invited | active | revoked
  invited_at, accepted_at

Invitation                           ← unified invite (team + client)
  id, organization_id → Organization
  email, role: owner | member | client
  invited_by_user_id → User
  token_hash, expires_at, accepted_at
  type: team | client
  project_id → Project (nullable, required for client type)

Plan
  id, name: starter | pro | agency
  max_projects, max_members, max_clients
  price_monthly_cents

Subscription
  id, organization_id → Organization (unique)
  plan_id → Plan
  stripe_subscription_id, stripe_customer_id
  status: active | past_due | canceled | trialing
  current_period_start, current_period_end
  cancel_at_period_end

Invoice                              ← synced from Stripe
  id, organization_id → Organization
  stripe_invoice_id, amount_cents, currency
  status: paid | open | void
  invoice_url, paid_at, created_at

Project
  id, organization_id → Organization
  client_id → Client
  name, description, slug (unique per org)
  status: active | paused | completed | archived
  start_date, due_date
  created_by_user_id → User
  created_at, updated_at, archived_at (soft delete)

ProjectUpdate
  id, project_id → Project
  created_by_user_id → User
  title, body (markdown)
  is_visible_to_client
  created_at, updated_at

Milestone
  id, project_id → Project
  title, due_date
  status: pending | completed
  completed_at

ProjectFile                          ← attachment to update or project
  id, project_id → Project
  update_id → ProjectUpdate (nullable)
  uploaded_by_user_id → User
  storage_key, file_name, mime_type, size_bytes
  created_at

PasswordResetToken
  id, user_id → User
  token_hash, expires_at, used_at

EmailVerificationToken
  id, user_id → User
  token_hash, expires_at, verified_at

NotificationPreference
  id, user_id → User
  on_project_update, on_milestone_reached
  on_new_comment, on_file_uploaded, on_billing_event

AuditLog
  id, organization_id → Organization
  actor_user_id → User
  action, target_type, target_id
  metadata (JSON), created_at
```

**Key Indexes:**
- `projects.organization_id, projects.archived_at` (project list queries)
- `projects.slug, projects.organization_id` (portal route lookup)
- `memberships.organization_id, memberships.user_id` (auth guard check)
- `invitations.token_hash` (invite acceptance)
- `project_updates.project_id, project_updates.is_visible_to_client` (client portal)
- `audit_logs.organization_id, audit_logs.created_at` (activity feed)

---

## 3. API Endpoint Plan

### Auth

| Method | Route | Auth | Role | Summary |
|---|---|---|---|---|
| POST | /auth/register | ❌ | — | Create org + owner in transaction |
| POST | /auth/login | ❌ | — | Issue access + refresh tokens |
| POST | /auth/refresh | ❌ | — | Silent refresh via HttpOnly cookie |
| POST | /auth/logout | ✅ | any | Revoke refresh token |
| POST | /auth/forgot-password | ❌ | — | Send reset email (rate limited) |
| POST | /auth/reset-password | ❌ | — | Consume token, set new password |
| POST | /auth/verify-email | ❌ | — | Verify email token |
| GET | /auth/me | ✅ | any | Current user + org context |

### Invitations

| Method | Route | Auth | Role | Summary |
|---|---|---|---|---|
| POST | /team/invitations | ✅ | owner | Invite team member (email + role) |
| GET | /team/invitations | ✅ | owner | List pending team invitations |
| DELETE | /team/invitations/:id | ✅ | owner | Revoke pending invitation |
| POST | /clients/invitations | ✅ | owner, member | Invite client (email + projectId) |
| POST | /invitations/accept | ❌ | — | Accept team or client invite via token |
| POST | /invitations/resend/:id | ✅ | owner, member | Resend invite email |

### Projects

| Method | Route | Auth | Role | Summary |
|---|---|---|---|---|
| GET | /projects | ✅ | owner, member | List with search + filters + pagination |
| POST | /projects | ✅ | owner, member | Create project |
| GET | /projects/:id | ✅ | owner, member, client | Project detail (scope by role) |
| PATCH | /projects/:id | ✅ | owner, member | Update project |
| POST | /projects/:id/archive | ✅ | owner | Soft archive project |
| GET | /projects/:id/updates | ✅ | owner, member, client | Timeline (client: visible only) |
| POST | /projects/:id/updates | ✅ | owner, member | Post update |
| GET | /projects/:id/milestones | ✅ | owner, member, client | Milestones list |
| POST | /projects/:id/milestones | ✅ | owner, member | Create milestone |
| PATCH | /projects/:id/milestones/:mid | ✅ | owner, member | Update milestone status |
| GET | /projects/:id/files | ✅ | owner, member, client | File list |
| POST | /projects/:id/files | ✅ | owner, member | Upload file(s) → signed S3 pre-upload |
| DELETE | /projects/:id/files/:fid | ✅ | owner, member | Delete file |

### Team & Clients

| Method | Route | Auth | Role | Summary |
|---|---|---|---|---|
| GET | /team/members | ✅ | owner | List members |
| PATCH | /team/members/:id/role | ✅ | owner | Change member role |
| DELETE | /team/members/:id | ✅ | owner | Remove member + revoke sessions |
| GET | /clients | ✅ | owner, member | List clients |
| POST | /clients | ✅ | owner, member | Create client record |
| GET | /clients/:id | ✅ | owner, member | Client detail + assigned projects |
| DELETE | /clients/:id/access | ✅ | owner, member | Revoke portal access |

### Users

| Method | Route | Auth | Role | Summary |
|---|---|---|---|---|
| GET | /users/me | ✅ | any | Profile |
| PATCH | /users/me | ✅ | any | Update profile |
| PATCH | /users/me/notification-preferences | ✅ | any | Update notification prefs |
| POST | /users/me/avatar | ✅ | any | Upload agency logo |

### Billing

| Method | Route | Auth | Role | Summary |
|---|---|---|---|---|
| GET | /billing/status | ✅ | owner | Current plan + subscription |
| GET | /billing/invoices | ✅ | owner | Invoice list |
| POST | /billing/checkout-session | ✅ | owner | Create Stripe checkout session |
| POST | /billing/change-plan | ✅ | owner | Upgrade/downgrade |
| POST | /billing/cancel | ✅ | owner | Cancel at period end |
| POST | /billing/portal-session | ✅ | owner | Stripe customer portal URL |

### Webhooks

| Method | Route | Auth | Role | Summary |
|---|---|---|---|---|
| POST | /webhooks/stripe | ❌ | — | Receive Stripe events (HMAC verified) |

### Analytics

| Method | Route | Auth | Role | Summary |
|---|---|---|---|---|
| GET | /analytics/summary | ✅ | owner, member | KPI cards (projects, updates, clients) |
| GET | /analytics/activity | ✅ | owner, member | Activity feed (audit log) |

### Files (Pre-signed Upload)

| Method | Route | Auth | Role | Summary |
|---|---|---|---|---|
| POST | /storage/presign | ✅ | owner, member | Get S3 pre-signed PUT URL |
| POST | /storage/confirm | ✅ | owner, member | Confirm upload completed |
| GET | /storage/signed-url/:key | ✅ | owner, member, client | Get signed GET URL (1h TTL) |

---

## 4. Validation Rules

| Field | Rule |
|---|---|
| email | format:email, max:255 |
| password | min:8, max:72, requires mixed case + digit |
| organizationName | min:2, max:80 |
| fullName | min:2, max:100 |
| project.name | min:2, max:120 |
| project.description | max:2000 |
| update.title | min:2, max:150 |
| update.body | min:10 |
| clientName | min:2, max:100 |
| file mime type | whitelist per upload type |
| file size | max 50MB (project files), 2MB (logo) |
| invitation token | must not be expired, must not be already used |
| planId | must be one of: starter, pro, agency |

---

## 5. Auth & Permission Model

```
owner   → Full access to org: billing, members, clients, projects
member  → Projects + clients + updates, NO billing, NO member management
client  → Read-only: assigned project updates/milestones/files (visible-to-client only)
```

Guards:
- `JwtAuthGuard` — validates access token
- `TenantGuard` — verifies user belongs to the organization of the target resource
- `RolesGuard` — checks `@Roles(...)` decorator
- `ClientScopeGuard` — verifies client can only access their assigned project(s)

All guards applied via NestJS decorator chain at controller level.

---

## 6. Integration Plan

| Integration | Purpose | Playbook | Adapter |
|---|---|---|---|
| Stripe | Subscriptions, checkout, webhooks | `payments.md` | `StripeAdapter` |
| Resend | Transactional email delivery | `notifications.md` | `EmailAdapter` |
| AWS S3 | File storage (private bucket + signed URLs) | `uploads.md` | `StorageAdapter` |
| PostHog | Usage event analytics | `analytics.md` | `AnalyticsAdapter` |

Each adapter lives in `src/integrations/`. Zero provider logic in controllers.

---

## 7. Background Jobs

All jobs run via BullMQ. Workers in separate process (`apps/worker`).

| Job | Queue | Trigger | Retry |
|---|---|---|---|
| `send-invitation-email` | `email` | Team or client invite created | 3x with exponential backoff |
| `send-update-notification` | `email` | Update posted (visible to client) | 3x |
| `send-password-reset-email` | `email` | Forgot password request | 3x |
| `send-email-verification` | `email` | New registration | 3x |
| `process-stripe-webhook` | `billing` | `/webhooks/stripe` received | 5x, idempotency by Stripe event ID |
| `send-cancellation-email` | `email` | Subscription canceled | 3x |
| `send-revoke-access-email` | `email` | Client access revoked | 3x |

All jobs are idempotent. Failed jobs move to a dead-letter queue after max retries.

---

## 8. Webhook Design

**Endpoint:** `POST /webhooks/stripe`

Security:
- HMAC signature verification via `stripe-signature` header
- Raw body preserved (no JSON.parse before verification)
- Return `200` immediately, process async via `process-stripe-webhook` job

Events handled:
```
customer.subscription.updated   → update Subscription record
customer.subscription.deleted   → mark canceled, restrict org
invoice.paid                    → create Invoice record, unlock features
invoice.payment_failed          → mark past_due, send alert email
customer.updated                → sync billing info
```

Idempotency: Stripe event ID stored in `processed_webhook_events` table.

---

## 9. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/briefboard

# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=900        # 15 minutes
JWT_REFRESH_EXPIRES_IN=604800    # 7 days

# Redis
REDIS_URL=redis://localhost:6379

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_AGENCY_PRICE_ID=

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=noreply@briefboard.app

# Storage (AWS S3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=briefboard-files
STORAGE_SIGNED_URL_TTL=3600      # 1 hour

# Analytics (PostHog)
POSTHOG_API_KEY=
POSTHOG_HOST=https://app.posthog.com

# App
FRONTEND_URL=https://app.briefboard.io
NODE_ENV=production
PORT=3000
```

---

## 10. Module / File Structure (NestJS)

```
apps/api/src/
├── main.ts
├── app.module.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   ├── register.dto.ts
│   │   │   ├── forgot-password.dto.ts
│   │   │   └── reset-password.dto.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── tenant.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── client-scope.guard.ts
│   │   └── strategies/
│   │       └── jwt.strategy.ts
│   │
│   ├── projects/
│   │   ├── projects.controller.ts
│   │   ├── projects.service.ts
│   │   ├── projects.repository.ts
│   │   └── dto/
│   │       ├── create-project.dto.ts
│   │       ├── update-project.dto.ts
│   │       └── create-update.dto.ts
│   │
│   ├── invitations/
│   │   ├── invitations.controller.ts
│   │   ├── invitations.service.ts
│   │   └── dto/
│   │       ├── invite-member.dto.ts
│   │       ├── invite-client.dto.ts
│   │       └── accept-invite.dto.ts
│   │
│   ├── team/
│   │   ├── team.controller.ts
│   │   └── team.service.ts
│   │
│   ├── clients/
│   │   ├── clients.controller.ts
│   │   └── clients.service.ts
│   │
│   ├── storage/
│   │   ├── storage.controller.ts
│   │   └── storage.service.ts
│   │
│   ├── billing/
│   │   ├── billing.controller.ts
│   │   ├── billing.service.ts
│   │   └── webhooks.controller.ts
│   │
│   ├── analytics/
│   │   ├── analytics.controller.ts
│   │   └── analytics.service.ts
│   │
│   └── users/
│       ├── users.controller.ts
│       └── users.service.ts
│
├── integrations/
│   ├── stripe/
│   │   └── stripe.adapter.ts
│   ├── email/
│   │   └── email.adapter.ts        ← wraps Resend
│   ├── storage/
│   │   └── storage.adapter.ts      ← wraps S3
│   └── analytics/
│       └── analytics.adapter.ts    ← wraps PostHog
│
├── jobs/
│   ├── email.processor.ts
│   └── billing.processor.ts
│
├── common/
│   ├── decorators/
│   │   ├── roles.decorator.ts
│   │   └── current-user.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   └── audit-log.interceptor.ts
│   └── pipes/
│       └── validation.pipe.ts
│
└── prisma/
    └── prisma.service.ts
```

---

## 11. Implementation Order

1. **Database schema & migrations** — Prisma schema, all entities, indexes
2. **Auth module** — register, login, refresh, guards, JWT strategy
3. **Email verification** — token + email job + verify endpoint
4. **Invitation system** — team invite, client invite, accept endpoint
5. **Projects module** — CRUD, archive, role-scoped endpoints
6. **Updates & Milestones** — post updates, milestone status
7. **Storage module** — S3 pre-sign, confirm, signed GET URL
8. **File attachment** — link to updates, list, delete
9. **Team management** — list, change role, remove
10. **Clients & access** — client record, portal access, revoke
11. **Billing module** — Stripe checkout, plans, portal session
12. **Webhook consumer** — Stripe event handler, idempotency
13. **Analytics module** — KPI aggregation, activity feed
14. **PostHog adapter** — event tracking
15. **Notification preferences** — user settings
16. **Test suite** — unit + integration per module (apply `testing.md`)

---

## 12. Security Hardening Checklist

- ✅ Rate limiting: `POST /auth/login` — 5 req/min per IP
- ✅ Rate limiting: `POST /auth/forgot-password` — 3 req/15min per email
- ✅ Auth endpoints: refresh token rotation on use
- ✅ Stripe webhook: HMAC signature verification before any processing
- ✅ File uploads: mime type whitelist, size limits enforced server-side
- ✅ All mutation endpoints: `TenantGuard` prevents cross-org data access
- ✅ Client scope: `ClientScopeGuard` limits client to their project(s)
- ✅ Soft delete only for projects — no hard deletes
- ✅ Passwords: Argon2id hashing
- ✅ Invitation tokens: hashed before storage
- ✅ Password reset tokens: single-use, 1h expiry
- ✅ S3 files: private bucket, 1h signed URL TTL
- ✅ Secrets: all in environment variables, never hardcoded

---

## 13. Risks & Edge Cases

| Risk | Mitigation |
|---|---|
| Client invited to multiple projects | `ClientAccess` allows multiple rows per client_id — scope all queries |
| Upload confirmation race condition | `storage/confirm` marks file as ready — orphan cleanup job |
| Stripe webhook duplicate delivery | Idempotency via `stripe_event_id` — check before processing |
| Plan downgrade exceeds limits | Check active projects/members count before allowing downgrade |
| Archive project revokes client access | Cascade: archive sets `ClientAccess.status = revoked` |
| Member removed while files uploading | Upload confirms check membership at confirmation time |
| Email delivery failure | Dead-letter queue + retry; invitation has resend action |

---

## 14. Observability Hooks

```
Health check:    GET /health → 200 OK
Logging:         Winston structured logs (JSON) — auth events, mutations, webhook processing
Error tracking:  Sentry adapter (env-var backed) — all unhandled exceptions
Metrics:         Prometheus-compatible: request duration, job queue depth, failed jobs
Key log events:
  - auth.login.success / auth.login.failed
  - auth.register
  - invitation.sent / invitation.accepted
  - project.created / project.archived
  - billing.subscription.updated / billing.payment.failed
  - webhook.stripe.received / webhook.stripe.processed / webhook.stripe.failed
```

# Backend Integrator Skill Examples

Worked examples showing how the `backend-integrator` agent uses the `/blueprint` command to analyze frontend flows and produce structured backend architecture.

Each example shows:
- command used
- frontend input
- backend inference
- entities and relations
- API endpoints
- integrations
- background jobs
- security requirements
- environment variables

---

# Example 1 — Authentication System

## Command
```
/blueprint
```

## Frontend Input

Pages: Login, Register, Forgot Password, User Profile
Forms: login form, register form, reset password form, update profile form
Uploads: avatar upload
Protected routes: profile, dashboard

---

## Backend Inference

The frontend implies:
- user identity system with JWT authentication
- password reset via email token
- profile management with avatar storage
- protected route guard

---

## Entities

```
User
  id, email (unique), password_hash, name, avatar_url, role, created_at, updated_at

PasswordResetToken
  id, user_id → User, token (hashed), expires_at, created_at
```

---

## API Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | /auth/register | ❌ | Create account |
| POST | /auth/login | ❌ | Issue access + refresh tokens |
| POST | /auth/refresh | ❌ | Renew access token |
| POST | /auth/logout | ✅ | Revoke session |
| POST | /auth/forgot-password | ❌ | Send reset email |
| POST | /auth/reset-password | ❌ | Consume token, set new password |
| GET | /users/me | ✅ | Fetch current user |
| PATCH | /users/me | ✅ | Update profile |
| POST | /users/avatar | ✅ | Upload avatar |

---

## Integrations

- **Storage** (S3 / Cloudinary) — avatar upload → apply `uploads` playbook
- **Email** (SendGrid / Resend) — password reset email → background job

## Background Jobs

- `send-password-reset-email` — triggered after token creation

## Security Requirements

- Rate limit: `POST /auth/login` and `POST /auth/forgot-password`
- Password: Argon2id hashing
- Tokens: 15m access token, 7d refresh token (HttpOnly Cookie)
- Avatar: mime type whitelist (`image/jpeg`, `image/png`, `image/webp`), 5MB max

## Environment Variables

```bash
DATABASE_URL
JWT_SECRET
JWT_REFRESH_SECRET
JWT_EXPIRES_IN=900
JWT_REFRESH_EXPIRES_IN=604800
STORAGE_BUCKET
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
EMAIL_PROVIDER_API_KEY
FRONTEND_URL
```

---

# Example 2 — E-commerce Product Management

## Command
```
/blueprint — Apply uploads playbook for product images
```

## Frontend Input

Pages: Product List, Create Product, Edit Product, Product Detail
Forms: create product (name, description, price, stock, category, images)
Tables: product list with search, category filter, price sort, pagination
Uploads: product image upload (multiple)

---

## Entities

```
Product
  id, name, description, price (decimal), stock, is_active, created_at, updated_at

Category
  id, name, slug (unique), created_at

ProductCategory
  product_id → Product, category_id → Category (composite PK)

ProductImage
  id, product_id → Product, storage_key, url, sort_order, created_at
```

---

## API Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | /products | ❌ | List with filters + pagination |
| POST | /products | ✅ admin | Create product |
| GET | /products/:id | ❌ | Product detail |
| PATCH | /products/:id | ✅ admin | Update product |
| DELETE | /products/:id | ✅ admin | Soft delete |
| POST | /products/:id/images | ✅ admin | Upload product image(s) |
| DELETE | /products/:id/images/:imageId | ✅ admin | Remove image |
| GET | /categories | ❌ | List categories |
| POST | /categories | ✅ admin | Create category |

---

## Query Parameters (GET /products)

```
?q=laptop&category=electronics&price_min=500&price_max=2000
&in_stock=true&sort=price_asc&page=1&limit=24
```

Apply `search` playbook for full-text search on name + description.

## Security Requirements

- All write endpoints require `admin` role
- Image upload: mime type whitelist, 10MB max per image, 10 images max per product
- Soft delete: set `is_active = false`, never hard delete

## Environment Variables

```bash
DATABASE_URL
STORAGE_BUCKET
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
```

---

# Example 3 — SaaS Team Workspace

## Command
```
/blueprint — Apply multi-tenancy playbook + payments playbook
```

## Frontend Input

Pages: Dashboard, Team Members, Invite Member, Billing, Usage Analytics
Forms: invite user (email, role), update role, billing plan change
Charts: usage metrics (line chart, KPI cards, date range picker)
Actions: remove member, resend invite, cancel subscription

---

## Entities

```
Organization
  id, name, slug (unique), stripe_customer_id, plan_id, created_at

User
  id, email, name, password_hash, created_at

Membership
  id, organization_id → Organization, user_id → User
  role: owner | admin | member | viewer, joined_at

Invitation
  id, organization_id → Organization, email, role, token (hashed)
  expires_at, accepted_at

UsageEvent
  id, organization_id → Organization, event_name, properties (JSON)
  occurred_at (indexed)

Subscription
  id, organization_id → Organization, stripe_subscription_id
  status: active | past_due | canceled, current_period_end
```

---

## API Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | /organizations/current | ✅ | Active org info |
| PATCH | /organizations/current | ✅ owner,admin | Update org |
| GET | /organizations/members | ✅ | Member list |
| PATCH | /organizations/members/:id | ✅ owner,admin | Change role |
| DELETE | /organizations/members/:id | ✅ owner,admin | Remove member |
| POST | /organizations/invitations | ✅ owner,admin | Send invite |
| GET | /organizations/invitations | ✅ owner,admin | Pending invites |
| DELETE | /organizations/invitations/:id | ✅ owner,admin | Revoke invite |
| POST | /invitations/accept | ❌ | Accept invite token |
| GET | /analytics/summary | ✅ | KPI cards |
| GET | /analytics/timeseries/:metric | ✅ | Chart data |
| POST | /billing/checkout-session | ✅ | Create Stripe session |
| GET | /billing/status | ✅ | Current plan + status |
| POST | /billing/change-plan | ✅ owner | Upgrade/downgrade |
| POST | /billing/cancel-subscription | ✅ owner | Cancel |

## Background Jobs

- `send-invitation-email` — after invite creation
- `aggregate-daily-usage` — cron, nightly
- `process-stripe-webhook` — after webhook receipt

## Webhooks

Apply `webhooks` playbook: `invoice.paid`, `customer.subscription.deleted`, `payment_intent.payment_failed`

## Security Requirements

- TenantGuard: all routes that touch org data must verify membership
- Billing endpoints: owner-only
- Analytics: scope all queries by `organization_id`
- Invitation tokens: expire in 7 days, invalidate after accept

## Environment Variables

```bash
DATABASE_URL
REDIS_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
EMAIL_PROVIDER_API_KEY
FRONTEND_URL
JWT_SECRET
```

---

# Example 4 — Webhook Platform

## Command
```
/blueprint — Apply webhooks playbook (producer + consumer)
```

## Frontend Input

Pages: Webhook Settings, Delivery History, Event Subscriptions
Forms: add webhook URL, select subscribed events
Tables: delivery log (status, timestamp, response code, retry count)
Actions: resend delivery, delete endpoint, send test event

---

## Entities

```
WebhookEndpoint
  id, organization_id, url, secret (HMAC signing key)
  events: string[], is_active, failure_count, created_at

WebhookDelivery
  id, endpoint_id → WebhookEndpoint, event_type, payload (JSON)
  status: pending | delivered | failed
  http_status_code, response_body (truncated), attempt_count
  next_retry_at, delivered_at
```

---

## API Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | /webhooks/endpoints | ✅ | List endpoints |
| POST | /webhooks/endpoints | ✅ | Register URL |
| PATCH | /webhooks/endpoints/:id | ✅ | Update URL/events |
| DELETE | /webhooks/endpoints/:id | ✅ | Remove endpoint |
| POST | /webhooks/endpoints/:id/test | ✅ | Send test payload |
| GET | /webhooks/deliveries | ✅ | Delivery history |
| POST | /webhooks/endpoints/:id/deliveries/:id/retry | ✅ | Manual retry |

Consumer endpoints:
| POST | /webhooks/stripe | ❌ | Stripe event receiver |

## Background Jobs

- `deliver-webhook` — signed POST to customer endpoint, retry with backoff
- `disable-failed-endpoint` — disable after 10 consecutive failures + notify org

## Environment Variables

```bash
DATABASE_URL
REDIS_URL
STRIPE_WEBHOOK_SECRET
WEBHOOK_DELIVERY_TIMEOUT_MS=5000
WEBHOOK_MAX_RETRIES=5
WEBHOOK_DISABLE_AFTER_FAILURES=10
```

---

# Example 5 — Real-Time Search Feature

## Command
```
/blueprint — Apply search playbook (PostgreSQL full-text + autocomplete)
```

## Frontend Input

Pages: Product Search, Global Search Modal
Features: search bar with autocomplete typeahead, filter panel (category, price, brand), sort by relevance/price/date, faceted counts ("Electronics (24)")

---

## Search Strategy

PostgreSQL full-text search with GIN index (Pattern A — appropriate for this data volume).

## Database Changes

```sql
ALTER TABLE products
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(brand, '')
  )
) STORED;

CREATE INDEX idx_products_fts ON products USING GIN(search_vector);
```

## API Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | /products/search | ❌ | Filtered + ranked results |
| GET | /search/suggest | ❌ | Autocomplete (cached) |
| GET | /search/facets | ❌ | Filter option counts |

## Query Parameters

```
GET /products/search
  ?q=laptop&category=electronics
  &price_min=500&price_max=2000
  &brand=apple&sort=relevance
  &page=1&limit=24
```

## Caching

- Suggest endpoint: Redis cache with 15-minute TTL
- Facet counts: Redis cache with 5-minute TTL

## Environment Variables

```bash
DATABASE_URL
REDIS_URL
SEARCH_SUGGEST_CACHE_TTL=900
SEARCH_FACET_CACHE_TTL=300
```

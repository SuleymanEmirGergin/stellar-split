# Audit Log Playbook

This playbook guides the Backend Integrator Agent when implementing audit logging systems — a mandatory requirement for multi-tenant SaaS, regulated industries, and any system with sensitive data mutations.

---

## 1. What to Infer From Frontend

Identify these UI elements that signal audit logging is required:

- **"Activity" / "Audit Log" page**: Explicit listing of who did what and when.
- **"Recent Changes" sidebar**: Shows last N changes to a resource.
- **Admin dashboards with data mutation capability**: admins modifying user data, billing, or permissions should always be audited.
- **"Undo" / "History" features**: Implies the system tracks before/after states.
- **Multi-tenant organizations**: Any action taken on behalf of an org must be traceable.
- **Financial / billing operations**: Regulatory requirement — every payment event must be logged.
- **Role / permission changes**: "Who gave this user admin access?" must be answerable.
- **Compliance requirements (GDPR, HIPAA, SOC2)**: May legally mandate audit trails.

---

## 2. Core Concept — What to Log

Log events at the **domain event** level — not raw SQL queries.

| Log This | Not This |
|---|---|
| "User admin@co.com deleted product SKU-123" | `DELETE FROM products WHERE id='...'` |
| "Payment $99 failed for org Acme Inc" | `UPDATE subscriptions SET status='past_due'` |
| "Role changed: user@co.com admin → member" | `UPDATE memberships SET role='member'` |

---

## 3. Required Entity

```
AuditLog
  - id
  - organization_id (nullable — null for system events)
  - actor_type: user | system | api_key
  - actor_id (nullable — user ID, null for system)
  - actor_email (denormalized — preserved even if user later deleted)
  - entity_type (e.g., "product", "user", "membership", "subscription")
  - entity_id
  - action: create | update | delete | login | logout | export | invite_sent | role_changed | ...
  - before_state (JSON, nullable — snapshot before change)
  - after_state (JSON, nullable — snapshot after change)
  - ip_address (nullable)
  - user_agent (nullable)
  - metadata (JSON — additional context)
  - created_at (indexed, immutable)
```

**Key Rules:**
- Audit logs are **append-only** — never update or delete them.
- `actor_email` is denormalized intentionally — preserve it even after user deletion.
- `before_state` / `after_state` are snapshots — strip sensitive fields (password_hash, tokens) before storing.

---

## 4. Required API Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | /audit-logs | ✅ admin/owner | List audit logs with filters |
| GET | /audit-logs/:id | ✅ admin/owner | Single event detail |
| GET | /audit-logs/export | ✅ admin/owner | CSV export (async for large sets) |

### Query Parameters (GET /audit-logs)

```
?actor_id=user_123
&entity_type=product
&entity_id=prod_456
&action=delete
&from=2024-01-01
&to=2024-01-31
&page=1
&limit=50
```

---

## 5. Audit Service Pattern

Create a dedicated `AuditService` that other services call. Never write audit logs directly in controllers:

```typescript
interface AuditContext {
  actorType: 'user' | 'system' | 'api_key'
  actorId?: string
  actorEmail?: string
  organizationId?: string
  ipAddress?: string
  userAgent?: string
}

interface AuditEventPayload {
  entityType: string
  entityId: string
  action: string
  beforeState?: Record<string, unknown>
  afterState?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

class AuditService {
  async log(context: AuditContext, event: AuditEventPayload): Promise<void>
}
```

### Usage in a Service

```typescript
// In ProductsService.deleteProduct()
await this.auditService.log(
  { actorType: 'user', actorId: user.id, actorEmail: user.email, organizationId: org.id },
  {
    entityType: 'product',
    entityId: product.id,
    action: 'delete',
    beforeState: { name: product.name, price: product.price, sku: product.sku },
  }
)
```

---

## 6. Sensitive Field Scrubbing

Before storing `before_state` / `after_state`, always strip sensitive fields:

```typescript
const SCRUBBED_FIELDS = ['password_hash', 'token', 'secret', 'stripe_key', 'totp_secret']

function scrub(state: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(state).map(([k, v]) => [k, SCRUBBED_FIELDS.includes(k) ? '[REDACTED]' : v])
  )
}
```

---

## 7. Async Logging (Performance)

For high-throughput systems, writing audit logs synchronously adds latency to every request.
Use a background queue:

```
Service call completes → enqueue audit log job → return response to client
Worker → persist AuditLog record
```

**Trade-off**: If the worker fails before persisting, the log is lost.
**Mitigation**: Use a reliable queue (BullMQ with Redis persistence) and log to a secondary channel (e.g., structured logger) as a backup.

For most SaaS apps, **synchronous logging in the same DB transaction is simpler and sufficient**.

---

## 8. Predefined Action Vocabulary

Standardize action names to make filtering useful:

| Category | Actions |
|---|---|
| Auth | `login`, `logout`, `login_failed`, `password_changed`, `2fa_enabled`, `2fa_disabled` |
| User management | `user_created`, `user_updated`, `user_deleted`, `user_invited` |
| Roles | `role_changed`, `permission_granted`, `permission_revoked` |
| Data | `record_created`, `record_updated`, `record_deleted`, `record_exported` |
| Billing | `subscription_created`, `plan_changed`, `subscription_canceled`, `payment_succeeded`, `payment_failed` |
| Security | `api_key_created`, `api_key_revoked`, `session_revoked_all` |

---

## 9. Retention Policy

- Define a retention period (e.g., 90 days for free tier, 1 year for enterprise).
- Run a nightly cleanup job that deletes logs older than the retention period.
- For regulated industries (GDPR, HIPAA) — retention may be mandatory for 3–7 years. Check requirements before deleting.

```bash
AUDIT_LOG_RETENTION_DAYS=365
```

---

## 10. Environment Variables

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379       # for async queue variant

AUDIT_LOG_RETENTION_DAYS=365
AUDIT_LOG_ASYNC=false                  # true = queue-based, false = synchronous
AUDIT_LOG_QUEUE_NAME=audit-logs
```

---

## 11. File Structure

```
src/
  audit/
    audit.module.ts
    audit.service.ts
    audit.controller.ts
    audit.module.ts
    dto/
      audit-query.dto.ts
    entities/
      audit-log.entity.ts
    helpers/
      scrub.helper.ts               ← Sensitive field redaction
    workers/
      audit-log.worker.ts           ← Async variant
    crons/
      audit-retention.cron.ts       ← Cleanup job
```

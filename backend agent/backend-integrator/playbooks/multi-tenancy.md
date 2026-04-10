# Multi-Tenancy Playbook

This playbook guides the Backend Integrator Agent when implementing multi-tenant architecture derived from frontend UI flows.

---

## 1. What to Infer From Frontend

Identify these UI elements to confirm multi-tenancy is required:

- **"Organization" / "Workspace" / "Team" concept**: Dashboard shows org name, settings, logo.
- **Team Members page**: List of users within a shared context.
- **Invite / Member management**: Users can be added to an org with specific roles.
- **"Switch Workspace" dropdown**: Users belong to multiple tenants.
- **Billing per org**: Subscription tied to org, not individual user.
- **Org-scoped data**: "Your team's projects", "Organization settings".
- **Subdomain routing** (e.g., `acme.yourapp.com`): Implies tenant-based routing.

---

## 2. Tenancy Models

Choose the model based on scale and isolation requirements:

| Model | Data Isolation | Complexity | Best For |
|---|---|---|---|
| **Shared Schema** | Row-level (`tenant_id` column) | Low | Most SaaS products |
| **Shared DB, Separate Schemas** | Schema per tenant | Medium | Mid-scale, regulated |
| **Separate Databases** | Full DB isolation | High | Enterprise, strict compliance |

**Default recommendation**: Shared schema with `organization_id` on all tenant-scoped tables.

---

## 3. Core Entities

```
Organization
  - id
  - name
  - slug (url-safe, unique — for subdomain routing)
  - plan_id
  - created_at

Membership
  - id
  - organization_id
  - user_id
  - role: owner | admin | member | viewer
  - joined_at

Invitation
  - id
  - organization_id
  - email
  - role
  - token (UUID, hashed)
  - expires_at
  - accepted_at (nullable)
```

Every other entity in the system (Project, Document, Task, etc.) gets:
```
  - organization_id  ← MANDATORY foreign key for tenant isolation
```

---

## 4. Required API Endpoints

### Organization Management
- `POST /organizations` — Create a new organization (owner becomes first member)
- `GET /organizations/current` — Fetch the active org context
- `PATCH /organizations/current` — Update org name, logo, settings
- `DELETE /organizations/current` — Delete org (owner only, with confirmation)

### Member Management
- `GET /organizations/members` — List members with roles
- `PATCH /organizations/members/:userId` — Change a member's role
- `DELETE /organizations/members/:userId` — Remove a member

### Invitations
- `POST /organizations/invitations` — Send invite email + create token
- `GET /organizations/invitations` — List pending invitations
- `DELETE /organizations/invitations/:id` — Revoke an invitation
- `POST /invitations/accept` — Public endpoint (no auth required) — resolve token and add user

### Context Switching (if users belong to multiple orgs)
- `GET /me/organizations` — List all orgs the current user belongs to
- `POST /me/organizations/:id/switch` — Update active org in session/token

---

## 5. Tenant Isolation Enforcement

**This is the most critical rule**: Every database query on tenant-scoped resources must filter by `organization_id`.

### Strategy: Repository Layer Enforcement

```typescript
// BAD — leaks data across tenants
async findAll() {
  return this.projectRepo.find()
}

// GOOD — always scope by tenant
async findAll(organizationId: string) {
  return this.projectRepo.find({ where: { organizationId } })
}
```

Apply this pattern at the repository layer, not the controller. The controller only passes `req.user.organizationId`.

### Guard / Middleware Pattern

Create a `TenantGuard` that:
1. Reads `X-Org-ID` header or JWT claim.
2. Verifies the user is a member of that org.
3. Attaches `organizationId` to request context.
4. Rejects requests with `403` if user is not a member.

---

## 6. Role-Based Access Control (RBAC) Within a Tenant

Define which roles can perform which actions:

| Action | owner | admin | member | viewer |
|---|---|---|---|---|
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Change member role | ✅ | ✅ | ❌ | ❌ |
| Delete organization | ✅ | ❌ | ❌ | ❌ |
| Manage billing | ✅ | ✅ | ❌ | ❌ |
| Create resources | ✅ | ✅ | ✅ | ❌ |
| Read resources | ✅ | ✅ | ✅ | ✅ |

Enforce role checks in the service layer using a permission helper:

```typescript
assertRole(currentMembership, ['owner', 'admin'])
```

---

## 7. Invitation Flow

```
1. Admin sends invite → POST /organizations/invitations
2. System creates Invitation record with hashed token + expiry
3. Email sent with link: https://app.com/invitations/accept?token=...
4. User clicks link → POST /invitations/accept { token }
5. System validates: token exists, not expired, not already accepted
6. If user exists → add Membership, mark invite accepted
7. If user doesn't exist → redirect to register, then complete join
```

---

## 8. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=...
JWT_ORG_CLAIM=organization_id     # claim name in token

# Invitations
INVITATION_TOKEN_TTL=604800       # 7 days in seconds
FRONTEND_URL=https://app.yourapp.com
EMAIL_PROVIDER_API_KEY=...
EMAIL_FROM=no-reply@yourapp.com
```

---

## 9. File Structure

```
src/
  organizations/
    organizations.controller.ts
    organizations.service.ts
    organizations.module.ts
    dto/
      create-organization.dto.ts
      update-organization.dto.ts
      invite-member.dto.ts
    entities/
      organization.entity.ts
      membership.entity.ts
      invitation.entity.ts
    guards/
      tenant.guard.ts
    helpers/
      assert-role.helper.ts
    workers/
      invitation-email.worker.ts
```

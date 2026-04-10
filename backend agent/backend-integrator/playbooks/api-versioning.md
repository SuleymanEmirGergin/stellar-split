# API Versioning Playbook

This playbook guides the Backend Integrator Agent when implementing API versioning strategies to enable backward-compatible evolution of a backend API.

---

## 1. What to Infer From Frontend

Identify these signals that an API versioning strategy is needed:

- **Multiple client types** (web, mobile, third-party): Different clients update at different speeds — breaking changes would break some.
- **Public API / Developer Portal**: Any API exposed to external developers must be versioned.
- **"API v1 / v2" references** in designs: Explicit versioning requirement.
- **Mobile apps**: Cannot force all users to update immediately — old app versions must continue to work.
- **Long-term SaaS with enterprise clients**: Enterprise contracts often lock to a specific API version.
- **Webhook payloads**: Changing the payload structure requires versioning.

---

## 2. Versioning Strategies

| Strategy | How It Works | Pros | Cons |
|---|---|---|---|
| **URL Path** | `/api/v1/users` | Explicit, easy to test in browser | URLs change, not REST-pure |
| **Header** | `Accept-Version: 1` or `API-Version: 2` | Clean URLs | Invisible, harder to test |
| **Query Param** | `/users?version=1` | Easy for quick testing | Not suitable for production |
| **Content Negotiation** | `Accept: application/vnd.app.v1+json` | REST-purist approach | Complex to implement |

**Default recommendation**: **URL Path versioning** — most explicit, easiest to document, most tooling support.

---

## 3. Versioning Scope

Define what gets versioned:

| Scope | Approach |
|---|---|
| **Whole API** | All routes under `/api/v1/` and `/api/v2/` |
| **Per-route** | Only changed routes get a new version |
| **Per-controller** | Each feature module has its own version |

**Recommendation**: Start with whole-API versioning. Migrate to per-route if versions diverge significantly.

---

## 4. Repository Structure

### URL Path Versioning (Whole API)

```
src/
  v1/
    users/
      users.controller.ts
      users.service.ts
    products/
      products.controller.ts
  v2/
    users/
      users.controller.ts      ← Modified from v1
      users.service.ts
    products/
      products.controller.ts   ← Shared with v1 (via import or inheritance)
  shared/
    users/
      users.repository.ts      ← Shared data access, no versioning needed
      users.types.ts
```

### NestJS Router Registration

```typescript
// app.module.ts
const v1 = await NestFactory.create(V1Module)
const v2 = await NestFactory.create(V2Module)

// Or with prefix in each module:
app.setGlobalPrefix('api')

// V1 controllers use @Controller('v1/users')
// V2 controllers use @Controller('v2/users')
```

### Express Router Registration

```typescript
import v1Router from './v1/router'
import v2Router from './v2/router'

app.use('/api/v1', v1Router)
app.use('/api/v2', v2Router)
```

---

## 5. Version Lifecycle

Define and document the lifecycle of each API version:

| Phase | Description | Action |
|---|---|---|
| **Current** | Latest stable version | Actively maintained |
| **Supported** | Older but still maintained | Security fixes only |
| **Deprecated** | Will be removed | Return `Deprecation` header |
| **Sunset** | Removed | Return `410 Gone` |

### Deprecation Headers

```typescript
// Add to deprecated endpoints
res.setHeader('Deprecation', 'true')
res.setHeader('Sunset', 'Sat, 31 Dec 2025 23:59:59 GMT')
res.setHeader('Link', '<https://api.yourapp.com/v2/users>; rel="successor-version"')
```

---

## 6. What Changes Between Versions

### Breaking Changes — require new version
- Removing a field from a response
- Renaming a field
- Changing a field type (string → number)
- Removing an endpoint
- Changing required/optional status of a request field
- Changing authentication mechanism

### Non-Breaking Changes — safe in current version
- Adding a new optional field to a response
- Adding a new optional request parameter
- Adding a new endpoint
- Reducing validation strictness

---

## 7. Code Sharing Between Versions

Most logic should be shared — only the interface (controller + DTOs) changes:

```
v1/users/users.controller.ts     ← Different input/output shape
v2/users/users.controller.ts     ← Different input/output shape
         ↓ both call ↓
shared/users/users.service.ts    ← Same business logic
shared/users/users.repository.ts ← Same DB queries
```

### Adapter Pattern for Version Differences

```typescript
// v2 controller calls shared service, then adapts the response
@Get(':id')
async getUser(@Param('id') id: string) {
  const user = await this.usersService.findById(id)
  return mapUserToV2Response(user)    // v2-specific response shape
}

function mapUserToV2Response(user: User): UserV2ResponseDto {
  return {
    id: user.id,
    fullName: `${user.firstName} ${user.lastName}`,  // v2 combines fields
    email: user.email,
    // v2 removes 'role' from public response
  }
}
```

---

## 8. Documentation per Version

Each version must have its own OpenAPI spec:

```
docs/
  openapi.v1.json     ← or .yaml
  openapi.v2.json
```

Use different `/api-docs/v1` and `/api-docs/v2` Swagger UI mounts.

```typescript
// NestJS Swagger
const v1Document = SwaggerModule.createDocument(app, config, {
  include: [V1UsersModule, V1ProductsModule],
})
SwaggerModule.setup('api-docs/v1', app, v1Document)
```

---

## 9. Version Routing Middleware

Detect and attach the requested version to every request for logging/metrics:

```typescript
app.use((req, res, next) => {
  const match = req.path.match(/^\/api\/(v\d+)\//)
  req.apiVersion = match ? match[1] : 'v1'
  next()
})
```

---

## 10. Checklist Before Adding a New Version

- [ ] Is there at least one breaking change? (If not, no new version needed)
- [ ] Is the old version stable and tested before branching?
- [ ] Is a migration guide written for API consumers?
- [ ] Is the deprecation timeline communicated? (minimum 6 months notice)
- [ ] Are both versions tested in CI?
- [ ] Is the old version's sunset date set and documented?
- [ ] Are webhook payload changes versioned separately if needed?

---

## 11. Environment Variables

```bash
API_DEFAULT_VERSION=v2              # version returned when no version specified
API_SUNSET_V1=2026-12-31            # sunset date communicated in headers
API_SUPPORTED_VERSIONS=v1,v2        # list of active versions
```

---

## 12. File Structure

```
src/
  api/
    v1/
      v1.module.ts
      users/
        users.controller.v1.ts
        dto/
          user-response.v1.dto.ts
    v2/
      v2.module.ts
      users/
        users.controller.v2.ts
        dto/
          user-response.v2.dto.ts
    shared/
      users/
        users.service.ts
        users.repository.ts
      products/
        products.service.ts
  middleware/
    api-version.middleware.ts
docs/
  openapi.v1.yaml
  openapi.v2.yaml
  migration-v1-to-v2.md
```

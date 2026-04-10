# API Keys Playbook

This playbook guides the Backend Integrator Agent when implementing API key authentication for developer-facing APIs and machine-to-machine integrations.

---

## 1. What to Infer From Frontend

Identify these UI elements that signal API key management is needed:

- **"API Keys" settings page**: List, create, revoke keys.
- **"Developer Portal" / "Integrations" section**: External developer access.
- **Webhook configuration page**: Webhooks often authenticate with API keys coming back.
- **"Connect your app" / SDK documentation**: Machine-to-machine auth requirement.
- **CLI tool references**: CLI tools authenticate with API keys, not browser sessions.
- **Programmatic access toggles**: "Allow API access" per org/user.

---

## 2. API Key Design

### Anatomy of a Secure API Key

```
Format: {prefix}_{randomBytes}

Examples:
  sk_live_4f8a2b1c9d3e7f6a...    ← Secret key (full access, shown once)
  sk_test_9e2f1a3b8c4d7e5f...    ← Test/sandbox key
  pk_live_2c7d9b5e1f3a8c4...     ← Public key (read-only)
  ak_4f8a2b1c9d3e7f6a...         ← App-specific key

Components:
  sk_     ← Type prefix (sk = secret, pk = public, ak = app)
  live_   ← Environment prefix (live / test)
  4f8a... ← 32 random bytes encoded as hex or base58
```

**Why prefix?**: Allows GitHub secret scanning to detect leaked keys. Match pattern: `sk_live_[a-z0-9]{64}`.

---

## 3. Required Backend Entities

```
ApiKey
  - id
  - organization_id → Organization (or user_id → User)
  - name (human-readable label: "Production App", "CI/CD Pipeline")
  - key_prefix (first 8 chars — for display in UI, e.g., "sk_live_4f")
  - key_hash (SHA-256 hash of full key — never store plaintext)
  - type: secret | public | restricted
  - scopes: string[] (e.g., ["read:products", "write:orders"])
  - environment: live | test
  - last_used_at (nullable)
  - expires_at (nullable)
  - is_active: boolean (soft revoke)
  - created_by → User
  - created_at
  - revoked_at (nullable)
  - revoked_by → User (nullable)

ApiKeyUsageLog (optional — for analytics/audit)
  - id
  - api_key_id → ApiKey
  - endpoint
  - method
  - status_code
  - ip_address
  - occurred_at
```

---

## 4. Key Generation

```typescript
import crypto from 'crypto'

function generateApiKey(type: 'sk' | 'pk', env: 'live' | 'test'): {
  plaintext: string    // show to user ONCE, never store
  hash: string         // store in DB
  prefix: string       // store in DB (for display)
} {
  const randomPart = crypto.randomBytes(32).toString('hex')  // 64 hex chars
  const plaintext = `${type}_${env}_${randomPart}`
  const hash = crypto.createHash('sha256').update(plaintext).digest('hex')
  const prefix = plaintext.slice(0, 12)  // e.g., "sk_live_4f8a"

  return { plaintext, hash, prefix }
}
```

**Critical**: Return `plaintext` to the user exactly once during creation. Never store it. Never return it again.

---

## 5. Required API Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | /api-keys | ✅ owner/admin | List org's API keys (no plaintext) |
| POST | /api-keys | ✅ owner/admin | Create new key — returns plaintext ONCE |
| PATCH | /api-keys/:id | ✅ owner/admin | Update name, scopes, expiry |
| DELETE | /api-keys/:id | ✅ owner/admin | Revoke key |
| GET | /api-keys/:id/usage | ✅ owner/admin | Usage log / last used info |

---

## 6. Authentication Middleware

```typescript
// API key auth middleware
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  // Standard Bearer token format
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing API key', data: null })
  }

  const plaintext = authHeader.slice(7)
  const hash = crypto.createHash('sha256').update(plaintext).digest('hex')

  const apiKey = await db.apiKeys.findUnique({ where: { keyHash: hash } })

  if (!apiKey || !apiKey.isActive) {
    return res.status(401).json({ success: false, error: 'Invalid API key', data: null })
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return res.status(401).json({ success: false, error: 'API key expired', data: null })
  }

  // Update last used (async, don't await — non-blocking)
  db.apiKeys.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  req.apiKey = apiKey
  req.organizationId = apiKey.organizationId
  next()
}
```

### Scope Checking

```typescript
export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey) return res.status(401).json({ ... })

    if (!req.apiKey.scopes.includes(scope) && !req.apiKey.scopes.includes('*')) {
      return res.status(403).json({
        success: false,
        error: `Missing required scope: ${scope}`,
        data: null,
      })
    }
    next()
  }
}

// Usage
router.get('/products', apiKeyAuth, requireScope('read:products'), listProductsHandler)
router.post('/orders',  apiKeyAuth, requireScope('write:orders'), createOrderHandler)
```

---

## 7. Scope Design

Define scopes as `{action}:{resource}`:

```typescript
export const SCOPES = {
  // Read scopes
  READ_PRODUCTS:  'read:products',
  READ_ORDERS:    'read:orders',
  READ_CUSTOMERS: 'read:customers',
  READ_ANALYTICS: 'read:analytics',

  // Write scopes
  WRITE_PRODUCTS:  'write:products',
  WRITE_ORDERS:    'write:orders',
  WRITE_CUSTOMERS: 'write:customers',

  // Admin scopes
  ADMIN: '*',      // Superscope — grants all access
} as const
```

UI should let users select scopes when creating a key (principle of least privilege).

---

## 8. Key Display Rules

- **After creation**: Show full key once in a dismissible modal with "Copy" button.
- **List view**: Show only `prefix` (e.g., `sk_live_4f8a...`) — never the full key.
- **After dismiss**: Never show the full key again — only "Revoke and recreate" if lost.

```typescript
// Create endpoint response
return {
  success: true,
  data: {
    id: apiKey.id,
    name: apiKey.name,
    plaintext: generated.plaintext,  ← ONLY time this is returned
    prefix: generated.prefix,
    scopes: apiKey.scopes,
    createdAt: apiKey.createdAt,
    message: 'Store this key securely. It will not be shown again.',
  }
}
```

---

## 9. Rate Limiting Per Key

Apply rate limits scoped to the API key, not just IP:

```typescript
const keyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,    // 1000 req/min per key
  keyGenerator: (req) => req.apiKey?.id ?? req.ip,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
})

app.use('/api/v1', apiKeyAuth, keyLimiter)
```

---

## 10. Key Rotation

Provide a rotation flow to minimize secret exposure duration:

```
1. POST /api-keys/:id/rotate
2. Generate new key (new hash + prefix)
3. Return new plaintext
4. Set grace period: old key valid for 24h (overlap period)
5. After 24h: automatically revoke old key
```

```typescript
ApiKey
  + rotatedAt: DateTime?
  + rotatedFromId: String?  ← points to the key this replaces
  + gracePeriodEndsAt: DateTime?
```

---

## 11. Environment Variables

```bash
# Key prefix used in HMAC-based validation (optional extra layer)
API_KEY_SIGNING_SECRET=<32 byte hex string>

# Rate limits per key
API_KEY_RATE_LIMIT_MAX=1000
API_KEY_RATE_LIMIT_WINDOW_MS=60000

# Grace period after rotation
API_KEY_ROTATION_GRACE_PERIOD_MS=86400000    # 24 hours
```

---

## 12. File Structure

```
src/
  api-keys/
    api-keys.module.ts
    api-keys.controller.ts
    api-keys.service.ts
    api-keys.repository.ts
    dto/
      create-api-key.dto.ts
      update-api-key.dto.ts
    entities/
      api-key.entity.ts
      api-key-usage-log.entity.ts
    middleware/
      api-key-auth.middleware.ts
      require-scope.middleware.ts
    helpers/
      key-generator.helper.ts      ← generateApiKey()
      scope-checker.helper.ts
```

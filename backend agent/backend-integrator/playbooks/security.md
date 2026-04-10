# Security Playbook

Apply this playbook to **every project**. It provides patterns not covered by specialized playbooks (auth, rate-limiting, api-keys, audit-log).

Additional priority triggers:
- Forms collecting PII (national ID, credit card, health data, SSN)
- Admin panel or super-user interface
- Public API / developer portal
- Multi-tenant architecture
- Payment or billing flows

---

## 1. What to Infer From Frontend

| Frontend Signal | Security Requirement |
|---|---|
| Any login / register form | auth.md + rate-limiting.md (already separate) |
| Form with email, phone, address | Field-level encryption (Section 5) |
| Form with credit card, SSN, health data | PCI/HIPAA-level field encryption + strict CORS |
| Admin panel, role management | RBAC (auth.md) + anomaly alerting (Section 8) |
| File upload | Magic byte validation (file-processing.md) + path traversal prevention (Section 4) |
| Search bar with user-generated input | SQL injection + XSS prevention (Section 4) |
| "Embed" or iframe functionality | X-Frame-Options: DENY (Section 2) |
| Multi-tenant workspace | Tenant isolation guard (multi-tenancy.md) + CORS per-tenant |
| Developer portal / API Keys | api-keys.md + dependency scanning (Section 7) |

---

## 2. Security Headers

Apply security headers at the framework entry point — not per-route.

### Node.js — Helmet.js

```ts
// src/common/middleware/helmet.middleware.ts
import helmet from 'helmet';

export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],          // no inline scripts
      styleSrc: ["'self'", "'unsafe-inline'"],  // allow inline styles (common for UI libs)
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],          // block Flash, plugins
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],           // no iframes
    },
  },
  hsts: {
    maxAge: 31536000,       // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },     // X-Frame-Options: DENY
  noSniff: true,                      // X-Content-Type-Options: nosniff
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false,
});
```

Apply in main entry:

```ts
// main.ts (NestJS) or app.ts (Express)
app.use(helmetConfig);
```

### Header Reference Table

| Header | Recommended Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | See above | Prevents XSS, data injection |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables browser APIs |
| `Cache-Control` (API routes) | `no-store` | Prevents caching sensitive responses |

### Python / FastAPI — Starlette Middleware

```python
# app/middleware/security_headers.py
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Strict-Transport-Security'] = (
            'max-age=31536000; includeSubDomains; preload'
        )
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        return response

# main.py
app.add_middleware(SecurityHeadersMiddleware)
```

---

## 3. CORS Configuration

Never use `origin: '*'` in production. Always whitelist explicit origins.

### Express / NestJS

```ts
// src/config/cors.config.ts
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? '';
  return raw.split(',').map(o => o.trim()).filter(Boolean);
}

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    const allowed = getAllowedOrigins();

    // Allow server-to-server requests (no Origin header)
    if (!origin) return callback(null, true);

    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,        // required for HttpOnly cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  maxAge: 86400,            // preflight cache: 24 hours
};
```

Apply:

```ts
// NestJS
app.enableCors(corsConfig);

// Express
import cors from 'cors';
app.use(cors(corsConfig));
```

### FastAPI

```python
from fastapi.middleware.cors import CORSMiddleware
import os

allowed_origins = [o.strip() for o in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',') if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allow_headers=['Content-Type', 'Authorization', 'X-Request-ID'],
    max_age=86400,
)
```

### CORS Anti-Patterns

| Anti-Pattern | Risk | Fix |
|---|---|---|
| `origin: '*'` with `credentials: true` | Browser blocks it — but reflects misconfiguration intent | Use explicit whitelist |
| Reflecting request `Origin` header without validation | Any origin can make authenticated requests | Validate against allowlist |
| Hardcoded `origin: 'https://app.example.com'` | Breaks staging/preview environments | Use env var whitelist |
| Allowing `OPTIONS` without `Access-Control-Max-Age` | Preflight on every request — latency | Set `maxAge: 86400` |

---

## 4. Input Sanitization & Injection Prevention

Schema validation (Zod, class-validator) is necessary but not sufficient. Apply output encoding and injection-specific defenses.

### XSS Prevention

Never render user content as raw HTML without sanitization:

```ts
// Install: npm install isomorphic-dompurify
import DOMPurify from 'isomorphic-dompurify';

// Sanitize before storing user-generated HTML content
function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false,
  });
}
```

When to apply:
- Rich text editor content (blog posts, comments, descriptions)
- User-supplied HTML in email templates
- Any content that will be rendered as HTML by the frontend

### SQL Injection Prevention

```ts
// SAFE — parameterized query via Prisma
const results = await prisma.$queryRaw<User[]>`
  SELECT * FROM users WHERE email = ${userInput}
`;

// NEVER — string interpolation in raw query
const results = await prisma.$queryRawUnsafe(
  `SELECT * FROM users WHERE email = '${userInput}'`  // ← FORBIDDEN
);
```

Rule: `$queryRawUnsafe` is banned. Every raw query must use Prisma's tagged template literal `$queryRaw`.

### Command Injection Prevention

```ts
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// SAFE — arguments passed as array, never concatenated into shell string
async function convertFile(inputPath: string, outputPath: string): Promise<void> {
  // Validate paths before passing to system binary
  if (!inputPath.startsWith('/app/uploads/')) throw new Error('Invalid input path');
  if (!outputPath.startsWith('/app/processed/')) throw new Error('Invalid output path');

  await execFileAsync('ffmpeg', ['-i', inputPath, outputPath]);
}

// NEVER — user input concatenated into shell command
exec(`ffmpeg -i ${userInput} output.mp4`);  // ← FORBIDDEN
```

### Path Traversal Prevention

```ts
import path from 'path';

function safeFilePath(baseDir: string, userFilename: string): string {
  // Normalize and resolve the full path
  const resolved = path.resolve(baseDir, userFilename);

  // Ensure it stays within the allowed directory
  if (!resolved.startsWith(path.resolve(baseDir))) {
    throw new BadRequestException('Invalid file path');
  }

  return resolved;
}

// Usage
const filePath = safeFilePath('/app/uploads', req.params.filename);
// Blocks: '../../../etc/passwd', '..%2F..%2Fetc%2Fpasswd', etc.
```

### Mass Assignment Prevention

```ts
// NestJS — use whitelist validation to strip unexpected properties
@Controller('users')
export class UsersController {
  @Patch('me')
  update(@Body() dto: UpdateUserDto, @CurrentUser() user: User) {
    // dto only contains fields defined in UpdateUserDto
    // role, is_admin, organization_id are NOT in the DTO → automatically stripped
    return this.usersService.update(user.id, dto);
  }
}

// Enable globally in main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,        // strip properties not in DTO
  forbidNonWhitelisted: false,  // silently strip (set true to throw on extra props)
  transform: true,
}));
```

---

## 5. Encryption

### Hash Algorithm Decision

| Use Case | Algorithm | Notes |
|---|---|---|
| User passwords | Argon2id | Never MD5, SHA-1, bcrypt acceptable fallback |
| API keys (storage) | SHA-256 | api-keys.md |
| Webhook signatures | HMAC-SHA256 | webhooks.md |
| File checksums | SHA-256 | Integrity verification |
| One-time tokens (reset, invite) | SHA-256 (raw bytes → hex) | 32 bytes entropy minimum |
| Field-level PII encryption | AES-256-GCM | See below |

### Field-Level Encryption (AES-256-GCM)

Apply to: email, phone, national ID, credit card last4, health data, any PII that must be searchable or auditable.

```ts
// src/common/security/encryption.service.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // 96 bits — recommended for GCM
const TAG_LENGTH = 16;  // 128-bit authentication tag

export class EncryptionService {
  private readonly key: Buffer;
  private readonly prevKey: Buffer | null;

  constructor(config: { key: string; prevKey?: string }) {
    this.key = Buffer.from(config.key, 'hex');
    if (this.key.length !== 32) throw new Error('FIELD_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
    this.prevKey = config.prevKey ? Buffer.from(config.prevKey, 'hex') : null;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    // Format: iv:tag:ciphertext (all hex)
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, tagHex, dataHex] = ciphertext.split(':');
    if (!ivHex || !tagHex || !dataHex) throw new Error('Invalid ciphertext format');

    return this._decryptWithKey(ivHex, tagHex, dataHex, this.key)
      ?? (this.prevKey ? this._decryptWithKey(ivHex, tagHex, dataHex, this.prevKey) : null)
      ?? (() => { throw new Error('Decryption failed with all keys'); })();
  }

  private _decryptWithKey(ivHex: string, tagHex: string, dataHex: string, key: Buffer): string | null {
    try {
      const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      return decipher.update(Buffer.from(dataHex, 'hex')).toString('utf8') + decipher.final('utf8');
    } catch {
      return null;
    }
  }
}
```

### Which Fields to Encrypt

| Entity | Encrypt | Searchable Strategy |
|---|---|---|
| User.email | ✅ | Store deterministic hash separately for lookup |
| User.phone | ✅ | Hash for lookup |
| User.national_id | ✅ | Hash for lookup |
| Payment.card_last4 | ✅ | Short — encrypt anyway |
| Address.street | ✅ | Full-text search on decrypted cache |
| Order.amount | ❌ | Not PII — index normally |
| User.full_name | Situational | Encrypt if health/legal domain |

For searchable encrypted fields, store a deterministic SHA-256 hash alongside the encrypted value:

```ts
// Store both on write
await prisma.user.create({
  data: {
    email_encrypted: encryption.encrypt(email),
    email_hash: createHash('sha256').update(email.toLowerCase()).digest('hex'),
  },
});

// Query by hash
await prisma.user.findFirst({
  where: { email_hash: createHash('sha256').update(email.toLowerCase()).digest('hex') },
});
```

### Zero-Downtime Key Rotation

```bash
# 1. Generate new key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Deploy with both keys set
FIELD_ENCRYPTION_KEY=<new_key>
FIELD_ENCRYPTION_KEY_PREV=<old_key>

# 3. Run migration: re-encrypt all rows with new key
# 4. Once complete, remove FIELD_ENCRYPTION_KEY_PREV
```

---

## 6. Secrets Management

### Log Masking

Never log sensitive fields. Configure log redaction at the logger level:

```ts
// Pino (recommended for Node.js)
import pino from 'pino';

const logger = pino({
  redact: {
    paths: [
      'password', 'password_hash',
      'token', 'access_token', 'refresh_token',
      'secret', 'api_key', 'authorization',
      'card_number', 'cvv',
      '*.password', '*.token', '*.secret',
      'req.headers.authorization',
      'req.body.password',
    ],
    censor: '[REDACTED]',
  },
});
```

### CI/CD Secrets

```yaml
# GitHub Actions — correct pattern
jobs:
  deploy:
    steps:
      - name: Deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}   # ✅ from GitHub Secrets
          API_KEY: ${{ secrets.API_KEY }}
        run: npm run deploy

# Never hardcode secrets in workflow files:
# API_KEY: sk-abc123   ← FORBIDDEN
```

Rules:
- Secrets must be stored in GitHub Secrets / GitLab CI Variables / Railway environment — never in `.env` committed to repo
- `.env` files must be in `.gitignore` — verify with `git check-ignore .env`
- `.env.example` must exist with placeholder values and no real secrets

### Docker Secrets (BuildKit)

```dockerfile
# Build-time secret (e.g., npm token for private registry)
# SAFE — secret not baked into image layer
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) npm install

# Build command:
# docker build --secret id=npm_token,env=NPM_TOKEN .
```

Never use `ENV` or `ARG` for secrets in Dockerfiles — they are baked into image layers and visible via `docker history`.

### Secret Rotation Pattern (Zero-Downtime)

```
1. Generate new secret value
2. Add new secret alongside old: DATABASE_URL_NEW=...
3. Update app to read BOTH and try new first
4. Deploy app
5. Verify all connections use new secret
6. Remove old secret
7. Rename DATABASE_URL_NEW → DATABASE_URL
8. Deploy again
```

---

## 7. Dependency Security

### CI Integration

Add to every CI pipeline (GitHub Actions example):

```yaml
# .github/workflows/security.yml
- name: Dependency audit
  run: npm audit --audit-level=high
  # Fails CI if high or critical vulnerabilities found

- name: Container scan
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.IMAGE_NAME }}
    format: 'sarif'
    severity: 'HIGH,CRITICAL'
    exit-code: '1'   # fail CI on HIGH/CRITICAL
```

Python:

```yaml
- name: Python dependency audit
  run: |
    pip install pip-audit
    pip-audit --requirement requirements.txt --severity high
```

### Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-patch"]  # skip patch-only PRs
```

### Package Lock File Rules

- Always commit `package-lock.json` or `pnpm-lock.yaml`
- Use `npm ci` (not `npm install`) in CI — respects lockfile exactly
- Use `--frozen-lockfile` flag with pnpm
- Never commit `node_modules/`

### Known Dangerous Patterns

| Pattern | Risk | Fix |
|---|---|---|
| `eval(userInput)` | Code injection | Never use eval with user data |
| `node-serialize` package | Known RCE vulnerability | Use `JSON.parse` instead |
| `child_process.exec(template string)` | Command injection | Use `execFile` with args array |
| Outdated JWT library (<9.0) | Algorithm confusion attacks | Pin to current major version |
| `Math.random()` for tokens | Not cryptographically secure | Use `crypto.randomBytes()` |

---

## 8. Security Monitoring & Alerting

This section covers patterns not present in any other playbook.

### Anomaly Detection

```ts
// src/common/security/ip-blocker.service.ts
export class IpBlockerService {
  private readonly FAILED_LOGIN_KEY = (ip: string) => `security:failed_logins:${ip}`;
  private readonly BLOCK_KEY = (ip: string) => `security:blocked:${ip}`;

  async recordFailedLogin(ip: string): Promise<void> {
    const key = this.FAILED_LOGIN_KEY(ip);
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 3600); // reset window after 1 hour

    const threshold = parseInt(process.env.SUSPICIOUS_LOGIN_THRESHOLD ?? '10');
    if (count >= threshold) {
      await this.blockIp(ip, parseInt(process.env.IP_BLOCK_DURATION_SECONDS ?? '3600'));
      await this.alert.send({
        type: 'ip_blocked',
        message: `IP ${ip} blocked after ${count} failed login attempts`,
        severity: 'high',
      });
    }
  }

  async isBlocked(ip: string): Promise<boolean> {
    return (await this.redis.exists(this.BLOCK_KEY(ip))) === 1;
  }

  async blockIp(ip: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.BLOCK_KEY(ip), '1', 'EX', ttlSeconds);
  }

  async unblockIp(ip: string): Promise<void> {
    await this.redis.del(this.BLOCK_KEY(ip));
  }
}
```

### Security Alert Service

```ts
// src/common/security/security-alert.service.ts
export interface SecurityAlert {
  type: 'ip_blocked' | 'suspicious_session' | 'permission_denied_burst' | 'admin_offhours';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export class SecurityAlertService {
  async send(alert: SecurityAlert): Promise<void> {
    // Always log to AuditLog
    await this.auditLog.record({
      actor: 'system',
      action: `security_alert.${alert.type}`,
      metadata: { severity: alert.severity, message: alert.message, ...alert.metadata },
    });

    if (alert.severity === 'high' || alert.severity === 'critical') {
      await Promise.allSettled([
        this.notifySlack(alert),
        this.notifyEmail(alert),
      ]);
    }
  }

  private async notifySlack(alert: SecurityAlert): Promise<void> {
    const webhookUrl = process.env.SECURITY_ALERT_SLACK_WEBHOOK;
    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *${alert.severity.toUpperCase()}* — ${alert.type}\n${alert.message}`,
      }),
    });
  }

  private async notifyEmail(alert: SecurityAlert): Promise<void> {
    const to = process.env.SECURITY_ALERT_EMAIL;
    if (!to) return;
    await this.email.send({ to, template: 'security-alert', data: alert });
  }
}
```

### Alert Triggers

| Event | Threshold | Severity | Action |
|---|---|---|---|
| Failed logins from same IP | 10 in 1 hour | High | Block IP + alert |
| Permission denied bursts | 20 in 5 minutes per user | Medium | Flag session + alert |
| Admin action outside business hours | Any | Low | Log + alert |
| Bulk data export by non-admin | >1000 records in 1 request | High | Block + alert |
| API key used from new country | First occurrence | Medium | Log |
| Same account logged in from 2+ countries in 5 min | Any | High | Suspend session + alert |

---

## 9. API Endpoints

| Method | Route | Auth | Summary |
|---|---|---|---|
| POST | /admin/security/ip-block | ✅ admin | Manually block an IP address |
| DELETE | /admin/security/ip-block/:ip | ✅ admin | Remove IP block |
| GET | /admin/security/alerts | ✅ admin | List active security alerts |
| POST | /admin/security/force-logout/:userId | ✅ admin | Revoke all sessions for a user |

---

## 10. Environment Variables

```bash
# Field-Level Encryption
FIELD_ENCRYPTION_KEY=          # 32-byte hex — generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
FIELD_ENCRYPTION_KEY_PREV=     # previous key during rotation; remove after re-encryption complete

# CORS
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com

# HSTS
HSTS_MAX_AGE=31536000          # 1 year in seconds

# IP Blocking / Anomaly Detection
SUSPICIOUS_LOGIN_THRESHOLD=10  # failed logins per IP before block
IP_BLOCK_DURATION_SECONDS=3600 # 1 hour block duration

# Security Alerting
SECURITY_ALERT_SLACK_WEBHOOK=  # Slack incoming webhook URL
SECURITY_ALERT_EMAIL=security@example.com

# Secret Scanning
GITLEAKS_CONFIG=.gitleaks.toml
```

---

## 11. Security Rules

- **Encryption mandate:** All PII fields (email, phone, national ID, health data) must be encrypted at rest using AES-256-GCM. Plaintext PII in the database is forbidden.
- **Raw query safety:** `$queryRawUnsafe` is forbidden. All raw queries must use Prisma's parameterized `$queryRaw` tagged templates.
- **Log sanitization:** The fields `password`, `token`, `secret`, `key`, `card`, `authorization` must never appear in logs. Configure Pino/Winston redact at service startup.
- **Algorithm restriction:** Only AES-256-GCM for symmetric encryption. DES, 3DES, RC4, AES-CBC, AES-ECB are forbidden.
- **Dependency scan gate:** CI pipelines must include `npm audit --audit-level=high` (or equivalent). Builds with HIGH or CRITICAL vulnerabilities must not deploy to production.
- **CORS strict mode:** `origin: '*'` is forbidden in production. All origins must be explicitly listed in `CORS_ALLOWED_ORIGINS`.
- **Command injection:** `child_process.exec` with any user-derived input is forbidden. Use `execFile` with an explicit arguments array.
- **Path traversal:** All filesystem paths derived from user input must be validated with `path.resolve` + `startsWith(baseDir)` before use.
- **Secret storage:** Secrets must never be in Dockerfile `ENV` or `ARG` instructions. Use BuildKit `--secret` or runtime environment injection.

---

## 12. File Structure

```
src/
├── common/
│   ├── security/
│   │   ├── encryption.service.ts      ← AES-256-GCM field encryption + key rotation
│   │   ├── ip-blocker.service.ts      ← Redis-based IP blocking + failed login tracking
│   │   └── security-alert.service.ts  ← Anomaly detection + Slack/email alerting
│   └── middleware/
│       ├── helmet.middleware.ts        ← Security headers (Helmet.js config)
│       └── cors.config.ts             ← CORS whitelist from env vars
├── modules/
│   └── admin/
│       └── security/
│           ├── security.module.ts
│           ├── security.controller.ts  ← ip-block, force-logout, alerts endpoints
│           └── security.service.ts
└── config/
    └── security.config.ts             ← Zod schema for all security env vars
```

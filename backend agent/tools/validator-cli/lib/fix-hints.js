/**
 * Fix Hints Generator
 *
 * For every failing or warning check, produce an actionable fix hint:
 *   - checkId: which check failed
 *   - problem: what the issue is
 *   - fix: exactly what to change in the handoff file
 *   - example: optional corrected JSON fragment
 */

const HINTS = {
  // ─── Category 2 — Semantic ───────────────────────────────────────────
  'semantic-form-page-refs': {
    fix: 'Ensure form.page matches exactly one of the strings in pages[].name.',
    example: `"forms": [{ "name": "LoginForm", "page": "LoginPage", ... }]
// pages[].name must include "LoginPage"`,
  },
  'semantic-table-page-refs': {
    fix: 'Ensure table.page matches exactly one of the strings in pages[].name.',
  },
  'semantic-action-page-refs': {
    fix: 'Ensure action.page matches exactly one of the strings in pages[].name.',
  },
  'semantic-upload-page-refs': {
    fix: 'Ensure upload.page matches exactly one of the strings in pages[].name.',
  },
  'semantic-rbac-page-roles': {
    fix: 'Add a roles[] array to at least one page definition when using role-based-access auth flow.',
    example: `"pages": [
  { "name": "AdminPage", "roles": ["admin"], "requiresAuth": true, ... }
]`,
  },
  'semantic-auth-login-flow': {
    fix: 'Add a login auth flow to authFlows[] when any page has requiresAuth: true.',
    example: `"authFlows": [{ "type": "login" }, { "type": "register" }]`,
  },
  'semantic-worker-queue': {
    fix: 'Set infrastructure.queue to the queue technology (e.g. "BullMQ") when backend.services includes a worker.',
    example: `"infrastructure": { "queue": "BullMQ", ... }`,
  },
  'semantic-monorepo-packages': {
    fix: 'Add at least one entry to packages[] when project.repoType is "monorepo".',
    example: `"packages": [
  { "name": "@app/types", "path": "packages/types", "purpose": "types", "consumedBy": ["api", "web"] }
]`,
  },
  'semantic-payment-secret-scan': {
    fix: 'Set security.secretScanningEnabled to true when integrations[] includes a payment type.',
    example: `"security": { "secretScanningEnabled": true, ... }`,
  },

  // ─── Category 3 — Security ───────────────────────────────────────────
  'security-auth-has-login': {
    fix: 'Add { "type": "login" } to authFlows[] when the system uses authentication.',
    example: `"authFlows": [{ "type": "login" }, { "type": "logout" }]`,
  },
  'security-webhook-signature': {
    fix: 'Add an assumption about webhook signature verification to assumptions[].',
    example: `"assumptions": [
  "All Stripe webhooks will be verified using HMAC-SHA256 signature validation before processing."
]`,
  },
  'security-secret-scanning': {
    fix: 'Set security.secretScanningEnabled to true and include .gitleaks.toml in the repo.',
    example: `"security": { "secretScanningEnabled": true }`,
  },
  'security-md-included': {
    fix: 'Set security.securityMdIncluded to true and scaffold a SECURITY.md file in the repo root.',
    example: `"security": { "securityMdIncluded": true }`,
  },
  'security-gitignore': {
    fix: 'Set security.gitignoreComprehensive to true after ensuring .gitignore covers .env, node_modules, dist, build artifacts.',
    example: `"security": { "gitignoreComprehensive": true }`,
  },

  // ─── Category 4 — Completeness ───────────────────────────────────────
  'completeness-assumptions-declared': {
    fix: 'Add at least one assumption string to assumptions[]. Document any decisions made by the producing agent.',
    example: `"assumptions": [
  "Authentication will use JWT with 1-hour access tokens and 30-day refresh tokens."
]`,
  },
  'completeness-project-name': {
    fix: 'Set project.name to a meaningful identifier of at least 2 characters.',
    example: `"project": { "name": "MyApp" }`,
  },
  'completeness-forms-or-actions': {
    fix: 'Either add forms/actions or add an assumption confirming this is a read-only system.',
    example: `"assumptions": ["This system is read-only. No user data mutations are required."]`,
  },

  // ─── Category 5 — Playbook ───────────────────────────────────────────
  'playbook-pii-encryption-assumption': {
    fix: 'Add an assumption referencing field-level encryption for PII data.',
    example: `"assumptions": [
  "PII fields (email, phone) will be encrypted at rest using AES-256-GCM with envelope key rotation."
]`,
  },
  'playbook-cors-assumption': {
    fix: 'Add an assumption about CORS configuration when auth flows are present.',
    example: `"assumptions": [
  "CORS will be configured with an explicit allowlist from the CORS_ALLOWED_ORIGINS environment variable. Wildcard origin is not permitted."
]`,
  },
  'playbook-public-rate-limiting': {
    fix: 'Add a rate limiting assumption for public pages that accept user-submitted data.',
    example: `"assumptions": [
  "Rate limiting will be applied to all unauthenticated endpoints: 100 req/15min per IP."
]`,
  },
  'playbook-security-md': {
    fix: 'Set security.securityMdIncluded to true. SECURITY.md is mandatory for every production repo.',
    example: `"security": { "securityMdIncluded": true }`,
  },
  'playbook-secret-scanning-sensitive': {
    fix: 'Set security.secretScanningEnabled to true when integrations include payment or auth.',
    example: `"security": { "secretScanningEnabled": true }`,
  },

  // ─── Category 6 — Data Classification ───────────────────────────────
  'data-class-pii-tier': {
    fix: 'Add a data classification tier assumption to assumptions[].',
    example: `"assumptions": [
  "User email and phone are classified as Confidential. They will be stored encrypted and never logged in plaintext."
]`,
  },
  'data-class-phi-assumption': {
    fix: 'Add a PHI/HIPAA assumption when health or medical fields are present.',
    example: `"assumptions": [
  "Health fields (diagnosis, medication) are PHI. HIPAA technical safeguards apply: AES-256-GCM encryption, audit logging on all reads."
]`,
  },
  'data-class-phi-scope': {
    fix: 'Set compliance.scope to "HIPAA" when PHI entities are detected.',
    example: `"compliance": { "scope": "HIPAA", "hipaaCompliant": true, ... }`,
  },
  'data-class-hipaa-compliant': {
    fix: 'Set compliance.hipaaCompliant to true after applying all HIPAA technical safeguards.',
    example: `"compliance": { "hipaaCompliant": true }`,
  },
  'data-class-phi-encrypted': {
    fix: 'Set compliance.phiEntitiesEncrypted to true after applying field-level encryption to all PHI entities.',
    example: `"compliance": { "phiEntitiesEncrypted": true }`,
  },
  'data-class-phi-audit': {
    fix: 'Set compliance.phiAuditLogging to true after implementing an immutable PHI access audit log.',
    example: `"compliance": { "phiAuditLogging": true }`,
  },
  'data-class-pci-scope': {
    fix: 'Add a PCI scope reduction assumption (tokenization, no raw card storage) when financial PII entities are present.',
    example: `"assumptions": [
  "Raw card numbers are never stored. Stripe tokenization is used for all payment data. PCI scope is minimized."
]`,
  },

  // ─── Category 7 — Observability ──────────────────────────────────────
  'observability-logging-assumption': {
    fix: 'Add a structured logging or health endpoint assumption when the system has 3+ pages or 2+ actions.',
    example: `"assumptions": [
  "Structured JSON logging (Pino) will be configured at the API entry point with correlation IDs on every request."
]`,
  },
  'observability-health-endpoints-planned': {
    fix: 'Set observability.healthEndpointsPlanned to true and define healthLive and healthReady routes.',
    example: `"observability": {
  "healthEndpointsPlanned": true,
  "healthLive": "/health/live",
  "healthReady": "/health/ready"
}`,
  },
  'observability-health-routes': {
    fix: 'Define both observability.healthLive and observability.healthReady route paths.',
    example: `"observability": {
  "healthEndpointsPlanned": true,
  "healthLive": "/health/live",
  "healthReady": "/health/ready"
}`,
  },
  'observability-distributed-tracing': {
    fix: 'Set observability.distributedTracing to true and add OTel SDK to all services. If deferring, add a distributedTracingNote.',
    example: `"observability": {
  "distributedTracing": true
}
// OR if deferring:
"observability": {
  "distributedTracing": false,
  "distributedTracingNote": "Deferred to v1.1 — single-region deployment, spans not required in MVP."
}`,
  },
  'observability-structured-logging': {
    fix: 'Set observability.structuredLogging to true and specify the logging library.',
    example: `"observability": {
  "structuredLogging": true,
  "loggingLibrary": "pino"
}`,
  },

  // ─── Category 8 — Resilience (Rule 16) ───────────────────────────────
  'resilience-external-trigger-patterns': {
    fix: 'Add an assumption declaring timeout, retry strategy, or circuit breaker for each external integration (payment, email, custom API).',
    example: `"assumptions": [
  "Stripe webhook calls are wrapped with p-retry (3 attempts, exponential backoff with jitter). Timeout is 10 seconds per attempt.",
  "Email delivery via Resend uses a circuit breaker (opossum) — failure threshold 50%, reset after 30 seconds."
]`,
  },
  'resilience-integration-patterns': {
    fix: 'Add "resilience.md" to meta.playbooksApplied, or add assumptions referencing retry/timeout/circuit breaker for each payment, email, or LLM integration.',
    example: `// Option A: playbooksApplied
"meta": {
  "playbooksApplied": ["resilience.md", "stripe-payments.md"]
}

// Option B: assumptions
"assumptions": [
  "All external API calls (Stripe, Resend) are wrapped with exponential backoff retry (p-retry) and a 10-second timeout (AbortController).",
  "Circuit breaker (opossum) is applied to the email service — failure does not block the main request flow."
]`,
  },
  'resilience-payment-idempotency': {
    fix: 'Add an assumption about idempotency keys for retried payment calls to eliminate double-charge risk.',
    example: `"assumptions": [
  "All Stripe PaymentIntent and charge requests use idempotency keys derived from the order ID — retried requests cannot create duplicate charges.",
  "Idempotency keys are generated as: SHA-256(workspaceId + orderId + amount + currency)."
]`,
  },

  // ─── Category 9 — Edge Runtime (Rule 17) ─────────────────────────────
  'edge-no-tcp-redis': {
    fix: 'Replace REDIS_URL (TCP Redis) with Upstash Redis REST API. TCP connections are not supported in Cloudflare Workers.',
    example: `// Remove from envVarsRequired:
"REDIS_URL"

// Replace with:
"UPSTASH_REDIS_REST_URL",
"UPSTASH_REDIS_REST_TOKEN"

// Client code (Hono / CF Workers):
import { Redis } from '@upstash/redis/cloudflare'
const redis = Redis.fromEnv(env) // uses REST API, no TCP socket`,
  },
  'edge-postgres-hyperdrive': {
    fix: 'Add a Cloudflare Hyperdrive binding for PostgreSQL, or switch to an HTTP-based Postgres client (Supabase PostgREST, Neon serverless driver).',
    example: `// Option A: CF Hyperdrive (wrangler.toml)
[[hyperdrive]]
binding = "HYPERDRIVE_DB"
id      = "your-hyperdrive-id"

// Option B: Supabase PostgREST (HTTP — no TCP)
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)

// In repo-handoff assumptions:
"assumptions": ["Postgres is accessed via CF Hyperdrive binding — no direct TCP connection."]`,
  },
  'edge-no-dockerfile': {
    fix: 'Confirm the Dockerfile is for local development only. CF Workers deploy via wrangler — no Docker image is needed for production.',
    example: `// If the Dockerfile is only for local dev, add an assumption:
"assumptions": [
  "Dockerfile is for local development / Docker Compose only. Production deployment uses wrangler deploy to Cloudflare Workers."
]`,
  },
  'edge-migration-tool': {
    fix: 'Replace Prisma migrate / Alembic with wrangler d1 migrations or drizzle-kit for D1 (SQLite) databases.',
    example: `// wrangler d1 migrations (in wrangler.toml):
[[d1_databases]]
binding      = "DB"
database_id  = "your-d1-id"
migrations_dir = "drizzle"

// drizzle-kit (drizzle.config.ts):
export default {
  schema: './src/schema.ts',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CF_ACCOUNT_ID!,
    databaseId: process.env.CF_D1_ID!,
    token: process.env.CF_API_TOKEN!,
  },
}`,
  },
  'edge-wrangler-config': {
    fix: 'Declare wrangler.toml in files[] or reference it in assumptions. Every CF Worker requires wrangler.toml for routes, KV bindings, and secrets.',
    example: `// In repo-handoff files (if files field exists):
"files": { "wranglerConfig": "wrangler.toml" }

// OR in assumptions:
"assumptions": [
  "wrangler.toml is committed at the repo root. It defines Worker routes, KV namespace bindings, D1 bindings, and Cloudflare zone config."
]`,
  },
};

/**
 * Generate fix hints for a list of failed/warned checks.
 * @param {object[]} checks - All checks from the validation run
 * @returns {object[]} fixHints
 */
export function generateFixHints(checks) {
  const problematic = checks.filter(c => c.status === 'fail' || c.status === 'warn');

  return problematic.map(check => {
    // Normalize check ID: remove trailing index (e.g. "schema-violation-1" → generic)
    const baseId = check.id.replace(/-\d+$/, '');
    const hint = HINTS[baseId] || HINTS[check.id];

    if (hint) {
      return {
        checkId: check.id,
        problem: check.message,
        fix: hint.fix,
        ...(hint.example ? { example: hint.example } : {}),
      };
    }

    // Generic fallback for schema violations
    if (check.id.startsWith('schema-violation-')) {
      return {
        checkId: check.id,
        problem: check.message,
        fix: `Correct the field at path "${check.field || 'root'}" to match the JSON schema requirements. Run with --format json for the full AJV error details.`,
      };
    }

    return {
      checkId: check.id,
      problem: check.message,
      fix: `Review the field "${check.field || 'indicated above'}" and correct the issue described in the check message.`,
    };
  });
}

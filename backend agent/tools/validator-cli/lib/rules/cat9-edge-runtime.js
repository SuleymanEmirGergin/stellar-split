/**
 * Category 9 — Edge Runtime Checks (Rule 17)
 *
 * Applies only when:
 *   project.deploymentTarget === 'cloudflare-workers'   (repo-handoff)
 *   OR any integration/envVar references CF Workers patterns
 *
 * For repo-handoff.json:
 *   - TCP Redis (REDIS_URL in envVarsRequired) → BLOCKING error
 *   - PostgreSQL without Hyperdrive → warning
 *   - Dockerfile declared → info
 *   - Wrong migration tool (prisma/alembic for D1) → warning
 *   - wrangler.toml / wranglerConfig not declared in files → warning
 */

const CF_WORKERS_INDICATORS = ['cloudflare-workers', 'cloudflare-worker', 'workers'];
const TCP_REDIS_ENV_KEYS = ['redis_url', 'redis_host', 'redis_port', 'redis_password'];
const UPSTASH_REST_ENV_KEYS = ['upstash_redis_rest_url', 'upstash_redis_rest_token'];
const NON_D1_MIGRATION_TOOLS = ['prisma', 'alembic', 'flyway', 'liquibase', 'migrate', 'knex'];

/**
 * Detect if this project targets Cloudflare Workers.
 * @param {object} data
 * @returns {boolean}
 */
function isCFWorkersProject(data) {
  const target = (data.project?.deploymentTarget || '').toLowerCase();
  const runtime = (data.project?.runtime || '').toLowerCase();
  return CF_WORKERS_INDICATORS.some(kw => target.includes(kw) || runtime.includes(kw));
}

/**
 * @param {'frontend-backend'|'repo'} type
 * @param {object} data
 * @returns {object[]} checks
 */
export function runCategory9(type, data) {
  // Rule 17 only applies to repo-handoff.json
  if (type !== 'repo') return [];
  // Only activate if this is a CF Workers project
  if (!isCFWorkersProject(data)) return [];

  return checkEdgeRuntime(data);
}

function checkEdgeRuntime(data) {
  const checks = [];
  const integrations = data.integrations || [];
  const assumptions = (data.assumptions || []).map(a => typeof a === "string" ? a : (a.statement || a.text || "")).join(' ').toLowerCase();

  // Collect all env var names (lowercase) across all integrations
  const allEnvVars = integrations
    .flatMap(i => i.envVarsRequired || [])
    .map(v => v.toLowerCase());

  // ── Check 1: TCP Redis → BLOCKING ────────────────────────────────────────
  const hasTcpRedis = TCP_REDIS_ENV_KEYS.some(key => allEnvVars.includes(key));
  const hasUpstashRest = UPSTASH_REST_ENV_KEYS.some(key => allEnvVars.includes(key));

  if (hasTcpRedis) {
    checks.push({
      id: 'edge-no-tcp-redis',
      category: 'security',
      label: 'Edge Runtime: No TCP Redis',
      status: 'fail',
      message: 'REDIS_URL (TCP Redis) detected in integration envVarsRequired. TCP Redis does not work in Cloudflare Workers — the Workers runtime does not support persistent TCP connections. Replace with Upstash Redis REST API (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).',
      severity: 'error',
      field: 'integrations[].envVarsRequired',
    });
  } else if (hasUpstashRest) {
    checks.push({
      id: 'edge-no-tcp-redis',
      category: 'security',
      label: 'Edge Runtime: No TCP Redis',
      status: 'pass',
      message: 'CF Workers project uses Upstash REST API (UPSTASH_REDIS_REST_URL) — compatible with edge runtime.',
      severity: 'error',
    });
  } else {
    // No Redis at all — not a failure
    checks.push({
      id: 'edge-no-tcp-redis',
      category: 'security',
      label: 'Edge Runtime: No TCP Redis',
      status: 'pass',
      message: 'No TCP Redis detected in CF Workers project.',
      severity: 'error',
    });
  }

  // ── Check 2: PostgreSQL without Hyperdrive → warning ─────────────────────
  const databases = data.databases || [];
  const directPostgresDb = databases.find(db => {
    const dbType = (db.type || '').toLowerCase();
    return (dbType.includes('postgres') || dbType.includes('postgresql')) && !db.hyperdrive;
  });

  // Also check if backend.database contains postgres and no hyperdrive mention
  const backendDb = (data.backend?.database || '').toLowerCase();
  // HTTP-based Postgres providers that don't need Hyperdrive
  const HTTP_POSTGRES_PROVIDERS = ['supabase', 'neon', 'postgrest', 'supabase-postgres'];
  const isHttpPostgres = HTTP_POSTGRES_PROVIDERS.some(p => backendDb.includes(p));

  const hasDirectPostgres = directPostgresDb ||
    (!isHttpPostgres && backendDb.includes('postgres') && !assumptions.includes('hyperdrive'));

  if (hasDirectPostgres && databases.length > 0) {
    checks.push({
      id: 'edge-postgres-hyperdrive',
      category: 'completeness',
      label: 'Edge Runtime: PostgreSQL via Hyperdrive',
      status: 'warn',
      message: 'PostgreSQL database detected in CF Workers project without a Hyperdrive binding. Direct TCP Postgres connections are not supported in Workers — use Cloudflare Hyperdrive or switch to D1 (SQLite) / Supabase (PostgREST over HTTP).',
      severity: 'warning',
      field: 'databases[].hyperdrive',
    });
  } else if (databases.length === 0 && !isHttpPostgres && backendDb.includes('postgres') && !assumptions.includes('hyperdrive')) {
    // backend.database string mentions postgres but no databases[] array
    checks.push({
      id: 'edge-postgres-hyperdrive',
      category: 'completeness',
      label: 'Edge Runtime: PostgreSQL via Hyperdrive',
      status: 'warn',
      message: 'backend.database references PostgreSQL in a CF Workers project. Verify a Hyperdrive binding (CF Hyperdrive) or HTTP-based Postgres client (Supabase PostgREST / Neon serverless) is declared. Direct TCP connections fail in Workers.',
      severity: 'warning',
      field: 'backend.database',
    });
  } else {
    // D1, Supabase, or Hyperdrive in use — OK
    if (backendDb.includes('postgres') && assumptions.includes('hyperdrive')) {
      checks.push({
        id: 'edge-postgres-hyperdrive',
        category: 'completeness',
        label: 'Edge Runtime: PostgreSQL via Hyperdrive',
        status: 'pass',
        message: 'PostgreSQL via Hyperdrive binding is referenced in assumptions — compatible with CF Workers.',
        severity: 'warning',
      });
    } else {
      checks.push({
        id: 'edge-postgres-hyperdrive',
        category: 'completeness',
        label: 'Edge Runtime: PostgreSQL via Hyperdrive',
        status: 'pass',
        message: 'No direct TCP Postgres detected — edge-compatible database in use.',
        severity: 'warning',
      });
    }
  }

  // ── Check 3: Dockerfile in CF Workers project → info ─────────────────────
  const files = data.files || {};
  const hasDockerfile = !!(files.dockerfile || files.dockerCompose || files['docker-compose']);

  checks.push({
    id: 'edge-no-dockerfile',
    category: 'completeness',
    label: 'Edge Runtime: No Dockerfile Needed',
    status: hasDockerfile ? 'warn' : 'pass',
    message: hasDockerfile
      ? 'A Dockerfile is declared for a Cloudflare Workers project. CF Workers bundles via `wrangler deploy` — Docker is not used. The Dockerfile may be for local development (Docker Compose) only; confirm intent.'
      : 'No Dockerfile declared — correct for CF Workers (uses wrangler deploy).',
    severity: 'info',
    field: hasDockerfile ? 'files.dockerfile' : undefined,
  });

  // ── Check 4: Migration tool must be wrangler-d1 or drizzle-kit → warning ─
  const nonD1MigrationTools = databases.filter(db => {
    const tool = (db.migrationTool || '').toLowerCase();
    return NON_D1_MIGRATION_TOOLS.some(bad => tool.includes(bad));
  });

  if (databases.length > 0) {
    if (nonD1MigrationTools.length > 0) {
      const toolNames = nonD1MigrationTools.map(db => db.migrationTool).join(', ');
      checks.push({
        id: 'edge-migration-tool',
        category: 'completeness',
        label: 'Edge Runtime: Migration Tool Compatible',
        status: 'warn',
        message: `Migration tool(s) "${toolNames}" detected for a CF Workers project. Tools like Prisma migrate and Alembic target PostgreSQL/MySQL — not D1 (SQLite). Use wrangler d1 migrations or drizzle-kit for D1 databases.`,
        severity: 'warning',
        field: 'databases[].migrationTool',
      });
    } else {
      checks.push({
        id: 'edge-migration-tool',
        category: 'completeness',
        label: 'Edge Runtime: Migration Tool Compatible',
        status: 'pass',
        message: 'Database migration tool(s) are compatible with the edge runtime (wrangler-d1 or drizzle-kit).',
        severity: 'warning',
      });
    }
  }

  // ── Check 5: wrangler.toml / wranglerConfig must be declared → warning ────
  const hasWranglerConfig = !!(
    files.wranglerConfig ||
    files['wrangler.toml'] ||
    files.wrangler ||
    assumptions.includes('wrangler.toml') ||
    assumptions.includes('wrangler deploy')
  );

  checks.push({
    id: 'edge-wrangler-config',
    category: 'completeness',
    label: 'Edge Runtime: wrangler.toml Declared',
    status: hasWranglerConfig ? 'pass' : 'warn',
    message: hasWranglerConfig
      ? 'wrangler.toml / wranglerConfig is declared — CF Workers deploy configuration present.'
      : 'CF Workers project detected but wrangler.toml is not referenced in files[] or assumptions[]. Every CF Worker requires a wrangler.toml (or wrangler.json) for routes, KV bindings, and deploy config.',
    severity: 'warning',
    field: hasWranglerConfig ? undefined : 'files.wranglerConfig',
  });

  return checks;
}

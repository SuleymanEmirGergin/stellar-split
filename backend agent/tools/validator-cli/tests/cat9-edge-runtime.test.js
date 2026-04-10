/**
 * CLI Test Suite — Category 9: Edge Runtime Checks (Rule 17)
 *
 * Tests cover:
 *   - TCP Redis detection (BLOCKING)
 *   - Upstash REST API (PASS)
 *   - Postgres without Hyperdrive (WARN)
 *   - Dockerfile present (INFO)
 *   - Wrong migration tool (WARN)
 *   - wrangler.toml not declared (WARN)
 *   - Non-CF-Workers project → all checks skipped
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runCategory9 } from '../lib/rules/cat9-edge-runtime.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cfRepo(overrides = {}) {
  return {
    meta: { generatedBy: 'repo-builder-agent', generatedAt: new Date().toISOString(), modeUsed: '/blueprint', playbooksApplied: [] },
    project: { name: 'TestWorker', repoType: 'single-app', deploymentTarget: 'cloudflare-workers' },
    frontend: {},
    backend: { framework: 'hono', language: 'typescript', services: [] },
    integrations: [],
    infrastructure: { containerization: 'none', cicd: 'github-actions' },
    security: { secretScanningEnabled: true, securityMdIncluded: true, gitignoreComprehensive: true, ciSecurityScanStep: true },
    packages: [],
    databases: [],
    files: {},
    assumptions: ['wrangler.toml is committed at the repo root.'],
    ...overrides,
  };
}

function nonCfRepo(overrides = {}) {
  return {
    ...cfRepo(overrides),
    project: { name: 'TestApp', repoType: 'single-app', deploymentTarget: 'railway' },
  };
}

// ─── Non-CF-Workers: all checks skipped ───────────────────────────────────────

describe('Cat9 — Non-CF-Workers project', () => {
  it('SKIP: returns empty array for railway deployment target', () => {
    const data = nonCfRepo();
    const checks = runCategory9('repo', data);
    assert.equal(checks.length, 0, 'No cat9 checks for non-CF-Workers projects');
  });

  it('SKIP: returns empty for frontend-backend type regardless of target', () => {
    const data = { project: { deploymentTarget: 'cloudflare-workers' } };
    const checks = runCategory9('frontend-backend', data);
    assert.equal(checks.length, 0, 'Cat9 never runs on frontend-backend type');
  });
});

// ─── TCP Redis Detection (BLOCKING) ───────────────────────────────────────────

describe('Cat9 — TCP Redis detection', () => {
  it('FAIL (blocking): REDIS_URL in envVarsRequired', () => {
    const data = cfRepo({
      integrations: [{
        name: 'Redis Cache',
        type: 'custom',
        envVarsRequired: ['REDIS_URL', 'REDIS_PASSWORD'],
      }],
    });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-no-tcp-redis');
    assert.ok(c, 'edge-no-tcp-redis check must exist');
    assert.equal(c.status, 'fail');
    assert.equal(c.severity, 'error');
    assert.ok(c.message.includes('TCP Redis'), 'Message must mention TCP Redis');
    assert.ok(c.message.includes('Upstash'), 'Message must suggest Upstash');
  });

  it('FAIL (blocking): redis_host in envVarsRequired (case-insensitive)', () => {
    const data = cfRepo({
      integrations: [{ name: 'Cache', type: 'custom', envVarsRequired: ['REDIS_HOST'] }],
    });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-no-tcp-redis');
    assert.equal(c.status, 'fail');
  });

  it('PASS: Upstash REST env vars instead of REDIS_URL', () => {
    const data = cfRepo({
      integrations: [{
        name: 'Upstash Cache',
        type: 'custom',
        envVarsRequired: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
      }],
    });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-no-tcp-redis');
    assert.equal(c.status, 'pass');
  });

  it('PASS: no Redis at all → passes cleanly', () => {
    const data = cfRepo({ integrations: [] });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-no-tcp-redis');
    assert.equal(c.status, 'pass');
  });
});

// ─── PostgreSQL + Hyperdrive ───────────────────────────────────────────────────

describe('Cat9 — PostgreSQL Hyperdrive warning', () => {
  it('WARN: postgres in databases[] without hyperdrive field', () => {
    const data = cfRepo({
      databases: [{ type: 'postgresql', migrationTool: 'prisma', hyperdrive: false }],
    });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-postgres-hyperdrive');
    assert.equal(c.status, 'warn');
  });

  it('WARN: backend.database mentions postgres without Hyperdrive assumption', () => {
    const data = cfRepo({
      backend: { framework: 'hono', language: 'typescript', database: 'postgresql', services: [] },
      assumptions: ['wrangler.toml is committed at the repo root.'],
    });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-postgres-hyperdrive');
    assert.equal(c.status, 'warn');
  });

  it('PASS: Supabase (HTTP-based) → no direct Postgres TCP', () => {
    const data = cfRepo({
      backend: { framework: 'hono', language: 'typescript', database: 'supabase-postgres', services: [] },
    });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-postgres-hyperdrive');
    assert.equal(c.status, 'pass');
  });

  it('PASS: D1 (SQLite) database → no Hyperdrive needed', () => {
    const data = cfRepo({
      databases: [{ type: 'd1', migrationTool: 'wrangler-d1' }],
      backend: { framework: 'hono', language: 'typescript', database: 'd1', services: [] },
    });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-postgres-hyperdrive');
    assert.equal(c.status, 'pass');
  });
});

// ─── Dockerfile detection ──────────────────────────────────────────────────────

describe('Cat9 — Dockerfile info check', () => {
  it('WARN/INFO: dockerfile declared for CF Workers project', () => {
    const data = cfRepo({ files: { dockerfile: 'Dockerfile' } });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-no-dockerfile');
    assert.ok(c);
    assert.equal(c.status, 'warn');
    assert.equal(c.severity, 'info');
  });

  it('PASS: no dockerfile in CF Workers project', () => {
    const data = cfRepo({ files: {} });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-no-dockerfile');
    assert.ok(c);
    assert.equal(c.status, 'pass');
  });
});

// ─── Migration tool checks ─────────────────────────────────────────────────────

describe('Cat9 — Migration tool compatibility', () => {
  it('WARN: prisma migrate tool for D1 type database', () => {
    const data = cfRepo({
      databases: [{ type: 'd1', migrationTool: 'prisma' }],
    });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-migration-tool');
    assert.ok(c);
    assert.equal(c.status, 'warn');
    assert.ok(c.message.includes('wrangler d1') || c.message.includes('drizzle-kit'));
  });

  it('WARN: alembic tool in CF Workers project', () => {
    const data = cfRepo({
      databases: [{ type: 'd1', migrationTool: 'alembic' }],
    });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-migration-tool');
    assert.equal(c.status, 'warn');
  });

  it('PASS: drizzle-kit tool for D1 → compatible', () => {
    const data = cfRepo({
      databases: [{ type: 'd1', migrationTool: 'drizzle-kit' }],
    });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-migration-tool');
    assert.equal(c.status, 'pass');
  });

  it('PASS: wrangler-d1 migration tool → compatible', () => {
    const data = cfRepo({
      databases: [{ type: 'd1', migrationTool: 'wrangler-d1' }],
    });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-migration-tool');
    assert.equal(c.status, 'pass');
  });

  it('SKIP migration check: no databases[] defined', () => {
    const data = cfRepo({ databases: [] });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-migration-tool');
    assert.equal(c, undefined, 'No migration check when databases[] is empty');
  });
});

// ─── Wrangler config ───────────────────────────────────────────────────────────

describe('Cat9 — wrangler.toml declaration', () => {
  it('WARN: no wrangler.toml reference in files or assumptions', () => {
    const data = cfRepo({
      files: {},
      assumptions: ['CORS is restricted by ALLOWED_ORIGIN.'],
    });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-wrangler-config');
    assert.equal(c.status, 'warn');
  });

  it('PASS: wrangler.toml referenced in assumptions', () => {
    const data = cfRepo({
      files: {},
      assumptions: ['wrangler.toml is committed at the project root.'],
    });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-wrangler-config');
    assert.equal(c.status, 'pass');
  });

  it('PASS: wrangler deploy referenced in assumptions', () => {
    const data = cfRepo({
      files: {},
      assumptions: ['Production deployment uses wrangler deploy via GitHub Actions.'],
    });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-wrangler-config');
    assert.equal(c.status, 'pass');
  });

  it('PASS: files.wranglerConfig is set', () => {
    const data = cfRepo({ files: { wranglerConfig: 'wrangler.toml' } });
    const checks = runCategory9('repo', data);
    const c = checks.find(c => c.id === 'edge-wrangler-config');
    assert.equal(c.status, 'pass');
  });
});

// ─── Full CF Workers PASS scenario (like EdgeForms) ───────────────────────────

describe('Cat9 — Full PASS scenario (EdgeForms-like)', () => {
  it('No blocking failures with well-formed CF Workers repo-handoff', () => {
    const data = cfRepo({
      integrations: [
        { name: 'Supabase', type: 'storage', envVarsRequired: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
        { name: 'Upstash', type: 'custom', envVarsRequired: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] },
      ],
      backend: { framework: 'hono', language: 'typescript', database: 'supabase-postgres', services: [] },
      databases: [],
      files: { wranglerConfig: 'wrangler.toml' },
      assumptions: [
        'wrangler.toml is committed at the repo root.',
        'CF Workers use Upstash REST API for KV operations — no TCP Redis.',
        // Note: no Hyperdrive keyword → postgres-hyperdrive will warn (acceptable)
      ],
    });
    const checks = runCategory9('repo', data);

    assert.ok(checks.length >= 4, `Expected >= 4 checks, got ${checks.length}`);

    // No BLOCKING failures — warnings are acceptable for this scenario
    const failures = checks.filter(c => c.status === 'fail');
    assert.equal(failures.length, 0, 'No blocking failures in well-formed CF Workers handoff');

    // Specifically: TCP Redis check must pass
    const tcpCheck = checks.find(c => c.id === 'edge-no-tcp-redis');
    assert.equal(tcpCheck?.status, 'pass', 'TCP Redis check must pass (Upstash REST used)');

    // wrangler config check must pass
    const wranglerCheck = checks.find(c => c.id === 'edge-wrangler-config');
    assert.equal(wranglerCheck?.status, 'pass', 'wrangler.toml check must pass');
  });

  it('PASS with Hyperdrive assumption: no postgres-hyperdrive warning', () => {
    const data = cfRepo({
      integrations: [
        { name: 'Supabase', type: 'storage', envVarsRequired: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
      ],
      backend: { framework: 'hono', language: 'typescript', database: 'supabase-postgres', services: [] },
      databases: [],
      files: { wranglerConfig: 'wrangler.toml' },
      assumptions: [
        'wrangler.toml is committed at the repo root.',
        'Postgres is accessed via Hyperdrive binding — no direct TCP socket.',
      ],
    });
    const checks = runCategory9('repo', data);
    const failures = checks.filter(c => c.status === 'fail');
    const pgCheck = checks.find(c => c.id === 'edge-postgres-hyperdrive');
    assert.equal(failures.length, 0, 'No blocking failures');
    assert.equal(pgCheck?.status, 'pass', 'postgres-hyperdrive check passes when Hyperdrive is in assumptions');
  });
});

// ─── Full FAIL scenario (TCP Redis in CF Workers) ────────────────────────────

describe('Cat9 — Full FAIL scenario (TCP Redis)', () => {
  it('BLOCKING failure when ioredis REDIS_URL is present in CF Workers project', () => {
    const data = cfRepo({
      integrations: [{
        name: 'Redis Cache',
        type: 'custom',
        envVarsRequired: ['REDIS_URL'],  // TCP Redis ← BLOCKING
      }],
      assumptions: ['wrangler.toml is committed.'],
    });
    const checks = runCategory9('repo', data);
    const failures = checks.filter(c => c.status === 'fail');
    assert.equal(failures.length, 1);
    assert.equal(failures[0].id, 'edge-no-tcp-redis');
    assert.equal(failures[0].severity, 'error');
  });
});

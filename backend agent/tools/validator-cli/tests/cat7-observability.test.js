/**
 * CLI Test Suite — Category 7: Observability Baseline (Rule 15)
 *
 * Tests cover:
 *   frontend-backend:
 *     - trivial system (< 3 pages, < 2 actions) → no check emitted
 *     - non-trivial system without logging/health assumption → WARN
 *     - non-trivial system WITH observability assumption → PASS
 *
 *   repo:
 *     - API service + healthEndpointsPlanned true + live + ready → PASS
 *     - API service + healthEndpointsPlanned true, missing healthReady → WARN
 *     - API service + healthEndpointsPlanned false → WARN
 *     - 2+ services + distributedTracing true → PASS
 *     - 2+ services + distributedTracing false → WARN (deferral note accepted)
 *     - deploymentTarget set + structuredLogging false → WARN
 *     - deploymentTarget not set → no structuredLogging check
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runCategory7 } from '../lib/rules/cat7-observability.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fb(overrides = {}) {
  return {
    project: { name: 'TestApp' },
    pages: [], forms: [], tables: [], actions: [],
    authFlows: [], externalTriggers: [], assumptions: [],
    ...overrides,
  };
}

function repo(overrides = {}) {
  return {
    meta: { generatedBy: 'repo-builder-agent', generatedAt: new Date().toISOString(), modeUsed: '/blueprint', playbooksApplied: [] },
    project: { name: 'TestApp', repoType: 'single-app', deploymentTarget: 'railway' },
    frontend: {},
    backend: { framework: 'nestjs', language: 'typescript', services: [{ type: 'api', name: 'API' }] },
    integrations: [], infrastructure: { containerization: 'docker', cicd: 'github-actions' },
    security: { secretScanningEnabled: true, securityMdIncluded: true, gitignoreComprehensive: true, ciSecurityScanStep: true },
    observability: {
      healthEndpointsPlanned: true, healthLive: '/health/live', healthReady: '/health/ready',
      structuredLogging: true, loggingLibrary: 'pino', distributedTracing: false,
    },
    packages: [], assumptions: [],
    ...overrides,
  };
}

// ─── frontend-backend: observability assumption ────────────────────────────────

describe('Cat7 — frontend-backend: observability logging assumption', () => {
  it('SKIP: trivial system (2 pages, 1 action) → no check emitted', () => {
    const data = fb({
      pages: [{ name: 'Home' }, { name: 'About' }],
      actions: [{ name: 'Subscribe', page: 'Home', method: 'POST' }],
    });
    const checks = runCategory7('frontend-backend', data);
    assert.equal(checks.find(c => c.id === 'observability-logging-assumption'), undefined);
  });

  it('SKIP: 0 pages, 0 actions → no check', () => {
    const data = fb({ pages: [], actions: [] });
    assert.equal(runCategory7('frontend-backend', data).find(c => c.id === 'observability-logging-assumption'), undefined);
  });

  it('WARN: 3 pages without observability assumption', () => {
    const data = fb({
      pages: [{ name: 'Home' }, { name: 'Dashboard' }, { name: 'Profile' }],
      assumptions: ['JWT expires in 1 hour.'],
    });
    const checks = runCategory7('frontend-backend', data);
    const c = checks.find(c => c.id === 'observability-logging-assumption');
    assert.ok(c, 'observability check must be emitted for non-trivial system');
    assert.equal(c.status, 'warn');
    assert.equal(c.field, 'assumptions');
  });

  it('WARN: 2 actions (threshold) without observability assumption', () => {
    const data = fb({
      pages: [{ name: 'Home' }],
      actions: [{ name: 'Action1' }, { name: 'Action2' }],
    });
    const checks = runCategory7('frontend-backend', data);
    const c = checks.find(c => c.id === 'observability-logging-assumption');
    assert.ok(c);
    assert.equal(c.status, 'warn');
  });

  it('PASS: 3 pages WITH "log" keyword in assumptions', () => {
    const data = fb({
      pages: [{ name: 'Home' }, { name: 'Dashboard' }, { name: 'Profile' }],
      assumptions: ['Structured logging via Pino is configured at startup.'],
    });
    const c = runCategory7('frontend-backend', data).find(c => c.id === 'observability-logging-assumption');
    assert.equal(c.status, 'pass');
  });

  it('PASS: "health" keyword in assumptions', () => {
    const data = fb({
      pages: [{ name: 'Home' }, { name: 'Dashboard' }, { name: 'Settings' }],
      assumptions: ['Health check endpoints /health/live and /health/ready are exposed.'],
    });
    assert.equal(runCategory7('frontend-backend', data).find(c => c.id === 'observability-logging-assumption').status, 'pass');
  });

  it('PASS: "monitor" keyword in assumptions', () => {
    const data = fb({
      pages: [{ name: 'Home' }, { name: 'Dashboard' }, { name: 'Reports' }],
      assumptions: ['System metrics are monitored via Prometheus/Grafana.'],
    });
    assert.equal(runCategory7('frontend-backend', data).find(c => c.id === 'observability-logging-assumption').status, 'pass');
  });
});

// ─── repo: health endpoints ───────────────────────────────────────────────────

describe('Cat7 — repo: health endpoints', () => {
  it('PASS: API service + healthEndpointsPlanned + both routes defined', () => {
    const data = repo({
      backend: { framework: 'nestjs', language: 'typescript', services: [{ type: 'api', name: 'API' }] },
      observability: { healthEndpointsPlanned: true, healthLive: '/health/live', healthReady: '/health/ready', structuredLogging: true },
    });
    const checks = runCategory7('repo', data);
    assert.equal(checks.find(c => c.id === 'observability-health-endpoints-planned').status, 'pass');
    assert.equal(checks.find(c => c.id === 'observability-health-routes').status, 'pass');
  });

  it('WARN: API service + healthEndpointsPlanned true but missing healthReady', () => {
    const data = repo({
      backend: { framework: 'nestjs', language: 'typescript', services: [{ type: 'api', name: 'API' }] },
      observability: { healthEndpointsPlanned: true, healthLive: '/health/live', structuredLogging: true },
    });
    const checks = runCategory7('repo', data);
    assert.equal(checks.find(c => c.id === 'observability-health-endpoints-planned').status, 'pass');
    assert.equal(checks.find(c => c.id === 'observability-health-routes').status, 'warn');
  });

  it('WARN: API service + healthEndpointsPlanned true but missing both live and ready', () => {
    const data = repo({
      backend: { framework: 'nestjs', language: 'typescript', services: [{ type: 'api', name: 'API' }] },
      observability: { healthEndpointsPlanned: true, structuredLogging: true },
    });
    const checks = runCategory7('repo', data);
    assert.equal(checks.find(c => c.id === 'observability-health-routes').status, 'warn');
  });

  it('WARN: API service + healthEndpointsPlanned false', () => {
    const data = repo({
      backend: { framework: 'nestjs', language: 'typescript', services: [{ type: 'api', name: 'API' }] },
      observability: { healthEndpointsPlanned: false, structuredLogging: true },
    });
    const checks = runCategory7('repo', data);
    const c = checks.find(c => c.id === 'observability-health-endpoints-planned');
    assert.equal(c.status, 'warn');
    assert.equal(c.field, 'observability.healthEndpointsPlanned');
    // healthReady/healthLive checks should not be emitted since plans not set
    assert.equal(checks.find(c => c.id === 'observability-health-routes'), undefined);
  });

  it('SKIP: no API service → no health endpoint check', () => {
    const data = repo({
      backend: { framework: 'nestjs', language: 'typescript', services: [{ type: 'worker', name: 'Worker' }] },
      observability: { healthEndpointsPlanned: false, structuredLogging: true },
    });
    const checks = runCategory7('repo', data);
    assert.equal(checks.find(c => c.id === 'observability-health-endpoints-planned'), undefined);
  });
});

// ─── repo: distributed tracing ────────────────────────────────────────────────

describe('Cat7 — repo: distributed tracing', () => {
  it('PASS: 2 services + distributedTracing true', () => {
    const data = repo({
      backend: {
        framework: 'nestjs', language: 'typescript',
        services: [{ type: 'api', name: 'API' }, { type: 'worker', name: 'Worker' }],
      },
      observability: { healthEndpointsPlanned: true, healthLive: '/health/live', healthReady: '/health/ready', structuredLogging: true, distributedTracing: true },
    });
    const c = runCategory7('repo', data).find(c => c.id === 'observability-distributed-tracing');
    assert.ok(c);
    assert.equal(c.status, 'pass');
    assert.ok(c.message.includes('2'));
  });

  it('WARN: 2 services + distributedTracing false', () => {
    const data = repo({
      backend: {
        framework: 'nestjs', language: 'typescript',
        services: [{ type: 'api', name: 'API' }, { type: 'worker', name: 'Worker' }],
      },
      observability: { distributedTracing: false, structuredLogging: true },
    });
    const c = runCategory7('repo', data).find(c => c.id === 'observability-distributed-tracing');
    assert.equal(c.status, 'warn');
    assert.equal(c.field, 'observability.distributedTracing');
  });

  it('WARN + deferral note: distributedTracingNote included in message', () => {
    const data = repo({
      backend: {
        framework: 'nestjs', language: 'typescript',
        services: [{ type: 'api', name: 'API' }, { type: 'worker', name: 'Worker' }],
      },
      observability: {
        distributedTracing: false,
        distributedTracingNote: 'Deferred to v1.1 — single-region MVP does not need it initially.',
        structuredLogging: true,
      },
    });
    const c = runCategory7('repo', data).find(c => c.id === 'observability-distributed-tracing');
    assert.equal(c.status, 'warn');
    assert.ok(c.message.includes('Deferred to v1.1'), 'Deferral note must appear in message');
  });

  it('SKIP: only 1 service → no distributed tracing check', () => {
    const data = repo({
      backend: { framework: 'nestjs', language: 'typescript', services: [{ type: 'api', name: 'API' }] },
      observability: { distributedTracing: false, structuredLogging: true },
    });
    assert.equal(runCategory7('repo', data).find(c => c.id === 'observability-distributed-tracing'), undefined);
  });
});

// ─── repo: structured logging ─────────────────────────────────────────────────

describe('Cat7 — repo: structured logging', () => {
  it('PASS: deploymentTarget set + structuredLogging true', () => {
    const data = repo({
      project: { name: 'TestApp', repoType: 'single-app', deploymentTarget: 'railway' },
      observability: { structuredLogging: true, loggingLibrary: 'pino', healthEndpointsPlanned: false },
    });
    const c = runCategory7('repo', data).find(c => c.id === 'observability-structured-logging');
    assert.ok(c);
    assert.equal(c.status, 'pass');
    assert.ok(c.message.includes('pino'), 'Message must mention logging library');
  });

  it('WARN: deploymentTarget set + structuredLogging false', () => {
    const data = repo({
      project: { name: 'TestApp', repoType: 'single-app', deploymentTarget: 'railway' },
      observability: { structuredLogging: false },
    });
    const c = runCategory7('repo', data).find(c => c.id === 'observability-structured-logging');
    assert.equal(c.status, 'warn');
    assert.equal(c.field, 'observability.structuredLogging');
  });

  it('SKIP: no deploymentTarget → no structuredLogging check', () => {
    const data = repo({
      project: { name: 'TestApp', repoType: 'single-app' }, // no deploymentTarget
      observability: { structuredLogging: false },
    });
    assert.equal(runCategory7('repo', data).find(c => c.id === 'observability-structured-logging'), undefined);
  });

  it('RESULT: all checks on full observability config are pass', () => {
    const data = repo({
      backend: { framework: 'nestjs', language: 'typescript', services: [{ type: 'api', name: 'API' }] },
      project: { name: 'TestApp', repoType: 'single-app', deploymentTarget: 'railway' },
      observability: {
        healthEndpointsPlanned: true, healthLive: '/health/live', healthReady: '/health/ready',
        structuredLogging: true, loggingLibrary: 'pino', distributedTracing: false,
      },
    });
    const checks = runCategory7('repo', data);
    const failures = checks.filter(c => c.status === 'fail');
    assert.equal(failures.length, 0, 'No failures in fully configured observability setup');
  });
});

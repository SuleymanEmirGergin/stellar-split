/**
 * CLI Test Suite — Category 4: Completeness Checks (Rule 7, Rule 12)
 *
 * Tests cover:
 *   - assumptions[] must not be empty (warn if empty)
 *   - project.name must be meaningful (≥ 2 chars)
 *   - frontend-backend: no forms AND no actions → warn (read-only system?)
 *   - repo: backend.services[] must not be empty → warn if empty
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runCategory4 } from '../lib/rules/cat4-completeness.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fb(overrides = {}) {
  return {
    project: { name: 'TestApp' },
    pages: [],
    forms: [],
    tables: [],
    actions: [],
    authFlows: [],
    externalTriggers: [],
    assumptions: ['JWT tokens expire in 1 hour.'],
    ...overrides,
  };
}

function repo(overrides = {}) {
  return {
    meta: { generatedBy: 'repo-builder-agent', generatedAt: new Date().toISOString(), modeUsed: '/blueprint', playbooksApplied: [] },
    project: { name: 'TestApp', repoType: 'single-app', deploymentTarget: 'railway' },
    frontend: {},
    backend: { framework: 'nestjs', language: 'typescript', services: [{ type: 'api', name: 'API' }] },
    integrations: [],
    infrastructure: { containerization: 'docker', cicd: 'github-actions' },
    security: { secretScanningEnabled: true, securityMdIncluded: true, gitignoreComprehensive: true, ciSecurityScanStep: true },
    packages: [],
    assumptions: ['JWT tokens expire in 1 hour.'],
    ...overrides,
  };
}

// ─── assumptions checks ───────────────────────────────────────────────────────

describe('Cat4 — assumptions declared', () => {

  it('PASS: assumptions array has at least one entry', () => {
    const data = fb({ assumptions: ['JWT expires in 1 hour.'] });
    const checks = runCategory4('frontend-backend', data);
    const c = checks.find(c => c.id === 'completeness-assumptions-declared');
    assert.ok(c, 'completeness-assumptions-declared must exist');
    assert.equal(c.status, 'pass');
    assert.ok(c.message.includes('1'), 'Message must reference count');
  });

  it('WARN: assumptions[] is empty', () => {
    const data = fb({ assumptions: [] });
    const checks = runCategory4('frontend-backend', data);
    const c = checks.find(c => c.id === 'completeness-assumptions-declared');
    assert.equal(c.status, 'warn');
    assert.equal(c.field, 'assumptions');
    assert.ok(c.message.includes('empty'), 'Message must say empty');
  });

  it('PASS: multiple assumptions → count reflected in message', () => {
    const data = fb({ assumptions: ['A1', 'A2', 'A3'] });
    const checks = runCategory4('frontend-backend', data);
    const c = checks.find(c => c.id === 'completeness-assumptions-declared');
    assert.equal(c.status, 'pass');
    assert.ok(c.message.includes('3'), 'Message must mention 3 assumptions');
  });

  it('RESULT: assumptions check has category=completeness', () => {
    const data = fb();
    const checks = runCategory4('frontend-backend', data);
    const c = checks.find(c => c.id === 'completeness-assumptions-declared');
    assert.equal(c.category, 'completeness');
  });
});

// ─── project name checks ──────────────────────────────────────────────────────

describe('Cat4 — project name meaningful', () => {

  it('PASS: project.name is at least 2 characters', () => {
    const data = fb({ project: { name: 'MyApp' } });
    const checks = runCategory4('frontend-backend', data);
    const c = checks.find(c => c.id === 'completeness-project-name');
    assert.equal(c.status, 'pass');
    assert.ok(c.message.includes('MyApp'));
  });

  it('WARN: project.name is 1 character (too short)', () => {
    const data = fb({ project: { name: 'A' } });
    const checks = runCategory4('frontend-backend', data);
    const c = checks.find(c => c.id === 'completeness-project-name');
    assert.equal(c.status, 'warn');
    assert.equal(c.field, 'project.name');
  });

  it('WARN: project.name is empty string', () => {
    const data = fb({ project: { name: '' } });
    const checks = runCategory4('frontend-backend', data);
    const c = checks.find(c => c.id === 'completeness-project-name');
    assert.equal(c.status, 'warn');
  });

  it('WARN: project object has no name field', () => {
    const data = fb({ project: {} });
    const checks = runCategory4('frontend-backend', data);
    const c = checks.find(c => c.id === 'completeness-project-name');
    assert.equal(c.status, 'warn');
  });

  it('PASS: exactly 2 character name is accepted', () => {
    const data = fb({ project: { name: 'AB' } });
    const checks = runCategory4('frontend-backend', data);
    const c = checks.find(c => c.id === 'completeness-project-name');
    assert.equal(c.status, 'pass');
  });
});

// ─── frontend-backend: interactive elements check ─────────────────────────────

describe('Cat4 — frontend-backend: forms or actions required', () => {

  it('WARN: both forms[] and actions[] empty → read-only system warning', () => {
    const data = fb({ forms: [], actions: [] });
    const checks = runCategory4('frontend-backend', data);
    const c = checks.find(c => c.id === 'completeness-forms-or-actions');
    assert.ok(c, 'completeness-forms-or-actions check must exist');
    assert.equal(c.status, 'warn');
    assert.ok(c.message.toLowerCase().includes('read-only') || c.message.includes('empty'));
  });

  it('PASS: has at least one form', () => {
    const data = fb({
      forms: [{ name: 'LoginForm', page: 'Login', fields: [] }],
      actions: [],
    });
    const checks = runCategory4('frontend-backend', data);
    const c = checks.find(c => c.id === 'completeness-forms-or-actions');
    assert.equal(c.status, 'pass');
    assert.ok(c.message.includes('1'), 'Message must reference form count');
  });

  it('PASS: has at least one action (no forms required)', () => {
    const data = fb({
      forms: [],
      actions: [{ name: 'Logout', page: 'Dashboard', method: 'POST' }],
    });
    const checks = runCategory4('frontend-backend', data);
    const c = checks.find(c => c.id === 'completeness-forms-or-actions');
    assert.equal(c.status, 'pass');
  });

  it('PASS: has both forms and actions', () => {
    const data = fb({
      forms: [{ name: 'LoginForm', page: 'Login', fields: [] }],
      actions: [{ name: 'DeleteAccount', page: 'Profile', method: 'DELETE' }],
    });
    const checks = runCategory4('frontend-backend', data);
    const c = checks.find(c => c.id === 'completeness-forms-or-actions');
    assert.equal(c.status, 'pass');
  });

  it('RESULT: forms-or-actions check only emitted for frontend-backend type', () => {
    const data = repo();
    const checks = runCategory4('repo', data);
    const c = checks.find(c => c.id === 'completeness-forms-or-actions');
    assert.equal(c, undefined, 'forms-or-actions check must not exist for repo type');
  });
});

// ─── repo: backend services check ────────────────────────────────────────────

describe('Cat4 — repo: backend services declared', () => {

  it('PASS: at least one service declared', () => {
    const data = repo({
      backend: { framework: 'nestjs', language: 'typescript', services: [{ type: 'api', name: 'API' }] },
    });
    const checks = runCategory4('repo', data);
    const c = checks.find(c => c.id === 'completeness-services-declared');
    assert.ok(c, 'completeness-services-declared must exist for repo');
    assert.equal(c.status, 'pass');
    assert.ok(c.message.includes('1'), 'Message must mention service count');
  });

  it('WARN: no services declared', () => {
    const data = repo({
      backend: { framework: 'nestjs', language: 'typescript', services: [] },
    });
    const checks = runCategory4('repo', data);
    const c = checks.find(c => c.id === 'completeness-services-declared');
    assert.equal(c.status, 'warn');
    assert.equal(c.field, 'backend.services');
  });

  it('PASS: API + worker services → both counted', () => {
    const data = repo({
      backend: {
        framework: 'nestjs',
        language: 'typescript',
        services: [
          { type: 'api', name: 'API' },
          { type: 'worker', name: 'EmailWorker' },
        ],
      },
    });
    const checks = runCategory4('repo', data);
    const c = checks.find(c => c.id === 'completeness-services-declared');
    assert.equal(c.status, 'pass');
    assert.ok(c.message.includes('2'), 'Message mentions 2 services');
    assert.ok(c.message.includes('1 API') || c.message.includes('1 api'));
    assert.ok(c.message.includes('1 worker'));
  });

  it('RESULT: services check only emitted for repo type', () => {
    const data = fb();
    const checks = runCategory4('frontend-backend', data);
    const c = checks.find(c => c.id === 'completeness-services-declared');
    assert.equal(c, undefined, 'services check must not exist for frontend-backend type');
  });

  it('RESULT: repo emits both assumptions and project-name checks', () => {
    const data = repo();
    const checks = runCategory4('repo', data);
    const ids = checks.map(c => c.id);
    assert.ok(ids.includes('completeness-assumptions-declared'), 'Must check assumptions');
    assert.ok(ids.includes('completeness-project-name'), 'Must check project name');
    assert.ok(ids.includes('completeness-services-declared'), 'Must check services');
  });
});

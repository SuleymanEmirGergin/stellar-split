/**
 * CLI Test Suite — Category 2: Semantic Cross-Reference Checks
 *
 * Tests cover:
 *   frontend-backend:
 *     - Form / table / action / upload page references must point to valid page names
 *     - RBAC auth flow requires at least one page with roles[]
 *     - requiresAuth: true pages require a login auth flow
 *
 *   repo:
 *     - Worker service requires infrastructure.queue
 *     - Monorepo repoType requires non-empty packages[]
 *     - Payment integration requires secretScanningEnabled: true
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runCategory2 } from '../lib/rules/cat2-semantic.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fb(overrides = {}) {
  return {
    project: { name: 'TestApp' },
    pages: [{ name: 'Dashboard', requiresAuth: false }],
    forms: [],
    tables: [],
    actions: [],
    uploads: [],
    authFlows: [],
    assumptions: [],
    externalTriggers: [],
    ...overrides,
  };
}

function repo(overrides = {}) {
  return {
    meta: { generatedBy: 'repo-builder-agent', generatedAt: new Date().toISOString(), modeUsed: '/blueprint', playbooksApplied: [] },
    project: { name: 'TestApp', repoType: 'single-app', deploymentTarget: 'railway' },
    frontend: {},
    backend: { framework: 'nestjs', language: 'typescript', services: [] },
    integrations: [],
    infrastructure: { containerization: 'docker', cicd: 'github-actions' },
    security: { secretScanningEnabled: true, securityMdIncluded: true, gitignoreComprehensive: true, ciSecurityScanStep: true },
    packages: [],
    assumptions: [],
    ...overrides,
  };
}

// ─── frontend-backend: page reference checks ──────────────────────────────────

describe('Cat2 — frontend-backend: page references', () => {

  it('PASS: form references a valid page name', () => {
    const data = fb({
      pages: [{ name: 'LoginPage', requiresAuth: false }],
      forms: [{ name: 'LoginForm', page: 'LoginPage', fields: [] }],
    });
    const checks = runCategory2('frontend-backend', data);
    const c = checks.find(c => c.id === 'semantic-form-page-refs');
    assert.ok(c, 'semantic-form-page-refs check must exist');
    assert.equal(c.status, 'pass');
  });

  it('FAIL: form references a non-existent page', () => {
    const data = fb({
      pages: [{ name: 'Dashboard', requiresAuth: false }],
      forms: [{ name: 'SignupForm', page: 'NonExistentPage', fields: [] }],
    });
    const checks = runCategory2('frontend-backend', data);
    const c = checks.find(c => c.id === 'semantic-form-page-ref');
    assert.ok(c, 'semantic-form-page-ref check must exist on broken ref');
    assert.equal(c.status, 'fail');
    assert.ok(c.message.includes('NonExistentPage'), 'Message must name the missing page');
  });

  it('FAIL: table references a non-existent page', () => {
    const data = fb({
      pages: [{ name: 'Dashboard', requiresAuth: false }],
      tables: [{ name: 'UsersTable', page: 'GhostPage', columns: [] }],
    });
    const checks = runCategory2('frontend-backend', data);
    const c = checks.find(c => c.id === 'semantic-table-page-ref');
    assert.ok(c);
    assert.equal(c.status, 'fail');
  });

  it('FAIL: action references a non-existent page', () => {
    const data = fb({
      pages: [{ name: 'Dashboard', requiresAuth: false }],
      actions: [{ name: 'DeleteUser', page: 'MissingPage', method: 'DELETE' }],
    });
    const checks = runCategory2('frontend-backend', data);
    const c = checks.find(c => c.id === 'semantic-action-page-ref');
    assert.ok(c);
    assert.equal(c.status, 'fail');
  });

  it('PASS: table references a valid page', () => {
    const data = fb({
      pages: [{ name: 'Dashboard', requiresAuth: false }],
      tables: [{ name: 'StatsTable', page: 'Dashboard', columns: [] }],
    });
    const checks = runCategory2('frontend-backend', data);
    const c = checks.find(c => c.id === 'semantic-table-page-refs');
    assert.equal(c.status, 'pass');
  });

  it('SKIP: no forms → no form page ref check emitted', () => {
    const data = fb({ forms: [] });
    const checks = runCategory2('frontend-backend', data);
    const formChecks = checks.filter(c => c.id.includes('form-page-ref'));
    assert.equal(formChecks.length, 0, 'No form reference checks when forms[] is empty');
  });

  it('PASS: all page refs valid — multiple items', () => {
    const data = fb({
      pages: [
        { name: 'Home', requiresAuth: false },
        { name: 'Profile', requiresAuth: false }, // no auth required — avoid triggering cat2 auth checks
      ],
      forms: [
        { name: 'EditProfile', page: 'Profile', fields: [] },
      ],
      tables: [
        { name: 'FeedTable', page: 'Home', columns: [] },
      ],
      actions: [
        { name: 'Logout', page: 'Profile', method: 'POST' },
      ],
    });
    const checks = runCategory2('frontend-backend', data);
    const failChecks = checks.filter(c => c.status === 'fail');
    assert.equal(failChecks.length, 0, 'No failures when all refs are valid');
  });
});

// ─── frontend-backend: RBAC and auth flow checks ──────────────────────────────

describe('Cat2 — frontend-backend: RBAC and login flow', () => {

  it('FAIL: role-based-access auth flow but no page defines roles', () => {
    const data = fb({
      pages: [{ name: 'AdminPanel', requiresAuth: true }], // no roles[]
      authFlows: [{ type: 'role-based-access' }],
    });
    const checks = runCategory2('frontend-backend', data);
    const c = checks.find(c => c.id === 'semantic-rbac-page-roles');
    assert.ok(c, 'RBAC check must exist');
    assert.equal(c.status, 'fail');
    assert.ok(c.message.includes('roles'), 'Message must reference missing roles');
  });

  it('PASS: role-based-access flow with at least one page containing roles', () => {
    const data = fb({
      pages: [{ name: 'AdminPanel', requiresAuth: true, roles: ['admin'] }],
      authFlows: [{ type: 'role-based-access' }],
    });
    const checks = runCategory2('frontend-backend', data);
    const c = checks.find(c => c.id === 'semantic-rbac-page-roles');
    assert.equal(c.status, 'pass');
  });

  it('SKIP: no RBAC flow → no RBAC check emitted', () => {
    const data = fb({
      pages: [{ name: 'Dashboard', requiresAuth: false }],
      authFlows: [{ type: 'login' }],
    });
    const checks = runCategory2('frontend-backend', data);
    const c = checks.find(c => c.id === 'semantic-rbac-page-roles');
    assert.equal(c, undefined, 'RBAC check must not be emitted when no RBAC flow');
  });

  it('FAIL: requiresAuth pages but no login flow', () => {
    const data = fb({
      pages: [{ name: 'Dashboard', requiresAuth: true }],
      authFlows: [{ type: 'register' }], // no login
    });
    const checks = runCategory2('frontend-backend', data);
    const c = checks.find(c => c.id === 'semantic-auth-login-flow');
    assert.ok(c, 'Login flow check must exist');
    assert.equal(c.status, 'fail');
  });

  it('PASS: requiresAuth page WITH login flow', () => {
    const data = fb({
      pages: [{ name: 'Dashboard', requiresAuth: true }],
      authFlows: [{ type: 'login' }],
    });
    const checks = runCategory2('frontend-backend', data);
    const c = checks.find(c => c.id === 'semantic-auth-login-flow');
    assert.equal(c.status, 'pass');
  });

  it('SKIP: no requiresAuth pages → no login flow check emitted', () => {
    const data = fb({
      pages: [{ name: 'Landing', requiresAuth: false }],
      authFlows: [],
    });
    const checks = runCategory2('frontend-backend', data);
    const c = checks.find(c => c.id === 'semantic-auth-login-flow');
    assert.equal(c, undefined, 'Login check not emitted when no auth-required pages');
  });
});

// ─── repo semantic checks ─────────────────────────────────────────────────────

describe('Cat2 — repo: worker-queue semantic', () => {

  it('FAIL: worker service without queue infrastructure', () => {
    const data = repo({
      backend: { framework: 'nestjs', language: 'typescript', services: [{ type: 'worker', name: 'EmailWorker' }] },
      infrastructure: { containerization: 'docker', cicd: 'github-actions' }, // no queue
    });
    const checks = runCategory2('repo', data);
    const c = checks.find(c => c.id === 'semantic-worker-queue');
    assert.ok(c, 'semantic-worker-queue check must exist');
    assert.equal(c.status, 'fail');
    assert.ok(c.message.includes('queue'), 'Message must reference queue');
  });

  it('PASS: worker service WITH queue infrastructure', () => {
    const data = repo({
      backend: { framework: 'nestjs', language: 'typescript', services: [{ type: 'worker', name: 'EmailWorker' }] },
      infrastructure: { containerization: 'docker', cicd: 'github-actions', queue: 'bullmq' },
    });
    const checks = runCategory2('repo', data);
    const c = checks.find(c => c.id === 'semantic-worker-queue');
    assert.equal(c.status, 'pass');
    assert.ok(c.message.includes('bullmq'), 'Message must mention queue type');
  });

  it('SKIP: no worker service → no queue check emitted', () => {
    const data = repo({
      backend: { framework: 'nestjs', language: 'typescript', services: [{ type: 'api', name: 'API' }] },
    });
    const checks = runCategory2('repo', data);
    const c = checks.find(c => c.id === 'semantic-worker-queue');
    assert.equal(c, undefined, 'No queue check when no worker service');
  });
});

describe('Cat2 — repo: monorepo-packages semantic', () => {

  it('FAIL: monorepo repoType with empty packages[]', () => {
    const data = repo({
      project: { name: 'TestApp', repoType: 'monorepo', deploymentTarget: 'railway' },
      packages: [],
    });
    const checks = runCategory2('repo', data);
    const c = checks.find(c => c.id === 'semantic-monorepo-packages');
    assert.ok(c);
    assert.equal(c.status, 'fail');
  });

  it('PASS: monorepo with at least one package', () => {
    const data = repo({
      project: { name: 'TestApp', repoType: 'monorepo', deploymentTarget: 'railway' },
      packages: [{ name: '@app/shared', path: 'packages/shared' }],
    });
    const checks = runCategory2('repo', data);
    const c = checks.find(c => c.id === 'semantic-monorepo-packages');
    assert.equal(c.status, 'pass');
  });

  it('SKIP: single-app repoType → no monorepo packages check', () => {
    const data = repo({
      project: { name: 'TestApp', repoType: 'single-app', deploymentTarget: 'railway' },
    });
    const checks = runCategory2('repo', data);
    const c = checks.find(c => c.id === 'semantic-monorepo-packages');
    assert.equal(c, undefined);
  });
});

describe('Cat2 — repo: payment integration + secret scanning', () => {

  it('FAIL: payment integration but secretScanningEnabled is false', () => {
    const data = repo({
      integrations: [{ name: 'Stripe', type: 'payment' }],
      security: { secretScanningEnabled: false, securityMdIncluded: true, gitignoreComprehensive: true, ciSecurityScanStep: true },
    });
    const checks = runCategory2('repo', data);
    const c = checks.find(c => c.id === 'semantic-payment-secret-scan');
    assert.ok(c);
    assert.equal(c.status, 'fail');
    assert.ok(c.message.includes('secretScanningEnabled'), 'Message must reference the field');
  });

  it('PASS: payment integration WITH secretScanningEnabled true', () => {
    const data = repo({
      integrations: [{ name: 'Stripe', type: 'payment' }],
      security: { secretScanningEnabled: true, securityMdIncluded: true, gitignoreComprehensive: true, ciSecurityScanStep: true },
    });
    const checks = runCategory2('repo', data);
    const c = checks.find(c => c.id === 'semantic-payment-secret-scan');
    assert.equal(c.status, 'pass');
  });

  it('SKIP: no payment integration → no secret scan check emitted', () => {
    const data = repo({
      integrations: [{ name: 'PostHog', type: 'analytics' }],
    });
    const checks = runCategory2('repo', data);
    const c = checks.find(c => c.id === 'semantic-payment-secret-scan');
    assert.equal(c, undefined);
  });
});

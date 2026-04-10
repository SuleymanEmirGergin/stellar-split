/**
 * CLI Test Suite — Category 3: Security Baseline Checks (Rule 6)
 *
 * Tests cover:
 *   frontend-backend:
 *     - Auth flows non-empty → must include login (else FAIL)
 *     - payment-webhook trigger → assumptions must reference signature/HMAC
 *
 *   repo:
 *     - secretScanningEnabled false → WARN
 *     - securityMdIncluded false → WARN
 *     - gitignoreComprehensive false → WARN
 *     - ciSecurityScanStep false → WARN
 *     - All true → all PASS
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runCategory3 } from '../lib/rules/cat3-security.js';

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
    assumptions: [],
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
    security: {
      secretScanningEnabled: true,
      securityMdIncluded: true,
      gitignoreComprehensive: true,
      ciSecurityScanStep: true,
    },
    packages: [],
    assumptions: [],
    ...overrides,
  };
}

// ─── frontend-backend: auth flows must include login ─────────────────────────

describe('Cat3 — frontend-backend: auth flows require login', () => {

  it('SKIP: no auth flows → no security-auth-has-login check emitted', () => {
    const data = fb({ authFlows: [] });
    const checks = runCategory3('frontend-backend', data);
    const c = checks.find(c => c.id === 'security-auth-has-login');
    assert.equal(c, undefined, 'No auth check when authFlows is empty');
  });

  it('PASS: auth flows include login', () => {
    const data = fb({
      authFlows: [{ type: 'login' }, { type: 'register' }],
    });
    const checks = runCategory3('frontend-backend', data);
    const c = checks.find(c => c.id === 'security-auth-has-login');
    assert.ok(c, 'security-auth-has-login must be emitted');
    assert.equal(c.status, 'pass');
  });

  it('FAIL: auth flows non-empty but missing login type', () => {
    const data = fb({
      authFlows: [{ type: 'register' }, { type: 'oauth' }],
    });
    const checks = runCategory3('frontend-backend', data);
    const c = checks.find(c => c.id === 'security-auth-has-login');
    assert.ok(c);
    assert.equal(c.status, 'fail');
    assert.ok(c.message.includes('login'), 'Message must mention login');
    assert.equal(c.category, 'security');
    assert.equal(c.severity, 'error');
  });

  it('FAIL: single non-login auth flow → fail', () => {
    const data = fb({
      authFlows: [{ type: 'role-based-access' }],
    });
    const checks = runCategory3('frontend-backend', data);
    const c = checks.find(c => c.id === 'security-auth-has-login');
    assert.equal(c.status, 'fail');
  });
});

// ─── frontend-backend: payment webhook signature verification ─────────────────

describe('Cat3 — frontend-backend: payment webhook signature', () => {

  it('SKIP: no payment-webhook trigger → no webhook signature check', () => {
    const data = fb({
      externalTriggers: [{ name: 'WelcomeEmail', type: 'email-send' }],
    });
    const checks = runCategory3('frontend-backend', data);
    const c = checks.find(c => c.id === 'security-webhook-signature');
    assert.equal(c, undefined, 'No webhook check when no payment-webhook trigger');
  });

  it('FAIL: payment-webhook trigger without signature assumption', () => {
    const data = fb({
      externalTriggers: [{ name: 'StripeWebhook', type: 'payment-webhook' }],
      assumptions: ['JWT tokens expire in 1 hour.'],
    });
    const checks = runCategory3('frontend-backend', data);
    const c = checks.find(c => c.id === 'security-webhook-signature');
    assert.ok(c);
    assert.equal(c.status, 'fail');
    assert.ok(c.message.includes('signature') || c.message.includes('HMAC'));
    assert.equal(c.field, 'assumptions');
  });

  it('PASS: "signature" keyword in assumptions', () => {
    const data = fb({
      externalTriggers: [{ name: 'StripeWebhook', type: 'payment-webhook' }],
      assumptions: ['Stripe webhook payload is verified using the Stripe-Signature header.'],
    });
    const checks = runCategory3('frontend-backend', data);
    const c = checks.find(c => c.id === 'security-webhook-signature');
    assert.equal(c.status, 'pass');
  });

  it('PASS: "hmac" keyword in assumptions (case insensitive)', () => {
    const data = fb({
      externalTriggers: [{ name: 'StripeWebhook', type: 'payment-webhook' }],
      assumptions: ['Stripe webhooks are verified via HMAC-SHA256.'],
    });
    const checks = runCategory3('frontend-backend', data);
    const c = checks.find(c => c.id === 'security-webhook-signature');
    assert.equal(c.status, 'pass');
  });

  it('PASS: "webhook secret" phrase in assumptions', () => {
    const data = fb({
      externalTriggers: [{ name: 'PaymentHook', type: 'payment-webhook' }],
      assumptions: ['The webhook secret is stored in STRIPE_WEBHOOK_SECRET env var.'],
    });
    const checks = runCategory3('frontend-backend', data);
    const c = checks.find(c => c.id === 'security-webhook-signature');
    assert.equal(c.status, 'pass');
  });

  it('PASS: both auth flows and payment webhook present — both checks pass when complete', () => {
    const data = fb({
      authFlows: [{ type: 'login' }, { type: 'register' }],
      externalTriggers: [{ name: 'StripeWebhook', type: 'payment-webhook' }],
      assumptions: ['Webhook verified via Stripe-Signature header. CORS restricted to frontend origin.'],
    });
    const checks = runCategory3('frontend-backend', data);
    const authCheck = checks.find(c => c.id === 'security-auth-has-login');
    const webhookCheck = checks.find(c => c.id === 'security-webhook-signature');
    assert.equal(authCheck.status, 'pass', 'Auth check must pass');
    assert.equal(webhookCheck.status, 'pass', 'Webhook check must pass');
    assert.equal(checks.filter(c => c.status === 'fail').length, 0, 'No failures');
  });
});

// ─── repo: security baseline checks ──────────────────────────────────────────

describe('Cat3 — repo: security baseline', () => {

  it('PASS: all security flags true → all 4 checks pass', () => {
    const data = repo({
      security: {
        secretScanningEnabled: true,
        securityMdIncluded: true,
        gitignoreComprehensive: true,
        ciSecurityScanStep: true,
      },
    });
    const checks = runCategory3('repo', data);
    assert.equal(checks.length, 4, 'Exactly 4 security checks for repo');
    checks.forEach(c => assert.equal(c.status, 'pass', `Check ${c.id} must pass`));
  });

  it('WARN: secretScanningEnabled false → security-secret-scanning is warn', () => {
    const data = repo({
      security: { secretScanningEnabled: false, securityMdIncluded: true, gitignoreComprehensive: true, ciSecurityScanStep: true },
    });
    const checks = runCategory3('repo', data);
    const c = checks.find(c => c.id === 'security-secret-scanning');
    assert.equal(c.status, 'warn');
    assert.ok(c.message.includes('.gitleaks'), 'Message must suggest gitleaks');
    assert.equal(c.field, 'security.secretScanningEnabled');
  });

  it('WARN: securityMdIncluded false → security-md-included is warn', () => {
    const data = repo({
      security: { secretScanningEnabled: true, securityMdIncluded: false, gitignoreComprehensive: true, ciSecurityScanStep: true },
    });
    const checks = runCategory3('repo', data);
    const c = checks.find(c => c.id === 'security-md-included');
    assert.equal(c.status, 'warn');
    assert.ok(c.message.includes('SECURITY.md'));
    assert.equal(c.field, 'security.securityMdIncluded');
  });

  it('WARN: gitignoreComprehensive false → security-gitignore is warn', () => {
    const data = repo({
      security: { secretScanningEnabled: true, securityMdIncluded: true, gitignoreComprehensive: false, ciSecurityScanStep: true },
    });
    const checks = runCategory3('repo', data);
    const c = checks.find(c => c.id === 'security-gitignore');
    assert.equal(c.status, 'warn');
    assert.ok(c.message.includes('.gitignore') || c.message.includes('.env'));
  });

  it('WARN: ciSecurityScanStep false → security-ci-scan is warn', () => {
    const data = repo({
      security: { secretScanningEnabled: true, securityMdIncluded: true, gitignoreComprehensive: true, ciSecurityScanStep: false },
    });
    const checks = runCategory3('repo', data);
    const c = checks.find(c => c.id === 'security-ci-scan');
    assert.equal(c.status, 'warn');
  });

  it('WARN: all flags false → all 4 checks are warn', () => {
    const data = repo({
      security: { secretScanningEnabled: false, securityMdIncluded: false, gitignoreComprehensive: false, ciSecurityScanStep: false },
    });
    const checks = runCategory3('repo', data);
    assert.equal(checks.length, 4, 'Still 4 checks regardless of flag values');
    checks.forEach(c => assert.equal(c.status, 'warn', `Check ${c.id} must be warn`));
  });

  it('RESULT: all 4 repo checks have category=security', () => {
    const data = repo();
    const checks = runCategory3('repo', data);
    checks.forEach(c => assert.equal(c.category, 'security', `Check ${c.id} must have category=security`));
  });

  it('RESULT: passing checks have no field property', () => {
    const data = repo();
    const checks = runCategory3('repo', data);
    checks.forEach(c => {
      if (c.status === 'pass') {
        assert.equal(c.field, undefined, `Passing check ${c.id} must not have field`);
      }
    });
  });
});

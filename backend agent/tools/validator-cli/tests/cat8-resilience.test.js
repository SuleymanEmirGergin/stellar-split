/**
 * CLI Test Suite — Category 8: Resilience Baseline (Rule 16)
 *
 * Tests cover:
 *   - frontend-backend: externalTriggers with/without resilience assumptions
 *   - repo: integrations needing resilience + idempotency key
 *   - Edge cases: no relevant triggers, only analytics integrations
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runCategory8 } from '../lib/rules/cat8-resilience.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fb(overrides = {}) {
  return {
    project: { name: 'TestApp' },
    pages: [],
    forms: [],
    tables: [],
    actions: [],
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

// ─── frontend-backend tests ───────────────────────────────────────────────────

describe('Cat8 — frontend-backend resilience', () => {

  it('SKIP: no external triggers → returns empty checks', () => {
    const data = fb({ externalTriggers: [] });
    const checks = runCategory8('frontend-backend', data);
    assert.equal(checks.length, 0, 'No checks emitted when no relevant triggers');
  });

  it('SKIP: only analytics trigger (not in resilience-required list) → empty', () => {
    const data = fb({
      externalTriggers: [{ name: 'PostHog', type: 'analytics-event' }],
    });
    const checks = runCategory8('frontend-backend', data);
    assert.equal(checks.length, 0);
  });

  it('WARN: payment-webhook trigger without resilience assumption', () => {
    const data = fb({
      externalTriggers: [{ name: 'StripeWebhook', type: 'payment-webhook' }],
      assumptions: ['JWT tokens expire in 1 hour.'],
    });
    const checks = runCategory8('frontend-backend', data);
    assert.equal(checks.length, 1);
    const c = checks[0];
    assert.equal(c.id, 'resilience-external-trigger-patterns');
    assert.equal(c.status, 'warn');
  });

  it('WARN: email-send trigger without resilience assumption', () => {
    const data = fb({
      externalTriggers: [{ name: 'WelcomeEmail', type: 'email-send' }],
      assumptions: [],
    });
    const checks = runCategory8('frontend-backend', data);
    const c = checks[0];
    assert.equal(c.status, 'warn');
  });

  it('WARN: custom trigger (3rd party API) without resilience assumption', () => {
    const data = fb({
      externalTriggers: [{ name: 'SlackNotify', type: 'custom' }],
      assumptions: [],
    });
    const checks = runCategory8('frontend-backend', data);
    assert.equal(checks[0].status, 'warn');
  });

  it('PASS: payment-webhook trigger WITH retry mentioned in assumptions', () => {
    const data = fb({
      externalTriggers: [{ name: 'StripeWebhook', type: 'payment-webhook' }],
      assumptions: ['Stripe webhook calls use p-retry with 3 attempts and exponential backoff.'],
    });
    const checks = runCategory8('frontend-backend', data);
    assert.equal(checks[0].status, 'pass');
  });

  it('PASS: email-send trigger WITH circuit breaker in assumptions', () => {
    const data = fb({
      externalTriggers: [{ name: 'SendEmail', type: 'email-send' }],
      assumptions: ['Email service uses a circuit breaker (opossum) — threshold 50%.'],
    });
    const checks = runCategory8('frontend-backend', data);
    assert.equal(checks[0].status, 'pass');
  });

  it('PASS: timeout keyword in assumptions is sufficient', () => {
    const data = fb({
      externalTriggers: [{ name: 'CustomAPI', type: 'custom' }],
      assumptions: ['All external calls have a 10 second timeout via AbortController.'],
    });
    const checks = runCategory8('frontend-backend', data);
    assert.equal(checks[0].status, 'pass');
  });

  it('PASS: multiple triggers — one resilience keyword covers all', () => {
    const data = fb({
      externalTriggers: [
        { name: 'StripeWebhook', type: 'payment-webhook' },
        { name: 'SendInvite', type: 'email-send' },
      ],
      assumptions: ['Retry with backoff is applied to all external service calls.'],
    });
    const checks = runCategory8('frontend-backend', data);
    assert.equal(checks[0].status, 'pass');
  });
});

// ─── repo tests ───────────────────────────────────────────────────────────────

describe('Cat8 — repo resilience integration patterns', () => {

  it('SKIP: no relevant integrations → returns empty', () => {
    const data = repo({
      integrations: [{ name: 'PostHog', type: 'analytics' }],
    });
    const checks = runCategory8('repo', data);
    assert.equal(checks.length, 0);
  });

  it('WARN: payment integration without resilience.md or assumption', () => {
    const data = repo({
      integrations: [{ name: 'Stripe', type: 'payment' }],
      assumptions: ['JWT tokens expire in 1 hour.'],
    });
    const checks = runCategory8('repo', data);
    const resilience = checks.find(c => c.id === 'resilience-integration-patterns');
    assert.ok(resilience, 'resilience-integration-patterns check must exist');
    assert.equal(resilience.status, 'warn');
  });

  it('WARN: email integration without resilience declaration', () => {
    const data = repo({
      integrations: [{ name: 'Resend', type: 'email' }],
      assumptions: [],
    });
    const checks = runCategory8('repo', data);
    const c = checks.find(c => c.id === 'resilience-integration-patterns');
    assert.equal(c.status, 'warn');
  });

  it('PASS: payment integration with resilience.md in playbooksApplied', () => {
    const data = repo({
      meta: { generatedBy: 'repo-builder-agent', generatedAt: new Date().toISOString(), modeUsed: '/blueprint', playbooksApplied: ['resilience.md'] },
      integrations: [{ name: 'Stripe', type: 'payment' }],
      assumptions: [],
    });
    const checks = runCategory8('repo', data);
    const c = checks.find(c => c.id === 'resilience-integration-patterns');
    assert.equal(c.status, 'pass');
  });

  it('PASS: email integration with retry in assumptions', () => {
    const data = repo({
      integrations: [{ name: 'Resend', type: 'email' }],
      assumptions: ['Email calls use exponential backoff retry (3 attempts).'],
    });
    const checks = runCategory8('repo', data);
    const c = checks.find(c => c.id === 'resilience-integration-patterns');
    assert.equal(c.status, 'pass');
  });

  it('PASS: llm integration with circuit breaker in assumptions', () => {
    const data = repo({
      integrations: [{ name: 'OpenAI', type: 'llm' }],
      assumptions: ['OpenAI calls are wrapped in a circuit breaker with 5s timeout.'],
    });
    const checks = runCategory8('repo', data);
    const c = checks.find(c => c.id === 'resilience-integration-patterns');
    assert.equal(c.status, 'pass');
  });
});

// ─── repo idempotency tests ───────────────────────────────────────────────────

describe('Cat8 — repo payment idempotency', () => {

  it('WARN: payment integration without idempotency key assumption', () => {
    const data = repo({
      meta: { generatedBy: 'repo-builder-agent', generatedAt: new Date().toISOString(), modeUsed: '/blueprint', playbooksApplied: ['resilience.md'] },
      integrations: [{ name: 'Stripe', type: 'payment' }],
      assumptions: ['Stripe webhook signature verified via HMAC.'],
    });
    const checks = runCategory8('repo', data);
    const idem = checks.find(c => c.id === 'resilience-payment-idempotency');
    assert.ok(idem, 'idempotency check must exist when payment integration present');
    assert.equal(idem.status, 'warn');
  });

  it('PASS: payment integration WITH idempotency key in assumptions', () => {
    const data = repo({
      meta: { generatedBy: 'repo-builder-agent', generatedAt: new Date().toISOString(), modeUsed: '/blueprint', playbooksApplied: ['resilience.md'] },
      integrations: [{ name: 'Stripe', type: 'payment' }],
      assumptions: ['All Stripe calls use idempotency keys derived from order ID.'],
    });
    const checks = runCategory8('repo', data);
    const idem = checks.find(c => c.id === 'resilience-payment-idempotency');
    assert.equal(idem.status, 'pass');
  });

  it('PASS: "exactly-once" keyword counts as idempotency reference', () => {
    const data = repo({
      meta: { generatedBy: 'repo-builder-agent', generatedAt: new Date().toISOString(), modeUsed: '/blueprint', playbooksApplied: ['resilience.md'] },
      integrations: [{ name: 'Stripe', type: 'payment' }],
      assumptions: ['Charge calls are exactly-once via Stripe idempotency header.'],
    });
    const checks = runCategory8('repo', data);
    const idem = checks.find(c => c.id === 'resilience-payment-idempotency');
    assert.equal(idem.status, 'pass');
  });

  it('NO idempotency check: non-payment integrations', () => {
    const data = repo({
      integrations: [{ name: 'Resend', type: 'email' }, { name: 'PostHog', type: 'analytics' }],
      assumptions: ['Retry with backoff applied to email.'],
    });
    const checks = runCategory8('repo', data);
    const idem = checks.find(c => c.id === 'resilience-payment-idempotency');
    assert.equal(idem, undefined, 'No idempotency check when no payment integration');
  });
});

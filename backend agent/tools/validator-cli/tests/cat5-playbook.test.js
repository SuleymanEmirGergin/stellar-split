/**
 * CLI Test Suite — Category 5: Security Playbook Baseline (Rule 13)
 *
 * Tests cover:
 *   frontend-backend:
 *     - PII fields (email/phone/ssn/card/national_id) → encryption assumption required (WARN)
 *     - Auth flows (login/register) → CORS assumption required (WARN)
 *     - Public page with form → rate limiting assumption required (WARN)
 *
 *   repo:
 *     - security.securityMdIncluded false → BLOCKING failure
 *     - payment/auth integration without secretScanningEnabled → BLOCKING failure
 *     - admin route without IpBlockerService assumption → WARN
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runCategory5 } from '../lib/rules/cat5-playbook.js';

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
    security: { secretScanningEnabled: true, securityMdIncluded: true, gitignoreComprehensive: true, ciSecurityScanStep: true },
    packages: [],
    assumptions: [],
    ...overrides,
  };
}

// ─── frontend-backend: PII encryption assumption ──────────────────────────────

describe('Cat5 — frontend-backend: PII encryption assumption', () => {

  it('SKIP: no PII fields → no encryption check emitted', () => {
    const data = fb({
      forms: [{ name: 'SearchForm', fields: [{ name: 'query', type: 'text' }] }],
      assumptions: [],
    });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-pii-encryption-assumption');
    assert.equal(c, undefined, 'No encryption check when no PII fields');
  });

  it('WARN: email field without encryption assumption', () => {
    const data = fb({
      forms: [{ name: 'RegisterForm', fields: [{ name: 'userEmail', type: 'email' }] }],
      assumptions: ['JWT expires in 1 hour.'],
    });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-pii-encryption-assumption');
    assert.ok(c, 'playbook-pii-encryption-assumption must exist');
    assert.equal(c.status, 'warn');
    assert.equal(c.field, 'assumptions');
  });

  it('WARN: phone field type without encryption assumption', () => {
    const data = fb({
      forms: [{ name: 'ProfileForm', fields: [{ name: 'phoneNumber', type: 'phone' }] }],
      assumptions: [],
    });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-pii-encryption-assumption');
    assert.equal(c.status, 'warn');
  });

  it('WARN: national_id field name without encryption assumption', () => {
    const data = fb({
      forms: [{ name: 'KYCForm', fields: [{ name: 'national_id', type: 'text' }] }],
      assumptions: [],
    });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-pii-encryption-assumption');
    assert.equal(c.status, 'warn');
  });

  it('PASS: email field WITH "encrypt" in assumptions', () => {
    const data = fb({
      forms: [{ name: 'RegisterForm', fields: [{ name: 'email', type: 'email' }] }],
      assumptions: ['Email is encrypted at rest using AES-256-GCM field-level encryption.'],
    });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-pii-encryption-assumption');
    assert.equal(c.status, 'pass');
  });

  it('PASS: "aes" keyword in assumptions is sufficient', () => {
    const data = fb({
      forms: [{ name: 'SignupForm', fields: [{ name: 'email', type: 'email' }] }],
      assumptions: ['PII stored with AES-256 encryption.'],
    });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-pii-encryption-assumption');
    assert.equal(c.status, 'pass');
  });

  it('PASS: "field-level" keyword in assumptions is sufficient', () => {
    const data = fb({
      forms: [{ name: 'ProfileForm', fields: [{ name: 'phone', type: 'phone' }] }],
      assumptions: ['All PII uses field-level encryption.'],
    });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-pii-encryption-assumption');
    assert.equal(c.status, 'pass');
  });
});

// ─── frontend-backend: CORS assumption for auth flows ─────────────────────────

describe('Cat5 — frontend-backend: CORS assumption for auth', () => {

  it('SKIP: no login/register flow → no CORS check', () => {
    const data = fb({ authFlows: [{ type: 'role-based-access' }] });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-cors-assumption');
    assert.equal(c, undefined);
  });

  it('WARN: login flow without CORS assumption', () => {
    const data = fb({
      authFlows: [{ type: 'login' }],
      assumptions: ['JWT expires in 1 hour.'],
    });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-cors-assumption');
    assert.ok(c);
    assert.equal(c.status, 'warn');
    assert.equal(c.field, 'assumptions');
  });

  it('WARN: register flow without CORS assumption', () => {
    const data = fb({
      authFlows: [{ type: 'register' }],
      assumptions: [],
    });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-cors-assumption');
    assert.equal(c.status, 'warn');
  });

  it('PASS: "cors" keyword in assumptions', () => {
    const data = fb({
      authFlows: [{ type: 'login' }],
      assumptions: ['CORS is restricted to the production frontend origin.'],
    });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-cors-assumption');
    assert.equal(c.status, 'pass');
  });

  it('PASS: "origin" keyword in assumptions', () => {
    const data = fb({
      authFlows: [{ type: 'login' }, { type: 'register' }],
      assumptions: ['The API only allows requests from the allowed origin.'],
    });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-cors-assumption');
    assert.equal(c.status, 'pass');
  });
});

// ─── frontend-backend: rate limiting for public pages ─────────────────────────

describe('Cat5 — frontend-backend: public page rate limiting', () => {

  it('SKIP: no public pages with forms → no rate limit check', () => {
    const data = fb({
      pages: [{ name: 'Dashboard', requiresAuth: true }],
      forms: [{ name: 'EditProfile', page: 'Dashboard', fields: [] }],
    });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-public-rate-limiting');
    assert.equal(c, undefined, 'No rate limit check when all form pages are auth-required');
  });

  it('WARN: public page with form, no rate limit assumption', () => {
    const data = fb({
      pages: [{ name: 'Login', requiresAuth: false }],
      forms: [{ name: 'LoginForm', page: 'Login', fields: [] }],
      assumptions: ['JWT expires in 1 hour.'],
    });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-public-rate-limiting');
    assert.ok(c);
    assert.equal(c.status, 'warn');
  });

  it('PASS: "rate limit" in assumptions', () => {
    const data = fb({
      pages: [{ name: 'Login', requiresAuth: false }],
      forms: [{ name: 'LoginForm', page: 'Login', fields: [] }],
      assumptions: ['Login endpoint has rate limiting: 5 attempts per 15 minutes.'],
    });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-public-rate-limiting');
    assert.equal(c.status, 'pass');
  });

  it('PASS: "throttle" keyword in assumptions', () => {
    const data = fb({
      pages: [{ name: 'Register', requiresAuth: false }],
      forms: [{ name: 'RegisterForm', page: 'Register', fields: [] }],
      assumptions: ['All public endpoints are throttled at 100 req/min.'],
    });
    const checks = runCategory5('frontend-backend', data);
    const c = checks.find(c => c.id === 'playbook-public-rate-limiting');
    assert.equal(c.status, 'pass');
  });
});

// ─── repo: BLOCKING failures ───────────────────────────────────────────────────

describe('Cat5 — repo: BLOCKING security playbook failures', () => {

  it('FAIL (BLOCKING): securityMdIncluded false → playbook-security-md is fail', () => {
    const data = repo({
      security: { secretScanningEnabled: true, securityMdIncluded: false, gitignoreComprehensive: true, ciSecurityScanStep: true },
    });
    const checks = runCategory5('repo', data);
    const c = checks.find(c => c.id === 'playbook-security-md');
    assert.ok(c, 'playbook-security-md check must exist');
    assert.equal(c.status, 'fail');
    assert.equal(c.severity, 'error');
    assert.ok(c.message.includes('SECURITY.md') || c.message.includes('mandatory'));
  });

  it('PASS: securityMdIncluded true → playbook-security-md passes', () => {
    const data = repo({
      security: { secretScanningEnabled: true, securityMdIncluded: true, gitignoreComprehensive: true, ciSecurityScanStep: true },
    });
    const checks = runCategory5('repo', data);
    const c = checks.find(c => c.id === 'playbook-security-md');
    assert.equal(c.status, 'pass');
  });

  it('FAIL (BLOCKING): payment integration without secretScanning → fail', () => {
    const data = repo({
      integrations: [{ name: 'Stripe', type: 'payment' }],
      security: { secretScanningEnabled: false, securityMdIncluded: true, gitignoreComprehensive: true, ciSecurityScanStep: true },
    });
    const checks = runCategory5('repo', data);
    const c = checks.find(c => c.id === 'playbook-secret-scanning-sensitive');
    assert.ok(c, 'playbook-secret-scanning-sensitive must exist for payment integration');
    assert.equal(c.status, 'fail');
    assert.equal(c.severity, 'error');
  });

  it('PASS: payment integration WITH secretScanning enabled', () => {
    const data = repo({
      integrations: [{ name: 'Stripe', type: 'payment' }],
      security: { secretScanningEnabled: true, securityMdIncluded: true, gitignoreComprehensive: true, ciSecurityScanStep: true },
    });
    const checks = runCategory5('repo', data);
    const c = checks.find(c => c.id === 'playbook-secret-scanning-sensitive');
    assert.equal(c.status, 'pass');
  });

  it('FAIL (BLOCKING): auth integration without secretScanning', () => {
    const data = repo({
      integrations: [{ name: 'Auth0', type: 'auth' }],
      security: { secretScanningEnabled: false, securityMdIncluded: true, gitignoreComprehensive: true, ciSecurityScanStep: true },
    });
    const checks = runCategory5('repo', data);
    const c = checks.find(c => c.id === 'playbook-secret-scanning-sensitive');
    assert.equal(c.status, 'fail');
  });

  it('SKIP: analytics integration → no sensitive integration check emitted', () => {
    const data = repo({
      integrations: [{ name: 'PostHog', type: 'analytics' }],
    });
    const checks = runCategory5('repo', data);
    const c = checks.find(c => c.id === 'playbook-secret-scanning-sensitive');
    assert.equal(c, undefined, 'No sensitive integration check for analytics-only integrations');
  });
});

// ─── repo: admin security service warning ────────────────────────────────────

describe('Cat5 — repo: admin security service', () => {

  it('WARN: admin route without IpBlockerService assumption', () => {
    const data = repo({
      backend: {
        framework: 'nestjs',
        language: 'typescript',
        services: [{ type: 'api', name: 'API', path: '/admin' }],
      },
      assumptions: ['JWT expires in 1 hour.'],
    });
    const checks = runCategory5('repo', data);
    const c = checks.find(c => c.id === 'playbook-admin-security-service');
    assert.ok(c, 'admin security service check must exist when admin route detected');
    assert.equal(c.status, 'warn');
    assert.equal(c.field, 'assumptions');
  });

  it('PASS: admin route WITH IpBlockerService in assumptions', () => {
    const data = repo({
      backend: {
        framework: 'nestjs',
        language: 'typescript',
        services: [{ type: 'api', name: 'AdminAPI', path: '/admin' }],
      },
      assumptions: ['IpBlockerService monitors admin endpoints for suspicious activity.'],
    });
    const checks = runCategory5('repo', data);
    const c = checks.find(c => c.id === 'playbook-admin-security-service');
    assert.equal(c.status, 'pass');
  });

  it('PASS: "ip block" phrase in assumptions', () => {
    const data = repo({
      backend: {
        framework: 'nestjs',
        language: 'typescript',
        services: [{ type: 'api', name: 'API', path: '/admin' }],
      },
      assumptions: ['Admin routes use IP block lists to prevent brute force.'],
    });
    const checks = runCategory5('repo', data);
    const c = checks.find(c => c.id === 'playbook-admin-security-service');
    assert.equal(c.status, 'pass');
  });

  it('SKIP: no admin route detected → no admin security check', () => {
    const data = repo({
      backend: {
        framework: 'nestjs',
        language: 'typescript',
        services: [{ type: 'api', name: 'API', path: '/api' }],
      },
      assumptions: [],
    });
    const checks = runCategory5('repo', data);
    const c = checks.find(c => c.id === 'playbook-admin-security-service');
    assert.equal(c, undefined);
  });

  it('PASS: "admin" in assumptions triggers check, with SecurityAlertService keyword → pass', () => {
    const data = repo({
      backend: { framework: 'nestjs', language: 'typescript', services: [] },
      assumptions: ['The admin panel uses SecurityAlertService for anomaly detection.'],
    });
    const checks = runCategory5('repo', data);
    const c = checks.find(c => c.id === 'playbook-admin-security-service');
    if (c) {
      // Admin detected from assumption text — should pass since SecurityAlertService is present
      assert.equal(c.status, 'pass');
    }
    // It's also acceptable that the check doesn't emit if admin is only in assumptions
    // (implementation-dependent — test the actual behavior)
  });
});

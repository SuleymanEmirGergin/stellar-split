/**
 * CLI Test Suite — Category 6: Data Classification (Rule 14)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runCategory6 } from '../lib/rules/cat6-data-class.js';

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
    project: { name: 'TestApp', repoType: 'single-app', deploymentTarget: 'fly-io' },
    frontend: {},
    backend: { framework: 'django', language: 'python', services: [], entities: [] },
    integrations: [], infrastructure: { containerization: 'docker', cicd: 'github-actions' },
    security: { secretScanningEnabled: true, securityMdIncluded: true, gitignoreComprehensive: true, ciSecurityScanStep: true },
    compliance: {}, packages: [], assumptions: [],
    ...overrides,
  };
}

function hipaaRepo(complianceOverrides = {}) {
  return repo({
    backend: {
      framework: 'django', language: 'python', services: [{ type: 'api', name: 'API' }],
      entities: ['User', 'Patient', 'MedicalRecord', 'AuditLog'],
    },
    compliance: {
      scope: 'HIPAA', hipaaCompliant: true,
      phiEntitiesEncrypted: true, phiAuditLogging: true,
      ...complianceOverrides,
    },
    assumptions: ['All PHI data is encrypted at rest using AES-256-GCM.'],
  });
}

// ─── frontend-backend: PII tier ───────────────────────────────────────────────

describe('Cat6 — frontend-backend: PII classification tier', () => {
  it('SKIP: no PII fields → no PII tier check', () => {
    const data = fb({ forms: [{ name: 'SearchForm', fields: [{ name: 'query', type: 'text' }] }] });
    const checks = runCategory6('frontend-backend', data);
    assert.equal(checks.find(c => c.id === 'data-class-pii-tier'), undefined);
  });

  it('WARN: email field without classification tier assumption', () => {
    const data = fb({
      forms: [{ name: 'RegisterForm', fields: [{ name: 'email', type: 'email' }] }],
      assumptions: ['JWT expires in 1 hour.'],
    });
    const checks = runCategory6('frontend-backend', data);
    const c = checks.find(c => c.id === 'data-class-pii-tier');
    assert.ok(c);
    assert.equal(c.status, 'warn');
    assert.equal(c.field, 'assumptions');
  });

  it('WARN: phone type field without tier assumption', () => {
    const data = fb({ forms: [{ name: 'Form', fields: [{ name: 'phone', type: 'phone' }] }] });
    const checks = runCategory6('frontend-backend', data);
    assert.equal(checks.find(c => c.id === 'data-class-pii-tier').status, 'warn');
  });

  it('PASS: email field WITH "confidential" in assumptions', () => {
    const data = fb({
      forms: [{ name: 'Form', fields: [{ name: 'email', type: 'email' }] }],
      assumptions: ['PII is classified Confidential — stored encrypted.'],
    });
    const checks = runCategory6('frontend-backend', data);
    assert.equal(checks.find(c => c.id === 'data-class-pii-tier').status, 'pass');
  });

  it('PASS: "restricted" keyword in assumptions', () => {
    const data = fb({
      forms: [{ name: 'Form', fields: [{ name: 'nationalid', type: 'text' }] }],
      assumptions: ['Restricted data policy applied.'],
    });
    const checks = runCategory6('frontend-backend', data);
    assert.equal(checks.find(c => c.id === 'data-class-pii-tier').status, 'pass');
  });
});

// ─── frontend-backend: PHI / HIPAA ────────────────────────────────────────────

describe('Cat6 — frontend-backend: PHI / HIPAA fields', () => {
  it('SKIP: no medical fields → no PHI check', () => {
    const data = fb({ forms: [{ name: 'Form', fields: [{ name: 'email', type: 'email' }] }] });
    assert.equal(runCategory6('frontend-backend', data).find(c => c.id === 'data-class-phi-assumption'), undefined);
  });

  it('WARN: "diagnosis" field without HIPAA assumption', () => {
    const data = fb({
      forms: [{ name: 'MedForm', fields: [{ name: 'diagnosis', type: 'text' }] }],
      assumptions: ['JWT expires in 1 hour.'],
    });
    assert.equal(runCategory6('frontend-backend', data).find(c => c.id === 'data-class-phi-assumption').status, 'warn');
  });

  it('PASS: "hipaa" keyword in assumptions', () => {
    const data = fb({
      forms: [{ name: 'PatientForm', fields: [{ name: 'diagnosis', type: 'text' }] }],
      assumptions: ['This system is HIPAA-compliant. PHI handled per 45 CFR Part 164.'],
    });
    assert.equal(runCategory6('frontend-backend', data).find(c => c.id === 'data-class-phi-assumption').status, 'pass');
  });

  it('PASS: "phi" keyword in assumptions', () => {
    const data = fb({
      forms: [{ name: 'RxForm', fields: [{ name: 'prescription', type: 'text' }] }],
      assumptions: ['PHI encrypted and audit-logged.'],
    });
    assert.equal(runCategory6('frontend-backend', data).find(c => c.id === 'data-class-phi-assumption').status, 'pass');
  });
});

// ─── repo: PHI entities BLOCKING ─────────────────────────────────────────────

describe('Cat6 — repo: PHI entity compliance (BLOCKING)', () => {
  it('SKIP: no PHI entity names → no PHI compliance checks', () => {
    const data = repo({ backend: { framework: 'nestjs', language: 'typescript', services: [], entities: ['User', 'Order'] } });
    assert.equal(runCategory6('repo', data).filter(c => c.id.startsWith('data-class-phi')).length, 0);
  });

  it('FAIL (BLOCKING): "Patient" entity without compliance.scope', () => {
    const data = repo({
      backend: { framework: 'django', language: 'python', services: [], entities: ['User', 'Patient'] },
      compliance: { scope: 'none' },
    });
    const c = runCategory6('repo', data).find(c => c.id === 'data-class-phi-scope');
    assert.ok(c);
    assert.equal(c.status, 'fail');
    assert.equal(c.field, 'compliance.scope');
  });

  it('FAIL (BLOCKING): "MedicalRecord" without scope', () => {
    const data = repo({ backend: { framework: 'django', language: 'python', services: [], entities: ['MedicalRecord'] }, compliance: {} });
    assert.equal(runCategory6('repo', data).find(c => c.id === 'data-class-phi-scope').status, 'fail');
  });

  it('PASS: PHI entity WITH scope=HIPAA → data-class-phi-scope passes', () => {
    assert.equal(runCategory6('repo', hipaaRepo()).find(c => c.id === 'data-class-phi-scope').status, 'pass');
  });

  it('FAIL (BLOCKING): hipaaCompliant false', () => {
    const c = runCategory6('repo', hipaaRepo({ hipaaCompliant: false })).find(c => c.id === 'data-class-hipaa-compliant');
    assert.equal(c.status, 'fail');
    assert.equal(c.field, 'compliance.hipaaCompliant');
  });

  it('FAIL (BLOCKING): phiEntitiesEncrypted false', () => {
    const c = runCategory6('repo', hipaaRepo({ phiEntitiesEncrypted: false })).find(c => c.id === 'data-class-phi-encrypted');
    assert.equal(c.status, 'fail');
    assert.equal(c.field, 'compliance.phiEntitiesEncrypted');
  });

  it('FAIL (BLOCKING): phiAuditLogging false', () => {
    const c = runCategory6('repo', hipaaRepo({ phiAuditLogging: false })).find(c => c.id === 'data-class-phi-audit');
    assert.equal(c.status, 'fail');
    assert.equal(c.field, 'compliance.phiAuditLogging');
  });

  it('PASS: all PHI compliance fields correct → no failures', () => {
    const checks = runCategory6('repo', hipaaRepo());
    assert.equal(checks.filter(c => c.status === 'fail').length, 0);
    // phi-scope, hipaa-compliant, phi-encrypted, phi-audit = 4 PHI-related checks
    const phiRelated = checks.filter(c =>
      c.id.startsWith('data-class-phi') || c.id === 'data-class-hipaa-compliant'
    );
    assert.ok(phiRelated.length >= 4, `Expected >= 4 PHI-related checks, got ${phiRelated.length}`);
  });
});

// ─── repo: PCI / financial PII ────────────────────────────────────────────────

describe('Cat6 — repo: PCI-DSS financial entity', () => {
  it('SKIP: no financial entities → no PCI check', () => {
    const data = repo({ backend: { framework: 'nestjs', language: 'typescript', services: [], entities: ['User', 'Order'] } });
    assert.equal(runCategory6('repo', data).find(c => c.id === 'data-class-pci-scope'), undefined);
  });

  it('WARN: "CreditCard" entity without PCI assumption', () => {
    const data = repo({ backend: { framework: 'nestjs', language: 'typescript', services: [], entities: ['CreditCard'] }, assumptions: [] });
    const c = runCategory6('repo', data).find(c => c.id === 'data-class-pci-scope');
    assert.ok(c);
    assert.equal(c.status, 'warn');
  });

  it('PASS: "CreditCard" WITH tokenization in assumptions', () => {
    const data = repo({
      backend: { framework: 'nestjs', language: 'typescript', services: [], entities: ['CreditCard'] },
      assumptions: ['Raw card data never stored — Stripe tokenizes all payment methods.'],
    });
    assert.equal(runCategory6('repo', data).find(c => c.id === 'data-class-pci-scope').status, 'pass');
  });

  it('PASS: "stripe" keyword covers PCI scope reduction', () => {
    const data = repo({
      backend: { framework: 'nestjs', language: 'typescript', services: [], entities: ['PaymentCard'] },
      assumptions: ['Stripe handles all payment processing.'],
    });
    assert.equal(runCategory6('repo', data).find(c => c.id === 'data-class-pci-scope').status, 'pass');
  });
});

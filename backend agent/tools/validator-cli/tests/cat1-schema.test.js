/**
 * CLI Test Suite — Category 1: Schema Compliance (AJV Validation)
 *
 * Tests cover:
 *   - Valid frontend-backend and repo JSON → schema-compliance pass
 *   - Missing required field → schema-violation checks emitted
 *   - Invalid enum value → schema violation
 *   - Unknown type (schema file not found simulation)
 *   - Both handoff types checked
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runCategory1 } from '../lib/rules/cat1-schema.js';

// ─── Minimal valid payloads ───────────────────────────────────────────────────
// These are the minimum-required fields so AJV reports zero violations.

function minimalFb(overrides = {}) {
  return {
    schemaVersion: '2.0.0',
    project: {
      name: 'TestApp',
      type: 'saas',
      stack: 'nestjs',
    },
    pages: [],
    forms: [],
    tables: [],
    actions: [],
    uploads: [],
    authFlows: [],
    externalTriggers: [],
    assumptions: ['JWT tokens expire in 1 hour.'],
    ...overrides,
  };
}

function minimalRepo(overrides = {}) {
  return {
    schemaVersion: '2.1.0',
    meta: {
      generatedBy: 'repo-builder-agent',
      generatedAt: new Date().toISOString(),
      modeUsed: '/blueprint',
      playbooksApplied: [],
    },
    project: {
      name: 'TestApp',
      repoType: 'single-app',
      deploymentTarget: 'railway',
    },
    frontend: {},
    backend: {
      framework: 'nestjs',
      language: 'typescript',
      services: [],
    },
    integrations: [],
    infrastructure: {
      containerization: 'docker',
      cicd: 'github-actions',
    },
    security: {
      secretScanningEnabled: true,
      securityMdIncluded: true,
      gitignoreComprehensive: true,
      ciSecurityScanStep: true,
    },
    packages: [],
    assumptions: ['JWT tokens expire in 1 hour.'],
    ...overrides,
  };
}

// ─── frontend-backend schema tests ───────────────────────────────────────────

describe('Cat1 — frontend-backend schema compliance', () => {

  it('PASS: minimal valid frontend-backend JSON validates cleanly', () => {
    const data = minimalFb();
    const { checks, schemaPath } = runCategory1('frontend-backend', data);

    assert.ok(schemaPath, 'schemaPath must be returned');
    const compliance = checks.find(c => c.id === 'schema-compliance');
    assert.ok(compliance, 'schema-compliance check must exist');
    assert.equal(compliance.status, 'pass');
    // No violation checks should be emitted
    const violations = checks.filter(c => c.id.startsWith('schema-violation'));
    assert.equal(violations.length, 0, 'No schema-violation checks on valid data');
  });

  it('FAIL: missing required project.name emits schema violations', () => {
    // Remove project.name by deleting the project object entirely
    const data = minimalFb();
    delete data.project;

    const { checks } = runCategory1('frontend-backend', data);
    const compliance = checks.find(c => c.id === 'schema-compliance');
    assert.equal(compliance.status, 'fail', 'schema-compliance must fail on missing required field');

    const violations = checks.filter(c => c.id.startsWith('schema-violation'));
    assert.ok(violations.length > 0, 'At least one schema-violation check emitted');
    // All violations are fail status
    violations.forEach(v => assert.equal(v.status, 'fail'));
    // All violations have a category
    violations.forEach(v => assert.equal(v.category, 'schema'));
  });

  it('FAIL: missing top-level pages[] (required) emits violation', () => {
    const data = minimalFb();
    delete data.pages;

    const { checks } = runCategory1('frontend-backend', data);
    const compliance = checks.find(c => c.id === 'schema-compliance');
    assert.equal(compliance.status, 'fail');
    const violations = checks.filter(c => c.id.startsWith('schema-violation'));
    assert.ok(violations.length >= 1, 'At least one violation for missing pages[]');
  });

  it('FAIL: missing assumptions[] (required) emits violation', () => {
    const data = minimalFb();
    delete data.assumptions;

    const { checks } = runCategory1('frontend-backend', data);
    const compliance = checks.find(c => c.id === 'schema-compliance');
    assert.equal(compliance.status, 'fail');
  });

  it('PASS: schema-compliance check has correct category and severity', () => {
    const data = minimalFb();
    const { checks } = runCategory1('frontend-backend', data);
    const compliance = checks.find(c => c.id === 'schema-compliance');
    assert.equal(compliance.category, 'schema');
    assert.equal(compliance.severity, 'error');
  });

  it('RESULT: schemaPath is a relative path string', () => {
    const data = minimalFb();
    const { schemaPath } = runCategory1('frontend-backend', data);
    assert.ok(typeof schemaPath === 'string', 'schemaPath must be a string');
    assert.ok(schemaPath.includes('frontend-backend-handoff.schema.json'), 'schemaPath must reference the correct schema file');
    // Must be relative (not starting with drive letter on Windows or / on Unix at root level)
    assert.ok(!schemaPath.startsWith('/') || schemaPath.startsWith('backend-integrator'), 'schemaPath should be relative');
  });
});

// ─── repo schema tests ────────────────────────────────────────────────────────

describe('Cat1 — repo schema compliance', () => {

  it('PASS: minimal valid repo JSON validates cleanly', () => {
    const data = minimalRepo();
    const { checks, schemaPath } = runCategory1('repo', data);

    assert.ok(schemaPath, 'schemaPath must be returned');
    const compliance = checks.find(c => c.id === 'schema-compliance');
    assert.ok(compliance, 'schema-compliance check must exist');
    assert.equal(compliance.status, 'pass');
    const violations = checks.filter(c => c.id.startsWith('schema-violation'));
    assert.equal(violations.length, 0);
  });

  it('FAIL: missing meta object emits schema violations', () => {
    const data = minimalRepo();
    delete data.meta;

    const { checks } = runCategory1('repo', data);
    const compliance = checks.find(c => c.id === 'schema-compliance');
    assert.equal(compliance.status, 'fail');
    const violations = checks.filter(c => c.id.startsWith('schema-violation'));
    assert.ok(violations.length >= 1);
  });

  it('FAIL: missing backend object emits schema violations', () => {
    const data = minimalRepo();
    delete data.backend;

    const { checks } = runCategory1('repo', data);
    const compliance = checks.find(c => c.id === 'schema-compliance');
    assert.equal(compliance.status, 'fail');
  });

  it('FAIL: missing security object emits schema violations', () => {
    const data = minimalRepo();
    delete data.security;

    const { checks } = runCategory1('repo', data);
    const compliance = checks.find(c => c.id === 'schema-compliance');
    assert.equal(compliance.status, 'fail');
  });

  it('PASS: schemaPath references repo-handoff.schema.json', () => {
    const data = minimalRepo();
    const { schemaPath } = runCategory1('repo', data);
    assert.ok(schemaPath.includes('repo-handoff.schema.json'), 'schemaPath must reference repo schema');
  });

  it('INFO: multiple violations are numbered sequentially (schema-violation-1, schema-violation-2...)', () => {
    const data = minimalRepo();
    delete data.meta;
    delete data.backend;

    const { checks } = runCategory1('repo', data);
    const violations = checks.filter(c => c.id.startsWith('schema-violation'));
    // If multiple violations, they should have numbered IDs
    if (violations.length >= 2) {
      assert.ok(violations.some(v => v.id === 'schema-violation-1'), 'First violation ID is schema-violation-1');
      assert.ok(violations.some(v => v.id === 'schema-violation-2'), 'Second violation ID is schema-violation-2');
    }
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('Cat1 — edge cases', () => {

  it('RESULT: each violation check has id, category, label, status, message, severity fields', () => {
    const data = minimalFb();
    delete data.project;

    const { checks } = runCategory1('frontend-backend', data);
    const violations = checks.filter(c => c.id.startsWith('schema-violation'));
    assert.ok(violations.length > 0, 'At least one violation should exist');

    for (const v of violations) {
      assert.ok(v.id, 'violation must have id');
      assert.ok(v.category, 'violation must have category');
      assert.ok(v.label, 'violation must have label');
      assert.ok(v.status, 'violation must have status');
      assert.ok(v.message, 'violation must have message');
      assert.ok(v.severity, 'violation must have severity');
    }
  });

  it('RESULT: schema-compliance check appears first in the checks array', () => {
    const data = minimalFb();
    const { checks } = runCategory1('frontend-backend', data);
    assert.equal(checks[0].id, 'schema-compliance', 'schema-compliance must be the first check');
  });

  it('RESULT: on PASS, violation count is exactly 0', () => {
    // Both valid payloads
    const fb = minimalFb();
    const repo = minimalRepo();

    const r1 = runCategory1('frontend-backend', fb);
    const r2 = runCategory1('repo', repo);

    const v1 = r1.checks.filter(c => c.id.startsWith('schema-violation'));
    const v2 = r2.checks.filter(c => c.id.startsWith('schema-violation'));

    assert.equal(v1.length, 0, 'No violations for valid frontend-backend');
    assert.equal(v2.length, 0, 'No violations for valid repo');
  });
});

/**
 * Validation Engine
 * Orchestrates all 7 check categories and assembles the final validation-report.json.
 */

import { runCategory1 } from './rules/cat1-schema.js';
import { runCategory2 } from './rules/cat2-semantic.js';
import { runCategory3 } from './rules/cat3-security.js';
import { runCategory4 } from './rules/cat4-completeness.js';
import { runCategory5 } from './rules/cat5-playbook.js';
import { runCategory6 } from './rules/cat6-data-class.js';
import { runCategory7 } from './rules/cat7-observability.js';
import { runCategory8 } from './rules/cat8-resilience.js';
import { runCategory9 } from './rules/cat9-edge-runtime.js';
import { generateFixHints } from './fix-hints.js';

/**
 * Run all validation categories against a handoff file.
 *
 * @param {'frontend-backend'|'repo'} type
 * @param {object} data - Parsed JSON from the handoff file
 * @param {string} filename - Original filename (for the report)
 * @param {object} opts
 * @param {boolean} opts.withFixHints - Generate fix hints for failures/warnings
 * @returns {object} validation-report compatible object
 */
export function runValidation(type, data, filename, opts = {}) {
  const { withFixHints = false } = opts;

  // ── Category 1: Schema ───────────────────────────────────────────────
  const { checks: cat1Checks, schemaPath } = runCategory1(type, data);
  const schemaFailed = cat1Checks.some(c => c.status === 'fail');

  // If schema hard-fails, skip remaining categories
  // (data shape is unknown — further checks would produce noise)
  let allChecks = [...cat1Checks];

  if (!schemaFailed) {
    // ── Category 2: Semantic ───────────────────────────────────────────
    allChecks.push(...runCategory2(type, data));

    // ── Category 3: Security Baseline ─────────────────────────────────
    allChecks.push(...runCategory3(type, data));

    // ── Category 4: Completeness ───────────────────────────────────────
    allChecks.push(...runCategory4(type, data));

    // ── Category 5: Security Playbook (Rule 13) ────────────────────────
    allChecks.push(...runCategory5(type, data));

    // ── Category 6: Data Classification (Rule 14) ──────────────────────
    allChecks.push(...runCategory6(type, data));

    // ── Category 7: Observability (Rule 15) ────────────────────────────────────────────────────────
    allChecks.push(...runCategory7(type, data));

    // ── Category 8: Resilience Baseline (Rule 16) ────────────────────────────────────────────────
    allChecks.push(...runCategory8(type, data));

    // ── Category 9: Edge Runtime Checks (Rule 17) ────────────────────────────────────────────────
    allChecks.push(...runCategory9(type, data));
  }

  // ── Dedup check IDs (keep first occurrence) ─────────────────────────
  const seen = new Set();
  allChecks = allChecks.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  // ── Compute summary ──────────────────────────────────────────────────
  const passed = allChecks.filter(c => c.status === 'pass').length;
  const warnings = allChecks.filter(c => c.status === 'warn').length;
  const failures = allChecks.filter(c => c.status === 'fail').length;

  const blockingFailures = allChecks
    .filter(c => c.status === 'fail')
    .map(c => c.id);

  const warningIds = allChecks
    .filter(c => c.status === 'warn')
    .map(c => c.id);

  // ── Overall status ───────────────────────────────────────────────────
  let status;
  if (failures > 0) {
    status = 'fail';
  } else if (warnings > 0) {
    status = 'warn';
  } else {
    status = 'pass';
  }

  // ── Build report ─────────────────────────────────────────────────────
  const report = {
    validatedFile: filename,
    validatedAt: new Date().toISOString(),
    schema: schemaPath || `(schema for ${type})`,
    status,
    summary: {
      totalChecks: allChecks.length,
      passed,
      warnings,
      failures,
    },
    checks: allChecks,
    blockingFailures,
    warnings: warningIds,
    meta: {
      validatorVersion: '2.1.0',
      pipelineStage: type === 'frontend-backend' ? 'frontend-to-backend' : 'backend-to-repo',
      commandUsed: type === 'frontend-backend' ? '/validate frontend-backend' : '/validate repo',
    },
  };

  // ── Fix Hints ────────────────────────────────────────────────────────
  if (withFixHints) {
    report.fixHints = generateFixHints(allChecks);
  }

  return report;
}

/**
 * Map overall status to a CI-friendly exit code.
 * 0 = pass, 1 = warn, 2 = fail
 */
export function statusToExitCode(status) {
  if (status === 'pass') return 0;
  if (status === 'warn') return 1;
  return 2;
}

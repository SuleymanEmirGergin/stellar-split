/**
 * Reporter — Terminal output formatter
 * Renders validation results to the terminal with colour-coded tables and summaries.
 */

import chalk from 'chalk';

const STATUS_ICONS = {
  pass: chalk.green('✅'),
  warn: chalk.yellow('⚠️ '),
  fail: chalk.red('✘ '),
};

const SEVERITY_COLORS = {
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.dim,
};

const CATEGORY_LABELS = {
  schema: 'Schema Compliance',
  semantic: 'Semantic Cross-Reference',
  security: 'Security Baseline',
  completeness: 'Completeness',
};

/**
 * Print the full validation result to stdout.
 * @param {object} report - Full validation report object
 * @param {object} opts
 * @param {boolean} opts.fixHints - Whether fix hints were requested
 */
export function printReport(report, opts = {}) {
  const { fixHints = false } = opts;

  // ── Header ──────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.bold('╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.bold('║       Backend Agent — Validator CLI                  ║'));
  console.log(chalk.bold('╚══════════════════════════════════════════════════════╝'));
  console.log('');
  console.log(`  ${chalk.dim('File    :')} ${chalk.cyan(report.validatedFile)}`);
  console.log(`  ${chalk.dim('Schema  :')} ${chalk.dim(report.schema)}`);
  console.log(`  ${chalk.dim('Run At  :')} ${chalk.dim(report.validatedAt)}`);
  console.log('');

  // ── Overall Status Banner ────────────────────────────────────────────
  if (report.status === 'pass') {
    console.log(chalk.bgGreen.black.bold('  ✅  ALL CHECKS PASSED — Pipeline may proceed  '));
  } else if (report.status === 'warn') {
    console.log(chalk.bgYellow.black.bold('  ⚠️   WARNINGS FOUND — Proceed with caution     '));
  } else {
    console.log(chalk.bgRed.white.bold('  ✘   VALIDATION FAILED — Pipeline is BLOCKED    '));
  }
  console.log('');

  // ── Checks grouped by category ───────────────────────────────────────
  const byCategory = groupByCategory(report.checks);
  const catOrder = ['schema', 'semantic', 'security', 'completeness'];

  for (const cat of catOrder) {
    const catChecks = byCategory[cat] || [];
    if (catChecks.length === 0) continue;

    const catStatus = catChecks.some(c => c.status === 'fail') ? 'fail'
      : catChecks.some(c => c.status === 'warn') ? 'warn' : 'pass';

    const catLabel = CATEGORY_LABELS[cat] || cat;
    const catIcon = STATUS_ICONS[catStatus];

    console.log(chalk.bold(`  ${catIcon} ${catLabel}`));
    console.log(chalk.dim('  ' + '─'.repeat(54)));

    for (const check of catChecks) {
      const icon = STATUS_ICONS[check.status];
      const color = check.status === 'fail' ? chalk.red
        : check.status === 'warn' ? chalk.yellow : chalk.dim;
      const label = check.status === 'pass'
        ? chalk.dim(check.label)
        : chalk.bold(check.label);

      console.log(`    ${icon} ${label}`);
      if (check.status !== 'pass') {
        // Wrap message to 70 chars
        const msgLines = wrapText(check.message, 68);
        msgLines.forEach(line => console.log(`       ${color(line)}`));
        if (check.field) {
          console.log(`       ${chalk.dim('Field: ' + check.field)}`);
        }
      }
    }
    console.log('');
  }

  // ── Summary ──────────────────────────────────────────────────────────
  const s = report.summary;
  console.log(chalk.bold('  ─── Summary ──────────────────────────────────────────'));
  console.log(`  ${chalk.green(`${s.passed} passed`)}  ·  ${chalk.yellow(`${s.warnings} warning(s)`)}  ·  ${chalk.red(`${s.failures} failure(s)`)}  ·  ${chalk.dim(`${s.totalChecks} total`)}`);
  console.log('');

  // ── Blocking Failures ────────────────────────────────────────────────
  if (report.blockingFailures.length > 0) {
    console.log(chalk.red.bold('  🚫 Blocking Failures (pipeline is stopped):'));
    report.blockingFailures.forEach(id => {
      console.log(`     ${chalk.red('•')} ${id}`);
    });
    console.log('');
  }

  // ── Fix Hints ────────────────────────────────────────────────────────
  if (fixHints && report.fixHints && report.fixHints.length > 0) {
    console.log(chalk.bold.cyan('  🔧 Fix Hints'));
    console.log(chalk.dim('  ' + '─'.repeat(54)));

    report.fixHints.forEach((hint, i) => {
      console.log('');
      console.log(`  ${chalk.bold(`[${i + 1}] Check: ${hint.checkId}`)}`);
      console.log(`  ${chalk.dim('Problem:')} ${hint.problem}`);
      console.log(`  ${chalk.cyan('Fix    :')} ${hint.fix}`);
      if (hint.example) {
        console.log(`  ${chalk.dim('Example:')}`);
        hint.example.split('\n').forEach(line => {
          console.log(`    ${chalk.dim(line)}`);
        });
      }
    });
    console.log('');
  }

  // ── Output File Note ─────────────────────────────────────────────────
  if (report._outputPath) {
    console.log(`  ${chalk.dim('Report saved to:')} ${chalk.cyan(report._outputPath)}`);
    console.log('');
  }
}

/**
 * Print a minimal one-line status (for --quiet mode with errors).
 */
export function printQuiet(report) {
  const s = report.summary;
  const statusLabel = report.status.toUpperCase().padEnd(4);
  console.log(`[${statusLabel}] ${report.validatedFile} — ${s.passed}/${s.totalChecks} checks passed, ${s.failures} failure(s), ${s.warnings} warning(s)`);
}

/**
 * Group checks by category.
 * @param {object[]} checks
 */
function groupByCategory(checks) {
  const groups = {};
  for (const check of checks) {
    const cat = check.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(check);
  }
  return groups;
}

/**
 * Word-wrap text at a given column width.
 * @param {string} text
 * @param {number} maxLen
 * @returns {string[]}
 */
function wrapText(text, maxLen) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trimStart().length > maxLen) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

#!/usr/bin/env node

/**
 * Backend Agent System — Validator CLI
 * Validates frontend-backend-handoff.json and repo-handoff.json files
 * against their JSON schemas and all 7 semantic/security/compliance rule categories.
 *
 * Usage:
 *   node index.js validate <type> <file> [options]
 *
 * Examples:
 *   node index.js validate frontend-backend ./handoff.json
 *   node index.js validate repo ./repo-handoff.json --report
 *   node index.js validate frontend-backend ./handoff.json --fix-hints
 *   node index.js validate repo ./repo-handoff.json --report --output ./my-report.json --fix-hints
 *   node index.js validate frontend-backend ./handoff.json --quiet
 *   node index.js validate repo ./repo-handoff.json --format json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import chalk from 'chalk';

import { runValidation, statusToExitCode } from './lib/engine.js';
import { printReport, printQuiet } from './lib/reporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('validate-agent')
  .description(chalk.bold('Backend Agent System — Handoff Validator CLI\n') +
    chalk.dim('Validates handoff JSON files against schema + semantic + security + compliance rules.\n') +
    chalk.dim('All 17 validator agent rules are enforced programmatically across 9 check categories.'))
  .version('2.1.0');

// ── validate command ──────────────────────────────────────────────────────────
program
  .command('validate')
  .description('Validate a handoff JSON file')
  .argument('<type>', 'Handoff type: "frontend-backend" or "repo"')
  .argument('<file>', 'Path to the handoff JSON file')
  .option('--report', 'Save validation report to a JSON file', false)
  .option('--output <path>', 'Output path for the report (default: ./validation-report.json)', './validation-report.json')
  .option('--fix-hints', 'Show actionable fix suggestions for all failures and warnings', false)
  .option('--quiet', 'Suppress terminal output (CI mode — only exit code)', false)
  .option('--format <fmt>', 'Terminal output format: "table" or "json"', 'table')
  .action((type, file, options) => {
    // ── Input validation ─────────────────────────────────────────────
    if (type !== 'frontend-backend' && type !== 'repo') {
      console.error(chalk.red(`\nError: Invalid type "${type}". Must be "frontend-backend" or "repo".\n`));
      process.exit(2);
    }

    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      console.error(chalk.red(`\nError: File not found at ${filePath}\n`));
      process.exit(2);
    }

    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (parseErr) {
      console.error(chalk.red(`\nError: Could not parse JSON — ${parseErr.message}\n`));
      process.exit(2);
    }

    // ── Run validation ───────────────────────────────────────────────
    const fileName = path.basename(filePath);
    const report = runValidation(type, data, fileName, {
      withFixHints: options.fixHints,
    });

    // ── Output: terminal ─────────────────────────────────────────────
    if (options.quiet) {
      if (report.status !== 'pass') {
        printQuiet(report);
      }
    } else if (options.format === 'json') {
      // Raw JSON to stdout (useful for piping)
      console.log(JSON.stringify(report, null, 2));
    } else {
      // Add output path to report for display note
      if (options.report) {
        report._outputPath = path.resolve(process.cwd(), options.output);
      }
      printReport(report, { fixHints: options.fixHints });
    }

    // ── Output: file ─────────────────────────────────────────────────
    if (options.report) {
      const outputPath = path.resolve(process.cwd(), options.output);
      // Remove internal fields before writing
      const fileReport = { ...report };
      delete fileReport._outputPath;

      try {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, JSON.stringify(fileReport, null, 2), 'utf8');
        if (!options.quiet && options.format !== 'json') {
          // The reporter already printed the path note
        }
      } catch (writeErr) {
        console.error(chalk.red(`\nError writing report to ${outputPath}: ${writeErr.message}\n`));
      }
    }

    // ── Exit code ────────────────────────────────────────────────────
    // 0 = pass, 1 = warn, 2 = fail
    const exitCode = statusToExitCode(report.status);
    process.exit(exitCode);
  });

// ── report command (alias: show last saved report) ────────────────────────────
program
  .command('report')
  .description('Display a previously saved validation-report.json')
  .argument('[file]', 'Path to the report JSON file', './validation-report.json')
  .option('--fix-hints', 'Show fix hints if present in the report', false)
  .action((file, options) => {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      console.error(chalk.red(`\nError: Report file not found at ${filePath}\n`));
      process.exit(2);
    }

    let report;
    try {
      report = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (parseErr) {
      console.error(chalk.red(`\nError: Could not parse report JSON — ${parseErr.message}\n`));
      process.exit(2);
    }

    printReport(report, { fixHints: options.fixHints });

    // Don't exit with error code when just displaying — use 0 always
    process.exit(0);
  });

program.parse();

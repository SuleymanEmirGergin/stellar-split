/**
 * Category 1 — Schema Compliance
 * Validates the handoff JSON file against its JSON Schema using AJV.
 * Every AJV error becomes a separate blocking check entry.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const SCHEMAS = {
  'frontend-backend': path.join(rootDir, 'backend-integrator/frontend-backend-handoff.schema.json'),
  'repo': path.join(rootDir, 'repo-builder-agent/repo-handoff.schema.json'),
};

/**
 * @param {'frontend-backend'|'repo'} type
 * @param {object} data - Parsed JSON
 * @returns {{ checks: object[], schemaPath: string }}
 */
export function runCategory1(type, data) {
  const checks = [];
  const schemaPath = SCHEMAS[type];

  if (!fs.existsSync(schemaPath)) {
    return {
      schemaPath,
      checks: [{
        id: 'schema-file-found',
        category: 'schema',
        label: 'Schema File Exists',
        status: 'fail',
        message: `Schema file not found at: ${schemaPath}`,
        severity: 'error',
      }],
    };
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (valid) {
    checks.push({
      id: 'schema-compliance',
      category: 'schema',
      label: 'JSON Schema Compliance',
      status: 'pass',
      message: `Handoff file is fully compliant with ${path.basename(schemaPath)}.`,
      severity: 'error',
    });
  } else {
    // Top-level schema pass/fail summary
    checks.push({
      id: 'schema-compliance',
      category: 'schema',
      label: 'JSON Schema Compliance',
      status: 'fail',
      message: `${validate.errors.length} schema violation(s) found.`,
      severity: 'error',
    });

    // One check per AJV error for granular reporting
    validate.errors.forEach((err, idx) => {
      const fieldPath = err.instancePath || err.schemaPath || 'root';
      const paramStr = err.params ? ` [${JSON.stringify(err.params)}]` : '';
      checks.push({
        id: `schema-violation-${idx + 1}`,
        category: 'schema',
        label: `Schema Violation #${idx + 1}`,
        status: 'fail',
        message: `${fieldPath}: ${err.message}${paramStr}`,
        severity: 'error',
        field: fieldPath || undefined,
      });
    });
  }

  return { checks, schemaPath: path.relative(rootDir, schemaPath) };
}

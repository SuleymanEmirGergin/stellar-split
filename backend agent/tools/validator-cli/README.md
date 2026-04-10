# Validator CLI

**Version 2.0.0** — Programmatic validation CLI for the Backend Agent System.

Validates `frontend-backend-handoff.json` and `repo-handoff.json` files against their JSON schemas and all 15 validator agent rules across 7 check categories.

---

## Installation

Dependencies are already in `package.json`. From this directory:

```bash
npm install
```

---

## Usage

```bash
node index.js validate <type> <file> [options]
```

### Arguments

| Argument | Values | Description |
|---|---|---|
| `type` | `frontend-backend` | Validate against `frontend-backend-handoff.schema.json` |
| `type` | `repo` | Validate against `repo-handoff.schema.json` |
| `file` | path | Path to the handoff JSON file |

### Options

| Flag | Default | Description |
|---|---|---|
| `--report` | false | Save `validation-report.json` to disk |
| `--output <path>` | `./validation-report.json` | Custom output path for the report |
| `--fix-hints` | false | Show actionable fix suggestions for all failures and warnings |
| `--quiet` | false | Suppress terminal output (CI mode) |
| `--format json\|table` | `table` | Terminal output format |

---

## Examples

```bash
# Basic validation
node index.js validate frontend-backend ./frontend-backend-handoff.json

# With fix hints
node index.js validate repo ./repo-handoff.json --fix-hints

# Save report to file
node index.js validate repo ./repo-handoff.json --report --output ./reports/stage1.json

# Full pipeline run with report and hints
node index.js validate frontend-backend ./frontend-backend-handoff.json --report --fix-hints

# CI-friendly (exit code only, no output)
node index.js validate repo ./repo-handoff.json --quiet

# JSON output for piping
node index.js validate frontend-backend ./handoff.json --format json | jq '.status'

# Display a previously saved report
node index.js report ./validation-report.json --fix-hints
```

---

## Pre-wired Test Scripts

```bash
# Run all pipeline-run examples
npm run test:all

# Individual runs
npm run test:briefboard        # BriefBoard frontend-backend handoff
npm run test:briefboard-repo   # BriefBoard repo handoff
npm run test:hipaa             # HIPAA TeleMed frontend-backend handoff
npm run test:hipaa-repo        # HIPAA TeleMed repo handoff
npm run test:linkpulse         # LinkPulse FastAPI frontend-backend handoff
npm run test:linkpulse-repo    # LinkPulse FastAPI repo handoff
```

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | All checks passed |
| `1` | Warnings found — proceed with caution |
| `2` | Blocking failures — pipeline must stop |

---

## Check Categories

| # | Category | Rules | Scope |
|---|---|---|---|
| 1 | Schema Compliance | Rule 1 | Both types |
| 2 | Semantic Cross-Reference | Rule 5 | Both types |
| 3 | Security Baseline | Rule 6 | Both types |
| 4 | Completeness | Rule 7, 12 | Both types |
| 5 | Security Playbook Baseline | Rule 13 | Both types |
| 6 | Data Classification | Rule 14 | Both types |
| 7 | Observability Baseline | Rule 15 | Both types |

---

## Output — validation-report.json

Conforms to `validator-agent/validation-report.schema.json`:

```json
{
  "validatedFile": "frontend-backend-handoff.json",
  "validatedAt": "2026-04-05T17:00:00.000Z",
  "schema": "backend-integrator/frontend-backend-handoff.schema.json",
  "status": "pass | warn | fail",
  "summary": {
    "totalChecks": 18,
    "passed": 16,
    "warnings": 1,
    "failures": 1
  },
  "checks": [...],
  "blockingFailures": ["semantic-worker-queue"],
  "warnings": ["observability-distributed-tracing"],
  "fixHints": [...],
  "meta": {
    "validatorVersion": "2.0.0",
    "pipelineStage": "frontend-to-backend",
    "commandUsed": "/validate frontend-backend"
  }
}
```

---

## Architecture

```
validator-cli/
├── index.js           ← CLI entry (Commander.js)
├── lib/
│   ├── engine.js      ← Orchestrates all 7 categories → report
│   ├── reporter.js    ← Coloured terminal output
│   ├── fix-hints.js   ← Fix hint generator (one hint per check ID)
│   └── rules/
│       ├── cat1-schema.js        ← AJV JSON Schema validation
│       ├── cat2-semantic.js      ← Cross-reference checks
│       ├── cat3-security.js      ← Security baseline (Rule 6)
│       ├── cat4-completeness.js  ← Assumptions, project name (Rule 7, 12)
│       ├── cat5-playbook.js      ← Security playbook (Rule 13)
│       ├── cat6-data-class.js    ← PHI/PCI detection (Rule 14)
│       └── cat7-observability.js ← Health endpoints, tracing (Rule 15)
└── package.json
```

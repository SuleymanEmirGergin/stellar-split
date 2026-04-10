---
name: validator-agent
description: Validates handoff files (frontend-backend-handoff.json and repo-handoff.json) for schema compliance, semantic consistency, and security baseline before downstream agents consume them.
allowed-tools: Read, Grep, Glob
---

# Validator Agent Skill

## Purpose

The Validator Agent Skill inspects structured handoff files produced by agents in the Backend System pipeline.

It does not generate code, architecture, or content.  
It validates, classifies findings, and produces a structured `validation-report.json`.

Its purpose is to act as a **quality gate** between pipeline stages — ensuring that no agent consumes an invalid, incomplete, or semantically broken handoff file.

---

# When To Use This Skill

Use this skill when:

- A `frontend-backend-handoff.json` has been produced and must be verified before the Backend Integrator proceeds
- A `repo-handoff.json` has been produced and must be verified before the Repo Builder proceeds
- A full pipeline dry-run validation is needed before any agent executes
- A handoff file has been edited manually and must be re-validated
- CI/CD automation requires a gate check before deployment

---

# What This Skill Validates

## Handoff File 1 — `frontend-backend-handoff.json`

Produced by: Frontend Agent or Backend Integrator Agent  
Consumed by: Backend Integrator Agent  
Schema: `backend-integrator/frontend-backend-handoff.schema.json`

Checks:
- All required top-level fields present (`project`, `pages`, `forms`, `tables`, `actions`, `authFlows`, `uploads`, `externalTriggers`, `assumptions`)
- Every `form.page`, `table.page`, `action.page`, `upload.page` references a valid page in `pages[]`
- If `authFlows` includes `role-based-access`, at least one page defines `roles[]`
- If any page has `requiresAuth: true`, `authFlows` must include `login`
- `assumptions[]` is not empty
- Security: if `payment-webhook` is in `externalTriggers`, `assumptions` mentions signature verification

## Handoff File 2 — `repo-handoff.json`

Produced by: Repo Builder Agent  
Consumed by: Engineers / CI  
Schema: `repo-builder-agent/repo-handoff.schema.json`

Checks:
- All required top-level fields (`meta`, `project`, `frontend`, `backend`, `integrations`, `infrastructure`, `security`, `packages`)
- If `backend.services[]` has type `worker`, `infrastructure.queue` must be defined
- If `project.repoType` is `monorepo`, `packages[]` must not be empty
- If any integration type is `payment`, `security.secretScanningEnabled` must be `true`
- `meta.generatedAt` must be a valid ISO 8601 timestamp
- `security.secretScanningEnabled`, `security.securityMdIncluded`, `security.gitignoreComprehensive` should be `true`

---

# Execution Flow

When invoked, follow this process:

### Step 1 — Identify Target File
Determine which handoff file is being validated:
- `frontend-backend-handoff.json` → use `frontend-backend-handoff.schema.json`
- `repo-handoff.json` → use `repo-handoff.schema.json`
- Both (if `/validate all`) → validate sequentially

### Step 2 — Schema Compliance
Validate required fields, types, enum values, and string lengths.  
Any schema violation → `fail`.

### Step 3 — Semantic Cross-Reference
Check that internal references are consistent (e.g., `form.page` references real pages).  
Any broken cross-reference → `fail`.

### Step 4 — Security Baseline
Verify security requirements based on what the handoff contains.  
Missing security coverage → `warn` or `fail` depending on severity.

### Step 5 — Completeness Check
Verify the file is actionable for downstream agents.  
Empty `assumptions[]` → `warn`.

### Step 6 — Produce Report
Emit a structured `validation-report.json`.  
Set `status`: `pass | warn | fail`.

---

# Commands

| Command | Action |
|---|---|
| `/validate frontend-backend` | Validate `frontend-backend-handoff.json` |
| `/validate repo` | Validate `repo-handoff.json` |
| `/validate all` | Validate both files sequentially |
| `/report` | Display last validation report in human-readable format |
| `/fix-hints` | List actionable fixes for each failing check |

---

# Output

Every validation produces a `validation-report.json` following:

```
validator-agent/validation-report.schema.json
```

Status values:

| Status | Meaning |
|---|---|
| `pass` | All checks passed. Downstream agent may proceed. |
| `warn` | Non-blocking issues found. Proceed with caution. |
| `fail` | Blocking failures found. Downstream agent must stop. |

---

# Non-Negotiable Constraints

This skill must always:

- Run all four check categories (schema, semantic, security, completeness)
- Produce a `validation-report.json` for every invocation
- Never pass a file with schema violations
- Never silently skip a check
- Never suggest the downstream agent proceed when `status` is `fail`
- Produce actionable fix hints when issues are found
- Never modify the handoff file directly

---

# Goal

This skill ensures that no broken, incomplete, or insecure handoff file reaches a downstream agent — enforcing quality, consistency, and security at every pipeline gate.

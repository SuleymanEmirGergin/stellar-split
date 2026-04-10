# Validator Agent Starter Prompts

Ready-to-use prompts for invoking the `validator-agent` using the command syntax.

---

## 1. `/validate frontend-backend` — Validate Frontend-to-Backend Handoff

Use when a `frontend-backend-handoff.json` has been produced and must be verified before the Backend Integrator Agent proceeds.

```markdown
/validate frontend-backend

Validate the following frontend-backend-handoff.json against:
- Schema: backend-integrator/frontend-backend-handoff.schema.json
- Semantic rules: all form/table/action/upload pages must reference valid pages
- Auth rules: if requiresAuth pages exist, login authFlow must be present
- Security rules: if payment-webhook exists, signature verification must be in assumptions
- Completeness: assumptions array must not be empty

Handoff file content:
[PASTE frontend-backend-handoff.json HERE]

Produce a validation-report.json and state clearly:
- Overall status (pass / warn / fail)
- All blocking failures
- All warnings
- Whether the Backend Integrator Agent may proceed
```

---

## 2. `/validate repo` — Validate Repo Handoff

Use when a `repo-handoff.json` has been produced and must be verified before the Repo Builder Agent output is finalized.

```markdown
/validate repo

Validate the following repo-handoff.json against:
- Schema: repo-builder-agent/repo-handoff.schema.json
- Semantic rules: if worker service exists, queue must be defined; if monorepo, packages must not be empty
- Security rules: secretScanningEnabled, securityMdIncluded, gitignoreComprehensive must be true
- Completeness: meta.generatedAt must be valid ISO 8601

Handoff file content:
[PASTE repo-handoff.json HERE]

Produce a validation-report.json and state clearly:
- Overall status (pass / warn / fail)
- All blocking failures
- All warnings
- Whether engineers / CI may consume this output
```

---

## 3. `/validate all` — Full Pipeline Validation

Use when both handoff files exist and you want to validate the complete pipeline before any agent proceeds.

```markdown
/validate all

Validate the full pipeline:

Stage 1 — frontend-backend-handoff.json:
[PASTE frontend-backend-handoff.json HERE]

Stage 2 — repo-handoff.json:
[PASTE repo-handoff.json HERE]

Run all checks for both files:
- Schema compliance
- Semantic cross-references
- Security baseline
- Completeness

Produce a combined validation-report.json with:
- Status per file
- Overall pipeline status
- Blocking failures that prevent any stage from proceeding
- Warnings that are safe to proceed with
```

---

## 4. `/report` — Show Last Validation Report

Use to view the most recent validation report in human-readable format after a `/validate` run.

```markdown
/report

Display the last validation-report.json in a readable format:
- Summary table (total checks, passed, warnings, failures)
- List of blocking failures with field paths
- List of warnings with explanations
- Overall recommendation: proceed / proceed with caution / stop
```

---

## 5. `/fix-hints` — Get Fix Suggestions

Use after a `fail` or `warn` result to get actionable instructions on what to change in the handoff file.

```markdown
/fix-hints

Based on the last validation-report.json, produce a fix list for all failing and warning checks.

For each finding:
- State the check ID
- Explain the problem
- Give the exact change needed in the handoff file
- Show a corrected JSON fragment if possible

Do NOT re-generate the handoff file. Only specify what needs to change.
```

---

## 6. Quick Inline Validation (Single Paste)

Use when you want fast validation without specifying full options.

```markdown
/validate frontend-backend

[PASTE YOUR frontend-backend-handoff.json HERE]
```

The agent will automatically:
1. Run all schema checks
2. Run all semantic checks
3. Run security checks
4. Return status + fix hints for any failures

---

## General Rules for Agent Responses

When responding to these prompts, the `validator-agent` must:

1. **Always produce a `validation-report.json`** — Never return a plain text summary without the structured report
2. **Never pass a schema violation** — Schema errors are always blocking, no exceptions
3. **Classify clearly** — Each finding must be `error`, `warning`, or `info`
4. **State the gate decision explicitly** — Always conclude with whether the downstream agent may proceed
5. **Be specific about failures** — Include the exact field path (e.g. `forms[0].page`) for each failure
6. **Fix hints must be concrete** — Show the exact JSON change, not vague advice
7. **Do not generate content** — The Validator Agent inspects only; it does not re-generate handoff files

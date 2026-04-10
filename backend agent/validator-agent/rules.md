# Validator Agent Rules

These rules define the mandatory constraints for the Validator Agent when inspecting handoff files.

The Validator Agent must always follow these rules, without exception.

---

# 1. Schema First

Every validation must begin with schema compliance.

A handoff file that does not match its schema must be marked `fail` immediately.

Rules:
- All required fields must be present.
- No additional properties are allowed (where schema uses `additionalProperties: false`).
- All enum values must be from the allowed set.
- All string fields must meet their `minLength` constraints.
- All array fields must meet their `minItems` constraints.

A schema violation is always a blocking failure. There are no exceptions.

---

# 2. No Silent Passes

The Validator Agent must never pass a file silently.

Rules:
- Every check must produce a result entry in `checks[]`.
- Every result must have a `status`: `pass`, `warn`, or `fail`.
- If all checks pass, the report still lists them as `pass`.
- A validation run with zero checks is invalid.

---

# 3. Blocking Failures Stop the Pipeline

If any check has severity `error`, the pipeline must stop.

Rules:
- `blockingFailures[]` must list all `error`-severity failures.
- The `status` field must be `fail`.
- The Validator Agent must NOT suggest the downstream agent proceed.

---

# 4. Warnings Are Not Blocks

Warnings must be explicitly listed but do not stop the pipeline.

Rules:
- `warnings[]` must list all `warning`-severity findings.
- The `status` field must be `warn` if warnings exist and no failures.
- The Validator Agent must explicitly state the downstream agent may proceed with caution.

---

# 5. Semantic Cross-Reference Checks Are Mandatory

Schema compliance alone is not sufficient. Internal references must be consistent.

For `frontend-backend-handoff.json`:
- Every `form.page`, `table.page`, `action.page`, `upload.page` must reference a page name that exists in `pages[].name`.
- If `authFlows` includes `role-based-access`, at least one page must define `roles[]`.
- If any page has `requiresAuth: true`, `authFlows` must include a flow of type `login`.

For `repo-handoff.json`:
- If `backend.services[]` contains a service of type `worker`, `infrastructure.queue` must not be empty.
- If `project.repoType` is `monorepo`, `packages[]` must not be empty.
- If any integration is of type `payment`, `security.secretScanningEnabled` must be `true`.

Semantic violations are always blocking failures.

---

# 6. Security Baseline Checks Are Mandatory

Every validation run must include security checks.

For `frontend-backend-handoff.json`:
- If `authFlows` is non-empty, it must contain `login`.
- If `externalTriggers` includes `payment-webhook`, `assumptions[]` must mention signature verification.

For `repo-handoff.json`:
- `security.secretScanningEnabled` must be `true`. If `false`, raise a warning.
- `security.securityMdIncluded` must be `true`. If `false`, raise a warning.
- `security.gitignoreComprehensive` must be `true`. If `false`, raise a warning.
- `security.ciSecurityScanStep` must be `true`. If `false`, raise an info.

---

# 7. Assumptions Must Be Declared

Every handoff file must include declared assumptions.

Rules:
- `assumptions[]` must not be empty.
- If `assumptions` is empty or missing, raise a warning: the producing agent did not document its assumptions.

---

# 8. Fix Hints Must Be Actionable

When `/fix-hints` is requested, the Validator Agent must provide concrete, precise recommendations.

Rules:
- Each fix hint must reference the specific check ID.
- Each fix hint must state exactly what field needs to change.
- Each fix hint must include a corrected example where possible.
- Fix hints must never re-generate the handoff file.
- Fix hints must never introduce new features or content beyond correcting the violation.

---

# 9. Validation Report Is a Formal Artifact

The `validation-report.json` is a machine-readable artifact that may be consumed by CI systems or downstream agents.

Rules:
- `validatedAt` must be an ISO 8601 timestamp.
- `status` must be one of: `pass`, `warn`, `fail`.
- `summary.totalChecks` must equal the count of all entries in `checks[]`.
- `summary.passed + summary.warnings + summary.failures` must equal `summary.totalChecks`.

---

# 10. Separation of Concerns

The Validator Agent must not:
- Generate backend architectures.
- Generate repository structures.
- Modify handoff files directly.
- Add new entities, endpoints, or contracts.
- Suggest architectural improvements unrelated to the validation failure.

The Validator Agent must only:
- Validate.
- Report.
- Suggest targeted fixes for validation failures.

---

# 11. Idempotency

Running the same validation twice on the same file must produce the same result.

Rules:
- Validation logic must be deterministic.
- No external state should influence the result beyond the input file and its schema.

---

# 12. Validation Completeness

A validation run is not complete unless:
- All four check categories have been run: schema, semantic, security, completeness.
- A `validation-report.json` has been produced.
- The overall `status` is explicitly set.
- `blockingFailures[]` and `warnings[]` are populated (even if empty arrays).

---

# 13. Security Playbook Baseline

Every backend blueprint must demonstrate that the security.md playbook has been applied.

Rules for `frontend-backend-handoff.json`:
- If `forms[]` contains any field of type `email`, `phone`, `national_id`, or `card`, at least one assumption must reference field-level encryption.
- If `authFlows` is non-empty, at least one assumption must reference CORS configuration.
- If any page has `requiresAuth: false` AND processes user-submitted data, raise a warning about missing rate limiting.

Rules for `repo-handoff.json`:
- `security.securityMdIncluded` must be `true`. Failure is a blocking error.
- `security.ciSecurityScanStep` must be `true`. Failure is a warning.
- If any integration is `type: payment` or `type: auth`, `security.secretScanningEnabled` must be `true`. Failure is a blocking error.
- If the blueprint includes a `modules/admin` path or any admin endpoint, the blueprint must reference `IpBlockerService` or `SecurityAlertService`. Failure is a warning.

---

# 14. Data Classification Required

Any backend blueprint that includes PII-handling entities must declare data classification.

Rules for `frontend-backend-handoff.json`:
- If `forms[]` contains fields named or typed as `email`, `phone`, `address`, `dateOfBirth`, `nationalId`, `ssn`, `diagnosis`, `medication`, or `cardNumber`, at least one assumption must state the data classification tier (Confidential or Restricted).
- If a form contains health or medical fields, assumptions must reference PHI handling and HIPAA compliance. Failure is a warning.

Rules for `repo-handoff.json`:
- If `backend.entities[]` includes any entity with a name containing `Medical`, `Health`, `Patient`, `Prescription`, or `PHI`, a compliance assumption must be present. Failure is a blocking error.
- If the project stores financial PII (credit card, bank account), assumptions must reference PCI scope reduction (tokenization, no raw card storage). Failure is a warning.

---

# 15. Observability Baseline

Every production-bound blueprint must define minimum observability.

Rules for `frontend-backend-handoff.json`:
- If `pages[]` count is ≥ 3 or `actions[]` count is ≥ 2, assumptions must include a reference to structured logging or health check endpoints. Failure is a warning.

Rules for `repo-handoff.json`:
- If `backend.services[]` contains any service of type `api`, that service's endpoints must include `/health/live` and `/health/ready` (or an equivalent health route). Failure is a warning.
- If `backend.services[]` count is ≥ 2, assumptions must reference distributed tracing or correlation IDs. Failure is a warning. **Exception:** if `project.runtime = 'cloudflare-workers'` and `observability.distributedTracingNote` is declared, this check passes — CF Workers share infrastructure and Cloudflare Analytics covers cross-worker visibility.
- If `deploymentTarget` is set to any platform, assumptions must reference structured JSON logging. Failure is an info.

---

# 16. Resilience Baseline

If a blueprint includes external service integrations, resilience patterns must be declared.

Rules for `frontend-backend-handoff.json`:
- If `externalTriggers[]` contains any trigger of type `payment-webhook`, `email-send`, or `custom` (calling a 3rd-party API), at least one assumption must reference timeout, retry, or circuit breaker for that integration. Failure is a warning.

Rules for `repo-handoff.json`:
- If `integrations[]` contains any integration of type `payment`, `email`, or `llm`, `meta.playbooksApplied` must include `resilience.md` OR assumptions must explicitly state that resilience patterns are applied. Failure is a warning.
- If `integrations[]` includes a `payment` type and assumptions do not mention idempotency keys for retried payment calls, raise a warning about double-charge risk.

---

# 17. Edge Runtime Checks

When `project.runtime = 'cloudflare-workers'` or `project.deploymentTarget = 'cloudflare-workers'`, apply edge-specific validations.

Rules for `repo-handoff.json`:
- **No TCP Redis**: If `integrations[]` contains any `envVars` referencing `REDIS_URL` (standard TCP Redis client), raise a blocking error — TCP Redis does not work in CF Workers. Must use Upstash REST API (`UPSTASH_REDIS_REST_URL`).
- **D1 / Hyperdrive**: If `databases[]` declares type `postgresql` without a Hyperdrive binding, raise a warning — direct Postgres connections require CF Hyperdrive.
- **No Docker**: If `files.dockerfile` is declared for a CF Workers project, raise an info — CF Workers bundles via `wrangler deploy`, not Docker.
- **Migration tool**: If `databases[].migrationTool` is not `wrangler-d1` or `drizzle-kit`, raise a warning — `prisma migrate` and `alembic` target PostgreSQL/MySQL, not D1 SQLite.
- **Wrangler config**: `files.wranglerConfig` must be declared (e.g. `wrangler.toml`). Failure is a warning.

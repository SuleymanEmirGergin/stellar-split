# Validator Agent Examples

Worked examples showing how the `validator-agent` runs checks and produces `validation-report.json` for different handoff scenarios.

Each example shows:
- command used
- the handoff input (or relevant excerpt)
- the full validation-report.json output
- the gate decision

---

# Example 1 — PASS: Clean Frontend-Backend Handoff

## Command
```
/validate frontend-backend
```

## Scenario
A well-formed `frontend-backend-handoff.json` for a simple auth + profile system.
All required fields present, all cross-references valid, assumptions declared.

## Handoff Input (excerpt)
```json
{
  "project": { "name": "TaskFlow", "frontendStack": "Next.js" },
  "pages": [
    { "name": "Login", "route": "/login", "purpose": "User authentication", "requiresAuth": false },
    { "name": "Dashboard", "route": "/dashboard", "purpose": "Main app view", "requiresAuth": true, "roles": [] }
  ],
  "forms": [
    {
      "name": "LoginForm",
      "page": "Login",
      "submitAction": "POST /auth/login",
      "methodHint": "POST",
      "fields": [
        { "name": "email", "type": "email", "required": true },
        { "name": "password", "type": "password", "required": true }
      ]
    }
  ],
  "authFlows": [{ "type": "login" }, { "type": "logout" }],
  "tables": [],
  "actions": [],
  "uploads": [],
  "externalTriggers": [],
  "assumptions": ["No 2FA required in v1", "JWT stored in HttpOnly cookie"]
}
```

## Validation Report Output
```json
{
  "validatedFile": "frontend-backend-handoff.json",
  "validatedAt": "2025-01-15T14:30:00Z",
  "schema": "backend-integrator/frontend-backend-handoff.schema.json",
  "status": "pass",
  "summary": {
    "totalChecks": 8,
    "passed": 8,
    "warnings": 0,
    "failures": 0
  },
  "checks": [
    {
      "id": "schema-compliance",
      "category": "schema",
      "label": "JSON schema compliance",
      "status": "pass",
      "message": "All required fields present. No additional properties. All enum values valid.",
      "severity": "info"
    },
    {
      "id": "form-page-reference",
      "category": "semantic",
      "label": "Form page references",
      "status": "pass",
      "message": "LoginForm.page='Login' references a valid page in pages[].",
      "severity": "info"
    },
    {
      "id": "auth-protected-pages",
      "category": "semantic",
      "label": "Protected pages have login flow",
      "status": "pass",
      "message": "Dashboard has requiresAuth: true. authFlows includes 'login'. Consistent.",
      "severity": "info"
    },
    {
      "id": "auth-rbac-consistency",
      "category": "semantic",
      "label": "RBAC consistency",
      "status": "pass",
      "message": "No role-based-access authFlow. No RBAC checks required.",
      "severity": "info"
    },
    {
      "id": "security-payment-webhook",
      "category": "security",
      "label": "Webhook signature verification",
      "status": "pass",
      "message": "No payment-webhook in externalTriggers. No signature check required.",
      "severity": "info"
    },
    {
      "id": "security-auth-coverage",
      "category": "security",
      "label": "Auth flow completeness",
      "status": "pass",
      "message": "authFlows includes login and logout. Coverage sufficient.",
      "severity": "info"
    },
    {
      "id": "completeness-assumptions",
      "category": "completeness",
      "label": "Assumptions declared",
      "status": "pass",
      "message": "assumptions[] contains 2 items. Agent declared its decisions.",
      "severity": "info"
    },
    {
      "id": "completeness-project-name",
      "category": "completeness",
      "label": "Project name defined",
      "status": "pass",
      "message": "project.name = 'TaskFlow'. Valid.",
      "severity": "info"
    }
  ],
  "blockingFailures": [],
  "warnings": [],
  "meta": {
    "pipelineStage": "frontend-to-backend",
    "commandUsed": "/validate frontend-backend"
  }
}
```

## Gate Decision
✅ **Status: PASS** — Backend Integrator Agent may proceed.

---

# Example 2 — WARN: Repo Handoff with Missing Security Flags

## Command
```
/validate repo
```

## Scenario
A `repo-handoff.json` for a monorepo project where the security baseline is incomplete.
Secrets scanning is not enabled, SECURITY.md was not included.
These are non-blocking but should be acknowledged.

## Handoff Input (excerpt)
```json
{
  "meta": {
    "generatedBy": "repo-builder-agent",
    "generatedAt": "2025-01-15T15:00:00Z",
    "modeUsed": "/scaffold"
  },
  "project": { "name": "TaskFlow", "repoType": "monorepo" },
  "frontend": { "framework": "Next.js", "apps": [{ "name": "web", "path": "apps/web" }] },
  "backend": {
    "framework": "NestJS",
    "language": "typescript",
    "services": [{ "name": "api", "path": "apps/api", "type": "api" }],
    "database": "PostgreSQL",
    "orm": "Prisma",
    "auth": "JWT"
  },
  "integrations": [],
  "infrastructure": {
    "containerization": "docker-compose",
    "cicd": "github-actions"
  },
  "security": {
    "secretScanningEnabled": false,
    "securityMdIncluded": false,
    "ciSecurityScanStep": false,
    "gitignoreComprehensive": true
  },
  "packages": [{ "name": "@taskflow/types", "path": "packages/types", "purpose": "types", "consumedBy": ["api", "web"] }],
  "assumptions": ["No worker service in v1"]
}
```

## Validation Report Output
```json
{
  "validatedFile": "repo-handoff.json",
  "validatedAt": "2025-01-15T15:05:00Z",
  "schema": "repo-builder-agent/repo-handoff.schema.json",
  "status": "warn",
  "summary": {
    "totalChecks": 9,
    "passed": 6,
    "warnings": 3,
    "failures": 0
  },
  "checks": [
    {
      "id": "schema-compliance",
      "category": "schema",
      "label": "JSON schema compliance",
      "status": "pass",
      "message": "All required fields present. Schema valid.",
      "severity": "info"
    },
    {
      "id": "monorepo-packages",
      "category": "semantic",
      "label": "Monorepo has shared packages",
      "status": "pass",
      "message": "project.repoType is 'monorepo' and packages[] contains 1 item. Consistent.",
      "severity": "info"
    },
    {
      "id": "worker-queue-consistency",
      "category": "semantic",
      "label": "Worker service requires queue",
      "status": "pass",
      "message": "No worker service in backend.services[]. No queue check required.",
      "severity": "info"
    },
    {
      "id": "meta-timestamp",
      "category": "schema",
      "label": "generatedAt is valid ISO 8601",
      "status": "pass",
      "message": "meta.generatedAt = '2025-01-15T15:00:00Z'. Valid.",
      "severity": "info"
    },
    {
      "id": "completeness-assumptions",
      "category": "completeness",
      "label": "Assumptions declared",
      "status": "pass",
      "message": "assumptions[] contains 1 item.",
      "severity": "info"
    },
    {
      "id": "security-gitignore",
      "category": "security",
      "label": "Comprehensive .gitignore",
      "status": "pass",
      "message": "security.gitignoreComprehensive = true.",
      "severity": "info"
    },
    {
      "id": "security-secret-scanning",
      "category": "security",
      "label": "Secret scanning enabled",
      "status": "warn",
      "message": "security.secretScanningEnabled = false. .gitleaks.toml or equivalent is missing. Secrets may accidentally be committed.",
      "severity": "warning"
    },
    {
      "id": "security-security-md",
      "category": "security",
      "label": "SECURITY.md included",
      "status": "warn",
      "message": "security.securityMdIncluded = false. SECURITY.md is missing. Vulnerability reporting path is undefined.",
      "severity": "warning"
    },
    {
      "id": "security-ci-scan",
      "category": "security",
      "label": "CI security scan step",
      "status": "warn",
      "message": "security.ciSecurityScanStep = false. No security scanning step in CI pipeline. Recommended: npm audit or trivy.",
      "severity": "warning"
    }
  ],
  "blockingFailures": [],
  "warnings": ["security-secret-scanning", "security-security-md", "security-ci-scan"],
  "meta": {
    "pipelineStage": "backend-to-repo",
    "commandUsed": "/validate repo"
  }
}
```

## Gate Decision
⚠️ **Status: WARN** — Repo Builder Agent may proceed, but the following must be addressed before production:
1. Add `.gitleaks.toml` to the repository root
2. Add `SECURITY.md` with vulnerability reporting instructions
3. Add a `pnpm audit` or `npm audit` step to the CI workflow

---

# Example 3 — FAIL: Broken Semantic References

## Command
```
/validate frontend-backend
```

## Scenario
A `frontend-backend-handoff.json` where form page references point to pages that don't exist,
and a protected page exists without a login auth flow.
These are blocking errors — the Backend Integrator Agent must not proceed.

## Handoff Input (excerpt, with errors)
```json
{
  "project": { "name": "ShopNow" },
  "pages": [
    { "name": "ProductList", "route": "/products", "purpose": "Browse products", "requiresAuth": false },
    { "name": "AdminPanel", "route": "/admin", "purpose": "Admin dashboard", "requiresAuth": true }
  ],
  "forms": [
    {
      "name": "CreateProductForm",
      "page": "CreateProduct",
      "submitAction": "POST /products",
      "methodHint": "POST",
      "fields": [
        { "name": "name", "type": "text", "required": true }
      ]
    }
  ],
  "authFlows": [{ "type": "register" }],
  "tables": [],
  "actions": [],
  "uploads": [],
  "externalTriggers": [],
  "assumptions": []
}
```

## Validation Report Output
```json
{
  "validatedFile": "frontend-backend-handoff.json",
  "validatedAt": "2025-01-15T16:00:00Z",
  "schema": "backend-integrator/frontend-backend-handoff.schema.json",
  "status": "fail",
  "summary": {
    "totalChecks": 7,
    "passed": 3,
    "warnings": 1,
    "failures": 3
  },
  "checks": [
    {
      "id": "schema-compliance",
      "category": "schema",
      "label": "JSON schema compliance",
      "status": "pass",
      "message": "All required top-level fields present. No schema violations.",
      "severity": "info"
    },
    {
      "id": "form-page-reference",
      "category": "semantic",
      "label": "Form page references",
      "status": "fail",
      "message": "CreateProductForm.page = 'CreateProduct' does not match any name in pages[]. Valid page names: ['ProductList', 'AdminPanel'].",
      "severity": "error",
      "field": "forms[0].page"
    },
    {
      "id": "auth-protected-pages",
      "category": "semantic",
      "label": "Protected pages have login flow",
      "status": "fail",
      "message": "AdminPanel has requiresAuth: true, but authFlows[] does not include 'login'. Users cannot authenticate to access this page.",
      "severity": "error",
      "field": "authFlows"
    },
    {
      "id": "auth-rbac-consistency",
      "category": "semantic",
      "label": "RBAC consistency",
      "status": "pass",
      "message": "No role-based-access authFlow. No RBAC checks required.",
      "severity": "info"
    },
    {
      "id": "security-payment-webhook",
      "category": "security",
      "label": "Webhook signature verification",
      "status": "pass",
      "message": "No payment-webhook in externalTriggers.",
      "severity": "info"
    },
    {
      "id": "completeness-assumptions",
      "category": "completeness",
      "label": "Assumptions declared",
      "status": "fail",
      "message": "assumptions[] is empty. The producing agent must declare all decisions and inferences made during handoff generation.",
      "severity": "error",
      "field": "assumptions"
    },
    {
      "id": "completeness-read-only-warning",
      "category": "completeness",
      "label": "System appears read-only",
      "status": "warn",
      "message": "forms[] contains 0 valid references and actions[] is empty. If this is intentional (read-only API), declare it in assumptions.",
      "severity": "warning"
    }
  ],
  "blockingFailures": [
    "form-page-reference",
    "auth-protected-pages",
    "completeness-assumptions"
  ],
  "warnings": ["completeness-read-only-warning"],
  "fixHints": [
    {
      "checkId": "form-page-reference",
      "problem": "CreateProductForm.page = 'CreateProduct' but no page named 'CreateProduct' exists in pages[].",
      "fix": "Either add a page named 'CreateProduct' to pages[], or change CreateProductForm.page to match an existing page name.",
      "example": "{ \"name\": \"CreateProduct\", \"route\": \"/admin/products/create\", \"purpose\": \"Admin product creation form\", \"requiresAuth\": true }"
    },
    {
      "checkId": "auth-protected-pages",
      "problem": "AdminPanel requires auth but no login authFlow is defined.",
      "fix": "Add a login authFlow to authFlows[].",
      "example": "{ \"type\": \"login\", \"protectedPages\": [\"AdminPanel\"] }"
    },
    {
      "checkId": "completeness-assumptions",
      "problem": "assumptions[] is empty.",
      "fix": "Add at least one assumption that documents decisions made during handoff generation.",
      "example": "\"assumptions\": [\"Admin-only pages require JWT auth\", \"No 2FA in v1\"]"
    }
  ],
  "meta": {
    "pipelineStage": "frontend-to-backend",
    "commandUsed": "/validate frontend-backend"
  }
}
```

## Gate Decision
🚫 **Status: FAIL** — Backend Integrator Agent must **not** proceed.

3 blocking failures must be resolved:
1. **`forms[0].page`** — `CreateProduct` page does not exist in `pages[]`
2. **`authFlows`** — `login` flow missing but `AdminPanel` requires authentication
3. **`assumptions`** — Empty; the producing agent must declare its decisions

Return this report to the producing agent and request a corrected handoff file.

---

# Example 4 — FAIL + /fix-hints: Worker Without Queue

## Command
```
/validate repo
```

## Scenario
A `repo-handoff.json` where a worker service exists but no queue system is defined.
This is a blocking semantic failure — a worker cannot function without a queue.

## Handoff Input (relevant excerpt)
```json
{
  "backend": {
    "framework": "NestJS",
    "language": "typescript",
    "services": [
      { "name": "api", "path": "apps/api", "type": "api" },
      { "name": "worker", "path": "apps/worker", "type": "worker" }
    ]
  },
  "infrastructure": {
    "containerization": "docker-compose",
    "cicd": "github-actions"
  }
}
```

## Relevant Check in Report
```json
{
  "id": "worker-queue-consistency",
  "category": "semantic",
  "label": "Worker service requires queue definition",
  "status": "fail",
  "message": "backend.services[] contains a service of type 'worker' (apps/worker), but infrastructure.queue is not defined. A worker without a queue system cannot function.",
  "severity": "error",
  "field": "infrastructure.queue"
}
```

## Fix Hint (from /fix-hints)
```
Check: worker-queue-consistency
Problem: A worker service exists but infrastructure.queue is undefined.
Fix: Add infrastructure.queue to the repo-handoff.json with your chosen queue system.
Example:
{
  "infrastructure": {
    "queue": "BullMQ",
    "cache": "Redis",
    "containerization": "docker-compose",
    "cicd": "github-actions"
  }
}
```

## Gate Decision
🚫 **Status: FAIL** — Repo Builder Agent must not finalize output.

The `infrastructure.queue` field is required when a worker service is present.

---

# Example 5 — WARN: PII Form Without Encryption Assumption (Rule 13)

## Command
```
/validate frontend-backend
```

## Scenario
A health clinic app where patients fill in their personal details — email, phone, and national ID.
The handoff is structurally valid, but no assumption declares that these PII fields will be encrypted at rest.
Rule 13 fires as a warning: the security.md field-level encryption requirement was not acknowledged.

## Handoff Input (excerpt)
```json
{
  "project": { "name": "ClinicPortal", "frontendStack": "Next.js" },
  "pages": [
    { "name": "Login", "route": "/login", "requiresAuth": false },
    { "name": "PatientProfile", "route": "/profile", "requiresAuth": true },
    { "name": "AppointmentBook", "route": "/book", "requiresAuth": true }
  ],
  "forms": [
    {
      "name": "PatientRegistrationForm",
      "page": "PatientProfile",
      "submitAction": "POST /patients",
      "methodHint": "POST",
      "fields": [
        { "name": "email", "type": "email", "required": true },
        { "name": "phone", "type": "tel", "required": true },
        { "name": "nationalId", "type": "text", "required": true },
        { "name": "dateOfBirth", "type": "date", "required": true }
      ]
    }
  ],
  "authFlows": [{ "type": "login" }, { "type": "logout" }],
  "tables": [],
  "actions": [],
  "uploads": [],
  "externalTriggers": [],
  "assumptions": [
    "JWT stored in HttpOnly cookie",
    "Appointments require confirmed auth",
    "No payment flow in v1"
  ]
}
```

## Validation Report Output
```json
{
  "validatedFile": "frontend-backend-handoff.json",
  "validatedAt": "2026-04-02T10:00:00Z",
  "schema": "backend-integrator/frontend-backend-handoff.schema.json",
  "status": "warn",
  "summary": {
    "totalChecks": 10,
    "passed": 8,
    "warnings": 2,
    "failures": 0
  },
  "checks": [
    {
      "id": "schema-compliance",
      "category": "schema",
      "label": "JSON schema compliance",
      "status": "pass",
      "message": "All required fields present. Schema valid.",
      "severity": "info"
    },
    {
      "id": "form-page-reference",
      "category": "semantic",
      "label": "Form page references",
      "status": "pass",
      "message": "PatientRegistrationForm.page='PatientProfile' is a valid page reference.",
      "severity": "info"
    },
    {
      "id": "auth-protected-pages",
      "category": "semantic",
      "label": "Protected pages have login flow",
      "status": "pass",
      "message": "PatientProfile and AppointmentBook require auth. authFlows includes 'login'. Consistent.",
      "severity": "info"
    },
    {
      "id": "auth-rbac-consistency",
      "category": "semantic",
      "label": "RBAC consistency",
      "status": "pass",
      "message": "No role-based-access authFlow. No RBAC checks required.",
      "severity": "info"
    },
    {
      "id": "security-payment-webhook",
      "category": "security",
      "label": "Webhook signature verification",
      "status": "pass",
      "message": "No payment-webhook in externalTriggers. No signature check required.",
      "severity": "info"
    },
    {
      "id": "security-auth-coverage",
      "category": "security",
      "label": "Auth flow completeness",
      "status": "pass",
      "message": "authFlows includes login and logout. Coverage sufficient.",
      "severity": "info"
    },
    {
      "id": "security-cors-assumption",
      "category": "security",
      "label": "CORS assumption declared (Rule 13)",
      "status": "pass",
      "message": "authFlows is non-empty and assumptions[] mentions auth. CORS acknowledgment inferred.",
      "severity": "info"
    },
    {
      "id": "security-pii-encryption",
      "category": "security",
      "label": "PII field encryption acknowledged (Rule 13)",
      "status": "warn",
      "message": "PatientRegistrationForm contains PII fields: email (type: email), phone (type: tel), nationalId (type: text). None of the 3 assumptions reference field-level encryption. Apply security.md Section 5 (AES-256-GCM field encryption) and declare it as an assumption.",
      "severity": "warning",
      "field": "forms[0].fields, assumptions"
    },
    {
      "id": "security-observability",
      "category": "security",
      "label": "Observability baseline (Rule 15)",
      "status": "warn",
      "message": "3 pages and 1 form detected. No assumption references structured logging or health check endpoints. Apply observability.md and declare minimum baseline.",
      "severity": "warning",
      "field": "assumptions"
    },
    {
      "id": "completeness-assumptions",
      "category": "completeness",
      "label": "Assumptions declared",
      "status": "pass",
      "message": "assumptions[] contains 3 items. Agent declared decisions.",
      "severity": "info"
    }
  ],
  "blockingFailures": [],
  "warnings": ["security-pii-encryption", "security-observability"],
  "meta": {
    "pipelineStage": "frontend-to-backend",
    "commandUsed": "/validate frontend-backend"
  }
}
```

## Gate Decision
⚠️ **Status: WARN** — Backend Integrator Agent may proceed, but must address before `/assemble`:

1. **`security-pii-encryption`** — `email`, `phone`, `nationalId` are PII fields. Add to assumptions: `"PII fields (email, phone, nationalId) encrypted at rest using AES-256-GCM (security.md Section 5)"`.
2. **`security-observability`** — Add to assumptions: `"Structured JSON logging with Pino, /health/live and /health/ready endpoints (observability.md)"`.

---

# Example 6 — FAIL: PHI Entity Without Compliance Assumption (Rules 14 + 15)

## Command
```
/validate repo
```

## Scenario
A telemedicine platform repo-handoff where the backend defines a `MedicalRecord` entity
(Protected Health Information under HIPAA), but no compliance assumption is present.
Rule 14 fires as a blocking error. Additionally, the API service defines no health endpoints,
and there is no structured logging assumption — Rule 15 fires two warnings.

## Handoff Input (excerpt)
```json
{
  "meta": {
    "generatedBy": "repo-builder-agent",
    "generatedAt": "2026-04-02T11:00:00Z",
    "modeUsed": "/scaffold"
  },
  "project": { "name": "TeleMed", "repoType": "monorepo" },
  "frontend": {
    "framework": "Next.js",
    "apps": [{ "name": "web", "path": "apps/web" }]
  },
  "backend": {
    "framework": "NestJS",
    "language": "typescript",
    "services": [
      { "name": "api", "path": "apps/api", "type": "api" },
      { "name": "worker", "path": "apps/worker", "type": "worker" }
    ],
    "entities": ["User", "MedicalRecord", "Appointment", "Prescription"],
    "database": "PostgreSQL",
    "orm": "Prisma",
    "auth": "JWT"
  },
  "integrations": [
    { "type": "payment", "provider": "Stripe" }
  ],
  "infrastructure": {
    "containerization": "docker-compose",
    "queue": "BullMQ",
    "cicd": "github-actions"
  },
  "security": {
    "secretScanningEnabled": true,
    "securityMdIncluded": true,
    "ciSecurityScanStep": true,
    "gitignoreComprehensive": true
  },
  "packages": [{ "name": "@telemed/types", "path": "packages/types", "purpose": "types", "consumedBy": ["api", "web"] }],
  "assumptions": [
    "Worker handles appointment reminder emails",
    "Stripe handles payment processing"
  ]
}
```

## Validation Report Output
```json
{
  "validatedFile": "repo-handoff.json",
  "validatedAt": "2026-04-02T11:05:00Z",
  "schema": "repo-builder-agent/repo-handoff.schema.json",
  "status": "fail",
  "summary": {
    "totalChecks": 12,
    "passed": 8,
    "warnings": 2,
    "failures": 2
  },
  "checks": [
    {
      "id": "schema-compliance",
      "category": "schema",
      "label": "JSON schema compliance",
      "status": "pass",
      "message": "All required fields present. Schema valid.",
      "severity": "info"
    },
    {
      "id": "monorepo-packages",
      "category": "semantic",
      "label": "Monorepo has shared packages",
      "status": "pass",
      "message": "repoType = 'monorepo' and packages[] has 1 item. Consistent.",
      "severity": "info"
    },
    {
      "id": "worker-queue-consistency",
      "category": "semantic",
      "label": "Worker service requires queue",
      "status": "pass",
      "message": "Worker service detected. infrastructure.queue = 'BullMQ'. Consistent.",
      "severity": "info"
    },
    {
      "id": "security-secret-scanning",
      "category": "security",
      "label": "Secret scanning enabled",
      "status": "pass",
      "message": "security.secretScanningEnabled = true.",
      "severity": "info"
    },
    {
      "id": "security-security-md",
      "category": "security",
      "label": "SECURITY.md included",
      "status": "pass",
      "message": "security.securityMdIncluded = true.",
      "severity": "info"
    },
    {
      "id": "security-ci-scan",
      "category": "security",
      "label": "CI security scan step",
      "status": "pass",
      "message": "security.ciSecurityScanStep = true.",
      "severity": "info"
    },
    {
      "id": "security-payment-secret-scanning",
      "category": "security",
      "label": "Payment integration requires secret scanning (Rule 13)",
      "status": "pass",
      "message": "integrations contains type 'payment'. security.secretScanningEnabled = true. Requirement met.",
      "severity": "info"
    },
    {
      "id": "completeness-assumptions",
      "category": "completeness",
      "label": "Assumptions declared",
      "status": "pass",
      "message": "assumptions[] contains 2 items.",
      "severity": "info"
    },
    {
      "id": "data-classification-phi",
      "category": "security",
      "label": "PHI entity requires compliance assumption (Rule 14)",
      "status": "fail",
      "message": "backend.entities[] contains 'MedicalRecord' — a PHI-bearing entity under HIPAA. No assumption references HIPAA compliance, PHI handling, or data classification tier. Compliance must be explicitly declared before this handoff can be consumed.",
      "severity": "error",
      "field": "backend.entities, assumptions"
    },
    {
      "id": "data-classification-prescription",
      "category": "security",
      "label": "PHI entity 'Prescription' requires compliance assumption (Rule 14)",
      "status": "fail",
      "message": "backend.entities[] contains 'Prescription' — also a PHI-bearing entity. Same HIPAA compliance assumption applies.",
      "severity": "error",
      "field": "backend.entities, assumptions"
    },
    {
      "id": "observability-health-endpoints",
      "category": "completeness",
      "label": "API service requires health endpoints (Rule 15)",
      "status": "warn",
      "message": "backend.services[] contains 'api' (type: api), but no assumption references /health/live or /health/ready endpoints. Apply observability.md Section 4.",
      "severity": "warning",
      "field": "assumptions"
    },
    {
      "id": "observability-structured-logging",
      "category": "completeness",
      "label": "Production deployment requires structured logging (Rule 15)",
      "status": "warn",
      "message": "infrastructure.cicd is set ('github-actions'), implying production deployment intent. No assumption references structured JSON logging. Apply observability.md Section 2.",
      "severity": "warning",
      "field": "assumptions"
    }
  ],
  "blockingFailures": ["data-classification-phi", "data-classification-prescription"],
  "warnings": ["observability-health-endpoints", "observability-structured-logging"],
  "fixHints": [
    {
      "checkId": "data-classification-phi",
      "problem": "MedicalRecord and Prescription entities contain HIPAA PHI. No compliance assumption present.",
      "fix": "Add a compliance assumption to assumptions[] that declares HIPAA scope, PHI classification tier, and BAA requirements.",
      "example": "\"MedicalRecord and Prescription entities classified as Restricted (Tier 4 PHI). HIPAA technical safeguards applied: field-level encryption (AES-256-GCM), audit log on every PHI read, minimum necessary access, BAA required for all third-party services (compliance.md)\""
    },
    {
      "checkId": "observability-health-endpoints",
      "problem": "No health endpoint assumption declared for the API service.",
      "fix": "Add to assumptions: health endpoints and structured logging baseline.",
      "example": "\"/health/live and /health/ready endpoints defined. Pino structured JSON logging with correlation IDs. Sentry for error tracking (observability.md)\""
    }
  ],
  "meta": {
    "pipelineStage": "backend-to-repo",
    "commandUsed": "/validate repo"
  }
}
```

## Gate Decision
🚫 **Status: FAIL** — Repo Builder Agent must **not** proceed.

2 blocking failures must be resolved:
1. **`data-classification-phi`** — `MedicalRecord` is HIPAA PHI. Declare HIPAA compliance tier, encryption, BAA requirements in assumptions.
2. **`data-classification-prescription`** — `Prescription` is also HIPAA PHI. Same compliance assumption covers both.

Plus 2 warnings to address before production:
- Add `/health/live` + `/health/ready` endpoints to the blueprint.
- Add structured JSON logging assumption.

---

# Summary Table

| Example | File Validated | Status | Key Finding |
|---|---|---|---|
| 1 | `frontend-backend-handoff.json` | ✅ PASS | All 10 checks passed |
| 2 | `repo-handoff.json` | ⚠️ WARN | Security baseline incomplete (3 warnings) |
| 3 | `frontend-backend-handoff.json` | 🚫 FAIL | Broken page refs + missing login + empty assumptions |
| 4 | `repo-handoff.json` | 🚫 FAIL | Worker without queue system |
| 5 | `frontend-backend-handoff.json` | ⚠️ WARN | PII fields without encryption assumption (Rule 13) + missing observability (Rule 15) |
| 6 | `repo-handoff.json` | 🚫 FAIL | PHI entities without HIPAA compliance assumption (Rule 14) |
| 7 | `repo-handoff.json` | ✅ PASS (1 warn) | TeleMed — HIPAA `repo-handoff.json` after compliance.md applied. Rule 14 PASS, Rule 15 WARN (distributed tracing). |

---

# Example 7 — PASS + WARN: HIPAA Repo Handoff After Compliance.md Applied (Rule 14 + Rule 15)

## Command
```
/validate repo
```

## Scenario
The same TeleMed telemedicine project from Example 6, but this time the Backend Integrator has applied `compliance.md` and `security.md`. The `repo-handoff.json` now includes a `compliance{}` block with all HIPAA requirements declared, and a `security{}` block with PII encryption confirmed.

Rule 14 now PASSES (PHI entities are addressed). Rule 15 fires a single warning — distributed tracing deferred to v1.1 because api and worker share the same database and cross-service call volume is low in v1.

This is the expected outcome after the Backend Integrator fixes the issues identified in Example 6.

## What Changed From Example 6

| Field | Example 6 (FAIL) | Example 7 (PASS) |
|---|---|---|
| `compliance` block | Missing | Present |
| `compliance.hipaaCompliant` | Not set | `true` |
| `compliance.phiEntitiesEncrypted` | Not set | `true` |
| `compliance.phiAuditLogging` | Not set | `true` |
| `security.piiFieldsEncrypted` | Not set | `true` |
| `security.securityMdIncluded` | `false` | `true` |
| `observability.healthEndpointsPlanned` | Not set | `true` |
| Overall status | `fail` | `pass` (1 warning) |

## Handoff Input (relevant fields)
```json
{
  "meta": {
    "generatedBy": "backend-integrator-agent",
    "generatedAt": "2026-04-02T10:15:00Z",
    "modeUsed": "/blueprint",
    "schemaVersion": "2.1.0",
    "playbooksApplied": ["security.md", "compliance.md", "observability.md", "auth.md"]
  },
  "project": {
    "name": "TeleMed",
    "repoType": "monorepo",
    "deploymentTarget": "fly-io"
  },
  "backend": {
    "framework": "Django REST Framework",
    "language": "python",
    "services": [
      { "name": "api", "path": "apps/api", "type": "api" },
      { "name": "worker", "path": "apps/worker", "type": "worker" }
    ],
    "database": "PostgreSQL 16",
    "auth": "JWT (access 15min + refresh HttpOnly cookie 7d, TOTP for doctor/admin)"
  },
  "security": {
    "secretScanningEnabled": true,
    "securityMdIncluded": true,
    "ciSecurityScanStep": true,
    "gitignoreComprehensive": true,
    "corsWhitelistConfigured": true,
    "piiFieldsEncrypted": true,
    "fieldEncryptionAlgorithm": "AES-256-GCM"
  },
  "compliance": {
    "scope": "HIPAA",
    "hipaaCompliant": true,
    "phiEntities": ["MedicalRecord", "Prescription", "Diagnosis"],
    "phiEntitiesEncrypted": true,
    "phiAuditLogging": true,
    "minimumNecessaryEnforced": true,
    "baaRequired": true,
    "baaVendors": ["AWS S3", "Daily.co", "Resend", "Twilio"],
    "dataRetentionYears": 7,
    "incidentResponseTimeline": "60 days (HIPAA breach notification rule)"
  },
  "observability": {
    "structuredLogging": true,
    "loggingLibrary": "structlog",
    "correlationId": true,
    "healthEndpointsPlanned": true,
    "healthLive": "/health/live",
    "healthReady": "/health/ready",
    "prometheusMetrics": true,
    "sentryEnabled": true,
    "distributedTracing": false,
    "distributedTracingNote": "OTel tracing deferred to v1.1 — api and worker share same DB, low cross-service call volume in v1"
  }
}
```

## Validation Report Output
```json
{
  "validatedFile": "repo-handoff.json",
  "validatedAt": "2026-04-02T10:18:00Z",
  "schema": "repo-builder-agent/repo-handoff.schema.json",
  "status": "pass",
  "summary": {
    "totalChecks": 20,
    "passed": 19,
    "warnings": 1,
    "failures": 0
  },
  "checks": [
    {
      "id": "schema-required-fields",
      "category": "schema",
      "label": "Required top-level fields present",
      "status": "pass",
      "message": "All 8 required fields present: meta, project, frontend, backend, integrations, infrastructure, security, packages.",
      "severity": "info"
    },
    {
      "id": "schema-meta-timestamp",
      "category": "schema",
      "label": "meta.generatedAt is valid ISO 8601",
      "status": "pass",
      "message": "meta.generatedAt = '2026-04-02T10:15:00Z'. Valid.",
      "severity": "info"
    },
    {
      "id": "schema-meta-mode",
      "category": "schema",
      "label": "meta.modeUsed is valid enum",
      "status": "pass",
      "message": "meta.modeUsed = '/blueprint'. Valid.",
      "severity": "info"
    },
    {
      "id": "schema-deployment-target",
      "category": "schema",
      "label": "project.deploymentTarget is valid enum",
      "status": "pass",
      "message": "project.deploymentTarget = 'fly-io'. Valid.",
      "severity": "info"
    },
    {
      "id": "semantic-worker-queue",
      "category": "semantic",
      "label": "Worker service requires queue definition",
      "status": "pass",
      "message": "backend.services[] contains 'worker' (apps/worker). infrastructure.queue = 'Celery+Redis'. Consistent.",
      "severity": "info"
    },
    {
      "id": "semantic-monorepo-packages",
      "category": "semantic",
      "label": "Monorepo has shared packages",
      "status": "pass",
      "message": "project.repoType = 'monorepo'. packages[] contains 2 items. Consistent.",
      "severity": "info"
    },
    {
      "id": "semantic-payment-secret-scanning",
      "category": "semantic",
      "label": "Payment/auth integration requires secret scanning",
      "status": "pass",
      "message": "No payment integration. Video webhook present (Daily.co). security.secretScanningEnabled = true. Consistent.",
      "severity": "info"
    },
    {
      "id": "completeness-assumptions",
      "category": "completeness",
      "label": "Assumptions declared",
      "status": "pass",
      "message": "assumptions[] contains 12 items covering PHI encryption, BAA vendors, Fly.io deployment, key rotation, structlog redaction.",
      "severity": "info"
    },
    {
      "id": "rule13-security-md",
      "category": "security-playbook",
      "label": "SECURITY.md included (Rule 13)",
      "status": "pass",
      "message": "security.securityMdIncluded = true.",
      "severity": "info"
    },
    {
      "id": "rule13-pii-encryption",
      "category": "security-playbook",
      "label": "PII field encryption declared (Rule 13)",
      "status": "pass",
      "message": "security.piiFieldsEncrypted = true. security.fieldEncryptionAlgorithm = 'AES-256-GCM'. assumptions[] confirms PHI fields encrypted before DB write.",
      "severity": "info"
    },
    {
      "id": "rule13-cors-whitelist",
      "category": "security-playbook",
      "label": "CORS whitelist configured (Rule 13)",
      "status": "pass",
      "message": "security.corsWhitelistConfigured = true.",
      "severity": "info"
    },
    {
      "id": "rule14-phi-scope",
      "category": "data-classification",
      "label": "HIPAA compliance scope declared (Rule 14)",
      "status": "pass",
      "message": "compliance.scope = 'HIPAA'. compliance.hipaaCompliant = true. All HIPAA technical safeguards declared.",
      "severity": "info"
    },
    {
      "id": "rule14-phi-encrypted",
      "category": "data-classification",
      "label": "PHI entities encrypted (Rule 14)",
      "status": "pass",
      "message": "compliance.phiEntities = ['MedicalRecord', 'Prescription', 'Diagnosis']. compliance.phiEntitiesEncrypted = true. AES-256-GCM confirmed in security block.",
      "severity": "info"
    },
    {
      "id": "rule14-phi-audit-log",
      "category": "data-classification",
      "label": "PHI audit logging declared (Rule 14)",
      "status": "pass",
      "message": "compliance.phiAuditLogging = true. assumptions[] confirms audit_log table with actor_id, action, entity_type, entity_id, ip_address, timestamp.",
      "severity": "info"
    },
    {
      "id": "rule14-baa-required",
      "category": "data-classification",
      "label": "BAA requirement documented (Rule 14)",
      "status": "pass",
      "message": "compliance.baaRequired = true. compliance.baaVendors = ['AWS S3', 'Daily.co', 'Resend', 'Twilio']. Pre-launch action noted.",
      "severity": "info"
    },
    {
      "id": "rule15-health-endpoints",
      "category": "observability",
      "label": "Health endpoints planned (Rule 15)",
      "status": "pass",
      "message": "observability.healthEndpointsPlanned = true. observability.healthLive = '/health/live'. observability.healthReady = '/health/ready'. Both liveness and readiness probes defined.",
      "severity": "info"
    },
    {
      "id": "rule15-structured-logging",
      "category": "observability",
      "label": "Structured logging configured (Rule 15)",
      "status": "pass",
      "message": "observability.structuredLogging = true. observability.loggingLibrary = 'structlog'. observability.correlationId = true.",
      "severity": "info"
    },
    {
      "id": "rule15-sentry",
      "category": "observability",
      "label": "Error tracking configured (Rule 15)",
      "status": "pass",
      "message": "observability.sentryEnabled = true. assumptions[] confirms Sentry beforeSend strips PHI (patientName, ssn, diagnosis) before transmission.",
      "severity": "info"
    },
    {
      "id": "rule15-metrics",
      "category": "observability",
      "label": "Prometheus metrics enabled (Rule 15)",
      "status": "pass",
      "message": "observability.prometheusMetrics = true.",
      "severity": "info"
    },
    {
      "id": "rule15-distributed-tracing",
      "category": "observability",
      "label": "Distributed tracing for multi-service (Rule 15)",
      "status": "warn",
      "message": "2 backend services detected (api, worker). observability.distributedTracing = false. Deferred to v1.1 per: 'OTel tracing deferred to v1.1 — api and worker share same DB, low cross-service call volume in v1'. Proceed with caution.",
      "severity": "warning",
      "fixHint": "Add opentelemetry-sdk + opentelemetry-exporter-otlp-proto-http to both apps/api and apps/worker. Use Celery task headers for trace context propagation. Configure OTLP_ENDPOINT in .env.example."
    }
  ],
  "blockingFailures": [],
  "warnings": [
    {
      "id": "rule15-distributed-tracing",
      "severity": "warn",
      "message": "Distributed tracing deferred to v1.1. 2 services (api, worker) lack OTel instrumentation.",
      "fixHint": "Add opentelemetry-sdk to both services before v1.1 launch."
    }
  ],
  "meta": {
    "validatorVersion": "1.5.0",
    "pipelineStage": "backend-to-repo",
    "commandUsed": "/validate repo"
  }
}
```

## Gate Decision
✅ **Status: PASS** — Repo Builder Agent may proceed.

1 warning acknowledged — distributed tracing is deferred to v1.1 with a documented rationale. This is acceptable for initial launch.

**Contrast with Example 6:** Adding the `compliance{}` block resolved all 3 blocking failures. Rule 14 now passes completely. The only remaining issue (Rule 15 distributed tracing) is non-blocking.

### Fix Applied (from Example 6's fix hints)

```json
"compliance": {
  "scope": "HIPAA",
  "hipaaCompliant": true,
  "phiEntities": ["MedicalRecord", "Prescription", "Diagnosis"],
  "phiEntitiesEncrypted": true,
  "phiAuditLogging": true,
  "baaRequired": true
}
```

And in `security`:
```json
"securityMdIncluded": true,
"piiFieldsEncrypted": true,
"fieldEncryptionAlgorithm": "AES-256-GCM"
```

These additions — taken directly from the fix hints in Example 6 — are sufficient to move from `fail` to `pass`.

---

# Example 8 — PASS: Edge Runtime (Hono + Cloudflare Workers)

## Command
```
/validate repo
```

## Scenario
A `repo-handoff.json` for a Hono + Cloudflare Workers project (SnapLink URL shortener).
This example demonstrates the edge-runtime checks introduced in Rule 17:
- `project.runtime = 'cloudflare-workers'`
- D1 (SQLite) instead of PostgreSQL
- Upstash REST API instead of TCP Redis
- No Docker; wrangler.toml as IaC
- Distributed tracing exemption (Rule 15 exception for CF Workers)

## Handoff Input (excerpt)
```json
{
  "project": {
    "name": "SnapLink",
    "framework": "hono",
    "runtime": "cloudflare-workers",
    "deploymentTarget": "cloudflare-workers"
  },
  "databases": [
    {
      "type": "d1",
      "provider": "cloudflare",
      "migrationTool": "wrangler-d1",
      "migrationCommand": "wrangler d1 migrations apply snaplink-db --remote"
    }
  ],
  "integrations": [
    {
      "name": "Upstash",
      "type": "rate-limiting",
      "envVars": ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]
    }
  ],
  "security": {
    "authStrategy": "jwt-hs256",
    "passwordHashing": "argon2id",
    "secretScanningEnabled": true,
    "securityMdIncluded": true,
    "corsWhitelistConfigured": true
  },
  "observability": {
    "distributedTracing": false,
    "distributedTracingNote": "Single-runtime Workers deployment — all Workers share CF infrastructure; Cloudflare Analytics covers cross-worker visibility"
  },
  "files": {
    "wranglerConfig": "wrangler.toml"
  }
}
```

## Validation Report Output
```json
{
  "validatedFile": "repo-handoff.json",
  "validatedAt": "2026-04-05T10:55:00Z",
  "status": "pass",
  "summary": {
    "totalChecks": 17,
    "passed": 17,
    "warnings": 0,
    "failures": 0
  },
  "checks": [
    {
      "id": "rule17-no-tcp-redis",
      "category": "edge-runtime",
      "status": "pass",
      "message": "No REDIS_URL in integrations envVars. Upstash REST API (UPSTASH_REDIS_REST_URL) used — correct for CF Workers."
    },
    {
      "id": "rule17-d1-migration-tool",
      "category": "edge-runtime",
      "status": "pass",
      "message": "databases[0].migrationTool='wrangler-d1' — correct for D1 SQLite. No PostgreSQL-only migration tool (prisma migrate, alembic) detected."
    },
    {
      "id": "rule17-wrangler-config",
      "category": "edge-runtime",
      "status": "pass",
      "message": "files.wranglerConfig='wrangler.toml' declared — required for CF Workers deployment."
    },
    {
      "id": "rule17-no-docker",
      "category": "edge-runtime",
      "status": "pass",
      "message": "files.dockerfile not declared — correct for CF Workers (wrangler deploy, no container runtime)."
    },
    {
      "id": "rule15-distributed-tracing",
      "category": "observability",
      "status": "pass",
      "message": "services[] count = 3 (api, queue-consumer, cron-aggregator). observability.distributedTracing=false. Rule 15 exception applies: project.runtime='cloudflare-workers' AND observability.distributedTracingNote is declared. CF Workers share Cloudflare infrastructure — Cloudflare Analytics provides cross-worker visibility without OTel instrumentation."
    },
    {
      "id": "security-rule13-baseline",
      "category": "security-playbook",
      "status": "pass",
      "message": "security.securityMdIncluded=true, security.secretScanningEnabled=true, security.corsWhitelistConfigured=true. security.passwordHashing='argon2id' — Wasm-compatible with CF Workers via @node-rs/argon2."
    }
  ],
  "blockingFailures": [],
  "warnings": [],
  "assumptions": [
    "Upstash REST API confirmed as rate-limiting strategy — TCP Redis not available in CF Workers",
    "argon2id via @node-rs/argon2 (Wasm) confirmed as CPU-efficient enough for Workers 50ms CPU budget",
    "D1 SQLite confirmed — standard SQL subset used; no PostgreSQL-specific functions"
  ],
  "fixHints": []
}
```

## Gate Decision
✅ **Status: PASS** — Repo Builder Agent may proceed.

No warnings, no failures. This is the first pipeline run to achieve a clean double PASS (stage 0 and stage 1) across all 33 checks.

**Key validations demonstrated by this example:**
- **Rule 17 (Edge Runtime):** TCP Redis correctly rejected; Upstash REST API accepted; wrangler.toml declared; no Docker; D1 migration tool correct.
- **Rule 15 (Observability) — CF Workers exception:** Distributed tracing warning suppressed when `project.runtime='cloudflare-workers'` AND `distributedTracingNote` is declared.
- **Rule 13 (Security):** argon2id validated as Wasm-compatible; CORS whitelist and secret scanning confirmed.

**Anti-pattern to watch for:** If a CF Workers project declares `REDIS_URL` in `integrations[].envVars` (standard TCP Redis), Rule 17 raises a **blocking error** — standard Redis clients open a TCP connection that CF Workers cannot establish.

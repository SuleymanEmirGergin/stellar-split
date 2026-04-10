# Coverage Analysis Playbook (`/coverage`)

Systematic analysis of existing test coverage — identify gaps, prioritize missing tests, and produce an actionable coverage gap report.

---

## 1. When to Apply This Playbook

Apply `/coverage` when:
- The project has an existing test suite and you need to measure its completeness
- A CI run shows coverage below threshold
- A new endpoint or feature was added without corresponding tests
- The team wants a coverage debt map before a production release
- Preparing a `/review` pass — `/coverage` should always run first

**Order of operations:**
```
/coverage  →  identify gaps
/review    →  assess quality of what exists
/generate  →  fill the gaps found by /coverage
```

---

## 2. Coverage Analysis Output: `coverage-gap-report.md`

The `/coverage` command produces `coverage-gap-report.md` with these sections:

### Section 1 — Executive Summary
```
Endpoint Coverage: 18/28 (64%) — 10 untested endpoints
Flow Coverage:     3/7 flows fully tested
P0 Gaps:           2 (auth token rotation, task delete cascade)
Security Boundary Tests: 6/28 routes have 401/403 tests
```

### Section 2 — Endpoint Coverage Matrix

Every route from `repo-handoff.json` mapped to test status:

| Method | Path | Auth | P-Level | Test File | Status |
|---|---|---|---|---|---|
| POST | /api/auth/register | No | P0 | auth.test.ts | ✅ Covered |
| POST | /api/auth/refresh | Cookie | P0 | — | ❌ Missing |
| DELETE | /api/tasks/:id | JWT | P1 | — | ❌ Missing |
| GET | /api/workspaces/:id/activity/stream | JWT | P1 | — | ❌ Missing (SSE) |

**P-levels:**
- **P0** — Auth, payment, data delete, security boundaries (must have 95%+ coverage)
- **P1** — Mutations (POST/PUT/PATCH), worker jobs (must have 85%+ coverage)
- **P2** — Reads (GET), paginated lists (70%+ coverage acceptable)

### Section 3 — Flow Coverage

Identifies which business flows are fully, partially, or not tested:

| Flow | Steps | Steps Covered | Status |
|---|---|---|---|
| Register → Verify → Login | 3 | 2/3 | ⚠️ Partial (verify missing) |
| Create Task → Assign → Complete | 3 | 0/3 | ❌ Missing |
| Invite Member → Accept → RBAC Check | 3 | 0/3 | ❌ Missing |

### Section 4 — Security Boundary Gaps

Lists every auth-protected route missing 401/403 tests:

```
MISSING 401 tests:
  - PATCH /api/tasks/:id
  - DELETE /api/tasks/:id
  - GET /api/workspaces/:id/activity/stream

MISSING 403 tests (member accessing admin route):
  - DELETE /api/workspaces/:id (admin-only)
  - PATCH /api/workspaces/:id/members/:userId (admin-only)
```

**Rule:** Every auth-protected route needs at minimum:
1. `401` — request with no token
2. `403` — request with valid token of wrong role (if RBAC applies)
3. `200/201/204` — request with correct token

### Section 5 — Branch Coverage Gaps

Identifies conditional paths not exercised by tests:

```
auth_service.go:RotateRefreshToken
  ❌ Branch not tested: expired refresh token → 401
  ❌ Branch not tested: already-revoked token → 401

task_handler.go:DeleteTask
  ❌ Branch not tested: delete task assigned to another user
  ❌ Branch not tested: delete task in archived board
```

### Section 6 — External Service Mock Gaps

| Integration | Mock Library | Webhook Tested | Error Path Tested |
|---|---|---|---|
| Resend (email) | msw / jest.mock | ✅ | ❌ (timeout not tested) |
| Stripe webhook | — | ❌ Missing | ❌ Missing |
| S3/Tigris upload | — | ❌ Missing | ❌ Missing |

### Section 7 — Priority Queue (What to Test Next)

Ordered by risk × untested:

```
PRIORITY 1 (P0 — test before next release)
  1. POST /api/auth/refresh — token rotation (auth security)
  2. POST /api/auth/reset-password — single-use token consumption
  3. DELETE /api/workspaces/:id — cascade delete (data loss risk)

PRIORITY 2 (P1 — test this sprint)
  4. POST /api/tasks/:id/attachments/presign — file upload flow
  5. SSE /api/workspaces/:id/activity/stream — event delivery

PRIORITY 3 (P2 — schedule in next sprint)
  6. GET /api/workspaces (pagination edge cases)
  7. PATCH /api/tasks/:id (partial update field validation)
```

---

## 3. Stack-Specific Coverage Extraction

### TypeScript (Jest / Vitest)

```bash
# Generate JSON summary
npx jest --coverage --coverageReporters=json-summary
# Output: coverage/coverage-summary.json

# Read overall
cat coverage/coverage-summary.json | jq '.total'

# Find uncovered files
cat coverage/coverage-summary.json | jq 'to_entries | map(select(.value.lines.pct < 80)) | .[].key'
```

### Python (pytest-cov)

```bash
pytest --cov=app --cov-report=json:coverage.json --cov-report=term-missing
# coverage.json contains per-file data with missing lines
python -c "import json; d=json.load(open('coverage.json')); [print(k, v['summary']['percent_covered']) for k,v in d['files'].items()]"
```

### Go (go test -cover)

```bash
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out          # per-function coverage
go tool cover -html=coverage.out          # HTML report
# Find uncovered functions:
go tool cover -func=coverage.out | grep ' 0.0%'
```

### Bun

```bash
bun test --coverage
# Coverage output appears in terminal; no JSON summary in Bun 1.x
# Use lcov reporter for CI integration:
bun test --coverage --coverage-reporter=lcov
```

---

## 4. Coverage Analysis Decision Tree

```
Start: /coverage command received
  │
  ├── Is there a coverage output file? (lcov, JSON, .out)
  │     YES → Parse it for per-file/per-function data
  │     NO  → Run "how to generate coverage" instructions for the stack
  │
  ├── Does coverage file exist?
  │     Compare coverage data against repo-handoff.json endpoints
  │     → Build Endpoint Coverage Matrix
  │
  ├── Are there existing test files?
  │     YES → Scan test files for route patterns, describe blocks, endpoint calls
  │     NO  → All endpoints = ❌ Missing
  │
  ├── For each endpoint: is there a test file that imports/calls this route?
  │     YES → ✅ Covered
  │     PARTIAL → ⚠️ Partially covered (happy path only / no error cases)
  │     NO  → ❌ Missing
  │
  └── Produce coverage-gap-report.md
```

---

## 5. Partial Coverage Classification

An endpoint is **partially covered** (⚠️) when:
- Only the happy path (200/201) is tested
- Error paths (400, 401, 403, 404, 409, 422) are not tested
- Only one RBAC role is tested when multiple apply
- Edge cases (empty body, boundary values, concurrent requests) are untested

---

## 6. Coverage Debt Scoring

Assign a debt score to prioritize work:

```
Debt Score = (1 - coverage%) × risk_weight

Risk weights:
  P0 (auth/payment/delete) = 10
  P1 (mutations)           = 5
  P2 (reads)               = 2

Example:
  POST /api/auth/refresh → 0% covered × 10 = 10 (highest debt)
  GET /api/workspaces    → 50% covered × 2 = 1  (low debt)
```

Order the Priority Queue by descending debt score.

---

## 7. /coverage Output Files

| File | Description |
|---|---|
| `coverage-gap-report.md` | Human-readable gap analysis (always produced) |
| `coverage-matrix.json` | Machine-readable endpoint → test status map |
| `priority-queue.md` | Ranked list of what to write next |

---

## 8. Common Pitfalls in Coverage Analysis

| Pitfall | Detection | Fix |
|---|---|---|
| Test imports route but asserts nothing | `expect(res.status)` missing | Flag as "test exists but no assertion" |
| Mocked DB makes all paths covered | Real DB unreachable in CI | Require at least 1 real-DB integration test per module |
| Coverage measured on build output | `dist/` in coverage source | Exclude build dirs from coverage config |
| Test passes by catching exceptions | `try/catch` swallows failure | Require `fail()` or `raise` in catch blocks of test code |
| SSE endpoint not testable by coverage tool | Streaming response | Add connection-establishment test + event delivery test separately |

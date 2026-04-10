# Test Review Playbook (`/review`)

Assess the quality of existing tests — not just whether they exist, but whether they are meaningful, maintainable, and actually catching bugs.

---

## 1. When to Apply This Playbook

Apply `/review` when:
- A project has tests but bugs are still slipping through to production
- Coverage is high (80%+) but mutation score is low (< 60%)
- Tests are flaky — failing intermittently in CI without code changes
- A PR is being prepared for a security-critical release
- After `/coverage` identifies what's missing — `/review` assesses what exists

**Order of operations:**
```
/coverage  →  identify gaps (what's missing)
/review    →  identify quality issues (what exists but is wrong)
/generate  →  fix both problems
```

---

## 2. Review Output: `test-review.md`

The `/review` command produces `test-review.md` with these sections:

### Section 1 — Review Summary

```
Files Reviewed: 12 test files, 87 test cases
Critical Issues:    3  (must fix before release)
Major Issues:       7  (fix this sprint)
Minor Issues:      11  (schedule in backlog)
Antipattern Count:  6  (see Section 3)
Security Gap Count: 4  (see Section 4)
```

### Section 2 — Issue Register

Each issue entry:

```
[CRITICAL] auth.test.ts:47 — No assertion on response body
  Test: POST /api/auth/login 200 — success
  Problem: Asserts status 200 but never checks res.body.accessToken exists.
           A broken token generation would still pass this test.
  Fix: Add expect(res.body.accessToken).toBeDefined()
       Add expect(res.body.accessToken).toMatch(/^[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+$/)

[MAJOR] tasks.test.ts:112 — No teardown
  Test: POST /api/boards/:id/tasks — creates task
  Problem: Created task is never deleted. After 100 CI runs the test DB has
           100+ orphan tasks, which can affect pagination tests.
  Fix: Add afterEach(() => deleteTask(createdTaskId))

[MINOR] users.test.ts:23 — Hardcoded email
  Test: POST /api/auth/register with email="test@example.com"
  Problem: Fails on second run if user already exists.
  Fix: Use uuid-based email: `qa-${randomUUID()}@example.com`
```

---

## 3. Test Antipatterns Catalogue

### AP-01 — No Assertions (Empty Test)

```typescript
// ❌ ANTIPATTERN: passes for any response
it('creates user', async () => {
  await request(app).post('/api/auth/register').send(payload)
})

// ✅ FIX: assert status, body shape, and side effects
it('201 — creates user', async () => {
  const res = await request(app).post('/api/auth/register').send(payload)
  expect(res.status).toBe(201)
  expect(res.body).toMatchObject({ email: payload.email })
  expect(res.body.password).toBeUndefined() // never return password
  const user = await db.query('SELECT id FROM users WHERE email = $1', [payload.email])
  expect(user.rows).toHaveLength(1) // verify DB persistence
})
```

### AP-02 — Fixed Sleep / `setTimeout` in Tests

```typescript
// ❌ ANTIPATTERN: arbitrary wait — flaky on slow CI
it('sends email after register', async () => {
  await request(app).post('/api/auth/register').send(payload)
  await new Promise(r => setTimeout(r, 2000))
  expect(mockResend.sendEmail).toHaveBeenCalled()
})

// ✅ FIX: poll with waitFor or use mock synchronously
it('sends email after register', async () => {
  await request(app).post('/api/auth/register').send(payload)
  // Email service is synchronous in test via mock — check immediately
  expect(mockResend.sendEmail).toHaveBeenCalledWith(
    expect.objectContaining({ to: payload.email })
  )
})
```

### AP-03 — Hardcoded Test Data

```typescript
// ❌ ANTIPATTERN: fails on second run (unique constraint)
const email = 'test@example.com'

// ✅ FIX: isolate via UUID
import { randomUUID } from 'crypto'
const email = `qa-${randomUUID()}@example.com`
```

### AP-04 — Shared Mutable State Between Tests

```typescript
// ❌ ANTIPATTERN: test order dependency
let userId: string
it('registers user', async () => { userId = await register() })
it('creates task', async () => { /* uses userId from above */ })

// ✅ FIX: each test creates its own state
beforeEach(async () => { userId = await register() })
afterEach(async () => { await deleteUser(userId) })
```

### AP-05 — Mocking Too Deep (Testing the Mock)

```python
# ❌ ANTIPATTERN: mocking the DB means you're not testing the query
with patch('app.db.session.execute') as mock_execute:
    mock_execute.return_value = MagicMock(scalars=lambda: MagicMock(all=lambda: [fake_user]))
    res = client.get('/api/users/me')
    assert res.status_code == 200

# ✅ FIX: use a real test DB, mock only external services
# conftest.py sets up a real PostgreSQL test DB
# Only mock: email provider, payment provider, S3
```

### AP-06 — Missing Error Path Tests

```typescript
// ❌ ANTIPATTERN: only happy path
it('200 — returns workspace', async () => {
  const res = await request(app).get(`/api/workspaces/${workspaceId}`).set('Authorization', token)
  expect(res.status).toBe(200)
})

// ✅ FIX: always include error paths
it('404 — workspace not found', async () => {
  const res = await request(app).get('/api/workspaces/00000000-0000-0000-0000-000000000000').set('Authorization', token)
  expect(res.status).toBe(404)
  expect(res.body.error).toBeDefined()
})

it('403 — member cannot access other workspace', async () => {
  const otherWorkspaceId = await createWorkspaceAsOtherUser()
  const res = await request(app).get(`/api/workspaces/${otherWorkspaceId}`).set('Authorization', memberToken)
  expect(res.status).toBe(403)
})
```

### AP-07 — Verifying Call Count Only (Not Payload)

```typescript
// ❌ ANTIPATTERN: confirms email was called but not what was sent
expect(mockResend.send).toHaveBeenCalled()

// ✅ FIX: assert the payload too
expect(mockResend.send).toHaveBeenCalledWith(
  expect.objectContaining({
    to: inviteeEmail,
    subject: expect.stringContaining('invited'),
    html: expect.stringContaining(inviteLink),
  })
)
// Also: confirm PHI is not in the email body
expect(mockResend.send.mock.calls[0][0].html).not.toContain(patientRecordId)
```

### AP-08 — Testing Framework Code, Not Business Logic

```python
# ❌ ANTIPATTERN: testing that Pydantic validates — not your code
def test_invalid_email_validation():
    res = client.post('/api/auth/register', json={'email': 'not-an-email', 'password': '...'})
    assert res.status_code == 422  # FastAPI does this automatically

# ✅ FIX: focus on business logic
def test_duplicate_email_rejected():
    # This IS your logic — unique constraint + error message
    client.post('/api/auth/register', json={'email': email, 'password': '...'})
    res = client.post('/api/auth/register', json={'email': email, 'password': '...'})
    assert res.status_code == 409
    assert 'already exists' in res.json()['detail'].lower()
```

---

## 4. Security Boundary Review Checklist

For every auth-protected route, verify these three tests exist:

```
Route: PATCH /api/workspaces/:id

✅ MUST HAVE:
  [ ] 401 — no Authorization header (or invalid token)
  [ ] 403 — valid token of wrong role (member trying admin route)
  [ ] 200 — valid token of correct role with valid payload

⚠️ SHOULD HAVE:
  [ ] 400 — valid auth, invalid request body (validation error)
  [ ] 404 — valid auth, non-existent resource ID
  [ ] 409 — valid auth, conflict (duplicate name, etc.)
```

**Auto-detect missing security tests:**

For each route in `repo-handoff.json`:
1. Is `requiresAuth: true`? → Must have 401 test
2. Does route have role restriction (admin-only)? → Must have 403 test
3. Does route modify data (POST/PATCH/DELETE)? → Must have 400 (bad body) test

---

## 5. Review Severity Classification

| Severity | Criteria | Action |
|---|---|---|
| **Critical** | No assertion in test body; security boundary untested (no 401/403); no cleanup causing test pollution | Must fix before merge |
| **Major** | Hardcoded test data; no error path tested; fixed sleeps; shared state between tests | Fix this sprint |
| **Minor** | Test name doesn't describe behavior; missing boundary value tests; no negative assertion on sensitive fields | Schedule in backlog |
| **Suggestion** | Could use a factory function instead of inline data; test file could be split | Optional improvement |

---

## 6. Stack-Specific Review Rules

### Go (go test)

```
✅ Every test function: t.Cleanup(func() { /* delete created data */ })
✅ Use t.Parallel() for read-only tests
✅ Use httptest.NewRecorder() — not a running server
✅ Assert both status code AND response body for every handler test
✅ Test context cancellation for long-running handlers (SSE, streaming)
❌ Never use time.Sleep in tests — use channels or sync.WaitGroup
```

### NestJS (Jest + Supertest)

```
✅ Use TestingModule — never import the real AppModule in unit tests
✅ Use a separate test database (DATABASE_URL_TEST)
✅ afterAll: await app.close() — prevent open handles
✅ Use jest.useFakeTimers() for token expiry tests
❌ Never mock @InjectRepository with a real database call
❌ Never use .toMatchSnapshot() for API responses — too brittle
```

### FastAPI (pytest + httpx)

```
✅ scope="function" fixtures for DB state — never "session" for mutable data
✅ Use anyio.from_thread for sync tests calling async code
✅ Override dependencies via app.dependency_overrides for external services
✅ Use freeze_gun for datetime-sensitive tests (token expiry)
❌ Never call asyncio.run() inside a test function
❌ Never use real HTTP (httpx.get("http://...")) — use ASGITransport
```

### Bun + Elysia

```
✅ Use app.handle(new Request("http://localhost/...")) — not a started server
✅ Use bun:test mock module for external services
✅ Isolate DB state: BEGIN TRANSACTION in beforeEach, ROLLBACK in afterEach
❌ Never use fetch() with localhost in tests — no server is running
❌ Never assert on Date.now() directly — use a fixed timestamp
```

---

## 7. Flakiness Detection

A test is **likely flaky** when it:

1. Contains `setTimeout` / `sleep` / `time.Sleep`
2. Uses `Date.now()` or `datetime.now()` without freezing time
3. Depends on insertion order in an unordered collection
4. Asserts on floating-point equality without tolerance
5. Shares state with other tests via global variables
6. Makes real network calls to external services (not mocked)
7. Reads from the filesystem without cleanup

**Automated flakiness scan:** Look for these patterns in test files:

```bash
# Detect setTimeout usage in tests
grep -rn "setTimeout\|time\.Sleep\|sleep(" tests/

# Detect missing cleanup
grep -rn "describe\|it(" tests/ | xargs -I{} grep -L "afterEach\|afterAll\|cleanup\|defer"

# Detect real HTTP calls
grep -rn "fetch(\"http\|axios.get(\"http\|requests.get(\"http" tests/
```

---

## 8. Review Output Files

| File | Description |
|---|---|
| `test-review.md` | Full issue register with severity, file, line, fix (always produced) |
| `antipattern-report.json` | Machine-readable list of detected antipatterns with count |
| `security-boundary-gaps.md` | Routes missing 401/403 tests |

---

## 9. /review → /generate Integration

After `/review` produces `test-review.md`, feed it to `/generate` to fix specific issues:

```
/generate --fix-review test-review.md
```

This instructs the QA Agent to:
1. Read `test-review.md`
2. For each Critical or Major issue: rewrite the offending test
3. Add missing 401/403 tests for every route in the Security Boundary Gaps section
4. Replace all hardcoded emails/IDs with UUID-based values
5. Add `afterEach` cleanup to every test that creates persistent data
6. Output the fixed test files

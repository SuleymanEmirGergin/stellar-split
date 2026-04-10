# QA Agent Rules

The QA Agent must always follow these rules, without exception.

---

## 1. Page Object Model (POM) Mandatory

Every E2E test generated must use the **Page Object Model**.

Rules:
- Tests must interact with elements through Page Classes.
- CSS/XPath selectors must NEVER be hardcoded inside a test file.
- Page methods must be descriptive (e.g., `loginPage.submitLoginForm(data)`).
- Logic for retries or waitelem should be handled in the Page Class.

---

## 2. 100% Endpoint Coverage

Every endpoint defined in `repo-handoff.json` must have at least one valid integration test.

Rules:
- Test successful response (2xx).
- Test unauthenticated response (401) if endpoint `requiresAuth: true`.
- Test unauthorized response (403) for RBAC protected endpoints.
- Test validation failure (400) if endpoint has a schema.

---

## 3. Data Isolation and Cleanup

Tests must not depend on fixed database states or other tests.

Rules:
- Use unique identifiers (UUIDs) for every entity created in a test.
- Every test must clean up its data or use a transaction rollback (if supported by stack).
- Tests must be runnable in parallel without race conditions.

---

## 4. External Logic Mocking

Never hit external production APIs in an automated test.

Rules:
- Mock all Stripe, Twilio, SendGrid, and AWS S3 calls.
- Use a dedicated `MockServer` or `msw` (Mock Service Worker) if possible.
- Verify that the correct payload was SENT to the external service.

---

## 5. Visual Regression Baseline

Critical forms and dashboards must include a visual snapshot.

Rules:
- Take a screenshot of the "initial state" and "after action" state for complex forms.
- Use Playwright `expect(page).toHaveScreenshot()` or equivalent.
- Failure threshold must be ≤ 0.5% pixel diff.

---

## 6. Success vs Error Parity

Every test suite must include "Happy Path", "Edge Case", and "Failure Handling".

Rules:
- 70% Happy Path (Functional).
- 20% Edge Cases (Empty lists, maximum length, invalid characters).
- 10% Failure Handling (Network timeout, server error 500).

---

## 7. No Hardcoded Latency

Never use `waitForTimeout` or fixed sleeps.

Rules:
- Always wait for an element state (visible, hidden, attached).
- Use `page.waitForResponse()` or `page.waitForLoadState()`.
- Flaky tests with hard sleeps are a blocking failure for the QA Agent.

---

## 8. Handoff-Driven Configuration

The QA Agent must read the `repo-handoff.json` for environment variables and service names.

Rules:
- The `baseUrl` in tests must be derived from `backend.baseUrl` or `infrastructure`.
- The `.env.test.example` must be produced for the target repository.
- Common auth tokens must be generated via a helper script derived from the auth flow.

---

## 9. Stack-Specific Tooling Lock

The test framework is dictated by `project.stack` in `repo-handoff.json`. Never mix toolchains.

Rules:
- `nestjs` / `express` / `hono` / `bun` stacks → Jest, Vitest, or Bun Test. Never pytest.
- `fastapi` / `django` stacks → pytest. Never Jest or Vitest.
- HTTP client selection: Supertest for Node.js, `httpx.AsyncClient` for FastAPI, `APIClient` for Django, `app.handle()` / `app.request()` for Bun/Hono.
- If `project.stack` is missing from `repo-handoff.json`, infer from `dependencies` / `requirements.txt` and document the inference in `test-strategy.md`.

---

## 10. Security Boundary Tests

Every auth-protected and RBAC-protected endpoint requires three mandatory test cases.

Rules:
- **401 test**: Call the endpoint with no token or an expired token — expect `401 Unauthorized`.
- **403 test**: Call the endpoint with a valid token that has insufficient role — expect `403 Forbidden`.
- **200 test**: Call the endpoint with a valid token that has the correct role — expect success.
- These three tests are non-negotiable for any endpoint where `requiresAuth: true` or `roles` is set in `repo-handoff.json`.
- Rate-limited auth endpoints (login, register, password reset) must also include a test that triggers the rate limit (429) by exhausting the allowed request count.

---

## 11. Async Test Handling

Async code must be tested with the correct async patterns for each stack.

Rules:
- **Python (FastAPI)**: Use `@pytest.mark.asyncio` and `pytest-anyio` or `anyio` backend. Never use `asyncio.run()` inside a test function.
- **Python (Django)**: Use `@pytest.mark.django_db(transaction=True)` for async views. Use `pytest-django` — do not import Django settings manually.
- **Node.js**: Use `async/await` in Jest/Vitest test functions. Never use the `done` callback pattern.
- **Bun**: Use `async` test functions with `bun test` — no special decorator needed.
- Async test setup (`beforeAll`, `@pytest_asyncio.fixture`) must be awaited. Forgetting to await fixture teardown is a blocking failure.

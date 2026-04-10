# QA Agent Starter Prompts

Use these prompts to invoke the QA Agent for automated test generation.

---

## 1. `/plan` — Generate Test Strategy

Use this when you have a `repo-handoff.json` and need a test plan.

```markdown
/plan

Identify all endpoints and business flows from this `repo-handoff.json`. 
Produce a `test-strategy.md` with:
1. Test pyramid breakdown.
2. Flow-to-page mapping.
3. Coverage matrix for all 100% endpoints.
4. Mocking strategy for external services (Stripe, Twilio, etc.).
```

---

## 2. `/generate all` — Full Test Suite Generation

Use this to generate the entire automated test codebase.

```markdown
/generate all

Generate the full automated test suite for this repository:
1. Root config files (playwright.config.ts / pytest.ini).
2. Page Object classes for all UI pages.
3. E2E specs for critical business flows.
4. Integration tests for 100% of defined endpoints.
5. Mock implementations for all external services.
Follow the rules for POM and data isolation.
```

---

## 3. `/generate e2e` — Focus on UI Testing

Use this when you specifically need Playwright/Cypress tests.

```markdown
/generate e2e

Generate the E2E test suite using the Page Object Model (POM):
1. Identify all pages and forms.
2. Create Page Classes with descriptive methods and robust selectors.
3. Write specs for the main user flows (Login, Dashboard, CRUD ops).
4. Include visual regression snapshots for complex dashboard views.
```

---

## 4. `/generate integration` — Focus on API Testing

Use this when you specifically need backend/API contract tests.

```markdown
/generate integration

Generate the API integration test suite:
1. Write tests for 100% of endpoints in `repo-handoff.json`.
2. Test success cases (200/201) and error cases (400, 401, 403, 404).
3. Include RBAC permission tests for every role-protected route.
4. Ensure every test cleans up its database state using unique IDs or transactions.
```

---

## 5. `/handoff` — Production QA Metadata

Use this to produce the final machine-readable QA report.

```markdown
/handoff

Generate the `qa-handoff.json` based on the current test suite:
1. Calculate total test count and endpoint coverage percentage.
2. List all mocked services and their strategies.
3. Produce the final artifact for CI consumption.
```

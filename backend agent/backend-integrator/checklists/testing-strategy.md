# Testing Strategy Checklist

Use this checklist to define and validate the testing architecture for a backend system.

Apply this during the `/blueprint` phase — testing structure should be decided before any implementation begins.

---

## 1. Testing Pyramid

Define coverage targets for each layer:

| Layer | Coverage Goal | Speed | Scope |
|---|---|---|---|
| **Unit Tests** | 70–80% | Fast (ms) | Single function / service method |
| **Integration Tests** | 50–60% | Medium (s) | DB + service layer together |
| **End-to-End Tests** | Critical user flows only | Slow (s-min) | Full HTTP request → DB → response |

> **Rule**: Never aim for 100% coverage everywhere — it increases maintenance cost with diminishing returns.

---

## 2. Unit Test Requirements

- [ ] Every service method has at least one unit test.
- [ ] External dependencies (DB, queues, providers) are mocked.
- [ ] Happy path is covered.
- [ ] Edge cases are covered: empty inputs, nulls, boundary values.
- [ ] Error/exception paths are tested.
- [ ] Tests are isolated — no shared state between test cases.
- [ ] Each test has a descriptive name (Given / When / Then format preferred).

### Naming Convention
```
users.service.spec.ts
auth.service.spec.ts
```

### Mock Pattern (NestJS Example)
```typescript
const mockUserRepo = { findOne: jest.fn(), save: jest.fn() }
```

---

## 3. Integration Test Requirements

- [ ] Database is real (test instance) — not mocked.
- [ ] Database is reset between test suites.
- [ ] Transactions are rolled back after each test (preferred) or DB is re-seeded.
- [ ] Tests cover the service layer calling the real repository.
- [ ] Tests verify data was actually persisted correctly.
- [ ] Tests use a dedicated `TEST_DATABASE_URL` environment variable.

### Database Reset Strategy
```bash
# Before each test suite
await db.migrate.latest()
await db.seed.run()

# Or use transactions:
await db.beginTransaction()
# ... test ...
await db.rollback()
```

---

## 4. End-to-End Test Requirements

- [ ] E2E tests cover the most critical user flows (auth, payment, core feature).
- [ ] Tests send real HTTP requests to the running application.
- [ ] Tests verify response status codes AND response shapes.
- [ ] Auth is tested — protected routes return `401` without token.
- [ ] Tests clean up created data after each run.
- [ ] E2E tests run against a test database, never production.

### Critical Flows to Always Cover
- [ ] Register → Login → Access protected resource
- [ ] Create resource → Read it → Update it → Delete it
- [ ] Trigger background job → poll for result
- [ ] Submit invalid data → receive 400 with validation errors

---

## 5. Test Configuration

- [ ] `jest.config.ts` or `jest.config.js` is present at root.
- [ ] Unit and E2E tests are in separate projects/configs.
- [ ] `moduleNameMapper` is configured for path aliases.
- [ ] Coverage thresholds are defined in jest config.
- [ ] Test timeout is configured appropriately (default 5s may be too short for DB tests).

### Recommended Jest Config (NestJS)
```typescript
export default {
  moduleFileExtensions: ['js', 'ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  testRegex: '.*\\.spec\\.ts$',
  coverageDirectory: './coverage',
  coverageThreshold: {
    global: { branches: 60, functions: 70, lines: 70 }
  }
}
```

---

## 6. CI Integration

- [ ] Tests run automatically on every pull request.
- [ ] Unit tests run in CI on every commit.
- [ ] E2E tests run in CI on PR merges to main.
- [ ] Test results are reported in PR checks.
- [ ] Coverage report is uploaded to a coverage service (Codecov / Coveralls) — optional.
- [ ] CI fails the build if tests fail.

### GitHub Actions Example Step
```yaml
- name: Run unit tests
  run: npm run test -- --coverage

- name: Run E2E tests
  run: npm run test:e2e
  env:
    TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

---

## 7. What NOT to Test

Avoid wasting effort on:

- [ ] Framework internals (NestJS decorators, ORM query builders).
- [ ] Simple getters/setters with no logic.
- [ ] Auto-generated migration files.
- [ ] Config files.
- [ ] Type definitions.

Focus tests on **business logic**, **validation rules**, and **integration boundaries**.

---

## 8. Test File Structure

```
src/
  users/
    users.service.ts
    users.service.spec.ts          ← unit test lives next to source
    users.controller.spec.ts
  auth/
    auth.service.spec.ts

test/
  auth.e2e-spec.ts                 ← E2E tests in dedicated folder
  users.e2e-spec.ts
  jest-e2e.json                    ← E2E jest config
```

---

## 9. Mocking Strategy

| Dependency | Unit Test | Integration Test |
|---|---|---|
| Database | Mock (jest.fn) | Real (test DB) |
| External APIs (Stripe, S3) | Mock (jest.fn) | Mock or sandbox |
| Queue/Redis | Mock (jest.fn) | Real (test Redis) |
| Email provider | Mock (jest.fn) | Mock |
| Config | Real (test env) | Real (test env) |

---

## Scoring

A backend is **not ready for implementation** without:

- Defined test file structure.
- At least one unit test spec per service.
- E2E coverage plan for at least 3 critical flows.
- CI integration plan.

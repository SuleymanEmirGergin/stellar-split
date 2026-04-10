# Coverage Thresholds Playbook

Minimum test coverage thresholds by stack, service type, and code path category.

---

## 1. When to Apply This Playbook

Apply when:
- Setting up a CI pipeline for the first time
- The `/plan` command determines coverage enforcement is needed
- Coverage scanning tools are being integrated (Istanbul, coverage.py, Bun's built-in)
- A project has existing tests and needs coverage gate enforcement

---

## 2. Why Coverage Thresholds Matter

Coverage thresholds prevent regressions from going undetected. Without enforced gates:
- New features ship without tests silently
- CI passes even when critical paths have zero coverage
- Tech debt accumulates invisibly

**Coverage is not quality.** 80% line coverage ≠ 80% of bugs caught. Use thresholds as a floor, not a ceiling.

---

## 3. Threshold Reference Table

### By Stack

| Stack | Framework | Min Lines | Min Branches | Min Functions | Enforcement |
|---|---|---|---|---|---|
| NestJS | Jest (`--coverage`) | 80% | 75% | 80% | `jest.config.ts` thresholds |
| Express | Jest (`--coverage`) | 75% | 70% | 75% | `jest.config.ts` thresholds |
| Fastapi | pytest-cov | 80% | — | — | `pytest.ini` / pyproject.toml |
| Django | pytest-cov | 80% | — | — | `pytest.ini` / pyproject.toml |
| Hono (CF Workers) | Vitest (`--coverage`) | 80% | 75% | 80% | `vitest.config.ts` |
| Bun + Elysia | Bun Test (`--coverage`) | 75% | 70% | 75% | `package.json` / CLI flag |
| Supabase Edge Functions | Vitest (Deno-compatible) | 70% | 60% | 70% | `vitest.config.ts` |

### By Code Path Category

| Category | Recommended Min | Rationale |
|---|---|---|
| Auth endpoints | **95%** | Login, register, reset — zero tolerance for security gaps |
| Payment/billing logic | **95%** | Charge, refund, webhook — must never silently fail |
| Data mutation handlers | **85%** | POST / PUT / PATCH / DELETE endpoints |
| Query/read handlers | **70%** | GET endpoints — lower risk, easier to spot visually |
| Utility / helper functions | **80%** | Shared logic — high reuse, high blast radius |
| Background job handlers | **85%** | Silent failures — no user to report errors |
| Email / notification senders | **80%** | Async, hard to observe in production |
| Config / env validation | **90%** | Startup failures are catastrophic |

---

## 4. Configuration Templates

### NestJS — `jest.config.ts`

```typescript
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/index.ts',
    '!main.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThresholds: {
    global: {
      lines: 80,
      branches: 75,
      functions: 80,
      statements: 80,
    },
    // Per-file overrides for critical paths
    './src/auth/**': {
      lines: 95,
      branches: 90,
      functions: 95,
      statements: 95,
    },
    './src/billing/**': {
      lines: 95,
      branches: 90,
      functions: 95,
      statements: 95,
    },
  },
};

export default config;
```

### FastAPI — `pyproject.toml`

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.coverage.run]
source = ["app"]
omit = ["app/main.py", "app/db/migrations/*", "*/tests/*"]
branch = true

[tool.coverage.report]
fail_under = 80
show_missing = true
skip_covered = false
exclude_lines = [
  "pragma: no cover",
  "if TYPE_CHECKING:",
  "raise NotImplementedError",
]
```

### Vitest (Hono / edge) — `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/*.d.ts'],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
});
```

### Bun Test — `package.json` script

```json
{
  "scripts": {
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "test:coverage:check": "bun test --coverage --coverage-threshold 75"
  }
}
```

> **Note:** Bun's `--coverage-threshold` (as of Bun 1.x) applies to line coverage globally. Per-path overrides require a wrapper script or switching to Vitest with Bun runner.

---

## 5. GitHub Actions — Coverage Gate Example

```yaml
# .github/workflows/ci.yml
- name: Run tests with coverage
  run: npx jest --coverage --coverageReporters=json-summary

- name: Check coverage thresholds
  run: |
    LINES=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$LINES < 80" | bc -l) )); then
      echo "Coverage $LINES% is below threshold 80%"
      exit 1
    fi
```

Or use the Jest threshold built-in — Jest exits with code 1 automatically when thresholds are not met.

```yaml
- name: Test + coverage (Jest native threshold)
  run: npx jest --coverage
  # Jest exits 1 if coverageThresholds in jest.config.ts are not met
```

---

## 6. Reporting Coverage in PRs

Upload `lcov.info` to a coverage service:

```yaml
- name: Upload to Codecov
  uses: codecov/codecov-action@v4
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./coverage/lcov.info
    fail_ci_if_error: true
```

Or use Coveralls:

```yaml
- name: Coveralls
  uses: coverallsapp/github-action@v2
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    path-to-lcov: ./coverage/lcov.info
```

---

## 7. Coverage Exceptions

Some code is legitimately hard to cover. Mark with `/* istanbul ignore next */` or `# pragma: no cover`:

```typescript
/* istanbul ignore next -- startup-only, tested via integration */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

**Do not abuse this.** Every ignore comment should have a rationale comment. CI can be configured to fail on too many ignores.

---

## 8. Common Pitfalls

| Pitfall | Fix |
|---|---|
| 100% line coverage, 0% branch coverage | Always enable `branch: true` in coverage config |
| Mocking everything → fake coverage | Write at least one integration test per module |
| Threshold set at 0% to not break CI | Set a real threshold on day 1, raise it incrementally |
| Coverage of `index.ts` re-exports inflates % | Exclude barrel files from coverage collection |
| Supabase RLS not tested | Add Supabase local dev + `supabase test db` to CI |

---

## 9. Environment Variables

```env
# CI coverage flags
COVERAGE_THRESHOLD_LINES=80
COVERAGE_THRESHOLD_BRANCHES=75
COVERAGE_THRESHOLD_FUNCTIONS=80
COVERAGE_FORMAT=lcov,json-summary
```

---

## 10. File Structure

```
project/
├── jest.config.ts           ← or vitest.config.ts / pyproject.toml
├── coverage/
│   ├── lcov.info            ← uploaded to Codecov/Coveralls
│   ├── coverage-summary.json
│   └── index.html           ← local HTML report
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

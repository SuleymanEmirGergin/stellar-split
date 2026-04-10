# Mutation Testing Playbook

Kill mutants. Catch tests that pass for the wrong reasons.

---

## 1. When to Apply This Playbook

Apply when:
- A project has 80%+ line coverage but bugs still slip through
- You need evidence that tests are actually asserting meaningful behavior
- Preparing for a security-critical release (auth, billing, RBAC logic)
- QA Agent is asked to measure test quality, not just test quantity

---

## 2. What Is Mutation Testing?

Mutation testing modifies ("mutates") your source code — changing `>` to `>=`, deleting `if` blocks, flipping booleans — and then runs your test suite against each mutant.

- If tests **fail** → mutant is **killed** ✅ (test is meaningful)
- If tests **pass** → mutant **survived** ❌ (test is not actually checking what it claims)

**Mutation score** = `killed / (killed + survived)` × 100

A 90% line coverage suite with 40% mutation score means tests are mostly checking "code runs" not "code is correct."

---

## 3. Toolchain by Stack

| Stack | Tool | Install | Config File |
|---|---|---|---|
| NestJS / Express (TypeScript) | **Stryker Mutator** | `npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner` | `stryker.config.mjs` |
| Hono / Bun (TypeScript) | **Stryker** + Vitest runner | `npm install --save-dev @stryker-mutator/vitest-runner` | `stryker.config.mjs` |
| FastAPI / Django (Python) | **mutmut** | `pip install mutmut` | `setup.cfg` or pyproject.toml |
| Any Node.js | **jest-circus** + `--testResultsProcessor` | Built into Stryker | `stryker.config.mjs` |

---

## 4. Stryker — TypeScript / Node.js

### Installation

```bash
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner
# OR for Vitest:
npm install --save-dev @stryker-mutator/core @stryker-mutator/vitest-runner
```

### `stryker.config.mjs` (Jest runner)

```javascript
// stryker.config.mjs
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress', 'dashboard'],
  testRunner: 'jest',
  coverageAnalysis: 'perTest',
  mutate: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/index.ts',
  ],
  thresholds: {
    high: 80,
    low: 60,
    break: 50,   // CI fails if score drops below 50%
  },
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.ts',
    enableFindRelatedTests: true,
  },
  timeoutMS: 60000,
  concurrency: 4,
  // Focus mutation effort on high-risk paths:
  ignorePatterns: ['node_modules', 'dist', 'coverage'],
};
```

### `stryker.config.mjs` (Vitest runner — Hono)

```javascript
export default {
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  vitest: {
    configFile: 'vitest.config.ts',
  },
  mutate: ['src/**/*.ts', '!src/**/*.test.ts'],
  thresholds: { high: 80, low: 60, break: 50 },
};
```

### Run

```bash
npx stryker run

# Run on a single file only (faster iteration)
npx stryker run --mutate "src/auth/auth.service.ts"

# CI mode (exit 1 if below break threshold)
npx stryker run --reporters clear-text
```

---

## 5. mutmut — Python (FastAPI / Django)

### Installation

```bash
pip install mutmut
```

### `setup.cfg`

```ini
[mutmut]
paths_to_mutate = app/
backup = False
runner = python -m pytest tests/ -x --timeout=10
tests_dir = tests/
dict_synonyms = Params, Opts
```

### `pyproject.toml` alternative

```toml
[tool.mutmut]
paths_to_mutate = "app/"
runner = "python -m pytest tests/ -x -q"
tests_dir = "tests/"
```

### Run

```bash
# Full run
mutmut run

# Show surviving mutants
mutmut results

# Show diff for a specific mutant ID
mutmut show 42

# Apply a surviving mutant to inspect what wasn't tested
mutmut apply 42

# HTML report
mutmut html
```

---

## 6. Interpreting Results

### Survived Mutants — Priority Triage

| Survival Pattern | Root Cause | Fix |
|---|---|---|
| Boundary condition flipped (`>` → `>=`) survived | Test didn't cover the edge value | Add test for exact boundary |
| Return value changed survived | Test didn't assert the return value | Add `expect(result).toBe(expectedValue)` |
| Conditional deleted survived | Test only tested the happy path | Add test for the false/empty branch |
| String changed survived | Test used `.toBeDefined()` instead of `.toBe('exact')` | Assert exact expected output |
| `throw` removed survived | Exception scenario not tested | Add test that expects the thrown error |

### Mutation Score Targets

| Project Maturity | Target Score |
|---|---|
| MVP / early stage | ≥ 50% |
| Production SaaS | ≥ 70% |
| Auth / payment module | ≥ 85% |
| OSS / library | ≥ 80% |

---

## 7. Focusing Mutation Testing on High-Risk Paths

Don't run mutation testing on every file — too slow. Focus on critical modules:

```javascript
// stryker.config.mjs — focused on auth + billing only
export default {
  mutate: [
    'src/auth/**/*.ts',
    'src/billing/**/*.ts',
    'src/permissions/**/*.ts',   // RBAC logic
    '!src/**/*.spec.ts',
  ],
  thresholds: { high: 85, low: 70, break: 65 },
};
```

```bash
# Python — run mutmut on a single module
mutmut run --paths-to-mutate app/auth/,app/billing/
```

---

## 8. CI Integration

### GitHub Actions — Stryker

```yaml
- name: Mutation testing (Stryker)
  run: npx stryker run
  env:
    STRYKER_DASHBOARD_API_KEY: ${{ secrets.STRYKER_DASHBOARD_API_KEY }}

- name: Upload Stryker HTML report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: stryker-report
    path: reports/mutation/
```

### GitHub Actions — mutmut

```yaml
- name: Mutation testing (mutmut)
  run: |
    mutmut run
    SCORE=$(mutmut results | grep "Mutation score" | grep -oP '[\d.]+' | head -1)
    echo "Mutation score: $SCORE%"
    if (( $(echo "$SCORE < 60" | bc -l) )); then
      echo "Mutation score $SCORE% below threshold 60%"
      exit 1
    fi
```

---

## 9. When NOT to Run Mutation Testing in CI

Mutation testing is slow (10–30 min for medium projects). Run it:
- **On PR merge to main** (not on every commit)
- **Nightly** for full suites
- **On demand** for critical module changes

```yaml
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'   # Nightly at 2am
```

---

## 10. Common Pitfalls

| Pitfall | Fix |
|---|---|
| Mutation testing runs on every commit → CI too slow | Schedule to nightly + PR-to-main only |
| Ignored mutations inflate score | Review `// Stryker disable` annotations quarterly |
| Test suite has `jest.setTimeout` issues on mutants | Set `timeoutMS` lower in stryker config |
| mutmut corrupts source after a crash | Always run with `backup = False` + use `git stash` recovery |
| Generated code (Prisma types, protobuf) gets mutated | Exclude generated directories from `mutate` |

---

## 11. Environment Variables

```env
STRYKER_DASHBOARD_API_KEY=your-key    # Optional: publish score to dashboard.stryker-mutator.io
MUTATION_SCORE_THRESHOLD=60
```

---

## 12. File Structure

```
project/
├── stryker.config.mjs           ← Stryker config (Node.js)
├── setup.cfg                    ← mutmut config (Python)
└── reports/
    └── mutation/
        ├── index.html           ← HTML mutation report
        └── mutation.json        ← Machine-readable results
```

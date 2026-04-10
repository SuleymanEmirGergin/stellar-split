# CI Test Matrix Playbook

Stack-specific GitHub Actions test matrix templates — parallelism, DB services, coverage upload.

---

## 1. When to Apply This Playbook

Apply when:
- Setting up a new project's CI pipeline
- Adding test automation to an existing repo without CI
- Configuring matrix strategies for multi-Node/multi-Python version support
- Wiring up test DB services (Postgres, Redis) in CI containers

---

## 2. Matrix Strategy Overview

A **matrix strategy** runs the same job across multiple runtime versions, OS combinations, or test categories in parallel — cutting CI time and ensuring compatibility.

```yaml
strategy:
  matrix:
    node-version: [20, 22]          # Test on LTS and current
    os: [ubuntu-latest]             # Linux only for backends
  fail-fast: false                  # Don't stop all runners on first failure
```

---

## 3. NestJS — Full CI Matrix

```yaml
# .github/workflows/ci.yml
name: NestJS CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test (Node ${{ matrix.node-version }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
      fail-fast: false

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: --health-cmd "redis-cli ping" --health-interval 10s --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Prisma migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test -- --runInBand --coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: ci-test-secret-not-production

      - name: E2E tests
        run: npm run test:e2e -- --runInBand
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: ci-test-secret-not-production

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: matrix.node-version == 20    # Upload once
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info

  security:
    name: Security audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm audit --audit-level=high
      - name: Secret scanning
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 4. FastAPI — Full CI Matrix

```yaml
# .github/workflows/ci.yml
name: FastAPI CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test (Python ${{ matrix.python-version }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.11', '3.12']
      fail-fast: false

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s --health-retries 5

      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: --health-cmd "redis-cli ping" --health-interval 10s --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: 'pip'

      - name: Install dependencies
        run: |
          pip install --upgrade pip
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run Alembic migrations
        run: alembic upgrade head
        env:
          DATABASE_URL: postgresql+asyncpg://postgres:postgres@localhost:5432/test_db

      - name: Lint (ruff)
        run: ruff check app/ tests/

      - name: Type check (mypy)
        run: mypy app/

      - name: Unit + integration tests
        run: |
          pytest tests/ \
            --cov=app \
            --cov-report=lcov:coverage/lcov.info \
            --cov-report=term-missing \
            --cov-fail-under=80 \
            -v
        env:
          DATABASE_URL: postgresql+asyncpg://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
          SECRET_KEY: ci-test-secret-not-production
          ENVIRONMENT: test

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: matrix.python-version == '3.12'
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info

  security:
    name: Security audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install pip-audit gitleaks
      - run: pip-audit --requirement requirements.txt
      - name: Secret scanning
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 5. Hono (Cloudflare Workers) — CI Matrix

```yaml
# .github/workflows/ci.yml
name: Hono Edge CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test (Node ${{ matrix.node-version }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      # Hono Workers tests run with Vitest (no real DB needed — use Supabase local or mocks)
      - name: Unit + integration tests
        run: npx vitest run --coverage
        env:
          SUPABASE_URL: http://localhost:54321
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_TEST_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_TEST_SERVICE_ROLE_KEY }}
          ALLOWED_ORIGIN: http://localhost:3000

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: matrix.node-version == 20
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  deploy-preview:
    name: Deploy to Cloudflare Workers (preview)
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - name: Deploy to preview environment
        run: npx wrangler deploy --env preview
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## 6. Bun + Elysia — CI Matrix

```yaml
# .github/workflows/ci.yml
name: Bun CI

on: [push, pull_request]

jobs:
  test:
    name: Test (Bun ${{ matrix.bun-version }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        bun-version: ['1.1', '1.2']

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun ${{ matrix.bun-version }}
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ matrix.bun-version }}

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Type check
        run: bunx tsc --noEmit

      - name: Tests with coverage
        run: bun test --coverage --coverage-threshold 75
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          JWT_SECRET: ci-test-only
```

---

## 7. Django — Full CI Matrix

```yaml
# .github/workflows/ci.yml
name: Django CI

on: [push, pull_request]

jobs:
  test:
    name: Test (Python ${{ matrix.python-version }}, Django ${{ matrix.django-version }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.11', '3.12']
        django-version: ['5.0', '5.1']
      fail-fast: false

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: 'pip'

      - run: pip install django~=${{ matrix.django-version }} -r requirements.txt -r requirements-dev.txt

      - name: Run migrations
        run: python manage.py migrate
        env:
          DJANGO_SETTINGS_MODULE: config.settings.test
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run tests
        run: |
          pytest tests/ \
            --cov=. \
            --cov-report=lcov:coverage/lcov.info \
            --cov-fail-under=80 \
            -x -v
        env:
          DJANGO_SETTINGS_MODULE: config.settings.test
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          SECRET_KEY: ci-test-only
```

---

## 8. Parallel Test Splitting (Large Suites)

For suites > 5 min, split by file group:

```yaml
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]    # 4 parallel runners

    steps:
      - name: Run shard ${{ matrix.shard }} of 4
        run: npx jest --shard=${{ matrix.shard }}/4 --coverage
```

Or use `jest-runner-group` to split by test category:

```bash
npx jest --testPathPattern="tests/unit" &
npx jest --testPathPattern="tests/integration" --runInBand &
wait
```

---

## 9. Health Check — Smoke Test After Deploy

```yaml
  smoke-test:
    name: Post-deploy smoke test
    runs-on: ubuntu-latest
    needs: deploy
    steps:
      - name: Health check
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.yourapp.com/health/live)
          if [ "$STATUS" != "200" ]; then
            echo "Health check failed: $STATUS"
            exit 1
          fi
          echo "Health check passed: $STATUS"
```

---

## 10. Required Secrets

| Secret | Used By | Description |
|---|---|---|
| `CODECOV_TOKEN` | Coverage upload | Codecov project token |
| `SUPABASE_TEST_ANON_KEY` | Hono / Supabase tests | Test project anon key |
| `SUPABASE_TEST_SERVICE_ROLE_KEY` | Server-side test calls | Test project service role key |
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy | CF Workers deploy token |
| `STRYKER_DASHBOARD_API_KEY` | Mutation testing | Optional: publish score |

---

## 11. Common Pitfalls

| Pitfall | Fix |
|---|---|
| Integration tests run without `--runInBand` → port conflicts | Always use `--runInBand` for NestJS/Express integration tests |
| Postgres service not ready when tests start | Add `options: --health-cmd pg_isready --health-retries 5` |
| `DJANGO_SETTINGS_MODULE` not set → Django tests fail silently | Set in `env:` at job level and in `pytest.ini` |
| Bun version mismatch between local and CI | Pin exact version in `setup-bun` or use version file |
| `fail-fast: true` hides failures on some matrix combinations | Set `fail-fast: false` |
| Single Node version inflates "passed on all versions" claim | Always test on at least LTS and current |

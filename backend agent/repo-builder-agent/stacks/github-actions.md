# Stack Guide — GitHub Actions CI

Use this guide when the Repo Builder Agent generates a **GitHub Actions** CI/CD pipeline.

---

## When to Use GitHub Actions

Use when:
- The project is hosted on GitHub (most common case)
- The team wants native integration with pull requests, issues, and environments
- Marketplace actions are desirable (e.g. setup-node, Codecov, Docker buildx)

---

## Base File Location

```
.github/
└── workflows/
    ├── ci.yml         ← Main CI pipeline
    ├── release.yml    ← Production deploy (optional)
    └── pr-check.yml   ← Lightweight PR validation (optional)
```

---

## Node.js Monorepo CI (Turborepo)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

jobs:
  ci:
    name: Build, Lint, Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 2  # Required for Turbo --filter=[HEAD^1]

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm turbo lint

      - name: Type check
        run: pnpm turbo type-check

      - name: Build
        run: pnpm turbo build

      - name: Test
        run: pnpm turbo test
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

      - name: Security scan
        run: pnpm audit --audit-level=high
```

---

## Python (FastAPI) CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  ci:
    name: Build, Lint, Test
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip

      - name: Install dependencies
        run: pip install -r requirements.txt -r requirements-dev.txt

      - name: Lint (ruff)
        run: ruff check .

      - name: Type check (mypy)
        run: mypy .

      - name: Test (pytest)
        run: pytest --cov=app --cov-report=xml
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Security scan (pip-audit)
        run: pip-audit
```

---

## Docker Build CI

```yaml
# .github/workflows/ci.yml (Docker section)
  docker:
    name: Docker Build
    runs-on: ubuntu-latest
    needs: ci

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build image (no push on PR)
        uses: docker/build-push-action@v5
        with:
          context: ./apps/api
          push: false
          tags: my-project/api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Release / Deploy Workflow

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment: production
    needs: ci

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # Add deployment steps here based on target:
      # - AWS ECS: use aws-actions/amazon-ecs-deploy-task-definition
      # - Railway: use railway up
      # - Vercel: uses automatic git integration
```

---

## Secrets Management

Secrets must be configured in:
- **GitHub → Settings → Secrets and variables → Actions**

Common secrets:

```
DATABASE_URL
JWT_SECRET
STRIPE_SECRET_KEY
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
DOCKER_HUB_TOKEN
TURBO_TOKEN
TURBO_TEAM
```

Reference in workflow:
```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Branch Protection Rules (Recommended)

Set in GitHub → Settings → Branches → Add branch protection rule for `main`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging (select `ci` job)
- ✅ Require branches to be up to date before merging
- ✅ Require signed commits (optional, high-security projects)

---

## Common Patterns

| Pattern | Implementation |
|---|---|
| Cache node_modules | `actions/setup-node` with `cache: pnpm` |
| Cache pip packages | `actions/setup-python` with `cache: pip` |
| Run tests with DB | Use `services:` block for postgres/redis |
| Only run on changed packages | Turbo `--filter=[HEAD^1]` |
| Upload test coverage | `codecov/codecov-action@v4` |
| Notify on failure | `actions/slack-notify` or GitHub notifications |

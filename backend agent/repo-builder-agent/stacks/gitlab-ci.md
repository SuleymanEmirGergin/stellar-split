# Stack Guide — GitLab CI

Use this guide when the Repo Builder Agent generates a **GitLab CI/CD** pipeline.

---

## When to Use GitLab CI

Use when:
- The project is hosted on GitLab (self-hosted or GitLab.com)
- The team uses GitLab for issue tracking, MR reviews, and CI together
- GitLab Runner is already available (on-prem or GitLab.com shared runners)
- Docker-in-Docker (DinD) builds are needed

---

## Base File Location

```
.gitlab-ci.yml         ← Main pipeline config at repo root
```

GitLab CI uses a single YAML file by default. You can split it using `include`:

```yaml
include:
  - local: '.gitlab/ci/build.yml'
  - local: '.gitlab/ci/test.yml'
  - local: '.gitlab/ci/deploy.yml'
```

---

## Node.js Monorepo CI (Turborepo + pnpm)

```yaml
# .gitlab-ci.yml
image: node:20-alpine

variables:
  PNPM_VERSION: "9"
  TURBO_TOKEN: $TURBO_TOKEN
  TURBO_TEAM: $TURBO_TEAM

cache:
  key:
    files:
      - pnpm-lock.yaml
  paths:
    - .pnpm-store/

before_script:
  - npm install -g pnpm@$PNPM_VERSION
  - pnpm config set store-dir .pnpm-store
  - pnpm install --frozen-lockfile

stages:
  - lint
  - build
  - test
  - security
  - deploy

lint:
  stage: lint
  script:
    - pnpm turbo lint
    - pnpm turbo type-check

build:
  stage: build
  script:
    - pnpm turbo build
  artifacts:
    paths:
      - apps/*/dist
      - apps/*/.next
    expire_in: 1 hour

test:
  stage: test
  script:
    - pnpm turbo test
  services:
    - postgres:16-alpine
  variables:
    POSTGRES_DB: testdb
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    DATABASE_URL: postgresql://test:test@postgres/testdb
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

security:
  stage: security
  script:
    - pnpm audit --audit-level=high
  allow_failure: true
```

---

## Python (FastAPI) CI

```yaml
# .gitlab-ci.yml
image: python:3.12-slim

variables:
  PIP_CACHE_DIR: "$CI_PROJECT_DIR/.cache/pip"

cache:
  key: python-${CI_COMMIT_REF_SLUG}
  paths:
    - .cache/pip/

before_script:
  - pip install -r requirements.txt -r requirements-dev.txt

stages:
  - lint
  - test
  - security

lint:
  stage: lint
  script:
    - ruff check .
    - mypy .

test:
  stage: test
  services:
    - name: postgres:16
      alias: postgres
  variables:
    POSTGRES_DB: testdb
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    DATABASE_URL: postgresql://test:test@postgres/testdb
  script:
    - pytest --cov=app --cov-report=xml --cov-report=term
  coverage: '/TOTAL.*\s+(\d+)%$/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml

security:
  stage: security
  script:
    - pip-audit
  allow_failure: true
```

---

## Docker Build + Push

```yaml
docker-build:
  image: docker:24
  stage: build
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE/api:$CI_COMMIT_SHA ./apps/api
    - docker push $CI_REGISTRY_IMAGE/api:$CI_COMMIT_SHA
  only:
    - main
```

---

## Deploy Stage (Example — Railway or Custom)

```yaml
deploy-production:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - echo "Deploy to production"
    # Add deployment commands here
  environment:
    name: production
    url: https://api.myproject.com
  only:
    - main
  when: manual  # Require manual trigger for safety
```

---

## GitLab Secrets Management

Variables must be configured in:
- **GitLab → Settings → CI/CD → Variables**

Mark sensitive values as **Masked** and **Protected**.

Common variables:

```
DATABASE_URL
JWT_SECRET
STRIPE_SECRET_KEY
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
TURBO_TOKEN
TURBO_TEAM
CI_REGISTRY_USER       (GitLab built-in)
CI_REGISTRY_PASSWORD   (GitLab built-in)
CI_REGISTRY_IMAGE      (GitLab built-in)
```

---

## Branch Protection (Merge Request Rules)

Set in GitLab → Settings → Repository → Protected Branches:

- Protect `main` branch
- Require Merge Request approval before merging
- Enable "Pipelines must succeed" merge check

---

## Key Differences from GitHub Actions

| Feature | GitHub Actions | GitLab CI |
|---|---|---|
| Config file | `.github/workflows/*.yml` (multiple) | `.gitlab-ci.yml` (single, or `include`) |
| Secrets | GitHub Secrets | GitLab CI/CD Variables |
| Container registry | GitHub Container Registry | GitLab Container Registry (built-in) |
| Runners | GitHub-hosted | GitLab shared or self-hosted |
| Manual approval | `environment` with protection rules | `when: manual` |
| Artifacts | `artifacts:` with `uses:` | `artifacts:` native |
| Services (test DBs) | `services:` block | `services:` block |

---

## Common Patterns

| Pattern | GitLab Implementation |
|---|---|
| Cache node_modules | `cache: paths: [.pnpm-store/]` with lockfile key |
| Run tests with DB | `services:` block with postgres image |
| Coverage reporting | `coverage:` regex + `reports: coverage_report` |
| Docker build | `docker:24-dind` service + `docker build/push` |
| Manual deploy gate | `when: manual` on deploy job |
| Environment tracking | `environment: name: production` |

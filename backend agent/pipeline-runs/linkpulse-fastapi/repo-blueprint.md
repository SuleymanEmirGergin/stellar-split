# LinkPulse — Repo Blueprint

**Project:** LinkPulse — Link-in-bio analytics platform  
**Stack:** FastAPI + SQLAlchemy (async) + ARQ + PostgreSQL + Redis + S3  
**Deployment:** Railway (api + worker services)  
**Pipeline stage:** Stage 2 — Repo Builder output  
**Stack guide applied:** `stacks/fastapi.md`  
**Deployment guide applied:** `deployments/railway.md`

---

## 1. Repository Layout

```
linkpulse/
├── src/
│   ├── main.py                         ← FastAPI app factory + lifespan + middleware
│   ├── worker.py                        ← ARQ WorkerSettings + job functions
│   ├── core/
│   │   ├── config.py                    ← Pydantic Settings (env validation, fail-fast)
│   │   ├── database.py                  ← async_sessionmaker, get_db dependency
│   │   ├── redis.py                     ← Redis client singleton, get_redis dependency
│   │   ├── security.py                  ← JWT sign/verify, Argon2id hash/verify
│   │   └── logging.py                   ← structlog configuration + PHI-strip processor
│   ├── middleware/
│   │   ├── request_id.py               ← X-Request-Id correlation header
│   │   └── security_headers.py         ← CSP, HSTS, X-Frame-Options, X-Content-Type-Options
│   ├── adapters/
│   │   ├── resend_adapter.py            ← email send (isolated: failure must not break API)
│   │   └── s3_adapter.py               ← S3 put_object + delete_object
│   ├── models/                          ← SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── link.py
│   │   ├── click_event.py
│   │   ├── analytics_summary.py
│   │   ├── api_key.py
│   │   ├── email_verification_token.py
│   │   └── refresh_token.py
│   ├── schemas/                         ← Pydantic v2 request/response schemas
│   │   ├── auth.py
│   │   ├── link.py
│   │   ├── analytics.py
│   │   ├── api_key.py
│   │   └── user.py
│   ├── routers/
│   │   ├── auth.py                      ← /auth/*
│   │   ├── links.py                     ← /links/*
│   │   ├── public.py                    ← /p/:username/*
│   │   ├── analytics.py                 ← /analytics/*
│   │   ├── api_keys.py                  ← /api-keys/*
│   │   ├── users.py                     ← /users/me
│   │   └── health.py                    ← /health/live + /health/ready
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── link_service.py
│   │   ├── analytics_service.py
│   │   └── api_key_service.py
│   └── dependencies/
│       ├── auth.py                      ← get_current_user, require_verified, api_key_auth
│       └── idempotency.py               ← idempotency_key header dep + Redis cache check
├── alembic/
│   ├── env.py                           ← async migration runner
│   ├── versions/
│   │   └── 001_initial.py
│   └── alembic.ini
├── tests/
│   ├── conftest.py                      ← AsyncClient + test DB fixtures
│   ├── test_auth.py
│   ├── test_links.py
│   ├── test_click_tracking.py           ← rate limit + idempotency
│   └── test_analytics.py
├── infra/
│   ├── Dockerfile.api
│   └── Dockerfile.worker
├── .github/
│   └── workflows/
│       └── deploy-railway.yml
├── .env.example
├── .gitleaks.toml
├── SECURITY.md
├── ARCHITECTURE.md
├── requirements.txt
└── requirements-dev.txt
```

---

## 2. Key File Contents

### `src/main.py`
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import text

from src.core.config import settings
from src.core.database import engine
from src.core.redis import get_redis_client
from src.core.logging import configure_logging
from src.middleware.request_id import RequestIdMiddleware
from src.middleware.security_headers import SecurityHeadersMiddleware
from src.routers import auth, links, public, analytics, api_keys, users, health

configure_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup validation
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    redis = get_redis_client()
    await redis.ping()
    yield
    await engine.dispose()
    await redis.aclose()

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="LinkPulse API",
    version="1.0.0",
    docs_url="/docs" if settings.NODE_ENV != "production" else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-Id", "Idempotency-Key"],
    max_age=86400,
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(links.router, prefix="/links", tags=["links"])
app.include_router(public.router, prefix="/p", tags=["public"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(api_keys.router, prefix="/api-keys", tags=["api-keys"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(health.router, tags=["health"])
```

### `src/core/config.py`
```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    REDIS_URL: str
    JWT_SECRET: str          # min 32 chars — validated below
    JWT_EXPIRES_IN: int = 900
    APP_DOMAIN: str = "localhost"
    CORS_ALLOWED_ORIGINS: str = "http://localhost:5173"
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str = "us-east-1"
    S3_PUBLIC_BUCKET: str
    RESEND_API_KEY: str
    CLICK_RATE_LIMIT: int = 200
    AUTH_RATE_LIMIT: int = 10
    ANALYTICS_CACHE_TTL: int = 300
    NODE_ENV: str = "development"

    def model_post_init(self, _):
        if len(self.JWT_SECRET) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")

settings = Settings()
```

### `infra/Dockerfile.api`
```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim AS production
WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --chown=appuser:appgroup src/ ./src/
COPY --chown=appuser:appgroup alembic/ ./alembic/
COPY --chown=appuser:appgroup alembic.ini .

USER appuser
EXPOSE 8000

# Run migrations then start
CMD ["sh", "-c", "alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port 8000"]
```

### `infra/Dockerfile.worker`
```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim AS production
WORKDIR /app
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --chown=appuser:appgroup src/ ./src/
USER appuser
CMD ["python", "-m", "arq", "src.worker.WorkerSettings"]
```

### `.github/workflows/deploy-railway.yml`
```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: linkpulse_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports: ["5432:5432"]
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: pip-audit --requirement requirements.txt
      - run: python -m pytest tests/ --cov=src --cov-report=term-missing
        env:
          DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/linkpulse_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret-min-32-chars-for-ci-only
          AWS_ACCESS_KEY_ID: test
          AWS_SECRET_ACCESS_KEY: test
          AWS_REGION: us-east-1
          S3_PUBLIC_BUCKET: test-bucket
          RESEND_API_KEY: test
          NODE_ENV: test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Railway CLI
        run: npm install -g @railway/cli
      - name: Deploy API service
        run: railway up --service api --detach
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
      - name: Deploy Worker service
        run: railway up --service worker --detach
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
      - name: Health check smoke test
        run: |
          sleep 30
          curl -f ${{ vars.API_URL }}/health/ready || exit 1
```

---

## 3. `.env.example`

```bash
# Database (auto-provided by Railway plugin)
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/linkpulse

# Redis (auto-provided by Railway plugin)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=                   # openssl rand -hex 32
JWT_EXPIRES_IN=900             # 15 minutes

# App
APP_DOMAIN=linkpulse.io
CORS_ALLOWED_ORIGINS=https://app.linkpulse.io
NODE_ENV=production

# S3 Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_PUBLIC_BUCKET=linkpulse-public

# Email
RESEND_API_KEY=re_...

# Rate Limiting
CLICK_RATE_LIMIT=200
AUTH_RATE_LIMIT=10

# Analytics
ANALYTICS_CACHE_TTL=300
```

---

## 4. `ARCHITECTURE.md` Summary

```
linkpulse/
  API (FastAPI)                     ← HTTP requests from React SPA + API key clients
    │  ↓ JWT / API key auth
    │  ↓ slowapi rate limiting
    ├─ PostgreSQL (Railway)          ← User, Link, ClickEvent, AnalyticsSummary, ApiKey
    ├─ Redis (Railway)               ← ARQ jobs, rate-limit counters, analytics cache
    └─ S3 (AWS)                      ← Public avatars + link thumbnails

  Worker (ARQ)                       ← Async task processor
    ├─ record_click                   ← Async click write + clickCount increment
    ├─ send_verification_email        ← Resend integration
    ├─ aggregate_analytics (cron)     ← Hourly AnalyticsSummary upsert
    └─ send_weekly_digest (cron)      ← Monday 09:00 UTC digest email

  Public endpoint /p/:username        ← No auth; Redis-cached 5min; rate-limited 200/min IP
```

Mermaid dependency diagram:

```mermaid
graph LR
  client["React SPA / API Client"]
  api["API Service\n(FastAPI)"]
  worker["Worker\n(ARQ)"]
  pg["PostgreSQL"]
  redis["Redis"]
  s3["S3 Public Bucket"]
  resend["Resend Email"]

  client -->|HTTP| api
  api -->|SQLAlchemy async| pg
  api -->|ioredis / ARQ enqueue| redis
  api -->|boto3| s3
  worker -->|SQLAlchemy async| pg
  worker -->|ARQ dequeue| redis
  worker -->|HTTP| resend
```

---

## 5. `requirements.txt`

```
fastapi==0.115.0
uvicorn[standard]==0.32.0
sqlalchemy[asyncio]==2.0.36
asyncpg==0.30.0
alembic==1.14.0
arq==0.25.0
redis==5.2.0
pydantic==2.9.2
pydantic-settings==2.6.1
python-jose[cryptography]==3.3.0
argon2-cffi==23.1.0
boto3==1.35.0
Pillow==11.0.0
slowapi==0.1.9
structlog==24.4.0
resend==2.4.0
```

```
# requirements-dev.txt
pytest==8.3.4
pytest-asyncio==0.24.0
httpx==0.28.0
pytest-cov==6.0.0
pip-audit==2.7.3
```

---

## 6. `SECURITY.md` Excerpt

```markdown
# Security Policy

## Reporting a Vulnerability
Email: security@linkpulse.io

## Security Baseline
- JWT HS256, 15-min access token, 7-day refresh (HttpOnly cookie)
- Passwords: Argon2id (memoryCost=65536)
- API keys: SHA-256 hash only — never stored in plaintext
- Click events: IP address hashed (SHA-256) before persistence — raw IP never logged
- Rate limiting: slowapi + Redis sliding window
- Dependency audit: pip-audit on every CI run
- Secret scanning: gitleaks pre-commit hook
```

---

## 7. Railway Service Configuration

| Service | Source | Start Command | Health Check |
|---|---|---|---|
| `api` | GitHub repo | `sh -c "alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port 8000"` | `/health/ready` |
| `worker` | GitHub repo | `python -m arq src.worker.WorkerSettings` | — |
| `postgres` | Railway Plugin | Auto | Auto |
| `redis` | Railway Plugin | Auto | Auto |

Configure in Railway Dashboard:
- **API service** → Settings → Health Check Path → `/health/ready`
- Railway polls every 30s; 3 failures → restart
- Set `RAILWAY_TOKEN` secret in GitHub repository settings

---

## 8. Test Structure

```python
# tests/conftest.py
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from src.main import app
from src.core.database import get_db
from src.models import Base

TEST_DB_URL = "postgresql+asyncpg://test:test@localhost:5432/linkpulse_test"

@pytest_asyncio.fixture(scope="session")
async def db_engine():
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest_asyncio.fixture
async def client(db_engine):
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

```python
# tests/test_click_tracking.py — idempotency + rate limit
async def test_click_idempotency(client, seeded_link):
    # Same job_id within 5-second window should not duplicate ClickEvent
    for _ in range(3):
        res = await client.post(f"/p/testuser/{seeded_link.id}/click")
        assert res.status_code == 204

    # ARQ queue should have only 1 unique job (deduped by job_id)
    # Verify via Redis directly in integration test

async def test_click_rate_limit(client, seeded_link):
    for i in range(201):
        res = await client.post(f"/p/testuser/{seeded_link.id}/click",
                                headers={"X-Forwarded-For": "1.2.3.4"})
    assert res.status_code == 429
```

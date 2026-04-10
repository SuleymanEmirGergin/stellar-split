# FastAPI Stack Guide

Framework-specific patterns for the Backend Integrator Agent when the project uses **FastAPI** — Python's high-performance, async-first web framework. Typically paired with SQLAlchemy 2.0 (async), Alembic migrations, Pydantic v2, and ARQ (or Celery) for background jobs.

---

## 1. When to Choose FastAPI

| Factor | FastAPI | Django DRF | NestJS |
|---|---|---|---|
| Async-first | ✅ Native | ❌ Sync by default (ASGI opt-in) | Partial (Node.js event loop) |
| Auto-generated OpenAPI docs | ✅ Built-in | ❌ Requires drf-spectacular | ❌ Requires @nestjs/swagger |
| Performance (req/s) | Highest (Python) | Moderate | Moderate |
| Type safety | ✅ Pydantic v2, fully typed | Partial (serializers) | ✅ TypeScript |
| Admin panel | ❌ | ✅ django-admin | ❌ |
| ORM flexibility | Any ORM | Django ORM (tightly coupled) | TypeORM / Prisma |
| ML / AI model serving | ✅ Best fit | ❌ | ❌ |
| Python dev learning curve | Low | Low | High (TypeScript required) |
| Dependency injection | `Depends()` — explicit | Implicit (signals, middleware) | NestJS DI container |

**Choose FastAPI when:** async-first API, ML model serving, high req/s requirements, teams comfortable with explicit type annotations, or when auto-generated OpenAPI docs are required.

**Choose Django DRF when:** admin panel is required, heavy Django ORM features (signals, admin actions), or existing Django codebase.

---

## 2. Project Structure

```
src/
├── main.py                    ← FastAPI app instantiation + lifespan hooks
├── app/
│   ├── core/
│   │   ├── config.py          ← Pydantic Settings (env validation at startup)
│   │   ├── database.py        ← SQLAlchemy async engine + session factory
│   │   ├── security.py        ← JWT create/verify, Argon2 password hash
│   │   ├── dependencies.py    ← Depends() factories: get_db, get_current_user, require_role
│   │   └── middleware.py      ← Correlation ID (X-Request-ID), security headers
│   ├── models/                ← SQLAlchemy ORM models
│   │   ├── base.py            ← BaseModel: UUID id, created_at, updated_at
│   │   └── user.py
│   ├── schemas/               ← Pydantic v2 request/response schemas
│   │   └── user.py
│   ├── routers/               ← One APIRouter per domain
│   │   ├── auth.py
│   │   └── users.py
│   ├── services/              ← Business logic (no HTTP concerns)
│   │   └── user_service.py
│   └── repositories/          ← DB queries only (repository pattern)
│       └── user_repository.py
├── tests/
│   ├── conftest.py            ← Fixtures: test engine, db session, AsyncClient
│   ├── test_auth.py
│   └── test_health.py         ← CI smoke test for /health/ready
├── alembic/
│   ├── env.py                 ← Async Alembic configuration
│   └── versions/
├── requirements/
│   ├── base.txt
│   ├── production.txt
│   └── test.txt
├── Dockerfile
└── .env.example
```

---

## 3. Validation (Pydantic v2)

FastAPI uses Pydantic v2 for all request/response validation. Pydantic v2 is a breaking change from v1 — never mix patterns.

```python
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from typing import Generic, TypeVar
from datetime import datetime

T = TypeVar("T")

# ─── Request schema ───────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

# ─── Response schema ──────────────────────────────────────────────────────────
class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime

    # Pydantic v2 — replaces orm_mode = True
    model_config = ConfigDict(from_attributes=True)

# ─── Generic pagination wrapper ───────────────────────────────────────────────
class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool
```

**Key rules:**
- Always use separate `Create` / `Update` / `Response` schemas — never reuse the same schema for input and output
- `model_config = ConfigDict(from_attributes=True)` is required on all response schemas that map from SQLAlchemy ORM models
- `orm_mode = True` is the Pydantic **v1** style — do NOT use it in v2 projects (silent failure)
- `EmailStr` requires `pip install pydantic[email]`
- Use `Annotated[str, Field(min_length=1, max_length=255)]` for typed string constraints

---

## 4. Dependency Injection (FastAPI Depends)

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import verify_access_token
from app.models.user import User, UserRole

security = HTTPBearer()

# ─── Current user dependency ──────────────────────────────────────────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = verify_access_token(credentials.credentials)  # raises 401 if invalid
    user = await db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user

# ─── Role guard factory ───────────────────────────────────────────────────────
def require_role(*roles: UserRole):
    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return _check

# ─── Usage in router ──────────────────────────────────────────────────────────
@router.get("/admin/users", dependencies=[Depends(require_role(UserRole.ADMIN))])
async def list_users(db: AsyncSession = Depends(get_db)):
    ...

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
```

Dependency chain: `get_db → get_current_user → require_role(...)` — always compose via `Depends()`. Never call dependency functions directly in business logic.

---

## 5. Database Access (SQLAlchemy 2.0 Async)

```python
# app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import func
import uuid

engine = create_async_engine(
    settings.DATABASE_URL,  # postgresql+asyncpg://user:pass@host/db
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    """Session factory dependency — commits on success, rolls back on exception."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# ─── Base model ───────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass

class BaseModel(Base):
    __abstract__ = True
    id: Mapped[str] = mapped_column(default=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

# ─── Repository pattern ───────────────────────────────────────────────────────
from sqlalchemy import select
from sqlalchemy.orm import selectinload

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(self, email: str, hashed_password: str, full_name: str) -> User:
        user = User(email=email, hashed_password=hashed_password, full_name=full_name)
        self.db.add(user)
        await self.db.flush()  # Gets ID without committing — commit happens in get_db
        return user

    async def get_with_posts(self, user_id: str) -> User | None:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.posts))  # Eager load — never lazy in async
            .where(User.id == user_id)
        )
        return result.scalar_one_or_none()
```

**N+1 prevention:** Always use `selectinload()` or `joinedload()` for relationships. Accessing a lazy-loaded relationship in async context raises `MissingGreenlet` — there is no lazy load in async SQLAlchemy.

---

## 6. Migrations (Alembic)

```bash
# Initialize (once per project)
alembic init alembic

# Create migration from model changes
alembic revision --autogenerate -m "add users table"

# Apply all pending migrations
alembic upgrade head

# Downgrade one step
alembic downgrade -1

# Preview SQL before applying (recommended before every deploy)
alembic upgrade head --sql | head -100
```

**Async `alembic/env.py` configuration:**
```python
from app.models.base import Base
from app.core.config import settings
# Import ALL model modules — autogenerate only detects imported models
from app.models import user, post, comment  # noqa: F401
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

target_metadata = Base.metadata

def run_migrations_online():
    connectable = create_async_engine(settings.DATABASE_URL)

    async def _run():
        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)
        await connectable.dispose()

    asyncio.run(_run())
```

**Migration conventions:**
- One migration per logical change — never batch unrelated model changes
- Always review autogenerated migration SQL before applying: `alembic upgrade head --sql`
- Zero-downtime column addition: add column (nullable, no default) → deploy → backfill → add `NOT NULL` constraint in a follow-up migration
- Never delete a migration file — add a revert migration instead

---

## 7. Background Jobs

**ARQ** (preferred for FastAPI — async-native Redis queue, no Celery overhead):

```python
# worker/main.py
from arq import create_pool
from arq.connections import RedisSettings

REDIS_SETTINGS = RedisSettings.from_dsn(settings.REDIS_URL)

async def send_welcome_email(ctx, user_id: str):
    db: AsyncSession = ctx["db"]
    user = await user_repo.get(db, user_id)
    await email_service.send(user.email, template="welcome")

async def startup(ctx):
    ctx["db"] = AsyncSessionLocal()

async def shutdown(ctx):
    await ctx["db"].close()

class WorkerSettings:
    functions = [send_welcome_email]
    redis_settings = REDIS_SETTINGS
    on_startup = startup
    on_shutdown = shutdown
    max_jobs = 10
    job_timeout = 300

# Enqueue from API route
@router.post("/auth/register", status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    user = await user_repo.create(db, data)
    redis = await create_pool(REDIS_SETTINGS)
    await redis.enqueue_job("send_welcome_email", user.id)
    return UserResponse.model_validate(user)
```

**Celery** (use when Celery Beat periodic scheduler is required):

```python
from celery import Celery
celery_app = Celery("worker", broker=settings.REDIS_URL)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email(self, user_id: str):
    try:
        user = sync_get_user(user_id)
        email_service.send_sync(user.email, "welcome")
    except Exception as exc:
        raise self.retry(exc=exc)
```

**Decision:** Use **ARQ** for new FastAPI projects. Use **Celery** only when Celery Beat scheduler is explicitly required or existing Celery infrastructure is in place.

---

## 8. Security Defaults

```python
# main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address

app = FastAPI(title=settings.APP_NAME)

# Trusted host — prevents host header injection
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)

# CORS — never use ["*"] in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

# Security headers
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Rate limiting with slowapi
limiter = Limiter(key_func=get_remote_address, storage_uri=settings.REDIS_URL)
app.state.limiter = limiter

@router.post("/auth/login")
@limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    ...
```

**JWT + Argon2 password pattern:**

```python
from jose import jwt, JWTError
from argon2 import PasswordHasher
from datetime import datetime, timedelta, timezone

ph = PasswordHasher()

def hash_password(plain: str) -> str:
    return ph.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return ph.verify(hashed, plain)
    except Exception:
        return False

def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")

def verify_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
```

---

## 9. Config Management (Pydantic Settings)

```python
# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "MyApp"
    DEBUG: bool = False
    ALLOWED_HOSTS: list[str] = ["localhost"]

    # Database — postgresql+asyncpg://user:pass@host/db
    DATABASE_URL: str

    # Auth
    JWT_SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # CORS
    CORS_ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    # Observability (Rule 25 — mandatory)
    LOG_LEVEL: str = "info"
    SERVICE_NAME: str = "api"
    SENTRY_DSN: str = ""

settings = Settings()
```

**Startup DB validation** — fail fast, not on first request:

```python
from contextlib import asynccontextmanager
from sqlalchemy import text

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify DB is reachable before accepting traffic
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    yield
    # Shutdown: close connection pool
    await engine.dispose()

app = FastAPI(lifespan=lifespan)
```

---

## 10. Testing Setup

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.main import app
from app.core.database import get_db
from app.models.base import Base

TEST_DB_URL = "postgresql+asyncpg://test:test@localhost/test_db"

@pytest.fixture(scope="session")
def event_loop():
    import asyncio
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db(test_engine):
    Session = async_sessionmaker(test_engine, expire_on_commit=False)
    async with Session() as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client(db):
    app.dependency_overrides[get_db] = lambda: db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

# ─── Example tests ────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    response = await client.post("/auth/register", json={
        "email": "user@example.com",
        "password": "SecurePass1",
        "full_name": "Test User",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "user@example.com"
    assert "password" not in data  # Never expose hashed password

# Health smoke test (Rule 25 — CI gate)
@pytest.mark.asyncio
async def test_health_ready(client: AsyncClient):
    response = await client.get("/health/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
```

**Required test packages (`requirements/test.txt`):**
```
pytest==8.2.0
pytest-asyncio==0.23.7
httpx==0.27.0
```

Set asyncio mode in `pyproject.toml` or `pytest.ini`:
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
```

---

## 11. Common Pitfalls

| Pitfall | Problem | Solution |
|---|---|---|
| Sync function in async route | Blocks the event loop — all requests queue behind it | Use `asyncio.get_event_loop().run_in_executor(None, sync_fn)` or `starlette.concurrency.run_in_threadpool` |
| `orm_mode = True` (Pydantic v1 style) | Silent failure in Pydantic v2 — ORM objects not serialized | Use `model_config = ConfigDict(from_attributes=True)` |
| Lazy-loading SQLAlchemy relations in async | `MissingGreenlet` error at runtime | Always use `selectinload()` or `joinedload()` in queries |
| `session.commit()` inside repository | Breaks transaction boundary — caller cannot roll back | Use `session.flush()` in repo; commit only in `get_db()` dependency |
| Missing model imports in `alembic/env.py` | Autogenerate misses new tables | Import every model module explicitly in `env.py` |
| `CORS allow_origins=["*"]` | All origins allowed — security risk | Use explicit list from `settings.CORS_ALLOWED_ORIGINS` |
| Missing `asyncpg` package | SQLAlchemy async requires asyncpg for PostgreSQL | Add `asyncpg` to `base.txt`; use `postgresql+asyncpg://` URL prefix |
| `datetime.utcnow()` | Deprecated in Python 3.12+; returns timezone-naive datetime | Use `datetime.now(timezone.utc)` |
| Missing `asyncio_mode = "auto"` | Async tests not collected by pytest | Add to `pyproject.toml`: `asyncio_mode = "auto"` |
| `expire_on_commit=True` (default) | SQLAlchemy expires all attributes after commit — lazy load fails in async | Use `async_sessionmaker(..., expire_on_commit=False)` |

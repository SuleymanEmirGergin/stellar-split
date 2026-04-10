# LinkPulse — Backend Blueprint

**Project:** LinkPulse — Link-in-bio analytics platform  
**Stack:** FastAPI + PostgreSQL + SQLAlchemy (async) + ARQ + Redis + S3  
**Deployment:** Railway (API service + Worker service)  
**Pipeline stage:** Stage 1 — Backend Integrator output  
**Playbooks applied:** auth, uploads, analytics, rate-limiting, api-keys, caching, background-jobs, security, observability, idempotency

---

## 1. Entities & Data Model

### User
```python
class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(unique=True, nullable=False)
    username: Mapped[str] = mapped_column(unique=True, nullable=False)   # public page slug
    display_name: Mapped[str] = mapped_column(nullable=False)
    password_hash: Mapped[str] = mapped_column(nullable=False)
    bio: Mapped[Optional[str]] = mapped_column(String(160))
    avatar_url: Mapped[Optional[str]]
    theme: Mapped[str] = mapped_column(default="default")
    email_verified: Mapped[bool] = mapped_column(default=False)
    notify_weekly_digest: Mapped[bool] = mapped_column(default=True)
    notify_milestone: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    links: Mapped[List["Link"]] = relationship(back_populates="user", order_by="Link.position")
    api_keys: Mapped[List["ApiKey"]] = relationship(back_populates="user")
```

### Link
```python
class Link(Base):
    __tablename__ = "links"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(80), nullable=False)
    url: Mapped[str] = mapped_column(nullable=False)
    thumbnail_url: Mapped[Optional[str]]
    is_active: Mapped[bool] = mapped_column(default=True)
    position: Mapped[int] = mapped_column(nullable=False)           # drag-and-drop order
    click_count: Mapped[int] = mapped_column(default=0)             # denormalized counter
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="links")

    __table_args__ = (
        Index("ix_links_user_position", "user_id", "position"),
    )
```

### ClickEvent
```python
class ClickEvent(Base):
    __tablename__ = "click_events"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    link_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("links.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(nullable=False)      # link owner's user_id (denormalized)
    ip_hash: Mapped[Optional[str]]                                   # SHA-256(IP) — never raw IP
    country: Mapped[Optional[str]] = mapped_column(String(2))        # ISO 3166-1 alpha-2
    city: Mapped[Optional[str]]
    referrer: Mapped[Optional[str]]
    user_agent: Mapped[Optional[str]]
    clicked_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        Index("ix_click_events_user_id_clicked_at", "user_id", "clicked_at"),
        Index("ix_click_events_link_id", "link_id"),
    )
```

### AnalyticsSummary (pre-computed, hourly cron)
```python
class AnalyticsSummary(Base):
    __tablename__ = "analytics_summaries"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    date: Mapped[date] = mapped_column(nullable=False)              # UTC date of the summary
    total_clicks: Mapped[int] = mapped_column(default=0)
    unique_clicks: Mapped[int] = mapped_column(default=0)           # distinct ip_hash count
    top_links: Mapped[dict] = mapped_column(JSON, default=list)     # [{link_id, title, clicks}]
    top_referrers: Mapped[dict] = mapped_column(JSON, default=list) # [{referrer, count}]
    top_countries: Mapped[dict] = mapped_column(JSON, default=list) # [{country, count}]

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_analytics_user_date"),
    )
```

### ApiKey
```python
class ApiKey(Base):
    __tablename__ = "api_keys"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(8), nullable=False)  # first 8 chars, plaintext
    key_hash: Mapped[str] = mapped_column(unique=True, nullable=False)   # SHA-256 of full key
    scopes: Mapped[list] = mapped_column(JSON, default=list)             # ["links:read", "links:write"]
    last_used_at: Mapped[Optional[datetime]]
    expires_at: Mapped[Optional[datetime]]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="api_keys")
```

### EmailVerificationToken
```python
class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    token_hash: Mapped[str] = mapped_column(unique=True)    # SHA-256 of token
    expires_at: Mapped[datetime]
    used_at: Mapped[Optional[datetime]]
```

---

## 2. API Endpoints

### Auth
| Method | Route | Auth | Body / Params | Response |
|---|---|---|---|---|
| POST | `/auth/register` | None | `{email, username, displayName, password}` | `201 {id, email, username}` |
| POST | `/auth/login` | None | `{email, password}` | `200 {accessToken}` + `Set-Cookie: refresh_token` |
| POST | `/auth/logout` | JWT | — | `204` |
| POST | `/auth/refresh` | Cookie | — | `200 {accessToken}` |
| GET | `/auth/verify-email` | None | `?token=...` | `200 {message}` |
| POST | `/auth/resend-verification` | JWT | — | `202` |

### Links (authenticated)
| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/links` | JWT | Returns ordered list of user's links |
| POST | `/links` | JWT | `Idempotency-Key` header required |
| GET | `/links/:id` | JWT | |
| PATCH | `/links/:id` | JWT | Partial update |
| DELETE | `/links/:id` | JWT | Reindexes position of remaining links |
| PATCH | `/links/:id/toggle` | JWT | Toggle `is_active` |
| PUT | `/links/reorder` | JWT | Body: `{order: [id1, id2, ...]}` |

### Public (no auth)
| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/p/:username` | None | Returns public page data (active links only) |
| POST | `/p/:username/:linkId/click` | None | Rate-limited 200/min per IP; returns `204` immediately; ClickEvent written by ARQ task |

### Analytics (authenticated)
| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/analytics/summary` | JWT | `?period=7d\|30d\|90d` — returns KPI cards data |
| GET | `/analytics/timeseries` | JWT | `?start=&end=&granularity=day\|week` |
| GET | `/analytics/top-links` | JWT | `?limit=10&period=7d` |
| GET | `/analytics/referrers` | JWT | `?period=7d&limit=20` |
| GET | `/analytics/geo` | JWT | `?period=7d` — country breakdown |

### API Keys (authenticated)
| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api-keys` | JWT | List user's keys (prefix + scopes, never hash) |
| POST | `/api-keys` | JWT | Returns full key once: `{id, key, prefix, scopes}` |
| DELETE | `/api-keys/:id` | JWT | Immediate invalidation |

### Users (authenticated or API key)
| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/users/me` | JWT | |
| PATCH | `/users/me` | JWT | Profile + notification preferences |
| POST | `/users/me/avatar` | JWT | Multipart upload → S3 |
| POST | `/users/me/links/:id/thumbnail` | JWT | Multipart upload → S3 |

### Health (no auth)
| Method | Route | Notes |
|---|---|---|
| GET | `/health/live` | Liveness — returns `{status: "ok"}` |
| GET | `/health/ready` | Readiness — checks DB + Redis |

---

## 3. Authentication & Authorization

**Access Token:** JWT HS256, 15-minute expiry. Payload: `{sub: user_id, email, username}`.  
**Refresh Token:** Opaque token stored in HttpOnly cookie (`refresh_token`), 7-day expiry. DB-backed (`RefreshToken` table) for revocation.  
**Email Verification:** Required for sending digest emails and creating API keys. Dashboard accessible without verification (banner shown).

### Auth Dependency Chain (FastAPI)
```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def get_current_user(
    token: str = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(token.credentials, settings.JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_verified(user: User = Depends(get_current_user)) -> User:
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    return user
```

### API Key Authentication
```python
async def get_current_user_or_api_key(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    # Try JWT first
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer lp_"):   # API key prefix
        raw_key = auth_header.removeprefix("Bearer ")
        key_hash = sha256(raw_key.encode()).hexdigest()
        api_key = await db.execute(
            select(ApiKey).where(ApiKey.key_hash == key_hash)
        )
        api_key = api_key.scalar_one_or_none()
        if not api_key or (api_key.expires_at and api_key.expires_at < datetime.utcnow()):
            raise HTTPException(status_code=401, detail="Invalid API key")
        # Update last_used_at (fire-and-forget)
        await db.execute(
            update(ApiKey).where(ApiKey.id == api_key.id)
            .values(last_used_at=datetime.utcnow())
        )
        return await db.get(User, api_key.user_id)
    # Fall back to JWT
    return await get_current_user(request, db)
```

---

## 4. Background Jobs (ARQ)

ARQ is the async Python Redis Queue — simpler than Celery, native `async/await`.

### Worker entry point
```python
# src/worker.py
from arq import create_pool
from arq.connections import RedisSettings

async def record_click(ctx, link_id: str, user_id: str, click_data: dict):
    """Write ClickEvent and increment link.click_count atomically."""
    async with get_db() as db:
        await db.execute(insert(ClickEvent).values(
            link_id=link_id,
            user_id=user_id,
            **click_data,
        ))
        await db.execute(
            update(Link).where(Link.id == link_id)
            .values(click_count=Link.click_count + 1)
        )
        await db.commit()

async def send_verification_email(ctx, user_id: str, token: str):
    async with get_db() as db:
        user = await db.get(User, uuid.UUID(user_id))
        await resend_adapter.send(
            to=user.email,
            subject="Verify your LinkPulse email",
            template="email-verification",
            context={"name": user.display_name, "token": token},
        )

async def aggregate_analytics(ctx):
    """Hourly cron: compute AnalyticsSummary for all users from ClickEvent."""
    async with get_db() as db:
        yesterday = date.today() - timedelta(days=1)
        # Upsert daily summary per user
        rows = await db.execute(
            select(ClickEvent.user_id, func.count().label("total"))
            .where(func.date(ClickEvent.clicked_at) == yesterday)
            .group_by(ClickEvent.user_id)
        )
        for user_id, total in rows:
            await db.execute(
                insert(AnalyticsSummary)
                .values(user_id=user_id, date=yesterday, total_clicks=total)
                .on_conflict_do_update(
                    index_elements=["user_id", "date"],
                    set_={"total_clicks": total}
                )
            )
        await db.commit()

async def send_weekly_digest(ctx):
    """Monday 09:00 UTC: send weekly digest to opted-in users."""
    async with get_db() as db:
        users = await db.execute(
            select(User).where(User.notify_weekly_digest == True)
        )
        for user in users.scalars():
            summary = await get_weekly_summary(db, user.id)
            await resend_adapter.send(
                to=user.email,
                subject="Your LinkPulse week in review",
                template="weekly-digest",
                context={"name": user.display_name, **summary},
            )

class WorkerSettings:
    functions = [record_click, send_verification_email]
    cron_jobs = [
        cron(aggregate_analytics, hour={*range(24)}, minute=0),   # every hour
        cron(send_weekly_digest, weekday=0, hour=9, minute=0),     # Monday 09:00 UTC
    ]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    job_timeout = 300
```

### Job Dispatch (HTTP handler)
```python
# In click tracking endpoint — fire and forget
@router.post("/p/{username}/{link_id}/click", status_code=204)
async def track_click(
    username: str,
    link_id: uuid.UUID,
    request: Request,
    redis: Redis = Depends(get_redis),
):
    # Rate limit check (200 req/min per IP)
    ip = request.client.host
    key = f"rate:click:{ip}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 60)
    if count > 200:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    # Enqueue — idempotency via job_id prevents double-write on client retry
    click_data = extract_click_data(request)
    await redis.enqueue_job(
        "record_click",
        str(link_id),
        str(user_id),
        click_data,
        _job_id=f"click-{link_id}-{ip}-{int(time.time() // 5)}",  # 5-second dedup window
    )
```

---

## 5. Idempotency

| Endpoint | Pattern | Implementation |
|---|---|---|
| `POST /links` | Idempotency Key (client-provided) | Redis SETEX 24h — `idem:create-link:{key}` |
| `POST /p/:username/:linkId/click` | Deterministic job_id | ARQ `_job_id` with 5-second window |
| `POST /api-keys` | Natural key (user_id + name unique) | DB unique constraint |
| `send_weekly_digest` cron | Deterministic cron job_id | ARQ cron runs at fixed schedule — no explicit dedup needed |

```python
# Idempotency middleware for POST /links
@router.post("/links", status_code=201)
async def create_link(
    dto: LinkCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
):
    if idempotency_key:
        cache_key = f"idem:create-link:{current_user.id}:{idempotency_key}"
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)

    # Assign position = max(existing) + 1
    max_pos = await db.execute(
        select(func.max(Link.position)).where(Link.user_id == current_user.id)
    )
    position = (max_pos.scalar() or 0) + 1
    link = Link(**dto.model_dump(), user_id=current_user.id, position=position)
    db.add(link)
    await db.commit()
    await db.refresh(link)

    result = LinkResponse.model_validate(link).model_dump()
    if idempotency_key:
        await redis.setex(cache_key, 86400, json.dumps(result, default=str))
    return result
```

---

## 6. Caching Strategy

| Data | Cache Key | TTL | Invalidation |
|---|---|---|---|
| Public page (`GET /p/:username`) | `page:{username}` | 5 min | On any link update/create/delete for that user |
| Analytics summary | `analytics:{user_id}:summary:{period}` | 5 min | On `aggregate_analytics` cron completion |
| Top links | `analytics:{user_id}:top-links:{period}` | 5 min | Same |
| API key lookup | `apikey:{key_hash}` | 60 sec | On key revocation |

```python
# Cache decorator
async def get_public_page(username: str, redis: Redis, db: AsyncSession):
    cache_key = f"page:{username}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    user = await db.execute(select(User).where(User.username == username))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404)

    links = await db.execute(
        select(Link)
        .where(Link.user_id == user.id, Link.is_active == True)
        .order_by(Link.position)
    )
    result = PublicPageResponse(user=user, links=links.scalars().all())
    data = result.model_dump_json()
    await redis.setex(cache_key, 300, data)
    return result
```

---

## 7. File Uploads (S3)

Both avatars and link thumbnails are public (no signed URLs). Direct upload from server after validation.

```python
# POST /users/me/avatar
@router.post("/users/me/avatar")
async def upload_avatar(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    s3: S3Client = Depends(get_s3),
):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=422, detail="Invalid file type")
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="File exceeds 2MB limit")

    # Resize to 256x256 (Pillow)
    img = Image.open(io.BytesIO(contents))
    img = img.resize((256, 256), Image.LANCZOS)
    buffer = io.BytesIO()
    img.save(buffer, format="WEBP", quality=85)
    buffer.seek(0)

    key = f"avatars/{current_user.id}/{uuid.uuid4()}.webp"
    await s3.put_object(
        Bucket=settings.S3_PUBLIC_BUCKET,
        Key=key,
        Body=buffer,
        ContentType="image/webp",
        ACL="public-read",
    )
    avatar_url = f"https://{settings.S3_PUBLIC_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
    await db.execute(update(User).where(User.id == current_user.id).values(avatar_url=avatar_url))
    await db.commit()
    return {"avatarUrl": avatar_url}
```

---

## 8. API Key Generation

```python
import secrets
from hashlib import sha256

def generate_api_key() -> tuple[str, str, str]:
    """Returns (full_key, prefix, key_hash)"""
    raw = secrets.token_urlsafe(32)           # 43-char URL-safe key
    full_key = f"lp_{raw}"                    # prefix "lp_" identifies LinkPulse keys
    key_prefix = full_key[:8]                 # "lp_xxxxx" — displayed in UI
    key_hash = sha256(full_key.encode()).hexdigest()
    return full_key, key_prefix, key_hash

# POST /api-keys
@router.post("/api-keys", status_code=201)
async def create_api_key(
    dto: ApiKeyCreate,
    current_user: User = Depends(require_verified),
    db: AsyncSession = Depends(get_db),
):
    full_key, key_prefix, key_hash = generate_api_key()
    api_key = ApiKey(
        user_id=current_user.id,
        name=dto.name,
        key_prefix=key_prefix,
        key_hash=key_hash,
        scopes=dto.scopes,
    )
    db.add(api_key)
    await db.commit()
    # Return full key ONCE — never stored, never retrievable again
    return {"id": str(api_key.id), "key": full_key, "prefix": key_prefix, "scopes": dto.scopes}
```

---

## 9. Security Baseline

| Control | Implementation |
|---|---|
| Security headers | `SecurityHeadersMiddleware` (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) |
| CORS | `CORS_ALLOWED_ORIGINS` env var, `allow_credentials=True` |
| Rate limiting | `slowapi` — 200/min on click endpoint, 10/15min on auth endpoints |
| Password hashing | Argon2id (argon2-cffi, `memoryCost=65536`) |
| JWT algorithm | HS256, `iss` claim validated |
| API key storage | SHA-256 hash only — plaintext never stored |
| Raw IP privacy | IP hashed (SHA-256) before storing in `ClickEvent.ip_hash` |
| Request ID | `X-Request-Id` correlation header on all responses |
| Log redaction | structlog processor strips `password`, `token`, `key` fields |

### Security Headers Middleware
```python
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response
```

---

## 10. Observability

```python
# src/core/logging.py — structlog with request context
import structlog

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        # Strip sensitive fields
        lambda _, __, event_dict: {
            k: "[REDACTED]" if k in {"password", "token", "key", "key_hash"} else v
            for k, v in event_dict.items()
        },
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
)

# Request ID middleware
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
    structlog.contextvars.bind_contextvars(request_id=request_id, path=str(request.url.path))
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    structlog.contextvars.clear_contextvars()
    return response
```

### Health Endpoints
```python
@router.get("/health/live")
async def health_live():
    return {"status": "ok"}

@router.get("/health/ready")
async def health_ready(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    checks = {}
    try:
        await db.execute(text("SELECT 1"))
        checks["db"] = "ok"
    except Exception:
        checks["db"] = "fail"
    try:
        await redis.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "fail"

    all_ok = all(v == "ok" for v in checks.values())
    if not all_ok:
        raise HTTPException(status_code=503, detail={"status": "degraded", "checks": checks})
    return {"status": "ok", "checks": checks}
```

---

## 11. Environment Variables

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/linkpulse

# Redis / ARQ
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=<min-32-chars>
JWT_EXPIRES_IN=900              # 15 minutes

# S3 / Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_PUBLIC_BUCKET=linkpulse-public

# Email
RESEND_API_KEY=re_...

# App
APP_DOMAIN=linkpulse.io
CORS_ALLOWED_ORIGINS=https://app.linkpulse.io
NODE_ENV=production

# Rate limiting (click endpoint)
CLICK_RATE_LIMIT=200           # per minute per IP
AUTH_RATE_LIMIT=10             # per 15 min per IP

# Analytics
ANALYTICS_CACHE_TTL=300        # seconds
```

---

## 12. Implementation Order

1. **Database models + Alembic migrations** — User, Link, ClickEvent, AnalyticsSummary, ApiKey, EmailVerificationToken
2. **Core infrastructure** — async SQLAlchemy session factory, Redis client, structlog setup, Zod→Pydantic Settings validation
3. **Auth module** — register, login (Argon2id verify), JWT sign/verify, refresh token rotation, email verification flow
4. **Links module** — CRUD + reorder (position reassignment in transaction) + toggle; idempotency key middleware
5. **Public endpoints** — `GET /p/:username` (cached), `POST /p/:username/:linkId/click` (rate-limited, ARQ dispatch)
6. **S3 upload endpoints** — avatar + link thumbnail (Pillow resize, public ACL)
7. **API keys module** — generate + hash + scoped auth dependency
8. **Analytics module** — query AnalyticsSummary + Redis cache layer
9. **ARQ worker** — record_click, send_verification_email, aggregate_analytics cron, send_weekly_digest cron
10. **Security middleware** — SecurityHeadersMiddleware, CORS, slowapi rate limiting, request ID
11. **Health endpoints** — `/health/live`, `/health/ready`
12. **Tests** — pytest-asyncio + httpx AsyncClient; unit tests for auth, link service; integration tests for click tracking + idempotency

---

## 13. Risks & Edge Cases

| Risk | Mitigation |
|---|---|
| Click tracking endpoint DoS | Redis sliding window rate limit (200/min per IP); ARQ job_id dedup window (5s) |
| ClickEvent table grows unbounded | Partition by month (pg_partman) or archive after 1 year to cold storage |
| Link position gaps after delete | Reindex positions in same transaction as delete; use `LOCK TABLE links WHERE user_id = ?` |
| Analytics lag (hourly cron) | Dashboard shows "last updated X min ago" badge; real-time counter from `Link.click_count` |
| S3 public bucket misconfiguration | Bucket policy enforces public-read; no private data in public bucket — verified in CI with `aws s3api get-bucket-acl` |
| API key brute force | Key is 43-char URL-safe (256 bits) — computationally infeasible; also rate-limited by global limiter |
| Weekly digest duplicate sends | ARQ cron schedules are idempotent by design — same job_id per schedule window |

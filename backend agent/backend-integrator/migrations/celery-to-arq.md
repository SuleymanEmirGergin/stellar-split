# Migration Guide — Celery → ARQ (Python Async Workers)

Migrate from Celery (synchronous task queue) to ARQ (async-native Redis queue) for FastAPI-based backends.

**When to use this guide:**
- The backend is FastAPI (async) and Celery feels out of place (sync workers in async stack)
- You want native `async/await` in task functions without `celery.contrib.asyncio` hacks
- Lower memory footprint and simpler deployment (ARQ worker = single Python process)
- You're already using Redis and don't need RabbitMQ or AMQP

**When NOT to migrate:**
- Django backend (Celery + Django is a well-supported pairing — keep it)
- Complex routing keys, priority queues, or broadcast patterns (Celery has richer routing)
- You need task results stored in a DB backend (not Redis) — Celery supports more result backends

---

## 1. Comparison

| Feature | Celery | ARQ |
|---|---|---|
| Async workers | ⚠️ Requires `gevent` or `eventlet` | ✅ Native `asyncio` |
| FastAPI integration | ⚠️ Awkward (different event loop) | ✅ Same loop |
| Configuration | `celery.py` + `tasks.py` | `worker.py` (single file) |
| Retry | `task.retry(countdown=60)` | `ctx['redis'].enqueue_job(...)` or `retry=3` |
| Scheduled tasks | Celery Beat (separate process) | `cron_jobs=[]` in `WorkerSettings` |
| Monitoring | Flower (separate service) | `arq` CLI or custom |
| Bundle size | Heavy (kombu, amqp, billiard) | Lightweight |
| Result storage | Redis / DB / custom | Redis (default) |
| Concurrency model | Prefork / eventlet / gevent | asyncio coroutines |

---

## 2. Installation

```bash
# Remove Celery
pip uninstall celery kombu amqp billiard vine celery-redis

# Install ARQ
pip install arq

# Redis client (already installed for Celery Redis, but verify)
pip install redis[hiredis]    # hiredis for better performance
```

Update `requirements.txt`:
```
# Remove:
# celery==5.x.x
# kombu==5.x.x

# Add:
arq==0.25.0
redis[hiredis]==5.0.0
```

---

## 3. Configuration Migration

**Before (Celery — `app/celery_app.py`):**
```python
from celery import Celery
import os

celery_app = Celery(
    'my_app',
    broker=os.environ['CELERY_BROKER_URL'],      # redis://localhost:6379/0
    backend=os.environ['CELERY_RESULT_BACKEND'],
    include=['app.tasks.email', 'app.tasks.exports'],
)

celery_app.conf.update(
    task_serializer='json',
    result_expires=3600,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
```

**After (ARQ — `app/worker.py`):**
```python
from arq import create_pool
from arq.connections import RedisSettings
import os

# Import all task functions (they become ARQ jobs)
from app.tasks.email import send_invitation_email, send_export_ready_email
from app.tasks.exports import export_responses_csv

class WorkerSettings:
    # Redis connection
    redis_settings = RedisSettings.from_dsn(os.environ['REDIS_URL'])

    # Register task functions
    functions = [
        send_invitation_email,
        send_export_ready_email,
        export_responses_csv,
    ]

    # Scheduled tasks (replaces Celery Beat)
    cron_jobs = [
        # cron(cleanup_expired_tokens, hour={2}, minute={0}),   # 2am daily
    ]

    # Worker settings
    max_jobs = 10           # concurrent jobs per worker process
    job_timeout = 300       # seconds before job is considered failed
    keep_result = 3600      # seconds to keep result in Redis
    retry_jobs = True       # retry on unexpected failure
```

---

## 4. Task Function Migration

**Before (Celery — `app/tasks/email.py`):**
```python
from celery import shared_task
from app.services.email import EmailService

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_invitation_email(self, workspace_id: str, invitee_email: str, role: str):
    try:
        EmailService().send_invitation(workspace_id, invitee_email, role)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

@shared_task(max_retries=3, acks_late=True)
def send_export_ready_email(user_email: str, download_url: str):
    EmailService().send_export_ready(user_email, download_url)
```

**After (ARQ — `app/tasks/email.py`):**
```python
from arq import ArqRedis
from app.services.email import EmailService
import logging

logger = logging.getLogger(__name__)

# ARQ task: first argument is always ctx (contains redis, job_id, etc.)
async def send_invitation_email(
    ctx: dict,
    workspace_id: str,
    invitee_email: str,
    role: str,
) -> dict:
    """Send workspace invitation email."""
    try:
        await EmailService().send_invitation_async(workspace_id, invitee_email, role)
        logger.info(f"Invitation sent to {invitee_email} for workspace {workspace_id}")
        return {'status': 'sent', 'email': invitee_email}
    except Exception as e:
        logger.error(f"Failed to send invitation email: {e}")
        raise   # ARQ will retry based on WorkerSettings.retry_jobs

async def send_export_ready_email(
    ctx: dict,
    user_email: str,
    download_url: str,
) -> dict:
    """Notify user that their CSV export is ready."""
    await EmailService().send_export_ready_async(user_email, download_url)
    return {'status': 'sent', 'email': user_email}
```

### Key differences in task functions:
- `@shared_task` decorator removed — just a plain async function
- First argument is always `ctx: dict` (contains `ctx['redis']`, `ctx['job_id']`, etc.)
- Function must be `async def` (this is the whole point of ARQ)
- No `self.retry()` — raise the exception, ARQ retries automatically

---

## 5. Enqueuing Tasks

**Before (Celery — from FastAPI route):**
```python
from app.tasks.email import send_invitation_email

@router.post('/workspace/invitations')
async def invite_member(data: InviteRequest, db: AsyncSession = Depends(get_db)):
    # ... save invitation to DB ...
    # Enqueue Celery task
    send_invitation_email.delay(workspace_id=str(workspace.id), invitee_email=data.email, role=data.role)
    return {'status': 'invitation_sent'}
```

**After (ARQ — from FastAPI route):**
```python
from arq import ArqRedis
from app.worker import send_invitation_email  # just the function reference

@router.post('/workspace/invitations')
async def invite_member(
    data: InviteRequest,
    db: AsyncSession = Depends(get_db),
    redis: ArqRedis = Depends(get_redis),     # injected ARQ pool
):
    # ... save invitation to DB ...
    # Enqueue ARQ job
    await redis.enqueue_job(
        'send_invitation_email',
        workspace_id=str(workspace.id),
        invitee_email=data.email,
        role=data.role,
        _job_id=f"invite:{workspace.id}:{data.email}",  # dedup key
    )
    return {'status': 'invitation_sent'}
```

### ARQ Redis pool (FastAPI lifespan):
```python
# app/dependencies.py
from arq import create_pool
from arq.connections import RedisSettings
from fastapi import Request

async def get_redis(request: Request) -> ArqRedis:
    return request.app.state.arq_redis

# app/main.py
from contextlib import asynccontextmanager
from arq import create_pool
from arq.connections import RedisSettings

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.arq_redis = await create_pool(
        RedisSettings.from_dsn(settings.REDIS_URL)
    )
    yield
    await app.state.arq_redis.close()

app = FastAPI(lifespan=lifespan)
```

---

## 6. Scheduled Tasks (Beat → ARQ Cron)

**Before (Celery Beat — `celery_app.py`):**
```python
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    'cleanup-expired-tokens': {
        'task': 'app.tasks.maintenance.cleanup_expired_tokens',
        'schedule': crontab(hour=2, minute=0),
    },
}
```

**After (ARQ Cron — `worker.py`):**
```python
from arq.cron import cron
from app.tasks.maintenance import cleanup_expired_tokens

class WorkerSettings:
    cron_jobs = [
        cron(cleanup_expired_tokens, hour=2, minute=0),  # 2am daily
    ]
```

The cron task function:
```python
async def cleanup_expired_tokens(ctx: dict) -> None:
    """Remove expired invitation tokens older than 7 days."""
    async with get_db_session() as db:
        await db.execute(
            delete(WorkspaceInvitation)
            .where(WorkspaceInvitation.expires_at < datetime.utcnow())
        )
        await db.commit()
```

---

## 7. Retry Configuration

**Before (Celery):**
```python
@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(RequestException,),
    retry_backoff=True,
)
def send_email_with_retry(self, ...):
    ...
```

**After (ARQ):**
```python
# In WorkerSettings:
class WorkerSettings:
    retry_jobs = True       # retry on unhandled exception
    max_tries = 3           # default max retries per job

# Per-job override (when enqueuing):
await redis.enqueue_job(
    'send_invitation_email',
    ...,
    _max_tries=5,           # override for this specific job
    _defer_by=60,           # delay start by 60 seconds (retry backoff)
)
```

For manual exponential backoff in the task:
```python
async def send_invitation_email(ctx: dict, email: str, ...) -> dict:
    retry_count = ctx.get('job_try', 1)
    try:
        await email_service.send(email, ...)
    except TransientError:
        backoff = 2 ** retry_count          # 2s, 4s, 8s
        raise Retry(defer=backoff)          # reschedule with backoff
```

---

## 8. Running the Worker

**Before (Celery):**
```bash
celery -A app.celery_app worker --loglevel=info --concurrency=4
celery -A app.celery_app beat --loglevel=info     # separate process for scheduled tasks
```

**After (ARQ — single process for both jobs and cron):**
```bash
arq app.worker.WorkerSettings

# With log level:
arq app.worker.WorkerSettings --log-level info
```

**Docker Compose:**
```yaml
services:
  api:
    build: .
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

  worker:
    build: .
    command: arq app.worker.WorkerSettings   # replaces celery worker + celery beat
    environment:
      REDIS_URL: redis://redis:6379/0
    depends_on: [redis]

  redis:
    image: redis:7-alpine
```

ARQ combines worker + scheduler in a single process — no separate beat service needed.

---

## 9. Testing ARQ Tasks

```python
# tests/test_tasks.py
import pytest
from unittest.mock import AsyncMock, patch
from app.tasks.email import send_invitation_email

@pytest.mark.asyncio
async def test_send_invitation_email_success():
    ctx = {'redis': AsyncMock(), 'job_id': 'test-job-001'}
    with patch('app.tasks.email.EmailService') as MockEmail:
        MockEmail.return_value.send_invitation_async = AsyncMock()
        result = await send_invitation_email(ctx, 'ws-123', 'user@example.com', 'editor')
    assert result['status'] == 'sent'
    assert result['email'] == 'user@example.com'

@pytest.mark.asyncio
async def test_send_invitation_email_propagates_exception():
    ctx = {'redis': AsyncMock(), 'job_id': 'test-job-002', 'job_try': 1}
    with patch('app.tasks.email.EmailService') as MockEmail:
        MockEmail.return_value.send_invitation_async = AsyncMock(
            side_effect=ConnectionError('SMTP timeout')
        )
        with pytest.raises(ConnectionError):
            await send_invitation_email(ctx, 'ws-123', 'user@example.com', 'editor')
```

---

## 10. Migration Checklist

```
[ ] pip uninstall celery kombu amqp billiard
[ ] pip install arq redis[hiredis]
[ ] Remove celery.py / celery_app.py
[ ] Remove @shared_task decorators from all task files
[ ] Convert task functions to async def with ctx as first argument
[ ] Create worker.py with WorkerSettings class
[ ] Register all task functions in WorkerSettings.functions[]
[ ] Move Celery Beat schedules to WorkerSettings.cron_jobs[]
[ ] Replace .delay() with await redis.enqueue_job('function_name', ...)
[ ] Add ARQ pool to FastAPI lifespan (create_pool + close)
[ ] Add get_redis dependency for routes that enqueue jobs
[ ] Update docker-compose: one worker service (no separate beat)
[ ] Update CI: no celery beat, just arq worker.WorkerSettings
[ ] Write async unit tests for task functions (mock ctx dict)
```

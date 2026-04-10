# Django Stack Guide

Framework-specific patterns for the Backend Integrator Agent when the project uses **Django + Django REST Framework (DRF)** — the standard Python web stack for full-featured backends with a mature ORM, admin panel, and rich ecosystem.

---

## 1. When to Choose Django/DRF

| Factor | Django + DRF | FastAPI | Flask |
|---|---|---|---|
| ORM | Built-in (powerful) | SQLAlchemy (external) | SQLAlchemy (external) |
| Admin panel | ✅ Auto-generated | ❌ Manual | ❌ Manual |
| Auth out of the box | ✅ Full (sessions, permissions) | ❌ External | ❌ External |
| Async support | Partial (ASGI, async views) | ✅ Native | ❌ Limited |
| Schema generation | drf-spectacular / drf-yasg | ✅ Automatic | External |
| Learning curve | Medium | Low | Low |
| Ecosystem | Most mature Python web | Growing fast | Minimal |
| Background tasks | Celery (external) | Celery / ARQ | Celery |

**Choose Django when**: rapid prototyping with a database-heavy domain, built-in admin is valuable, team has Django experience, or the project needs the full Django ecosystem (allauth, guardian, channels).

---

## 2. Project Structure

```
project_name/
  manage.py
  config/
    __init__.py
    settings/
      base.py           ← Shared settings
      development.py    ← Dev overrides
      production.py     ← Prod overrides
    urls.py             ← Root URL config
    wsgi.py
    asgi.py             ← ASGI for async/WebSocket
  apps/
    users/
      models.py
      serializers.py
      views.py
      urls.py
      permissions.py
      tests/
        test_models.py
        test_views.py
    payments/
      models.py
      serializers.py
      views.py
      urls.py
    core/
      models.py         ← Abstract base models (TimestampedModel, etc.)
      pagination.py
      exceptions.py
      permissions.py
  requirements/
    base.txt
    development.txt
    production.txt
  Dockerfile
  docker-compose.yml
```

---

## 3. Abstract Base Models

```python
# apps/core/models.py
import uuid
from django.db import models

class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True

class BaseModel(UUIDModel, TimestampedModel):
    class Meta:
        abstract = True
```

---

## 4. Custom User Model

Always define a custom user model before first migration:

```python
# apps/users/models.py
from django.contrib.auth.models import AbstractUser
from apps.core.models import UUIDModel

class User(UUIDModel, AbstractUser):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar_url = models.URLField(blank=True)
    is_email_verified = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'
```

```python
# config/settings/base.py
AUTH_USER_MODEL = 'users.User'
```

---

## 5. Serializers + ViewSets

```python
# apps/users/serializers.py
from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'avatar_url', 'created_at']
        read_only_fields = ['id', 'created_at']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['email', 'password', 'name']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
```

```python
# apps/users/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import User
from .serializers import UserSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Never expose all users to non-admins
        if self.request.user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get'])
    def me(self, request):
        return Response(UserSerializer(request.user).data)
```

---

## 6. JWT Authentication (SimpleJWT)

```python
# requirements/base.txt
djangorestframework-simplejwt==5.*
```

```python
# config/settings/base.py
from datetime import timedelta

INSTALLED_APPS = [
    ...
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.CursorPagination',
    'PAGE_SIZE': 20,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': env('JWT_SECRET'),
    'AUTH_HEADER_TYPES': ('Bearer',),
}
```

```python
# apps/users/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, RegisterView, LogoutView

urlpatterns = [
    path('auth/register/', RegisterView.as_view()),
    path('auth/login/', LoginView.as_view()),
    path('auth/refresh/', TokenRefreshView.as_view()),
    path('auth/logout/', LogoutView.as_view()),
]
```

---

## 7. Permissions + RBAC

```python
# apps/core/permissions.py
from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_staff

class IsOwner(BasePermission):
    """Object-level permission — user can only modify their own resources."""
    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id or request.user.is_staff

class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.is_staff
```

---

## 8. Security Defaults

Apply to **every** Django project. Configures security headers, CORS allowlist, rate limiting, and request ID tracing.

### Django SECURE_* Settings

```python
# config/settings/base.py
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True                  # HTTP → HTTPS redirect (disable behind a proxy that handles this)
SECURE_HSTS_SECONDS = 31536000              # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_BROWSER_XSS_FILTER = True           # X-XSS-Protection: 1; mode=block
SECURE_CONTENT_TYPE_NOSNIFF = True         # X-Content-Type-Options: nosniff
X_FRAME_OPTIONS = 'DENY'                   # X-Frame-Options: DENY
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS')
```

```python
# config/settings/development.py — relax for local dev only
SECURE_SSL_REDIRECT = False
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
```

### CORS (django-cors-headers)

```python
# requirements/base.txt
django-cors-headers==4.*
```

```python
# config/settings/base.py
INSTALLED_APPS = [..., 'corsheaders']

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be FIRST — before CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    ...
]

CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS')   # e.g. ['https://app.example.com']
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'content-type',
    'authorization',
    'x-request-id',
    'idempotency-key',
]
CORS_PREFLIGHT_MAX_AGE = 86400   # Preflight cache: 24 hours
# CORS_ALLOW_ALL_ORIGINS = True  # NEVER in production
```

**Rule:** `CORS_ALLOW_ALL_ORIGINS = True` is forbidden. Always use `CORS_ALLOWED_ORIGINS` backed by an env var list.

### Security Headers Middleware (CSP + Referrer-Policy)

Django's built-in settings cover HSTS and X-Frame-Options, but CSP and Referrer-Policy require custom middleware:

```python
# apps/core/middleware.py
class SecurityHeadersMiddleware:
    """Adds Content-Security-Policy, Referrer-Policy, and Permissions-Policy headers."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self'; "
            "frame-ancestors 'none'"
        )
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        return response
```

```python
# config/settings/base.py
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'apps.core.middleware.SecurityHeadersMiddleware',  # after CORS, before auth
    ...
]
```

### Rate Limiting (django-ratelimit)

```python
# requirements/base.txt
django-ratelimit==4.*
```

```python
# Function-based views
from django_ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='10/15m', method='POST', block=True)
def login_view(request):
    ...
```

```python
# Class-based / DRF ViewSet
from django_ratelimit.core import is_ratelimited
from rest_framework.exceptions import Throttled

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if is_ratelimited(request, key='ip', rate='10/15m', method='POST', increment=True):
            raise Throttled(detail='Too many login attempts. Try again in 15 minutes.')
        # ... auth logic
```

```python
# config/settings/base.py — use Redis cache backend for distributed rate limiting
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': env('REDIS_URL'),
    }
}
RATELIMIT_USE_CACHE = 'default'   # django-ratelimit reads this key
```

**Rule:** Always configure Redis as the cache backend for rate limiting — the default in-memory cache resets on pod restart and doesn't work across multiple instances.

### Request ID Middleware

```python
# apps/core/middleware.py
import uuid

class RequestIdMiddleware:
    """Propagates X-Request-Id header for distributed tracing."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get('X-Request-Id') or str(uuid.uuid4())
        request.request_id = request_id
        response = self.get_response(request)
        response['X-Request-Id'] = request_id
        return response
```

```python
# config/settings/base.py
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'apps.core.middleware.RequestIdMiddleware',    # early — before auth middleware
    'apps.core.middleware.SecurityHeadersMiddleware',
    ...
]
```

Include `request.request_id` in every log entry and error response.

---

## 9. Database Patterns

### Select Related (avoid N+1)

```python
# Always use select_related / prefetch_related
orders = Order.objects.select_related('user', 'product').prefetch_related('items').filter(
    user=request.user,
    status='pending',
).order_by('-created_at')
```

### Cursor Pagination

```python
# apps/core/pagination.py
from rest_framework.pagination import CursorPagination

class StandardCursorPagination(CursorPagination):
    page_size = 20
    ordering = '-created_at'
    cursor_query_param = 'cursor'
```

### Raw SQL (parameterized only)

```python
# SAFE — parameterized
from django.db import connection

with connection.cursor() as cursor:
    cursor.execute(
        "SELECT id, email FROM users WHERE created_at > %s",
        [cutoff_date]  # ← always use params list, never f-string
    )
    rows = cursor.fetchall()

# NEVER: f"WHERE email = '{user_input}'"  ← SQL injection
```

---

## 10. Background Tasks (Celery)

```python
# config/celery.py
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

app = Celery('project')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
```

```python
# config/settings/base.py
CELERY_BROKER_URL = env('REDIS_URL')
CELERY_RESULT_BACKEND = env('REDIS_URL')
CELERY_TASK_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_ALWAYS_EAGER = False   # set True in tests only
```

```python
# apps/notifications/tasks.py
from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_task(self, user_id: str, template: str, context: dict):
    try:
        user = User.objects.get(id=user_id)
        email_service.send(user.email, template, context)
    except Exception as exc:
        logger.error(f'Email task failed: {exc}', exc_info=True)
        raise self.retry(exc=exc)
```

---

## 11. Testing (pytest-django)

```python
# requirements/development.txt
pytest-django==4.*
pytest-factoryboy
factory-boy
faker
```

```python
# conftest.py
import pytest
from rest_framework.test import APIClient
from apps.users.tests.factories import UserFactory

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def authenticated_client(api_client):
    user = UserFactory()
    api_client.force_authenticate(user=user)
    return api_client, user
```

```python
# apps/users/tests/test_views.py
import pytest
from django.urls import reverse

@pytest.mark.django_db
class TestRegisterView:
    def test_creates_user(self, api_client):
        url = reverse('user-register')
        data = {'email': 'test@example.com', 'password': 'securepass123', 'name': 'Test User'}

        response = api_client.post(url, data, format='json')

        assert response.status_code == 201
        assert response.data['email'] == 'test@example.com'

    def test_duplicate_email_returns_400(self, api_client):
        UserFactory(email='existing@example.com')
        data = {'email': 'existing@example.com', 'password': 'securepass123', 'name': 'Test'}

        response = api_client.post(reverse('user-register'), data, format='json')

        assert response.status_code == 400
```

---

## 12. Environment Variables

```python
# config/settings/base.py — use django-environ
import environ

env = environ.Env()
environ.Env.read_env()

SECRET_KEY = env('DJANGO_SECRET_KEY')
DEBUG = env.bool('DEBUG', default=False)
DATABASES = {'default': env.db('DATABASE_URL')}
```

```bash
DJANGO_SECRET_KEY=your-50-char-secret-key
DEBUG=false
DATABASE_URL=postgres://user:pass@localhost:5432/dbname
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-jwt-secret
ALLOWED_HOSTS=api.example.com,localhost
CORS_ALLOWED_ORIGINS=https://app.example.com
```

---

## 13. Common Pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| No custom User model | Can't extend user later | Always define before first migration |
| N+1 queries | Slow list endpoints | Use `select_related` / `prefetch_related` on all ViewSets |
| `DEBUG=True` in production | Security warning + leaked tracebacks | Set `DEBUG=False`; use `ALLOWED_HOSTS` |
| Celery tasks not autodiscovered | Tasks not running | Ensure `tasks.py` exists in each app; call `autodiscover_tasks()` |
| Blocking ORM in async views | Deadlock / `SynchronousOnlyOperation` | Use `sync_to_async` wrapper or `database_sync_to_async` |
| Serializer `many=True` without pagination | Returns unbounded list | Always paginate list endpoints |
| `CharField` without `max_length` | Migration error | Always set `max_length` on CharField |

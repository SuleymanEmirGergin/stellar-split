# QA Agent Examples

This file contains worked examples of the QA Agent generating test plans and code.

---

## Example 1: SaaS Dashboard (Playwright POM)

**Input**: `repo-handoff.json` with a multi-tenant dashboard and Stripe integration.

**Command**: `/generate e2e`

**Output**:

### 1. `tests/e2e/pages/DashboardPage.ts`
```typescript
import { Page, expect } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/dashboard');
  }

  async createProject(name: string) {
    await this.page.click('[data-testid="create-project-btn"]');
    await this.page.fill('[name="projectName"]', name);
    await this.page.click('text=Submit');
    await this.page.waitForSelector(`text=${name}`);
  }

  async verifySubscriptionStatus(status: string) {
    const badge = this.page.locator('[data-testid="subscription-badge"]');
    await expect(badge).toContainText(status);
  }
}
```

### 2. `tests/e2e/specs/project-creation.spec.ts`
```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { v4 as uuid } from 'uuid';

test.describe('Project Management', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await loginPage.login(process.env.TEST_USER, process.env.TEST_PASS);
  });

  test('should create a new project with unique ID', async ({ page }) => {
    const projectName = `Test Project ${uuid()}`;
    await dashboardPage.navigate();
    await dashboardPage.createProject(projectName);
    
    // Cleanup: API call or UI action to delete test data
    await page.request.delete(`/api/projects/${projectName}`);
  });
});
```

---

## Example 2: API Integration (Jest + Node.js)

**Input**: `repo-handoff.json` with auth-protected entities.

**Command**: `/generate integration`

**Output**:

### 3. `tests/integration/user-auth.test.ts`
```typescript
import request from 'supertest';
import { app } from '../../src/app';
import { v4 as uuid } from 'uuid';

describe('Auth Endpoints', () => {
  const testUser = {
    email: `qa-${uuid()}@example.com`,
    password: 'Password123!',
  };

  test('POST /api/auth/register should create new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(res.status).toBe(201);
    expect(res.body.email).toBe(testUser.email);
  });

  test('POST /api/auth/login should return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send(testUser);
    
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('GET /api/me should fail without token', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });
});
```

---

## Example 3: External Integration Mocking (Stripe)

**Input**: `repo-handoff.json` with `payment-webhook` external trigger.

**Command**: `/generate all`

**Output**:

### 4. `tests/mocks/stripe.mock.ts`
```typescript
import { jest } from '@jest/globals';

export const mockStripe = {
  customers: {
    create: jest.fn().mockResolvedValue({ id: 'cus_mock123' }),
  },
  subscriptions: {
    create: jest.fn().mockResolvedValue({ id: 'sub_mock123', status: 'active' }),
  },
};

// In test-setup.ts
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});
```

### 5. `tests/integration/webhooks.test.ts`
```typescript
test('POST /api/webhooks/stripe should handle invoice.paid', async () => {
  const payload = {
    type: 'invoice.paid',
    data: { object: { customer: 'cus_mock123', subscription: 'sub_mock123' } },
  };

  const res = await request(app)
    .post('/api/webhooks/stripe')
    .set('Stripe-Signature', 'mock_sig') // Logic to generate mock sig
    .send(payload);

  expect(res.status).toBe(200);
});
```

---

## Example 4: FastAPI + pytest (Python Stack)

**Input**: `repo-handoff.json` with `project.stack = "fastapi"` and auth-protected endpoints.

**Command**: `/generate integration`

**Output**:

### 6. `tests/conftest.py`
```python
import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db import Base, get_db

TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/test_db"

@pytest_asyncio.fixture(scope="session")
async def async_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest_asyncio.fixture
async def async_client(async_engine):
    async def override_get_db():
        TestingSessionLocal = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
        async with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def auth_headers(async_client):
    """Register + login, return Bearer token headers."""
    email = f"qa-{uuid.uuid4()}@example.com"
    await async_client.post("/api/auth/register", json={
        "email": email, "password": "Password123!", "name": "QA User"
    })
    res = await async_client.post("/api/auth/login", json={
        "email": email, "password": "Password123!"
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

### 7. `pytest.ini`
```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

### 8. `tests/integration/test_auth.py`
```python
import uuid
import pytest

@pytest.mark.asyncio
async def test_register_returns_201(async_client):
    email = f"qa-{uuid.uuid4()}@example.com"
    res = await async_client.post("/api/auth/register", json={
        "email": email, "password": "Password123!", "name": "QA"
    })
    assert res.status_code == 201
    assert res.json()["email"] == email

@pytest.mark.asyncio
async def test_register_rejects_duplicate_email(async_client):
    email = f"qa-{uuid.uuid4()}@example.com"
    payload = {"email": email, "password": "Password123!", "name": "QA"}
    await async_client.post("/api/auth/register", json=payload)
    res = await async_client.post("/api/auth/register", json=payload)
    assert res.status_code == 409

@pytest.mark.asyncio
async def test_login_returns_token(async_client):
    email = f"qa-{uuid.uuid4()}@example.com"
    await async_client.post("/api/auth/register", json={
        "email": email, "password": "Password123!", "name": "QA"
    })
    res = await async_client.post("/api/auth/login", json={
        "email": email, "password": "Password123!"
    })
    assert res.status_code == 200
    assert "access_token" in res.json()

@pytest.mark.asyncio
async def test_me_requires_auth(async_client):
    res = await async_client.get("/api/me")
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_me_returns_profile(async_client, auth_headers):
    res = await async_client.get("/api/me", headers=auth_headers)
    assert res.status_code == 200
    assert "email" in res.json()
```

---

## Example 5: Django REST Framework + pytest-django

**Input**: `repo-handoff.json` with `project.stack = "django"` and RBAC-protected admin endpoints.

**Command**: `/generate integration`

**Output**:

### 9. `conftest.py`
```python
import pytest
import uuid
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def regular_user(db):
    email = f"qa-{uuid.uuid4()}@example.com"
    user = User.objects.create_user(
        email=email, password="Password123!", username=email
    )
    yield user
    user.delete()

@pytest.fixture
def admin_user(db):
    email = f"qa-admin-{uuid.uuid4()}@example.com"
    user = User.objects.create_superuser(
        email=email, password="AdminPass123!", username=email
    )
    yield user
    user.delete()

@pytest.fixture
def auth_client(api_client, regular_user):
    api_client.force_authenticate(user=regular_user)
    return api_client

@pytest.fixture
def admin_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client
```

### 10. `pytest.ini`
```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.test
python_files = tests/*/test_*.py
markers =
    django_db: marks tests that access the database
    slow: marks tests as slow (deselect with '-m "not slow"')
```

### 11. `tests/integration/test_users.py`
```python
import uuid
import pytest

@pytest.mark.django_db
def test_register_creates_user(api_client):
    email = f"qa-{uuid.uuid4()}@example.com"
    res = api_client.post("/api/auth/register/", {
        "email": email, "password": "Password123!", "name": "QA User"
    })
    assert res.status_code == 201
    assert res.data["email"] == email

@pytest.mark.django_db
def test_register_rejects_invalid_email(api_client):
    res = api_client.post("/api/auth/register/", {
        "email": "not-an-email", "password": "Password123!", "name": "QA"
    })
    assert res.status_code == 400

@pytest.mark.django_db
def test_me_unauthenticated(api_client):
    res = api_client.get("/api/me/")
    assert res.status_code == 401

@pytest.mark.django_db
def test_me_returns_own_profile(auth_client, regular_user):
    res = auth_client.get("/api/me/")
    assert res.status_code == 200
    assert res.data["email"] == regular_user.email

@pytest.mark.django_db
def test_admin_list_forbidden_for_regular_user(auth_client):
    """RBAC: regular user must not access admin endpoint."""
    res = auth_client.get("/api/admin/users/")
    assert res.status_code == 403

@pytest.mark.django_db
def test_admin_list_accessible_for_admin(admin_client):
    res = admin_client.get("/api/admin/users/")
    assert res.status_code == 200
    assert isinstance(res.data, list)

@pytest.mark.django_db
def test_delete_own_account(auth_client, regular_user):
    res = auth_client.delete(f"/api/users/{regular_user.id}/")
    assert res.status_code == 204
    # Verify cleanup
    from django.contrib.auth import get_user_model
    assert not get_user_model().objects.filter(id=regular_user.id).exists()
```

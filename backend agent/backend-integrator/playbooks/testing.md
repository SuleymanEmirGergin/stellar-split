# Playbook — Testing Strategy

Apply this playbook when the Backend Integrator Agent detects that a production-grade test suite is required.

**Triggers:**
- Any project with more than 2 API endpoints
- Projects with payment flows
- Projects with authentication
- Projects with background jobs or webhooks
- Any project where `/scaffold` or `/assemble` mode is used

---

## Overview

A backend testing strategy must cover three layers:

| Layer | Scope | Tooling |
|---|---|---|
| Unit | Individual functions, services, utilities | Jest (Node.js) / Pytest (Python) |
| Integration | API endpoints with real or test DB | Jest + Supertest / Pytest + httpx |
| E2E | Full request-to-database flow | Optional (Playwright or Postman) |

This playbook covers **Unit** and **Integration** testing. E2E is optional and project-dependent.

---

## Decision: Jest/Supertest (Node.js) vs Pytest (Python)

| Signal | Use Jest/Supertest | Use Pytest |
|---|---|---|
| Backend language | TypeScript / JavaScript | Python |
| Framework | Express, NestJS, Hono, Fastify | FastAPI, Django, Flask |
| ORM | Prisma, Drizzle, TypeORM | SQLAlchemy, Tortoise, Beanie |

Both can coexist in a monorepo if the system has mixed-language services.

---

## Section A — Node.js Testing (Jest + Supertest)

### Installation

```bash
pnpm add -D jest ts-jest @types/jest supertest @types/supertest
```

### jest.config.ts

```ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterFramework: ['<rootDir>/tests/setup.ts'],
};

export default config;
```

### Test Database Strategy

Never use the production database for tests.

Options (in order of preference):

1. **In-memory SQLite** — For fast unit/integration tests (Prisma + `@prisma/adapter-libsql`, Drizzle + `better-sqlite3`)
2. **Docker PostgreSQL** — For integration tests that require real Postgres behavior
3. **Test schema isolation** — Run each test suite against a separate schema prefix

Docker Compose test service:
```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
```

### Test Setup File

```ts
// tests/setup.ts
import { prisma } from '../src/lib/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  // Truncate test data between tests
  const tablenames = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;
  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }
});
```

### Unit Test Example — Service Layer

```ts
// src/services/__tests__/user.service.test.ts
import { UserService } from '../user.service';
import { mockPrismaClient } from '../../__mocks__/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user and hash the password', async () => {
      mockPrismaClient.user.create.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        createdAt: new Date(),
      });

      const result = await UserService.createUser({
        email: 'test@example.com',
        password: 'plaintext',
      });

      expect(result.email).toBe('test@example.com');
      expect(mockPrismaClient.user.create).toHaveBeenCalledTimes(1);
    });

    it('should throw if email already exists', async () => {
      mockPrismaClient.user.create.mockRejectedValue(
        new Error('Unique constraint failed on email')
      );

      await expect(
        UserService.createUser({ email: 'dup@example.com', password: 'pw' })
      ).rejects.toThrow();
    });
  });
});
```

### Integration Test Example — API Endpoint

```ts
// src/routes/__tests__/auth.route.test.ts
import request from 'supertest';
import { app } from '../../app';

describe('POST /auth/register', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new@example.com', password: 'ValidPass1!' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('should return 400 for missing email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ password: 'ValidPass1!' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 409 for duplicate email', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'ValidPass1!' });

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'ValidPass1!' });

    expect(res.statusCode).toBe(409);
  });
});
```

---

## Section B — Python Testing (Pytest + httpx)

### Installation

```bash
pip install pytest pytest-asyncio httpx pytest-cov factory-boy
```

### pytest.ini / pyproject.toml

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "--cov=app --cov-report=term-missing --cov-fail-under=75"
```

### Test Database Strategy

Use a separate test database via environment variable override.

```python
# conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.main import app
from app.database import Base

TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5432/testdb"

@pytest.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db(test_engine):
    async with AsyncSession(test_engine) as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
```

### Unit Test Example — Service Layer

```python
# tests/unit/test_user_service.py
import pytest
from unittest.mock import AsyncMock, patch
from app.services.user import UserService

@pytest.mark.asyncio
async def test_create_user_hashes_password():
    mock_repo = AsyncMock()
    mock_repo.create.return_value = {"id": "1", "email": "test@example.com"}

    service = UserService(repo=mock_repo)
    result = await service.create_user(email="test@example.com", password="plain")

    assert result["email"] == "test@example.com"
    mock_repo.create.assert_called_once()
    call_args = mock_repo.create.call_args[1]
    assert call_args["password"] != "plain"  # Must be hashed


@pytest.mark.asyncio
async def test_create_user_raises_on_duplicate(db):
    mock_repo = AsyncMock()
    mock_repo.create.side_effect = ValueError("Email already exists")

    service = UserService(repo=mock_repo)
    with pytest.raises(ValueError, match="Email already exists"):
        await service.create_user(email="dup@example.com", password="pw")
```

### Integration Test Example — API Endpoint

```python
# tests/integration/test_auth.py
import pytest

@pytest.mark.asyncio
async def test_register_success(client):
    res = await client.post("/auth/register", json={
        "email": "new@example.com",
        "password": "ValidPass1!"
    })
    assert res.status_code == 201
    data = res.json()["data"]
    assert "id" in data
    assert "password" not in data


@pytest.mark.asyncio
async def test_register_missing_email(client):
    res = await client.post("/auth/register", json={
        "password": "ValidPass1!"
    })
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "ValidPass1!"}
    await client.post("/auth/register", json=payload)
    res = await client.post("/auth/register", json=payload)
    assert res.status_code == 409
```

---

## Coverage Requirements

| Layer | Minimum Coverage |
|---|---|
| Service layer | 85% |
| Route/controller layer | 80% |
| Utility/helper functions | 90% |
| Background jobs | 70% |
| Overall | 75–80% |

These thresholds should be enforced in CI — fail the pipeline if coverage drops below minimum.

---

## What Must Be Tested

| Component | Test Type | Priority |
|---|---|---|
| Auth endpoints (register, login, refresh) | Integration | 🔴 Required |
| Mutation endpoints (create, update, delete) | Integration | 🔴 Required |
| Validation rejection (missing/invalid fields) | Integration | 🔴 Required |
| Permission denials (401, 403) | Integration | 🔴 Required |
| Service layer business logic | Unit | 🔴 Required |
| Webhook signature verification | Unit | 🟡 Required if webhooks exist |
| Background job handlers | Unit | 🟡 Required if jobs exist |
| Search/filter/pagination | Integration | 🟡 Required if tables exist |
| File upload limits | Integration | 🟢 Recommended |

---

## Files to Create

```
apps/api/
├── tests/
│   ├── setup.ts           (Node.js) or conftest.py (Python)
│   ├── unit/
│   │   └── services/
│   └── integration/
│       └── routes/
├── jest.config.ts         (Node.js only)
└── pytest.ini             (Python only)
```

---

## Environment Variables for Testing

```env
# .env.test
DATABASE_URL=postgresql://test:test@localhost:5433/testdb
JWT_SECRET=test-secret-do-not-use-in-production
NODE_ENV=test
```

Never use production credentials in test environments.

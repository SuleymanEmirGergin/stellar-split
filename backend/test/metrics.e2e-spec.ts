import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { MetricsController } from '../src/metrics/metrics.controller';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createMockPrisma } from './helpers/mock-prisma';
import { TEST_JWT_SECRET } from './helpers/mock-jwt';

const TEST_METRICS_SECRET = 'test-metrics-secret-xyz';

describe('Metrics E2E', () => {
  let app: INestApplication;
  const mockRedis = { get: jest.fn(), set: jest.fn().mockResolvedValue('OK'), del: jest.fn().mockResolvedValue(1) };

  beforeAll(async () => {
    // Set the secret before the controller reads it
    process.env.METRICS_SECRET = TEST_METRICS_SECRET;

    const mockPrisma = createMockPrisma();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [MetricsController],
      providers: [
        AuthService,
        JwtStrategy,
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: unknown) => {
              const cfg: Record<string, unknown> = { JWT_SECRET: TEST_JWT_SECRET, NODE_ENV: 'test' };
              return key in cfg ? cfg[key] : def;
            },
            getOrThrow: () => TEST_JWT_SECRET,
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    delete process.env.METRICS_SECRET;
    await app.close();
  });

  afterEach(() => jest.clearAllMocks());

  // ─── No credentials ───────────────────────────────────────────────────────────

  describe('GET /metrics — no credentials', () => {
    it('403 — no Authorization header and no token param', async () => {
      await request(app.getHttpServer())
        .get('/metrics')
        .expect(403);
    });

    it('403 — wrong Bearer token', async () => {
      await request(app.getHttpServer())
        .get('/metrics')
        .set('Authorization', 'Bearer wrong-secret')
        .expect(403);
    });

    it('403 — wrong query token', async () => {
      await request(app.getHttpServer())
        .get('/metrics')
        .query({ token: 'wrong-secret' })
        .expect(403);
    });
  });

  // ─── Valid Bearer token ───────────────────────────────────────────────────────

  describe('GET /metrics — Bearer token', () => {
    it('200 — correct Bearer token returns prometheus text', async () => {
      const res = await request(app.getHttpServer())
        .get('/metrics')
        .set('Authorization', `Bearer ${TEST_METRICS_SECRET}`)
        .expect(200);

      expect(res.headers['content-type']).toMatch(/openmetrics-text|text\/plain/);
      // Prometheus format always starts with # HELP or a metric name
      expect(res.text).toMatch(/# HELP|stellarsplit_/);
    });

    it('200 — response includes registered stellarsplit_ metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/metrics')
        .set('Authorization', `Bearer ${TEST_METRICS_SECRET}`)
        .expect(200);

      expect(res.text).toContain('stellarsplit_http_request_duration_seconds');
      expect(res.text).toContain('stellarsplit_http_requests_total');
    });
  });

  // ─── Valid query param ────────────────────────────────────────────────────────

  describe('GET /metrics — query param', () => {
    it('200 — correct ?token query param returns prometheus text', async () => {
      const res = await request(app.getHttpServer())
        .get('/metrics')
        .query({ token: TEST_METRICS_SECRET })
        .expect(200);

      expect(res.text).toMatch(/# HELP|stellarsplit_/);
    });
  });
});

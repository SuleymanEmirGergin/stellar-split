import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { Reflector } from '@nestjs/core';

import { NotificationsController } from '../src/notifications/notifications.controller';
import { NotificationsService } from '../src/notifications/notifications.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createMockPrisma } from './helpers/mock-prisma';
import { getTestAuthHeader, TEST_JWT_SECRET, TEST_USER_A } from './helpers/mock-jwt';

const NOTIF_ID = 'notif-uuid';

function buildMockNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: NOTIF_ID,
    userId: TEST_USER_A.id,
    type: 'EXPENSE_ADDED',
    payload: { groupId: 'g1', amount: 10 },
    readAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('Notifications E2E', () => {
  let app: INestApplication;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  const mockQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
  const mockRedis = { get: jest.fn(), set: jest.fn().mockResolvedValue('OK'), del: jest.fn().mockResolvedValue(1) };

  beforeAll(async () => {
    mockPrisma = createMockPrisma();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [NotificationsController],
      providers: [
        NotificationsService,
        AuthService,
        JwtStrategy,
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        { provide: getQueueToken('notifications'), useValue: mockQueue },
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
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(() => app.close());
  afterEach(() => jest.clearAllMocks());

  // ─── GET /notifications ───────────────────────────────────────────────────────

  describe('GET /notifications', () => {
    it('200 — returns notifications for authenticated user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.notification.findMany.mockResolvedValue([buildMockNotification()]);

      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].type).toBe('EXPENSE_ADDED');
      expect(res.body.hasMore).toBe(false);
    });

    it('200 — returns empty list when no notifications', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.notification.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.hasMore).toBe(false);
      expect(res.body.nextCursor).toBeUndefined();
    });

    it('200 — accepts cursor and limit query params', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.notification.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/notifications')
        .query({ cursor: 'some-cursor', limit: '5' })
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: TEST_USER_A.id },
          take: 6, // limit + 1
          cursor: { id: 'some-cursor' },
          skip: 1,
        }),
      );
    });

    it('200 — hasMore=true and nextCursor set when page is full', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      // Request limit=3 → service fetches take+1=4, returns 4 items → hasMore=true, items truncated to 3
      const notifications = Array.from({ length: 4 }, (_, i) =>
        buildMockNotification({ id: `notif-${i}` }),
      );
      mockPrisma.notification.findMany.mockResolvedValue(notifications);

      const res = await request(app.getHttpServer())
        .get('/notifications')
        .query({ limit: '3' })
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(res.body.hasMore).toBe(true);
      expect(res.body.nextCursor).toBeDefined();
      expect(res.body.items).toHaveLength(3);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .get('/notifications')
        .expect(401);
    });
  });

  // ─── PATCH /notifications/:id/read ────────────────────────────────────────────

  describe('PATCH /notifications/:id/read', () => {
    it('200 — marks notification as read', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(app.getHttpServer())
        .patch(`/notifications/${NOTIF_ID}/read`)
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(res.body.count).toBe(1);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: NOTIF_ID, userId: TEST_USER_A.id },
        data: { readAt: expect.any(Date) },
      });
    });

    it('200 — returns count:0 when notification not found or belongs to another user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const res = await request(app.getHttpServer())
        .patch(`/notifications/nonexistent/read`)
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(res.body.count).toBe(0);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .patch(`/notifications/${NOTIF_ID}/read`)
        .expect(401);
    });
  });
});

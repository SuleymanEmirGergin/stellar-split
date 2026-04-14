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

import { RecurringController } from '../src/recurring/recurring.controller';
import { RecurringService } from '../src/recurring/recurring.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createMockPrisma } from './helpers/mock-prisma';
import { getTestAuthHeader, TEST_JWT_SECRET, TEST_USER_A, TEST_USER_B } from './helpers/mock-jwt';

const GROUP_ID = 'group-rec-uuid';
const TEMPLATE_ID = 'template-rec-uuid';
const VALID_NEXT_DUE = new Date(Date.now() + 86_400_000).toISOString();

function buildMockTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: TEMPLATE_ID,
    groupId: GROUP_ID,
    description: 'Monthly Netflix',
    amount: 10,
    frequency: 'MONTHLY',
    nextDue: new Date(VALID_NEXT_DUE),
    memberIds: [],
    createdAt: new Date(),
    ...overrides,
  };
}

describe('Recurring E2E', () => {
  let app: INestApplication;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    getJob: jest.fn().mockResolvedValue(null),
  };
  const mockRedis = { get: jest.fn(), set: jest.fn().mockResolvedValue('OK'), del: jest.fn().mockResolvedValue(1) };

  beforeAll(async () => {
    mockPrisma = createMockPrisma();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [RecurringController],
      providers: [
        RecurringService,
        AuthService,
        JwtStrategy,
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        { provide: getQueueToken('recurring-expenses'), useValue: mockQueue },
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

  // ─── GET /groups/:groupId/recurring ──────────────────────────────────────────

  describe('GET /groups/:groupId/recurring', () => {
    it('200 — returns template list for group member', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.recurringTemplate.findMany.mockResolvedValue([buildMockTemplate()]);

      const res = await request(app.getHttpServer())
        .get(`/groups/${GROUP_ID}/recurring`)
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].description).toBe('Monthly Netflix');
    });

    it('200 — returns empty array when no templates', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.recurringTemplate.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get(`/groups/${GROUP_ID}/recurring`)
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(res.body).toHaveLength(0);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .get(`/groups/${GROUP_ID}/recurring`)
        .expect(401);
    });

    it('403 — non-member cannot list templates', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_B);
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(`/groups/${GROUP_ID}/recurring`)
        .set('Authorization', getTestAuthHeader(TEST_USER_B.id, TEST_USER_B.walletAddress))
        .expect(403);
    });
  });

  // ─── POST /recurring ─────────────────────────────────────────────────────────

  describe('POST /recurring', () => {
    const validBody = {
      groupId: GROUP_ID,
      description: 'Monthly Netflix',
      amount: 10,
      frequency: 'MONTHLY',
      nextDue: VALID_NEXT_DUE,
    };

    it('201 — creates recurring template for group member', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.recurringTemplate.create.mockResolvedValue(buildMockTemplate());

      const res = await request(app.getHttpServer())
        .post('/recurring')
        .set('Authorization', getTestAuthHeader())
        .send(validBody)
        .expect(201);

      expect(res.body.description).toBe('Monthly Netflix');
      expect(mockQueue.add).toHaveBeenCalledWith('process-recurring', expect.any(Object), expect.any(Object));
    });

    it('400 — frequency is invalid enum value', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post('/recurring')
        .set('Authorization', getTestAuthHeader())
        .send({ ...validBody, frequency: 'BIANNUAL' })
        .expect(400);
    });

    it('400 — amount is negative', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post('/recurring')
        .set('Authorization', getTestAuthHeader())
        .send({ ...validBody, amount: -5 })
        .expect(400);
    });

    it('400 — description is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post('/recurring')
        .set('Authorization', getTestAuthHeader())
        .send({ groupId: GROUP_ID, amount: 10, frequency: 'MONTHLY', nextDue: VALID_NEXT_DUE })
        .expect(400);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .post('/recurring')
        .send(validBody)
        .expect(401);
    });

    it('403 — non-member cannot create template', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_B);
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/recurring')
        .set('Authorization', getTestAuthHeader(TEST_USER_B.id, TEST_USER_B.walletAddress))
        .send(validBody)
        .expect(403);
    });
  });

  // ─── PATCH /recurring/:id ─────────────────────────────────────────────────────

  describe('PATCH /recurring/:id', () => {
    it('200 — updates description for template owner', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.recurringTemplate.findUnique.mockResolvedValue(buildMockTemplate());
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.recurringTemplate.update.mockResolvedValue(buildMockTemplate({ description: 'Updated' }));

      const res = await request(app.getHttpServer())
        .patch(`/recurring/${TEMPLATE_ID}`)
        .set('Authorization', getTestAuthHeader())
        .send({ description: 'Updated' })
        .expect(200);

      expect(res.body.description).toBe('Updated');
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .patch(`/recurring/${TEMPLATE_ID}`)
        .send({ description: 'Updated' })
        .expect(401);
    });

    it('403 — non-member cannot update template', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_B);
      mockPrisma.recurringTemplate.findUnique.mockResolvedValue(buildMockTemplate());
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch(`/recurring/${TEMPLATE_ID}`)
        .set('Authorization', getTestAuthHeader(TEST_USER_B.id, TEST_USER_B.walletAddress))
        .send({ description: 'Hack' })
        .expect(403);
    });
  });

  // ─── DELETE /recurring/:id ────────────────────────────────────────────────────

  describe('DELETE /recurring/:id', () => {
    it('204 — owner deletes template successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.recurringTemplate.findUnique.mockResolvedValue(buildMockTemplate());
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.recurringTemplate.delete.mockResolvedValue(buildMockTemplate());

      await request(app.getHttpServer())
        .delete(`/recurring/${TEMPLATE_ID}`)
        .set('Authorization', getTestAuthHeader())
        .expect(204);

      expect(mockPrisma.recurringTemplate.delete).toHaveBeenCalledWith({ where: { id: TEMPLATE_ID } });
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .delete(`/recurring/${TEMPLATE_ID}`)
        .expect(401);
    });

    it('403 — non-member cannot delete template', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_B);
      mockPrisma.recurringTemplate.findUnique.mockResolvedValue(buildMockTemplate());
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete(`/recurring/${TEMPLATE_ID}`)
        .set('Authorization', getTestAuthHeader(TEST_USER_B.id, TEST_USER_B.walletAddress))
        .expect(403);
    });

    it('404 — template not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.recurringTemplate.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete(`/recurring/nonexistent`)
        .set('Authorization', getTestAuthHeader())
        .expect(404);
    });
  });
});

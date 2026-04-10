import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { GroupsController } from '../src/groups/groups.controller';
import { GroupsService } from '../src/groups/groups.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { AuthService } from '../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createMockPrisma } from './helpers/mock-prisma';
import {
  getTestAuthHeader,
  TEST_JWT_SECRET,
  TEST_USER_A,
  TEST_USER_B,
} from './helpers/mock-jwt';

const MOCK_GROUP_ID = 'group-e2e-uuid-1';
const INVITE_CODE = 'test-invite-code-abc';

function buildMockGroup(overrides: Record<string, unknown> = {}) {
  return {
    id: MOCK_GROUP_ID,
    name: 'Test Group',
    currency: 'XLM',
    isSettled: false,
    inviteCode: INVITE_CODE,
    createdById: TEST_USER_A.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creator: { id: TEST_USER_A.id, walletAddress: TEST_USER_A.walletAddress },
    members: [
      {
        userId: TEST_USER_A.id,
        role: 'CREATOR',
        user: {
          id: TEST_USER_A.id,
          walletAddress: TEST_USER_A.walletAddress,
          reputationScore: 0,
        },
      },
    ],
    _count: { expenses: 0, settlements: 0, members: 1 },
    ...overrides,
  };
}

describe('Groups E2E', () => {
  let app: INestApplication;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockRedis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeAll(async () => {
    mockPrisma = createMockPrisma();
    mockRedis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [GroupsController],
      providers: [
        GroupsService,
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
              const cfg: Record<string, unknown> = {
                JWT_SECRET: TEST_JWT_SECRET,
                NODE_ENV: 'test',
              };
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

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => jest.clearAllMocks());

  // ─── POST /groups ─────────────────────────────────────────────────────────────

  describe('POST /groups', () => {
    it('201 — creates group when authenticated', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.group.create.mockResolvedValue(buildMockGroup());
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A); // JwtStrategy.validate

      const res = await request(app.getHttpServer())
        .post('/groups')
        .set('Authorization', getTestAuthHeader())
        .send({ name: 'Holiday Trip', currency: 'XLM' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .post('/groups')
        .send({ name: 'Holiday Trip', currency: 'XLM' })
        .expect(401);
    });

    it('400 — missing required name', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post('/groups')
        .set('Authorization', getTestAuthHeader())
        .send({ currency: 'XLM' })
        .expect(400);
    });
  });

  // ─── GET /groups ──────────────────────────────────────────────────────────────

  describe('GET /groups', () => {
    it('200 — returns paginated list', async () => {
      mockPrisma.group.findMany.mockResolvedValue([buildMockGroup()]);
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      const res = await request(app.getHttpServer())
        .get('/groups')
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('hasMore');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer()).get('/groups').expect(401);
    });
  });

  // ─── GET /groups/:id ──────────────────────────────────────────────────────────

  describe('GET /groups/:id', () => {
    it('200 — returns group detail for member', async () => {
      mockPrisma.group.findUnique.mockResolvedValue(buildMockGroup());
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      const res = await request(app.getHttpServer())
        .get(`/groups/${MOCK_GROUP_ID}`)
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(res.body.id).toBe(MOCK_GROUP_ID);
    });

    it('403 — non-member gets 403', async () => {
      mockPrisma.group.findUnique.mockResolvedValue(
        buildMockGroup({
          members: [
            {
              userId: TEST_USER_B.id,
              role: 'CREATOR',
              user: { ...TEST_USER_B, reputationScore: 0 },
            },
          ],
        }),
      );
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .get(`/groups/${MOCK_GROUP_ID}`)
        .set('Authorization', getTestAuthHeader())
        .expect(403);
    });

    it('404 — group not found', async () => {
      mockPrisma.group.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .get('/groups/nonexistent-id')
        .set('Authorization', getTestAuthHeader())
        .expect(404);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .get(`/groups/${MOCK_GROUP_ID}`)
        .expect(401);
    });
  });

  // ─── POST /groups/:id/join ────────────────────────────────────────────────────

  describe('POST /groups/:id/join', () => {
    it('201 — joins group with valid invite code', async () => {
      mockPrisma.group.findUnique.mockResolvedValue({ id: MOCK_GROUP_ID, inviteCode: INVITE_CODE });
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);
      mockPrisma.groupMember.create.mockResolvedValue({
        id: 'gm-new',
        groupId: MOCK_GROUP_ID,
        userId: TEST_USER_A.id,
        role: 'MEMBER',
      });
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post(`/groups/${MOCK_GROUP_ID}/join`)
        .set('Authorization', getTestAuthHeader())
        .send({ inviteCode: INVITE_CODE })
        .expect(201);
    });

    it('409 — already a member', async () => {
      mockPrisma.group.findUnique.mockResolvedValue({ id: MOCK_GROUP_ID, inviteCode: INVITE_CODE });
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm-exists' });
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post(`/groups/${MOCK_GROUP_ID}/join`)
        .set('Authorization', getTestAuthHeader())
        .send({ inviteCode: INVITE_CODE })
        .expect(409);
    });

    it('403 — wrong invite code', async () => {
      mockPrisma.group.findUnique.mockResolvedValue({ id: MOCK_GROUP_ID, inviteCode: INVITE_CODE });
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post(`/groups/${MOCK_GROUP_ID}/join`)
        .set('Authorization', getTestAuthHeader())
        .send({ inviteCode: 'wrong-code' })
        .expect(403);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .post(`/groups/${MOCK_GROUP_ID}/join`)
        .send({ inviteCode: INVITE_CODE })
        .expect(401);
    });
  });

  // ─── POST /groups/:id/leave ───────────────────────────────────────────────────

  describe('POST /groups/:id/leave', () => {
    it('200 — member leaves group successfully', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue({
        id: 'gm-1',
        role: 'MEMBER',
        groupId: MOCK_GROUP_ID,
        userId: TEST_USER_A.id,
      });
      mockPrisma.groupMember.delete.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post(`/groups/${MOCK_GROUP_ID}/leave`)
        .set('Authorization', getTestAuthHeader())
        .expect(200);
    });

    it('403 — creator cannot leave', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue({
        id: 'gm-1',
        role: 'CREATOR',
        groupId: MOCK_GROUP_ID,
        userId: TEST_USER_A.id,
      });
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post(`/groups/${MOCK_GROUP_ID}/leave`)
        .set('Authorization', getTestAuthHeader())
        .expect(403);
    });

    it('404 — not a member', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post(`/groups/${MOCK_GROUP_ID}/leave`)
        .set('Authorization', getTestAuthHeader())
        .expect(404);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .post(`/groups/${MOCK_GROUP_ID}/leave`)
        .expect(401);
    });
  });

  // ─── GET /groups/:id/balances ─────────────────────────────────────────────────

  describe('GET /groups/:id/balances', () => {
    it('200 — returns balance array for member', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm-1', role: 'MEMBER' });
      mockPrisma.expense.findMany.mockResolvedValue([
        {
          id: 'exp-1',
          amount: 100,
          paidById: TEST_USER_A.id,
          status: 'ACTIVE',
          paidBy: { id: TEST_USER_A.id, walletAddress: TEST_USER_A.walletAddress },
          splits: [
            { userId: TEST_USER_A.id, amount: 50 },
            { userId: TEST_USER_B.id, amount: 50 },
          ],
        },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      const res = await request(app.getHttpServer())
        .get(`/groups/${MOCK_GROUP_ID}/balances`)
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const userABalance = res.body.find((b: { userId: string; balance: number }) => b.userId === TEST_USER_A.id);
      expect(userABalance).toBeDefined();
      expect(userABalance.balance).toBe(50); // paid 100, owes 50 → net +50
    });

    it('403 — non-member cannot view balances', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .get(`/groups/${MOCK_GROUP_ID}/balances`)
        .set('Authorization', getTestAuthHeader())
        .expect(403);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .get(`/groups/${MOCK_GROUP_ID}/balances`)
        .expect(401);
    });
  });
});

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

import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';
import { AuditService } from '../src/audit/audit.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createMockPrisma } from './helpers/mock-prisma';
import { getTestAuthHeader, TEST_JWT_SECRET, TEST_USER_A, TEST_USER_B } from './helpers/mock-jwt';

const GROUP_ID = 'group-settle-uuid';
const VALID_TX_HASH = 'a'.repeat(64);
const SETTLEMENT_ID = 'settlement-uuid';

function buildMockSettlement(overrides: Record<string, unknown> = {}) {
  return {
    id: SETTLEMENT_ID,
    groupId: GROUP_ID,
    settledById: TEST_USER_A.id,
    txHash: VALID_TX_HASH,
    amount: 10,
    status: 'PENDING',
    timestamp: new Date().toISOString(),
    settledBy: { id: TEST_USER_A.id, walletAddress: TEST_USER_A.walletAddress },
    ...overrides,
  };
}

describe('Settlements E2E', () => {
  let app: INestApplication;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  const mockQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
  const mockAudit = { log: jest.fn() };
  const mockRedis = { get: jest.fn(), set: jest.fn().mockResolvedValue('OK'), del: jest.fn().mockResolvedValue(1) };

  beforeAll(async () => {
    mockPrisma = createMockPrisma();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [SettlementsController],
      providers: [
        SettlementsService,
        AuthService,
        JwtStrategy,
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: getQueueToken('stellar-tx-monitor'), useValue: mockQueue },
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
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(() => app.close());
  afterEach(() => jest.clearAllMocks());

  // ─── GET /groups/:groupId/settlements ────────────────────────────────────────

  describe('GET /groups/:groupId/settlements', () => {
    it('200 — returns settlements list for group member', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.settlement.findMany.mockResolvedValue([buildMockSettlement()]);

      const res = await request(app.getHttpServer())
        .get(`/groups/${GROUP_ID}/settlements`)
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].txHash).toBe(VALID_TX_HASH);
    });

    it('200 — returns empty list with hasMore=false when no settlements', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.settlement.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get(`/groups/${GROUP_ID}/settlements`)
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.hasMore).toBe(false);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .get(`/groups/${GROUP_ID}/settlements`)
        .expect(401);
    });

    it('403 — non-member cannot list settlements', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_B);
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(`/groups/${GROUP_ID}/settlements`)
        .set('Authorization', getTestAuthHeader(TEST_USER_B.id, TEST_USER_B.walletAddress))
        .expect(403);
    });
  });

  // ─── POST /settlements ────────────────────────────────────────────────────────

  describe('POST /settlements', () => {
    const validBody = { groupId: GROUP_ID, txHash: VALID_TX_HASH, amount: 10 };

    it('201 — creates settlement with valid body', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.settlement.findUnique.mockResolvedValue(null); // idempotency: not existing
      mockPrisma.settlement.create.mockResolvedValue(buildMockSettlement());

      const res = await request(app.getHttpServer())
        .post('/settlements')
        .set('Authorization', getTestAuthHeader())
        .send(validBody)
        .expect(201);

      expect(res.body.txHash).toBe(VALID_TX_HASH);
      expect(mockQueue.add).toHaveBeenCalledWith('monitor-tx', expect.any(Object), expect.any(Object));
    });

    it('201 — returns existing record when txHash already exists (idempotency)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.settlement.findUnique.mockResolvedValue(buildMockSettlement());

      const res = await request(app.getHttpServer())
        .post('/settlements')
        .set('Authorization', getTestAuthHeader())
        .send(validBody)
        .expect(201);

      expect(res.body.id).toBe(SETTLEMENT_ID);
      expect(mockPrisma.settlement.create).not.toHaveBeenCalled();
    });

    it('400 — missing txHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post('/settlements')
        .set('Authorization', getTestAuthHeader())
        .send({ groupId: GROUP_ID, amount: 10 })
        .expect(400);
    });

    it('400 — txHash is not 64-char hex', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post('/settlements')
        .set('Authorization', getTestAuthHeader())
        .send({ groupId: GROUP_ID, txHash: 'not-a-hash', amount: 10 })
        .expect(400);
    });

    it('400 — amount is negative', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post('/settlements')
        .set('Authorization', getTestAuthHeader())
        .send({ groupId: GROUP_ID, txHash: VALID_TX_HASH, amount: -5 })
        .expect(400);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .post('/settlements')
        .send(validBody)
        .expect(401);
    });

    it('403 — non-member cannot create settlement', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_B);
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/settlements')
        .set('Authorization', getTestAuthHeader(TEST_USER_B.id, TEST_USER_B.walletAddress))
        .send(validBody)
        .expect(403);
    });
  });
});

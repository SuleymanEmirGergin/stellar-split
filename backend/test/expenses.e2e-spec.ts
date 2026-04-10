import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { ExpensesController } from '../src/expenses/expenses.controller';
import { ExpensesService } from '../src/expenses/expenses.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createMockPrisma } from './helpers/mock-prisma';
import {
  getTestAuthHeader,
  TEST_JWT_SECRET,
  TEST_USER_A,
  TEST_USER_B,
} from './helpers/mock-jwt';

const GROUP_ID = 'group-e2e-expenses-uuid';
const EXPENSE_ID = 'expense-e2e-uuid';
const VALID_WALLET_A = TEST_USER_A.walletAddress;
const VALID_WALLET_B = TEST_USER_B.walletAddress;

function buildMockExpense(overrides: Record<string, unknown> = {}) {
  return {
    id: EXPENSE_ID,
    groupId: GROUP_ID,
    description: 'Test Expense',
    amount: 100,
    currency: 'XLM',
    paidById: TEST_USER_A.id,
    splitType: 'EQUAL',
    status: 'ACTIVE',
    splits: [
      { userId: TEST_USER_A.id, amount: 50 },
      { userId: TEST_USER_B.id, amount: 50 },
    ],
    paidBy: { id: TEST_USER_A.id, walletAddress: VALID_WALLET_A },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Expenses E2E', () => {
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
      controllers: [ExpensesController],
      providers: [
        ExpensesService,
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

  // Shared stub helper — sets up membership, paidByUser, and group members
  function setupCreateStubs() {
    mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm-1', role: 'MEMBER' });
    mockPrisma.user.findUnique.mockResolvedValue({ id: TEST_USER_A.id, walletAddress: VALID_WALLET_A });
    mockPrisma.groupMember.findMany.mockResolvedValue([
      { userId: TEST_USER_A.id, user: { id: TEST_USER_A.id, walletAddress: VALID_WALLET_A } },
      { userId: TEST_USER_B.id, user: { id: TEST_USER_B.id, walletAddress: VALID_WALLET_B } },
    ]);
  }

  // ─── POST /expenses — EQUAL ───────────────────────────────────────────────────

  describe('POST /expenses — EQUAL split', () => {
    it('201 — creates equal-split expense', async () => {
      setupCreateStubs();
      mockPrisma.expense.create.mockResolvedValue(buildMockExpense());

      const res = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', getTestAuthHeader())
        .send({
          groupId: GROUP_ID,
          description: 'Team lunch',
          amount: 100,
          currency: 'XLM',
          paidBy: VALID_WALLET_A,
          splitType: 'EQUAL',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.splitType).toBe('EQUAL');
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .post('/expenses')
        .send({
          groupId: GROUP_ID,
          description: 'Test',
          amount: 50,
          currency: 'XLM',
          paidBy: VALID_WALLET_A,
          splitType: 'EQUAL',
        })
        .expect(401);
    });

    it('400 — missing required fields', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', getTestAuthHeader())
        .send({ description: 'Incomplete expense' }) // missing amount, currency, paidBy, splitType, groupId
        .expect(400);
    });

    it('403 — non-member cannot create expense', async () => {
      // assertMember returns null → ForbiddenException
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', getTestAuthHeader())
        .send({
          groupId: GROUP_ID,
          description: 'Unauthorised',
          amount: 50,
          currency: 'XLM',
          paidBy: VALID_WALLET_A,
          splitType: 'EQUAL',
        })
        .expect(403);
    });
  });

  // ─── POST /expenses — CUSTOM ──────────────────────────────────────────────────

  describe('POST /expenses — CUSTOM split', () => {
    it('201 — creates custom-split expense with provided amounts', async () => {
      setupCreateStubs();
      mockPrisma.expense.create.mockResolvedValue(
        buildMockExpense({
          splitType: 'CUSTOM',
          splits: [
            { userId: TEST_USER_A.id, amount: 70 },
            { userId: TEST_USER_B.id, amount: 30 },
          ],
        }),
      );

      const res = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', getTestAuthHeader())
        .send({
          groupId: GROUP_ID,
          description: 'Hotel room',
          amount: 100,
          currency: 'USDC',
          paidBy: VALID_WALLET_A,
          splitType: 'CUSTOM',
          splits: [
            { walletAddress: VALID_WALLET_A, amount: 70 },
            { walletAddress: VALID_WALLET_B, amount: 30 },
          ],
        })
        .expect(201);

      expect(res.body.splitType).toBe('CUSTOM');
    });

    it('400 — member wallet not in group', async () => {
      setupCreateStubs();

      await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', getTestAuthHeader())
        .send({
          groupId: GROUP_ID,
          description: 'Hotel',
          amount: 100,
          currency: 'XLM',
          paidBy: VALID_WALLET_A,
          splitType: 'CUSTOM',
          splits: [
            // wallet that is not in mockMembers
            { walletAddress: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGFM2OA3HA7IQQF5L7AMTT', amount: 100 },
          ],
        })
        .expect(400);
    });

    it('400 — missing splits array for CUSTOM type', async () => {
      setupCreateStubs();

      await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', getTestAuthHeader())
        .send({
          groupId: GROUP_ID,
          description: 'Hotel',
          amount: 100,
          currency: 'XLM',
          paidBy: VALID_WALLET_A,
          splitType: 'CUSTOM',
          // splits omitted
        })
        .expect(400);
    });
  });

  // ─── PATCH /expenses/:id/cancel ───────────────────────────────────────────────

  describe('PATCH /expenses/:id/cancel', () => {
    it('200 — payer can cancel expense', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(
        buildMockExpense({
          group: {
            members: [{ userId: TEST_USER_A.id, role: 'MEMBER' }],
          },
        }),
      );
      mockPrisma.expense.update.mockResolvedValue(buildMockExpense({ status: 'CANCELLED' }));
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      const res = await request(app.getHttpServer())
        .patch(`/expenses/${EXPENSE_ID}/cancel`)
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(res.body.status).toBe('CANCELLED');
    });

    it('400 — already cancelled', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(
        buildMockExpense({
          status: 'CANCELLED',
          group: { members: [{ userId: TEST_USER_A.id, role: 'MEMBER' }] },
        }),
      );
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .patch(`/expenses/${EXPENSE_ID}/cancel`)
        .set('Authorization', getTestAuthHeader())
        .expect(400);
    });

    it('403 — non-payer member (not creator) cannot cancel', async () => {
      // TEST_USER_B tries to cancel an expense paid by TEST_USER_A
      const userBToken = getTestAuthHeader(TEST_USER_B.id, TEST_USER_B.walletAddress);
      mockPrisma.expense.findUnique.mockResolvedValue(
        buildMockExpense({
          paidById: TEST_USER_A.id,
          group: {
            members: [
              { userId: TEST_USER_A.id, role: 'MEMBER' },
              { userId: TEST_USER_B.id, role: 'MEMBER' },
            ],
          },
        }),
      );
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_B);

      await request(app.getHttpServer())
        .patch(`/expenses/${EXPENSE_ID}/cancel`)
        .set('Authorization', userBToken)
        .expect(403);
    });

    it('404 — expense not found', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .patch('/expenses/nonexistent-id/cancel')
        .set('Authorization', getTestAuthHeader())
        .expect(404);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .patch(`/expenses/${EXPENSE_ID}/cancel`)
        .expect(401);
    });
  });
});

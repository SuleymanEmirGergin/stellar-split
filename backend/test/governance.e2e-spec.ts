import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { GovernanceController } from '../src/governance/governance.controller';
import { GovernanceService } from '../src/governance/governance.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createMockPrisma } from './helpers/mock-prisma';
import { getTestAuthHeader, TEST_JWT_SECRET, TEST_USER_A, TEST_USER_B } from './helpers/mock-jwt';

const GROUP_ID = 'group-gov-uuid';
const PROPOSAL_ID = 'proposal-gov-uuid';
const VALID_ENDS_AT = new Date(Date.now() + 86_400_000).toISOString();

function buildMockProposal(overrides: Partial<{ status: string }> = {}) {
  return {
    id: PROPOSAL_ID,
    groupId: GROUP_ID,
    creatorId: TEST_USER_A.id,
    title: 'Test Proposal',
    description: 'A governance proposal',
    status: overrides.status ?? 'ACTIVE',
    threshold: 51,
    endsAt: new Date(VALID_ENDS_AT),
    createdAt: new Date(),
    creator: { id: TEST_USER_A.id, walletAddress: TEST_USER_A.walletAddress },
    votes: [],
  };
}

describe('Governance E2E', () => {
  let app: INestApplication;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  const mockRedis = { get: jest.fn(), set: jest.fn().mockResolvedValue('OK'), del: jest.fn().mockResolvedValue(1) };

  beforeAll(async () => {
    mockPrisma = createMockPrisma();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [GovernanceController],
      providers: [
        GovernanceService,
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
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(() => app.close());
  afterEach(() => jest.clearAllMocks());

  // ─── GET /governance/proposals ───────────────────────────────────────────────

  describe('GET /governance/proposals', () => {
    it('200 — returns proposal list for group member', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.proposal.findMany.mockResolvedValue([buildMockProposal()]);

      const res = await request(app.getHttpServer())
        .get('/governance/proposals')
        .query({ groupId: GROUP_ID })
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items[0].title).toBe('Test Proposal');
    });

    it('200 — returns empty array when no proposals', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.proposal.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/governance/proposals')
        .query({ groupId: GROUP_ID })
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.hasMore).toBe(false);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .get('/governance/proposals')
        .query({ groupId: GROUP_ID })
        .expect(401);
    });

    it('403 — non-member cannot list proposals', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_B);
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/governance/proposals')
        .query({ groupId: GROUP_ID })
        .set('Authorization', getTestAuthHeader(TEST_USER_B.id, TEST_USER_B.walletAddress))
        .expect(403);
    });
  });

  // ─── POST /governance/proposals ──────────────────────────────────────────────

  describe('POST /governance/proposals', () => {
    const validBody = {
      groupId: GROUP_ID,
      title: 'New Rule',
      description: 'We should split differently',
      endsAt: VALID_ENDS_AT,
    };

    it('201 — creates proposal for group member', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.proposal.create.mockResolvedValue(buildMockProposal());

      const res = await request(app.getHttpServer())
        .post('/governance/proposals')
        .set('Authorization', getTestAuthHeader())
        .send(validBody)
        .expect(201);

      expect(res.body.title).toBe('Test Proposal');
      expect(mockPrisma.proposal.create).toHaveBeenCalled();
    });

    it('400 — title is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post('/governance/proposals')
        .set('Authorization', getTestAuthHeader())
        .send({ groupId: GROUP_ID, description: 'desc', endsAt: VALID_ENDS_AT })
        .expect(400);
    });

    it('400 — endsAt is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post('/governance/proposals')
        .set('Authorization', getTestAuthHeader())
        .send({ groupId: GROUP_ID, title: 'Proposal', description: 'desc' })
        .expect(400);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .post('/governance/proposals')
        .send(validBody)
        .expect(401);
    });

    it('403 — non-member cannot create proposal', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_B);
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/governance/proposals')
        .set('Authorization', getTestAuthHeader(TEST_USER_B.id, TEST_USER_B.walletAddress))
        .send(validBody)
        .expect(403);
    });
  });

  // ─── POST /governance/proposals/:id/vote ─────────────────────────────────────

  describe('POST /governance/proposals/:id/vote', () => {
    function setupVote(proposalStatus = 'ACTIVE', hasExistingVote = false) {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.proposal.findUnique.mockResolvedValue(buildMockProposal({ status: proposalStatus }));
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.proposalVote.findUnique.mockResolvedValue(
        hasExistingVote ? { id: 'existing-vote' } : null,
      );
      mockPrisma.proposalVote.create.mockResolvedValue({
        id: 'vote-1', proposalId: PROPOSAL_ID, voterId: TEST_USER_A.id, option: 'yes',
      });
      mockPrisma.groupMember.count.mockResolvedValue(3);
      mockPrisma.proposalVote.findMany.mockResolvedValue([]);
    }

    it('201 — yes vote recorded for active proposal by member', async () => {
      setupVote();

      const res = await request(app.getHttpServer())
        .post(`/governance/proposals/${PROPOSAL_ID}/vote`)
        .set('Authorization', getTestAuthHeader())
        .send({ option: 'yes' })
        .expect(201);

      expect(res.body.option).toBe('yes');
      expect(mockPrisma.proposalVote.create).toHaveBeenCalled();
    });

    it('201 — no vote is also valid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.proposal.findUnique.mockResolvedValue(buildMockProposal());
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.proposalVote.findUnique.mockResolvedValue(null);
      mockPrisma.proposalVote.create.mockResolvedValue({
        id: 'vote-2', proposalId: PROPOSAL_ID, voterId: TEST_USER_A.id, option: 'no',
      });
      mockPrisma.groupMember.count.mockResolvedValue(3);
      mockPrisma.proposalVote.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .post(`/governance/proposals/${PROPOSAL_ID}/vote`)
        .set('Authorization', getTestAuthHeader())
        .send({ option: 'no' })
        .expect(201);

      expect(res.body.option).toBe('no');
    });

    it('400 — invalid option value', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post(`/governance/proposals/${PROPOSAL_ID}/vote`)
        .set('Authorization', getTestAuthHeader())
        .send({ option: 'maybe' })
        .expect(400);
    });

    it('400 — option is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post(`/governance/proposals/${PROPOSAL_ID}/vote`)
        .set('Authorization', getTestAuthHeader())
        .send({})
        .expect(400);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .post(`/governance/proposals/${PROPOSAL_ID}/vote`)
        .send({ option: 'yes' })
        .expect(401);
    });

    it('403 — proposal is PASSED — voting closed', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.proposal.findUnique.mockResolvedValue(buildMockProposal({ status: 'PASSED' }));

      await request(app.getHttpServer())
        .post(`/governance/proposals/${PROPOSAL_ID}/vote`)
        .set('Authorization', getTestAuthHeader())
        .send({ option: 'yes' })
        .expect(403);
    });

    it('404 — proposal not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.proposal.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post(`/governance/proposals/nonexistent/vote`)
        .set('Authorization', getTestAuthHeader())
        .send({ option: 'yes' })
        .expect(404);
    });

    it('409 — user has already voted on this proposal', async () => {
      setupVote('ACTIVE', true);

      await request(app.getHttpServer())
        .post(`/governance/proposals/${PROPOSAL_ID}/vote`)
        .set('Authorization', getTestAuthHeader())
        .send({ option: 'yes' })
        .expect(409);
    });
  });

  // ─── GET /governance/disputes ────────────────────────────────────────────────

  describe('GET /governance/disputes', () => {
    it('200 — returns disputes for group member', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.dispute.findMany.mockResolvedValue([
        { id: 'disp-1', groupId: GROUP_ID, expenseId: 'exp-1', amount: '50.00',
          category: 'food', description: 'Disagreement', status: 'OPEN',
          createdAt: new Date(), initiator: { id: TEST_USER_A.id, walletAddress: TEST_USER_A.walletAddress } },
      ]);

      const res = await request(app.getHttpServer())
        .get('/governance/disputes')
        .query({ groupId: GROUP_ID })
        .set('Authorization', getTestAuthHeader())
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items[0].expenseId).toBe('exp-1');
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .get('/governance/disputes')
        .query({ groupId: GROUP_ID })
        .expect(401);
    });

    it('403 — non-member cannot list disputes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_B);
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/governance/disputes')
        .query({ groupId: GROUP_ID })
        .set('Authorization', getTestAuthHeader(TEST_USER_B.id, TEST_USER_B.walletAddress))
        .expect(403);
    });
  });

  // ─── POST /governance/disputes ───────────────────────────────────────────────

  describe('POST /governance/disputes', () => {
    const validBody = {
      groupId: GROUP_ID,
      expenseId: 'exp-uuid',
      amount: 50,
      category: 'food',
      description: 'I disagree with this split',
    };

    it('201 — creates dispute for group member', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      mockPrisma.dispute.create.mockResolvedValue({
        id: 'disp-new', ...validBody, initiatorId: TEST_USER_A.id, status: 'OPEN', createdAt: new Date(),
        initiator: { id: TEST_USER_A.id, walletAddress: TEST_USER_A.walletAddress },
      });

      const res = await request(app.getHttpServer())
        .post('/governance/disputes')
        .set('Authorization', getTestAuthHeader())
        .send(validBody)
        .expect(201);

      expect(res.body.expenseId).toBe('exp-uuid');
      expect(mockPrisma.dispute.create).toHaveBeenCalled();
    });

    it('400 — amount is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);

      await request(app.getHttpServer())
        .post('/governance/disputes')
        .set('Authorization', getTestAuthHeader())
        .send({ groupId: GROUP_ID, expenseId: 'exp-1', category: 'food', description: 'desc' })
        .expect(400);
    });

    it('401 — no token', async () => {
      await request(app.getHttpServer())
        .post('/governance/disputes')
        .send(validBody)
        .expect(401);
    });

    it('403 — non-member cannot create dispute', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_B);
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/governance/disputes')
        .set('Authorization', getTestAuthHeader(TEST_USER_B.id, TEST_USER_B.walletAddress))
        .send(validBody)
        .expect(403);
    });
  });
});

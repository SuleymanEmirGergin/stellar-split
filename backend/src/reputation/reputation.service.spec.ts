import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReputationService } from './reputation.service';
import { PrismaService } from '../common/prisma/prisma.service';

const USER_ID = 'user-uuid-1';
const VALID_WALLET = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';

function makeMockPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userBadge: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };
}

describe('ReputationService', () => {
  let service: ReputationService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReputationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReputationService>(ReputationService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── updateScore ─────────────────────────────────────────────────────────────

  describe('updateScore()', () => {
    it('increments reputation score by delta', async () => {
      prisma.user.update.mockResolvedValue({
        id: USER_ID,
        reputationScore: 15,
        walletAddress: VALID_WALLET,
      });
      prisma.userBadge.upsert.mockResolvedValue({});

      await service.updateScore(USER_ID, 10);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { reputationScore: { increment: 10 } },
      });
    });

    it('awards FIRST_SETTLEMENT badge when score reaches 10', async () => {
      prisma.user.update.mockResolvedValue({ id: USER_ID, reputationScore: 10 });
      prisma.userBadge.upsert.mockResolvedValue({});

      await service.updateScore(USER_ID, 10);

      expect(prisma.userBadge.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_badge: { userId: USER_ID, badge: 'FIRST_SETTLEMENT' } },
          create: { userId: USER_ID, badge: 'FIRST_SETTLEMENT' },
        }),
      );
    });

    it('awards TRUSTED_MEMBER badge when score reaches 50', async () => {
      prisma.user.update.mockResolvedValue({ id: USER_ID, reputationScore: 50 });
      prisma.userBadge.upsert.mockResolvedValue({});

      await service.updateScore(USER_ID, 40);

      expect(prisma.userBadge.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_badge: { userId: USER_ID, badge: 'TRUSTED_MEMBER' } },
        }),
      );
    });

    it('awards STELLAR_PAYER badge when score reaches 100', async () => {
      prisma.user.update.mockResolvedValue({ id: USER_ID, reputationScore: 100 });
      prisma.userBadge.upsert.mockResolvedValue({});

      await service.updateScore(USER_ID, 50);

      expect(prisma.userBadge.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_badge: { userId: USER_ID, badge: 'STELLAR_PAYER' } },
        }),
      );
    });

    it('awards all three badges when score exceeds 100', async () => {
      prisma.user.update.mockResolvedValue({ id: USER_ID, reputationScore: 150 });
      prisma.userBadge.upsert.mockResolvedValue({});

      await service.updateScore(USER_ID, 100);

      const upsertCalls = prisma.userBadge.upsert.mock.calls.map(
        (call: Array<{ where: { userId_badge: { badge: string } } }>) => call[0].where.userId_badge.badge,
      );
      expect(upsertCalls).toContain('FIRST_SETTLEMENT');
      expect(upsertCalls).toContain('TRUSTED_MEMBER');
      expect(upsertCalls).toContain('STELLAR_PAYER');
    });

    it('does not award badge when score is below milestone', async () => {
      prisma.user.update.mockResolvedValue({ id: USER_ID, reputationScore: 5 });
      prisma.userBadge.upsert.mockResolvedValue({});

      await service.updateScore(USER_ID, 5);

      expect(prisma.userBadge.upsert).not.toHaveBeenCalled();
    });

    it('returns the updated user object', async () => {
      const mockUser = { id: USER_ID, reputationScore: 20, walletAddress: VALID_WALLET };
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.userBadge.upsert.mockResolvedValue({});

      const result = await service.updateScore(USER_ID, 10);

      expect(result).toEqual(mockUser);
    });
  });

  // ─── getMyReputation ─────────────────────────────────────────────────────────

  describe('getMyReputation()', () => {
    it('returns user with badges and settlement history', async () => {
      const mockUser = {
        id: USER_ID,
        walletAddress: VALID_WALLET,
        reputationScore: 50,
        badges: [
          { id: 'badge-1', badge: 'FIRST_SETTLEMENT', awardedAt: new Date() },
          { id: 'badge-2', badge: 'TRUSTED_MEMBER', awardedAt: new Date() },
        ],
        settlements: [
          { id: 'settle-1', amount: 100, timestamp: new Date() },
        ],
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMyReputation(USER_ID);

      expect(result.userId).toBe(USER_ID);
      expect(result.walletAddress).toBe(VALID_WALLET);
      expect(result.reputationScore).toBe(50);
      expect(result.badges).toHaveLength(2);
      expect(result.settlementHistory).toHaveLength(1);
    });

    it('queries only CONFIRMED settlements', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: USER_ID,
        walletAddress: VALID_WALLET,
        reputationScore: 0,
        badges: [],
        settlements: [],
      });

      await service.getMyReputation(USER_ID);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            settlements: expect.objectContaining({
              where: { status: 'CONFIRMED' },
            }),
          }),
        }),
      );
    });

    it('throws 404 when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMyReputation(USER_ID)).rejects.toThrow(NotFoundException);
    });
  });
});

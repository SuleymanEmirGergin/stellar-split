import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { LeaderboardService } from './leaderboard.service';
import { PrismaService } from '../common/prisma/prisma.service';

function makeMockPrisma() {
  return {
    settlement: {
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
}

function makeMockCache() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
}

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let prisma: ReturnType<typeof makeMockPrisma>;
  let cache: ReturnType<typeof makeMockCache>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    cache = makeMockCache();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getLeaderboard() — cold cache', () => {
    it('builds leaderboard from Prisma when cache is empty', async () => {
      cache.get.mockResolvedValue(null);
      prisma.settlement.groupBy.mockResolvedValue([
        { settledById: 'user-a', _count: { _all: 5 }, _sum: { amount: 500 } },
        { settledById: 'user-b', _count: { _all: 3 }, _sum: { amount: 150.5 } },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-a', walletAddress: 'GAAAA...' },
        { id: 'user-b', walletAddress: 'GBBBB...' },
      ]);

      const result = await service.getLeaderboard();

      expect(result.top).toHaveLength(2);
      expect(result.top[0]).toMatchObject({
        rank: 1,
        walletAddress: 'GAAAA...',
        settlementsInitiated: 5,
        spltBalance: 500, // 5 × 100
        totalVolumeXlm: 500,
      });
      expect(result.top[1]).toMatchObject({
        rank: 2,
        walletAddress: 'GBBBB...',
        settlementsInitiated: 3,
        spltBalance: 300,
        totalVolumeXlm: 150.5,
      });
      expect(cache.set).toHaveBeenCalledWith(
        'analytics:leaderboard:v1',
        expect.objectContaining({ entries: expect.any(Array), lastUpdated: expect.any(String) }),
        5 * 60 * 1000,
      );
    });

    it('returns empty array gracefully when no settlements exist', async () => {
      cache.get.mockResolvedValue(null);
      prisma.settlement.groupBy.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.getLeaderboard();

      expect(result.top).toEqual([]);
      expect(result.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(prisma.user.findMany).not.toHaveBeenCalled(); // skipped empty lookup
    });

    it('clamps the limit to a sensible range', async () => {
      cache.get.mockResolvedValue(null);
      // 15 users in DB
      const entries = Array.from({ length: 15 }, (_, i) => ({
        settledById: `u${i}`,
        _count: { _all: 15 - i },
        _sum: { amount: (15 - i) * 10 },
      }));
      prisma.settlement.groupBy.mockResolvedValue(entries);
      prisma.user.findMany.mockResolvedValue(
        entries.map((e, i) => ({ id: e.settledById, walletAddress: `G${i}` })),
      );

      const result = await service.getLeaderboard({ limit: 5 });
      expect(result.top).toHaveLength(5);
      expect(result.top[0].rank).toBe(1);
      expect(result.top[4].rank).toBe(5);

      // Default (no limit) returns 10
      const defaultResult = await service.getLeaderboard();
      expect(defaultResult.top).toHaveLength(10);
    });

    it('drops entries whose settledById does not resolve to a User', async () => {
      cache.get.mockResolvedValue(null);
      prisma.settlement.groupBy.mockResolvedValue([
        { settledById: 'ghost-user', _count: { _all: 10 }, _sum: { amount: 100 } },
        { settledById: 'real-user', _count: { _all: 1 }, _sum: { amount: 5 } },
      ]);
      // Only real-user exists in User table
      prisma.user.findMany.mockResolvedValue([{ id: 'real-user', walletAddress: 'GREAL...' }]);

      const result = await service.getLeaderboard();
      expect(result.top).toHaveLength(1);
      expect(result.top[0].walletAddress).toBe('GREAL...');
    });
  });

  describe('getLeaderboard() — warm cache', () => {
    it('returns cached pool without touching Prisma', async () => {
      cache.get.mockResolvedValue({
        entries: [
          { rank: 1, walletAddress: 'GCACHE...', settlementsInitiated: 9, spltBalance: 900, totalVolumeXlm: 999 },
        ],
        lastUpdated: '2026-04-22T10:00:00.000Z',
      });

      const result = await service.getLeaderboard();

      expect(result.top).toHaveLength(1);
      expect(result.top[0].walletAddress).toBe('GCACHE...');
      expect(result.lastUpdated).toBe('2026-04-22T10:00:00.000Z');
      expect(prisma.settlement.groupBy).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });
  });

  describe('yourRank behavior', () => {
    const cachedTop = {
      entries: [
        { rank: 1, walletAddress: 'GTOP1', settlementsInitiated: 9, spltBalance: 900, totalVolumeXlm: 90 },
        { rank: 2, walletAddress: 'GTOP2', settlementsInitiated: 5, spltBalance: 500, totalVolumeXlm: 50 },
      ],
      lastUpdated: '2026-04-22T10:00:00.000Z',
    };

    it('returns yourRank from top when requester is in it', async () => {
      cache.get.mockResolvedValue(cachedTop);

      const result = await service.getLeaderboard({ wallet: 'GTOP2' });
      expect(result.yourRank).toMatchObject({ rank: 2, walletAddress: 'GTOP2' });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('computes yourRank when requester is outside the top', async () => {
      cache.get.mockResolvedValue(cachedTop);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-x' });
      prisma.settlement.count.mockResolvedValue(2);
      // 7 users ahead of them
      prisma.settlement.groupBy.mockResolvedValue(
        Array.from({ length: 7 }, (_, i) => ({ settledById: `u${i}`, _count: { _all: 3 + i }, _sum: { amount: 0 } })),
      );
      prisma.settlement.aggregate.mockResolvedValue({ _sum: { amount: 42 } });

      const result = await service.getLeaderboard({ wallet: 'GOUT...' });
      expect(result.yourRank).toMatchObject({
        rank: 8, // 7 ahead + 1
        walletAddress: 'GOUT...',
        settlementsInitiated: 2,
        spltBalance: 200,
        totalVolumeXlm: 42,
      });
    });

    it('omits yourRank when the wallet is unknown', async () => {
      cache.get.mockResolvedValue(cachedTop);
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getLeaderboard({ wallet: 'GNOUSER' });
      expect(result.yourRank).toBeUndefined();
    });

    it('omits yourRank when the user has zero settlements', async () => {
      cache.get.mockResolvedValue(cachedTop);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-zero' });
      prisma.settlement.count.mockResolvedValue(0);

      const result = await service.getLeaderboard({ wallet: 'GZERO' });
      expect(result.yourRank).toBeUndefined();
    });
  });
});

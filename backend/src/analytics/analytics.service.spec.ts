import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AnalyticsService, TrackEventDto } from './analytics.service';
import { PrismaService } from '../common/prisma/prisma.service';

function makeMockPrisma() {
  return {
    analyticsEvent: {
      create: jest.fn(),
    },
    group: { count: jest.fn() },
    user: { count: jest.fn() },
    expense: { count: jest.fn(), findMany: jest.fn() },
    settlement: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
}

function makeMockCache() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: ReturnType<typeof makeMockPrisma>;
  let cache: ReturnType<typeof makeMockCache>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    cache = makeMockCache();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('track()', () => {
    const dto: TrackEventDto = { event: 'expense_created', userId: 'user-1', payload: { amount: 50 } };

    it('does not throw and calls prisma.analyticsEvent.create', async () => {
      prisma.analyticsEvent.create.mockResolvedValue({ id: 'evt-1' });

      await expect(service.track(dto)).resolves.toBeUndefined();

      // Allow fire-and-forget microtask to flush
      await Promise.resolve();

      expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: { event: dto.event, userId: dto.userId, payload: dto.payload },
      });
    });

    it('does not throw even when Prisma create fails', async () => {
      prisma.analyticsEvent.create.mockRejectedValue(new Error('DB down'));

      await expect(service.track(dto)).resolves.toBeUndefined();

      // Flush microtask — no unhandled rejection
      await Promise.resolve();
    });

    it('works without optional userId and payload', async () => {
      prisma.analyticsEvent.create.mockResolvedValue({ id: 'evt-2' });

      await expect(service.track({ event: 'page_view' })).resolves.toBeUndefined();

      await Promise.resolve();

      expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: { event: 'page_view', userId: undefined, payload: undefined },
      });
    });
  });

  describe('getSummary()', () => {
    beforeEach(() => {
      prisma.group.count.mockResolvedValue(4);
      prisma.user.count.mockResolvedValue(9);
      prisma.expense.count.mockResolvedValue(21);
      prisma.settlement.count.mockResolvedValue(7);
      prisma.settlement.aggregate.mockResolvedValue({ _sum: { amount: '1234.5' } });
      // DAU (24h)
      prisma.expense.findMany
        .mockResolvedValueOnce([{ paidById: 'u1' }, { paidById: 'u2' }])
        .mockResolvedValueOnce([{ paidById: 'u1' }, { paidById: 'u3' }, { paidById: 'u4' }])
        .mockResolvedValueOnce([
          { paidById: 'u1' },
          { paidById: 'u3' },
          { paidById: 'u4' },
          { paidById: 'u5' },
        ]);
      prisma.settlement.findMany
        .mockResolvedValueOnce([{ settledById: 'u2' }, { settledById: 'u9' }])
        .mockResolvedValueOnce([{ settledById: 'u9' }])
        .mockResolvedValueOnce([{ settledById: 'u9' }, { settledById: 'u10' }]);
      prisma.$queryRaw.mockResolvedValue([
        { day: new Date('2026-04-22T00:00:00.000Z'), count: BigInt(3) },
        { day: new Date('2026-04-21T00:00:00.000Z'), count: BigInt(2) },
      ]);
    });

    it('returns the aggregated shape with cached=false on first call', async () => {
      const summary = await service.getSummary();

      expect(summary).toMatchObject({
        totalGroups: 4,
        totalMembers: 9,
        totalExpenses: 21,
        totalSettled: 7,
        totalVolumeXlm: 1234.5,
        // DAU union of u1,u2 + u2,u9 = 3 distinct
        dau: 3,
        // WAU union of u1,u3,u4 + u9 = 4 distinct
        wau: 4,
        // MAU union of u1,u3,u4,u5 + u9,u10 = 6 distinct
        mau: 6,
      });
      expect(summary.dauTrend).toHaveLength(14);
      expect(summary.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(cache.set).toHaveBeenCalledWith(
        'analytics:summary:v1',
        expect.any(Object),
        60_000,
      );
    });

    it('returns the cached value without hitting Prisma on cache hit', async () => {
      const cachedSummary = {
        totalGroups: 1,
        totalMembers: 1,
        totalExpenses: 1,
        totalSettled: 1,
        totalVolumeXlm: 1,
        dau: 1,
        wau: 1,
        mau: 1,
        dauTrend: [],
        lastUpdated: '2026-04-22T00:00:00.000Z',
      };
      cache.get.mockResolvedValueOnce(cachedSummary);

      const result = await service.getSummary();

      expect(result).toBe(cachedSummary);
      expect(prisma.group.count).not.toHaveBeenCalled();
      expect(prisma.settlement.aggregate).not.toHaveBeenCalled();
    });

    it('handles null settlement sum as zero volume', async () => {
      prisma.settlement.aggregate.mockResolvedValueOnce({ _sum: { amount: null } });
      const summary = await service.getSummary();
      expect(summary.totalVolumeXlm).toBe(0);
    });

    it('backfills missing days in dauTrend with zero', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]);
      const summary = await service.getSummary();
      expect(summary.dauTrend).toHaveLength(14);
      for (const point of summary.dauTrend) {
        expect(point.count).toBe(0);
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });
});

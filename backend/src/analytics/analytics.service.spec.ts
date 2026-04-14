import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService, TrackEventDto } from './analytics.service';
import { PrismaService } from '../common/prisma/prisma.service';

function makeMockPrisma() {
  return {
    analyticsEvent: {
      create: jest.fn(),
    },
  };
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
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
});

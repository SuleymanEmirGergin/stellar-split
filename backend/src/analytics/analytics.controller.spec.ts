import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { LeaderboardService } from './leaderboard.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  const mockAnalytics = { track: jest.fn(), getSummary: jest.fn() };
  const mockLeaderboard = { getLeaderboard: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: mockAnalytics },
        { provide: LeaderboardService, useValue: mockLeaderboard },
      ],
    }).compile();
    controller = module.get(AnalyticsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('calls service.track and returns queued:true', () => {
    const dto = { event: 'expense_created', userId: 'u1', payload: {} };
    const result = controller.track(dto);
    expect(mockAnalytics.track).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ queued: true });
  });

  it('passes wallet query param through to leaderboardService', () => {
    mockLeaderboard.getLeaderboard.mockReturnValue({ top: [], lastUpdated: 'x' });
    controller.getLeaderboard('GABC', undefined);
    expect(mockLeaderboard.getLeaderboard).toHaveBeenCalledWith({
      wallet: 'GABC',
      limit: undefined,
    });
  });

  it('parses a numeric limit query param to an integer', () => {
    mockLeaderboard.getLeaderboard.mockReturnValue({ top: [], lastUpdated: 'x' });
    controller.getLeaderboard(undefined, '25');
    expect(mockLeaderboard.getLeaderboard).toHaveBeenCalledWith({
      wallet: undefined,
      limit: 25,
    });
  });

  it('treats a non-numeric limit as undefined', () => {
    mockLeaderboard.getLeaderboard.mockReturnValue({ top: [], lastUpdated: 'x' });
    controller.getLeaderboard(undefined, 'NaN-string');
    expect(mockLeaderboard.getLeaderboard).toHaveBeenCalledWith({
      wallet: undefined,
      limit: undefined,
    });
  });
});

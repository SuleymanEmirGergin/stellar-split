import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  const mockService = { track: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: mockService }],
    }).compile();
    controller = module.get(AnalyticsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('calls service.track and returns queued:true', () => {
    const dto = { event: 'expense_created', userId: 'u1', payload: {} };
    const result = controller.track(dto);
    expect(mockService.track).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ queued: true });
  });
});

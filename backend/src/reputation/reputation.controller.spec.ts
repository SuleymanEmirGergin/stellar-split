import { Test, TestingModule } from '@nestjs/testing';
import { ReputationController } from './reputation.controller';
import { ReputationService } from './reputation.service';

const USER = { sub: 'user-uuid' } as any;

describe('ReputationController', () => {
  let controller: ReputationController;
  const mockService = { getMyReputation: jest.fn(), getBadges: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReputationController],
      providers: [{ provide: ReputationService, useValue: mockService }],
    }).compile();
    controller = module.get(ReputationController);
  });

  afterEach(() => jest.clearAllMocks());

  it('getMyReputation() delegates to service', async () => {
    mockService.getMyReputation.mockResolvedValue({ score: 100 });
    await expect(controller.getMyReputation(USER)).resolves.toMatchObject({ score: 100 });
    expect(mockService.getMyReputation).toHaveBeenCalledWith(USER.sub);
  });

  it('getBadges() delegates to service', async () => {
    mockService.getBadges.mockResolvedValue([]);
    await expect(controller.getBadges(USER)).resolves.toEqual([]);
    expect(mockService.getBadges).toHaveBeenCalledWith(USER.sub);
  });
});

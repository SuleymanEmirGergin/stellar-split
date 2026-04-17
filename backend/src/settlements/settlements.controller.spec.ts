import { Test, TestingModule } from '@nestjs/testing';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';

const USER = { sub: 'user-uuid' } as any;

describe('SettlementsController', () => {
  let controller: SettlementsController;
  const mockService = { findByGroup: jest.fn(), create: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettlementsController],
      providers: [{ provide: SettlementsService, useValue: mockService }],
    }).compile();
    controller = module.get(SettlementsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('findByGroup() delegates to service', async () => {
    mockService.findByGroup.mockResolvedValue([]);
    await expect(controller.findByGroup('grp-1', USER)).resolves.toEqual([]);
    expect(mockService.findByGroup).toHaveBeenCalledWith('grp-1', USER.sub, undefined, undefined);
  });

  it('create() injects groupId from URL param and delegates to service', async () => {
    const dto = { txHash: 'abc123', amount: 100 } as any;
    mockService.create.mockResolvedValue({ id: 's1' });
    await expect(controller.create('grp-1', USER, dto)).resolves.toMatchObject({ id: 's1' });
    expect(dto.groupId).toBe('grp-1');
    expect(mockService.create).toHaveBeenCalledWith(USER.sub, dto);
  });
});

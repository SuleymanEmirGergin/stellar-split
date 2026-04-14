import { Test, TestingModule } from '@nestjs/testing';
import { RecurringController } from './recurring.controller';
import { RecurringService } from './recurring.service';

const USER = { sub: 'user-uuid' } as any;

describe('RecurringController', () => {
  let controller: RecurringController;
  const mockService = {
    findByGroup: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecurringController],
      providers: [{ provide: RecurringService, useValue: mockService }],
    }).compile();
    controller = module.get(RecurringController);
  });

  afterEach(() => jest.clearAllMocks());

  it('findByGroup() delegates to service', async () => {
    mockService.findByGroup.mockResolvedValue([]);
    await expect(controller.findByGroup('grp-1', USER)).resolves.toEqual([]);
    expect(mockService.findByGroup).toHaveBeenCalledWith('grp-1', USER.sub);
  });

  it('create() delegates to service', async () => {
    const dto = { groupId: 'grp-1', description: 'rent', amount: 500, frequency: 'MONTHLY' } as any;
    mockService.create.mockResolvedValue({ id: 'r1' });
    await expect(controller.create(USER, dto)).resolves.toMatchObject({ id: 'r1' });
    expect(mockService.create).toHaveBeenCalledWith(USER.sub, dto);
  });

  it('update() delegates to service', async () => {
    const patch = { description: 'updated rent' };
    mockService.update.mockResolvedValue({ id: 'r1', ...patch });
    await expect(controller.update('r-1', USER, patch)).resolves.toMatchObject({ id: 'r1' });
    expect(mockService.update).toHaveBeenCalledWith('r-1', USER.sub, patch);
  });

  it('remove() delegates to service', async () => {
    mockService.remove.mockResolvedValue(undefined);
    await expect(controller.remove('r-1', USER)).resolves.toBeUndefined();
    expect(mockService.remove).toHaveBeenCalledWith('r-1', USER.sub);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

const USER = { sub: 'user-uuid', walletAddress: 'GXXX' } as any;

describe('ExpensesController', () => {
  let controller: ExpensesController;
  const mockService = {
    findByGroup: jest.fn(),
    create: jest.fn(),
    cancel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [{ provide: ExpensesService, useValue: mockService }],
    }).compile();
    controller = module.get(ExpensesController);
  });

  afterEach(() => jest.clearAllMocks());

  it('findByGroup() delegates to service', async () => {
    mockService.findByGroup.mockResolvedValue([]);
    await expect(controller.findByGroup('grp-1', USER)).resolves.toEqual([]);
    expect(mockService.findByGroup).toHaveBeenCalledWith('grp-1', USER.sub, undefined, undefined);
  });

  it('create() delegates to service', async () => {
    const dto = { groupId: 'grp-1', description: 'lunch', amount: 100, currency: 'XLM', splitType: 'EQUAL' } as any;
    const created = { id: 'exp-1', ...dto };
    mockService.create.mockResolvedValue(created);
    await expect(controller.create(USER, dto)).resolves.toEqual(created);
    expect(mockService.create).toHaveBeenCalledWith(USER.sub, dto);
  });

  it('cancel() delegates to service', async () => {
    mockService.cancel.mockResolvedValue({ id: 'exp-1', status: 'CANCELLED' });
    await expect(controller.cancel('exp-1', USER)).resolves.toMatchObject({ status: 'CANCELLED' });
    expect(mockService.cancel).toHaveBeenCalledWith('exp-1', USER.sub);
  });
});

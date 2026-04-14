import { Test, TestingModule } from '@nestjs/testing';
import { GuardiansController } from './guardians.controller';
import { GuardiansService } from './guardians.service';

const USER = { sub: 'user-uuid' } as any;

describe('GuardiansController', () => {
  let controller: GuardiansController;
  const mockService = {
    findByGroup: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuardiansController],
      providers: [{ provide: GuardiansService, useValue: mockService }],
    }).compile();
    controller = module.get(GuardiansController);
  });

  afterEach(() => jest.clearAllMocks());

  it('findByGroup() delegates to service', async () => {
    mockService.findByGroup.mockResolvedValue([]);
    await expect(controller.findByGroup('grp-1', USER)).resolves.toEqual([]);
    expect(mockService.findByGroup).toHaveBeenCalledWith('grp-1', USER.sub);
  });

  it('create() delegates to service', async () => {
    const dto = { groupId: 'grp-1', guardianAddress: 'GCUSTODIAN' } as any;
    mockService.create.mockResolvedValue({ id: 'g1' });
    await expect(controller.create(USER, dto)).resolves.toMatchObject({ id: 'g1' });
    expect(mockService.create).toHaveBeenCalledWith(USER.sub, dto);
  });

  it('remove() delegates to service', async () => {
    mockService.remove.mockResolvedValue(undefined);
    await expect(controller.remove('g-1', USER)).resolves.toBeUndefined();
    expect(mockService.remove).toHaveBeenCalledWith('g-1', USER.sub);
  });
});

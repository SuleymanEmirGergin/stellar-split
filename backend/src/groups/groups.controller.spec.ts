import { Test, TestingModule } from '@nestjs/testing';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

const USER = { sub: 'user-uuid' } as any;

describe('GroupsController', () => {
  let controller: GroupsController;
  const mockService = {
    findAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    getBalances: jest.fn(),
    getSettlementPlan: jest.fn(),
    getInviteLink: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [{ provide: GroupsService, useValue: mockService }],
    }).compile();
    controller = module.get(GroupsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('findAll() delegates to service', async () => {
    mockService.findAll.mockResolvedValue([]);
    await expect(controller.findAll(USER)).resolves.toEqual([]);
    expect(mockService.findAll).toHaveBeenCalledWith(USER.sub, undefined, undefined, undefined);
  });

  it('create() delegates to service', async () => {
    const dto = { name: 'Trip', currency: 'XLM' } as any;
    mockService.create.mockResolvedValue({ id: 'g1' });
    await expect(controller.create(USER, dto)).resolves.toMatchObject({ id: 'g1' });
    expect(mockService.create).toHaveBeenCalledWith(USER.sub, dto);
  });

  it('findOne() delegates to service', async () => {
    mockService.findOne.mockResolvedValue({ id: 'g1' });
    await expect(controller.findOne('g1', USER)).resolves.toMatchObject({ id: 'g1' });
    expect(mockService.findOne).toHaveBeenCalledWith('g1', USER.sub);
  });

  it('update() delegates to service', async () => {
    const dto = { name: 'Updated' } as any;
    mockService.update.mockResolvedValue({ id: 'g1', name: 'Updated' });
    await expect(controller.update('g1', USER, dto)).resolves.toMatchObject({ name: 'Updated' });
    expect(mockService.update).toHaveBeenCalledWith('g1', USER.sub, dto);
  });

  it('remove() delegates to service', async () => {
    mockService.remove.mockResolvedValue(undefined);
    await expect(controller.remove('g1', USER)).resolves.toBeUndefined();
    expect(mockService.remove).toHaveBeenCalledWith('g1', USER.sub);
  });

  it('join() delegates to service', async () => {
    mockService.join.mockResolvedValue({ id: 'gm1' });
    await expect(controller.join('g1', USER, 'invite-code')).resolves.toMatchObject({ id: 'gm1' });
    expect(mockService.join).toHaveBeenCalledWith('g1', USER.sub, 'invite-code');
  });

  it('leave() delegates to service', async () => {
    mockService.leave.mockResolvedValue(undefined);
    await expect(controller.leave('g1', USER)).resolves.toBeUndefined();
    expect(mockService.leave).toHaveBeenCalledWith('g1', USER.sub);
  });

  it('getBalances() delegates to service', async () => {
    mockService.getBalances.mockResolvedValue([]);
    await expect(controller.getBalances('g1', USER)).resolves.toEqual([]);
    expect(mockService.getBalances).toHaveBeenCalledWith('g1', USER.sub);
  });

  it('getSettlementPlan() delegates to service', async () => {
    mockService.getSettlementPlan.mockResolvedValue([]);
    await expect(controller.getSettlementPlan('g1', USER)).resolves.toEqual([]);
    expect(mockService.getSettlementPlan).toHaveBeenCalledWith('g1', USER.sub);
  });

  it('getInvite() delegates to service', async () => {
    mockService.getInviteLink.mockResolvedValue({ url: 'https://invite.link/g1' });
    await expect(controller.getInvite('g1', USER)).resolves.toMatchObject({ url: expect.stringContaining('g1') });
    expect(mockService.getInviteLink).toHaveBeenCalledWith('g1', USER.sub);
  });
});

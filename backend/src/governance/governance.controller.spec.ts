import { Test, TestingModule } from '@nestjs/testing';
import { GovernanceController } from './governance.controller';
import { GovernanceService } from './governance.service';

const USER = { sub: 'user-uuid' } as any;

describe('GovernanceController', () => {
  let controller: GovernanceController;
  const mockService = {
    findProposals: jest.fn(),
    createProposal: jest.fn(),
    castVote: jest.fn(),
    findDisputes: jest.fn(),
    createDispute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GovernanceController],
      providers: [{ provide: GovernanceService, useValue: mockService }],
    }).compile();
    controller = module.get(GovernanceController);
  });

  afterEach(() => jest.clearAllMocks());

  it('findProposals() delegates to service', async () => {
    mockService.findProposals.mockResolvedValue([]);
    await expect(controller.findProposals(USER, 'grp-1')).resolves.toEqual([]);
    expect(mockService.findProposals).toHaveBeenCalledWith('grp-1', USER.sub);
  });

  it('createProposal() delegates to service', async () => {
    const dto = { groupId: 'grp-1', title: 'New Rule', description: 'desc', endsAt: '2027-01-01' } as any;
    mockService.createProposal.mockResolvedValue({ id: 'p1' });
    await expect(controller.createProposal(USER, dto)).resolves.toMatchObject({ id: 'p1' });
    expect(mockService.createProposal).toHaveBeenCalledWith(USER.sub, dto);
  });

  it('castVote() delegates to service', async () => {
    const dto = { option: 'yes' } as any;
    mockService.castVote.mockResolvedValue({ id: 'v1' });
    await expect(controller.castVote(USER, 'p-1', dto)).resolves.toMatchObject({ id: 'v1' });
    expect(mockService.castVote).toHaveBeenCalledWith('p-1', USER.sub, dto);
  });

  it('findDisputes() delegates to service', async () => {
    mockService.findDisputes.mockResolvedValue([]);
    await expect(controller.findDisputes(USER, 'grp-1')).resolves.toEqual([]);
    expect(mockService.findDisputes).toHaveBeenCalledWith('grp-1', USER.sub);
  });

  it('createDispute() delegates to service', async () => {
    const dto = { groupId: 'grp-1', expenseId: 'e1', amount: 50, category: 'food', description: 'wrong' } as any;
    mockService.createDispute.mockResolvedValue({ id: 'd1' });
    await expect(controller.createDispute(USER, dto)).resolves.toMatchObject({ id: 'd1' });
    expect(mockService.createDispute).toHaveBeenCalledWith(USER.sub, dto);
  });
});

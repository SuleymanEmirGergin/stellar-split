import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { GovernanceService } from './governance.service';
import { PrismaService } from '../common/prisma/prisma.service';

const GROUP_ID = 'group-uuid';
const USER_ID = 'user-uuid';
const PROPOSAL_ID = 'proposal-uuid';
const DISPUTE_ID = 'dispute-uuid';

function makeMockPrisma() {
  return {
    groupMember: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    proposal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    proposalVote: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    dispute: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };
}

function makeProposal(overrides: Partial<{
  id: string; groupId: string; status: string; threshold: number;
}> = {}) {
  return {
    id: overrides.id ?? PROPOSAL_ID,
    groupId: overrides.groupId ?? GROUP_ID,
    creatorId: USER_ID,
    title: 'Test Proposal',
    description: 'A test',
    status: overrides.status ?? 'ACTIVE',
    threshold: overrides.threshold ?? 51,
    endsAt: new Date('2027-01-01'),
    createdAt: new Date(),
  };
}

describe('GovernanceService', () => {
  let service: GovernanceService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernanceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<GovernanceService>(GovernanceService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findProposals() ─────────────────────────────────────────────────────────

  describe('findProposals()', () => {
    it('returns proposals for a group member', async () => {
      const proposals = [makeProposal()];
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.proposal.findMany.mockResolvedValue(proposals);

      const result = await service.findProposals(GROUP_ID, USER_ID);

      expect(prisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { groupId: GROUP_ID } }),
      );
      expect(result).toEqual(proposals);
    });

    it('throws ForbiddenException when user is not a group member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.findProposals(GROUP_ID, USER_ID)).rejects.toThrow(ForbiddenException);
      expect(prisma.proposal.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── createProposal() ────────────────────────────────────────────────────────

  describe('createProposal()', () => {
    const dto = {
      groupId: GROUP_ID,
      title: 'New Rule',
      description: 'We should split bills differently',
      threshold: 60,
      endsAt: '2027-06-01T00:00:00.000Z',
    };

    it('creates a proposal for a group member', async () => {
      const created = makeProposal({ threshold: 60 });
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.proposal.create.mockResolvedValue(created);

      const result = await service.createProposal(USER_ID, dto);

      expect(prisma.proposal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            groupId: GROUP_ID,
            creatorId: USER_ID,
            title: 'New Rule',
            threshold: 60,
          }),
        }),
      );
      expect(result).toEqual(created);
    });

    it('uses threshold=51 when not provided in DTO', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.proposal.create.mockResolvedValue(makeProposal());

      await service.createProposal(USER_ID, { ...dto, threshold: undefined as any });

      const createData = prisma.proposal.create.mock.calls[0][0].data;
      expect(createData.threshold).toBe(51);
    });

    it('throws ForbiddenException when user is not a group member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.createProposal(USER_ID, dto)).rejects.toThrow(ForbiddenException);
      expect(prisma.proposal.create).not.toHaveBeenCalled();
    });
  });

  // ─── castVote() ──────────────────────────────────────────────────────────────

  describe('castVote()', () => {
    it('creates a vote for an active proposal by a group member', async () => {
      const vote = { id: 'vote-1', proposalId: PROPOSAL_ID, voterId: USER_ID, option: 'yes' };
      prisma.proposal.findUnique.mockResolvedValue(makeProposal());
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.proposalVote.findUnique.mockResolvedValue(null);
      prisma.proposalVote.create.mockResolvedValue(vote);
      prisma.groupMember.count.mockResolvedValue(3);
      prisma.proposalVote.findMany.mockResolvedValue([vote]);

      const result = await service.castVote(PROPOSAL_ID, USER_ID, { option: 'yes' });

      expect(prisma.proposalVote.create).toHaveBeenCalledWith({
        data: { proposalId: PROPOSAL_ID, voterId: USER_ID, option: 'yes' },
      });
      expect(result).toEqual(vote);
    });

    it('throws NotFoundException when proposal does not exist', async () => {
      prisma.proposal.findUnique.mockResolvedValue(null);

      await expect(service.castVote(PROPOSAL_ID, USER_ID, { option: 'yes' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when proposal status is PASSED', async () => {
      prisma.proposal.findUnique.mockResolvedValue(makeProposal({ status: 'PASSED' }));

      await expect(service.castVote(PROPOSAL_ID, USER_ID, { option: 'yes' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when proposal status is REJECTED', async () => {
      prisma.proposal.findUnique.mockResolvedValue(makeProposal({ status: 'REJECTED' }));

      await expect(service.castVote(PROPOSAL_ID, USER_ID, { option: 'yes' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when user is not a group member', async () => {
      prisma.proposal.findUnique.mockResolvedValue(makeProposal());
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.castVote(PROPOSAL_ID, USER_ID, { option: 'yes' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ConflictException when user has already voted', async () => {
      prisma.proposal.findUnique.mockResolvedValue(makeProposal());
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.proposalVote.findUnique.mockResolvedValue({ id: 'existing-vote' });

      await expect(service.castVote(PROPOSAL_ID, USER_ID, { option: 'yes' })).rejects.toThrow(
        ConflictException,
      );
    });

    describe('recalculateProposalStatus()', () => {
      function setupVoteCast(votes: Array<{ option: string }>, memberCount: number) {
        const voteRecord = { id: 'v1', proposalId: PROPOSAL_ID, voterId: USER_ID, option: votes[0].option };
        prisma.proposal.findUnique.mockResolvedValue(makeProposal({ threshold: 51 }));
        prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
        prisma.proposalVote.findUnique.mockResolvedValue(null);
        prisma.proposalVote.create.mockResolvedValue(voteRecord);
        prisma.groupMember.count.mockResolvedValue(memberCount);
        prisma.proposalVote.findMany.mockResolvedValue(votes.map((v, i) => ({ id: `v${i}`, option: v.option, proposalId: PROPOSAL_ID, voterId: `user-${i}` })));
      }

      it('updates proposal to PASSED when yes votes exceed threshold', async () => {
        // 2 yes out of 3 members = 67% > 51% threshold
        setupVoteCast([{ option: 'yes' }, { option: 'yes' }], 3);

        await service.castVote(PROPOSAL_ID, USER_ID, { option: 'yes' });

        expect(prisma.proposal.update).toHaveBeenCalledWith({
          where: { id: PROPOSAL_ID },
          data: { status: 'PASSED' },
        });
      });

      it('updates proposal to REJECTED when no votes exceed anti-threshold', async () => {
        // 2 no out of 3 members = 67% no > 49% (100-51) anti-threshold
        setupVoteCast([{ option: 'no' }, { option: 'no' }], 3);

        await service.castVote(PROPOSAL_ID, USER_ID, { option: 'no' });

        expect(prisma.proposal.update).toHaveBeenCalledWith({
          where: { id: PROPOSAL_ID },
          data: { status: 'REJECTED' },
        });
      });

      it('does not update status when vote count is insufficient', async () => {
        // 1 yes out of 3 members = 33% < 51% threshold
        setupVoteCast([{ option: 'yes' }], 3);

        await service.castVote(PROPOSAL_ID, USER_ID, { option: 'yes' });

        expect(prisma.proposal.update).not.toHaveBeenCalled();
      });
    });
  });

  // ─── findDisputes() ──────────────────────────────────────────────────────────

  describe('findDisputes()', () => {
    it('returns disputes for a group member', async () => {
      const disputes = [{ id: DISPUTE_ID, groupId: GROUP_ID }];
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.dispute.findMany.mockResolvedValue(disputes);

      const result = await service.findDisputes(GROUP_ID, USER_ID);

      expect(prisma.dispute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { groupId: GROUP_ID } }),
      );
      expect(result).toEqual(disputes);
    });

    it('throws ForbiddenException when user is not a group member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.findDisputes(GROUP_ID, USER_ID)).rejects.toThrow(ForbiddenException);
      expect(prisma.dispute.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── createDispute() ─────────────────────────────────────────────────────────

  describe('createDispute()', () => {
    const dto = {
      groupId: GROUP_ID,
      expenseId: 'exp-uuid',
      amount: 50,
      category: 'food',
      description: 'I disagree with this split',
    };

    it('creates a dispute for a group member', async () => {
      const created = { id: DISPUTE_ID, ...dto, initiatorId: USER_ID };
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.dispute.create.mockResolvedValue(created);

      const result = await service.createDispute(USER_ID, dto);

      expect(prisma.dispute.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            groupId: GROUP_ID,
            initiatorId: USER_ID,
            expenseId: 'exp-uuid',
            amount: 50,
            category: 'food',
          }),
        }),
      );
      expect(result).toEqual(created);
    });

    it('throws ForbiddenException when user is not a group member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.createDispute(USER_ID, dto)).rejects.toThrow(ForbiddenException);
      expect(prisma.dispute.create).not.toHaveBeenCalled();
    });
  });
});

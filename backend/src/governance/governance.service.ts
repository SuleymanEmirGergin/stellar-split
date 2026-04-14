import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';

@Injectable()
export class GovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Proposals ──────────────────────────────────────────────────────────────

  async findProposals(groupId: string, userId: string) {
    await this.assertMember(groupId, userId);
    return this.prisma.proposal.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, walletAddress: true } },
        votes: { include: { voter: { select: { id: true, walletAddress: true } } } },
      },
    });
  }

  async createProposal(userId: string, dto: CreateProposalDto) {
    await this.assertMember(dto.groupId, userId);
    return this.prisma.proposal.create({
      data: {
        groupId: dto.groupId,
        creatorId: userId,
        title: dto.title,
        description: dto.description,
        threshold: dto.threshold ?? 51,
        endsAt: new Date(dto.endsAt),
      },
      include: {
        creator: { select: { id: true, walletAddress: true } },
        votes: true,
      },
    });
  }

  async castVote(proposalId: string, userId: string, dto: CastVoteDto) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (proposal.status !== 'ACTIVE') {
      throw new ForbiddenException('Voting is closed for this proposal');
    }

    await this.assertMember(proposal.groupId, userId);

    const existing = await this.prisma.proposalVote.findUnique({
      where: { proposalId_voterId: { proposalId, voterId: userId } },
    });
    if (existing) throw new ConflictException('You have already voted on this proposal');

    const vote = await this.prisma.proposalVote.create({
      data: { proposalId, voterId: userId, option: dto.option },
    });

    // Recalculate status after vote
    await this.recalculateProposalStatus(proposalId, proposal.groupId, proposal.threshold);

    return vote;
  }

  // ─── Disputes ───────────────────────────────────────────────────────────────

  async findDisputes(groupId: string, userId: string) {
    await this.assertMember(groupId, userId);
    return this.prisma.dispute.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      include: {
        initiator: { select: { id: true, walletAddress: true } },
      },
    });
  }

  async createDispute(userId: string, dto: CreateDisputeDto) {
    await this.assertMember(dto.groupId, userId);
    return this.prisma.dispute.create({
      data: {
        groupId: dto.groupId,
        initiatorId: userId,
        expenseId: dto.expenseId,
        amount: dto.amount,
        category: dto.category,
        description: dto.description,
      },
      include: {
        initiator: { select: { id: true, walletAddress: true } },
      },
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async assertMember(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this group');
    return member;
  }

  private async recalculateProposalStatus(
    proposalId: string,
    groupId: string,
    threshold: number,
  ) {
    const [memberCount, votes] = await Promise.all([
      this.prisma.groupMember.count({ where: { groupId } }),
      this.prisma.proposalVote.findMany({ where: { proposalId } }),
    ]);

    if (memberCount === 0) return;

    const yesCount = votes.filter((v) => v.option === 'yes').length;
    const yesPercent = Math.round((yesCount / memberCount) * 100);
    const noPercent = Math.round(((votes.length - yesCount) / memberCount) * 100);

    let status: 'ACTIVE' | 'PASSED' | 'REJECTED' = 'ACTIVE';
    if (yesPercent >= threshold) status = 'PASSED';
    else if (noPercent > 100 - threshold) status = 'REJECTED';

    if (status !== 'ACTIVE') {
      await this.prisma.proposal.update({
        where: { id: proposalId },
        data: { status },
      });
    }
  }
}

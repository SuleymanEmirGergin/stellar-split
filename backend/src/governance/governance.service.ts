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
import { CastDisputeVoteDto } from './dto/cast-dispute-vote.dto';

@Injectable()
export class GovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Proposals ──────────────────────────────────────────────────────────────

  async findProposals(groupId: string, userId: string, cursor?: string, limit = 20) {
    await this.assertMember(groupId, userId);
    const take = Math.min(limit, 100);
    const proposals = await this.prisma.proposal.findMany({
      where: { groupId },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, walletAddress: true } },
        votes: { include: { voter: { select: { id: true, walletAddress: true } } } },
      },
    });
    const hasMore = proposals.length > take;
    const items = hasMore ? proposals.slice(0, take) : proposals;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : undefined, hasMore };
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

  async findDisputes(groupId: string, userId: string, cursor?: string, limit = 20) {
    await this.assertMember(groupId, userId);
    const take = Math.min(limit, 100);
    const disputes = await this.prisma.dispute.findMany({
      where: { groupId },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        initiator: { select: { id: true, walletAddress: true } },
        votes: { include: { voter: { select: { id: true, walletAddress: true } } } },
      },
    });
    const hasMore = disputes.length > take;
    const items = hasMore ? disputes.slice(0, take) : disputes;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : undefined, hasMore };
  }

  async castDisputeVote(disputeId: string, userId: string, dto: CastDisputeVoteDto) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status !== 'OPEN') {
      throw new ForbiddenException('Voting is closed for this dispute');
    }

    await this.assertMember(dispute.groupId, userId);

    // Upsert: allow changing vote (idempotent)
    const vote = await this.prisma.disputeVote.upsert({
      where: { disputeId_voterId: { disputeId, voterId: userId } },
      update: { option: dto.option },
      create: { disputeId, voterId: userId, option: dto.option },
    });

    // Recalculate dispute status after vote
    await this.recalculateDisputeStatus(disputeId, dispute.groupId);

    return vote;
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

  private async recalculateDisputeStatus(disputeId: string, groupId: string) {
    const [memberCount, votes] = await Promise.all([
      this.prisma.groupMember.count({ where: { groupId } }),
      this.prisma.disputeVote.findMany({ where: { disputeId } }),
    ]);

    if (memberCount === 0) return;

    const upholdCount = votes.filter((v) => v.option === 'uphold').length;
    const dismissCount = votes.filter((v) => v.option === 'dismiss').length;

    // Simple majority (>50%) determines outcome
    const majority = Math.ceil(memberCount / 2);
    let status: 'OPEN' | 'RESOLVED' | 'DISMISSED' | null = null;
    if (upholdCount >= majority) status = 'RESOLVED';
    else if (dismissCount >= majority) status = 'DISMISSED';

    if (status) {
      await this.prisma.dispute.update({
        where: { id: disputeId },
        data: { status },
      });
    }
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

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { AuditService } from '../audit/audit.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly audit: AuditService,
  ) {}

  async findAll(userId: string, cursor?: string, limit = 20, search?: string) {
    const take = Math.min(limit, 100);
    const where = {
      members: { some: { userId } },
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };
    const groups = await this.prisma.group.findMany({
      where,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true } } },
    });
    const hasMore = groups.length > take;
    const items = hasMore ? groups.slice(0, take) : groups;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;
    return { items, nextCursor, hasMore };
  }

  async findOne(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: { select: { id: true, walletAddress: true } },
        members: { include: { user: { select: { id: true, walletAddress: true, reputationScore: true } } } },
        _count: { select: { expenses: true, settlements: true } },
      },
    });
    if (!group) throw new NotFoundException('Group not found');
    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not a member of this group');
    return group;
  }

  async create(userId: string, dto: CreateGroupDto) {
    // Resolve wallet addresses of additional members to user IDs
    const additionalMemberIds: string[] = [];
    if (dto.members?.length) {
      const users = await this.prisma.user.findMany({
        where: { walletAddress: { in: dto.members } },
        select: { id: true },
      });
      additionalMemberIds.push(...users.map((u) => u.id));
    }

    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        currency: dto.currency as any,
        createdById: userId,
        members: {
          create: [
            { userId, role: 'CREATOR' },
            ...additionalMemberIds
              .filter((id) => id !== userId)
              .map((id) => ({ userId: id, role: 'MEMBER' as const })),
          ],
        },
      },
      include: { members: true },
    });

    this.logger.log({ groupId: group.id, createdBy: userId }, 'Group created');
    this.audit.log(
      { actorType: 'user', actorId: userId, groupId: group.id },
      { entityType: 'group', entityId: group.id, action: 'group.created',
        afterState: { name: group.name, currency: group.currency } },
    );
    return group;
  }

  async update(groupId: string, userId: string, dto: UpdateGroupDto) {
    await this.assertCreator(groupId, userId);
    return this.prisma.group.update({ where: { id: groupId }, data: dto });
  }

  async remove(groupId: string, userId: string) {
    await this.assertCreator(groupId, userId);
    await this.prisma.group.delete({ where: { id: groupId } });
    this.logger.log({ groupId, deletedBy: userId }, 'Group deleted');
  }

  async join(groupId: string, userId: string, inviteCode?: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (inviteCode && group.inviteCode !== inviteCode) {
      throw new ForbiddenException('Invalid invite code');
    }
    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (existing) throw new ConflictException('Already a member of this group');
    const member = await this.prisma.groupMember.create({ data: { groupId, userId } });
    this.logger.log({ groupId, userId }, 'Member joined group');

    void this.events.publish({ type: 'member:joined', groupId, payload: { userId }, ts: Date.now() });
    this.audit.log(
      { actorType: 'user', actorId: userId, groupId },
      { entityType: 'member', entityId: userId, action: 'member.joined' },
    );
    return member;
  }

  async leave(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new NotFoundException('Not a member of this group');
    if (member.role === 'CREATOR') {
      throw new ForbiddenException('Group creator cannot leave — transfer ownership first');
    }
    await this.prisma.groupMember.delete({ where: { id: member.id } });
    this.logger.log({ groupId, userId }, 'Member left group');

    void this.events.publish({ type: 'member:left', groupId, payload: { userId }, ts: Date.now() });
    this.audit.log(
      { actorType: 'user', actorId: userId, groupId },
      { entityType: 'member', entityId: userId, action: 'member.left' },
    );
  }

  async getBalances(groupId: string, userId: string) {
    await this.assertMember(groupId, userId);
    const expenses = await this.prisma.expense.findMany({
      where: { groupId, status: 'ACTIVE' },
      include: { splits: true, paidBy: { select: { id: true, walletAddress: true } } },
    });

    // Build net balance map: positive = owed to you, negative = you owe
    const balanceMap = new Map<string, number>();
    for (const expense of expenses) {
      const paidById = expense.paidById;
      // payer gets credit
      balanceMap.set(paidById, (balanceMap.get(paidById) ?? 0) + Number(expense.amount));
      // debtors get debited
      for (const split of expense.splits) {
        balanceMap.set(split.userId, (balanceMap.get(split.userId) ?? 0) - Number(split.amount));
      }
    }

    return Array.from(balanceMap.entries()).map(([uid, balance]) => ({ userId: uid, balance }));
  }

  async getInviteLink(groupId: string, userId: string) {
    const group = await this.findOne(groupId, userId);
    return { inviteCode: group.inviteCode, groupId: group.id };
  }

  private async assertMember(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this group');
    return member;
  }

  private async assertCreator(groupId: string, userId: string) {
    const member = await this.assertMember(groupId, userId);
    if (member.role !== 'CREATOR') {
      throw new ForbiddenException('Only the group creator can perform this action');
    }
    return member;
  }
}

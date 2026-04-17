import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { AuditService } from '../audit/audit.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { simplifyDebts } from './debt-simplification';

/** Cache TTL constants (milliseconds) */
const TTL_GROUP  = 60_000;  // 60 s — group detail
const TTL_BALS   = 30_000;  // 30 s — balance map (invalidated by expense mutations)

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly audit: AuditService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
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
    const cacheKey = `group:${groupId}`;

    let group = await this.cache.get<Awaited<ReturnType<typeof this.fetchGroup>>>(cacheKey);
    if (!group) {
      group = await this.fetchGroup(groupId);
      if (group) await this.cache.set(cacheKey, group, TTL_GROUP);
    }

    if (!group) throw new NotFoundException('Group not found');
    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not a member of this group');
    return group;
  }

  private fetchGroup(groupId: string) {
    return this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: { select: { id: true, walletAddress: true } },
        members: { include: { user: { select: { id: true, walletAddress: true, reputationScore: true } } } },
        _count: { select: { expenses: true, settlements: true } },
      },
    });
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
    const updated = await this.prisma.group.update({ where: { id: groupId }, data: dto });
    await this.cache.del(`group:${groupId}`);
    return updated;
  }

  async remove(groupId: string, userId: string) {
    await this.assertCreator(groupId, userId);
    await this.prisma.group.delete({ where: { id: groupId } });
    await Promise.all([
      this.cache.del(`group:${groupId}`),
      this.cache.del(`group:${groupId}:balances`),
    ]);
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
    await this.cache.del(`group:${groupId}`);
    this.logger.log({ groupId, userId }, 'Member joined group');

    void Promise.resolve(this.events.publish({ type: 'member:joined', groupId, payload: { userId }, ts: Date.now() }))
      .catch(err => this.logger.error({ err, groupId }, 'Event publish failed (member:joined)'));
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
    await this.cache.del(`group:${groupId}`);
    this.logger.log({ groupId, userId }, 'Member left group');

    void Promise.resolve(this.events.publish({ type: 'member:left', groupId, payload: { userId }, ts: Date.now() }))
      .catch(err => this.logger.error({ err, groupId }, 'Event publish failed (member:left)'));
    this.audit.log(
      { actorType: 'user', actorId: userId, groupId },
      { entityType: 'member', entityId: userId, action: 'member.left' },
    );
  }

  async getBalances(groupId: string, userId: string) {
    await this.assertMember(groupId, userId);

    const cacheKey = `group:${groupId}:balances`;
    const cached = await this.cache.get<Array<{ userId: string; balance: number }>>(cacheKey);
    if (cached) return cached;

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

    const result = Array.from(balanceMap.entries()).map(([uid, balance]) => ({ userId: uid, balance }));
    await this.cache.set(cacheKey, result, TTL_BALS);
    return result;
  }

  /** Called by ExpensesService after any expense mutation to keep balances fresh. */
  async invalidateBalances(groupId: string): Promise<void> {
    await this.cache.del(`group:${groupId}:balances`);
  }

  async getSettlementPlan(groupId: string, userId: string) {
    const rawBalances = await this.getBalances(groupId, userId);
    const transfers = simplifyDebts(rawBalances);
    return {
      transfers,
      totalTransfers: transfers.length,
      /**
       * Maximum transfers without simplification = n*(n-1)/2.
       * Simplification savings: how many transfers were avoided.
       */
      savedTransfers: Math.max(0, rawBalances.filter(b => Math.abs(b.balance) > 1e-7).length - transfers.length),
    };
  }

  async getInviteLink(groupId: string, userId: string) {
    const group = await this.findOne(groupId, userId);
    return { inviteCode: group.inviteCode, groupId: group.id };
  }

  async getAnalytics(groupId: string, userId: string) {
    await this.assertMember(groupId, userId);

    const expenses = await this.prisma.expense.findMany({
      where: { groupId, status: 'ACTIVE' },
      include: {
        paidBy: { select: { walletAddress: true } },
        splits: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // ── Currency breakdown (backend doesn't have free-form categories) ─────
    const byCurrency: Record<string, { total: number; count: number }> = {};
    for (const e of expenses) {
      const cur = e.currency as string;
      if (!byCurrency[cur]) byCurrency[cur] = { total: 0, count: 0 };
      byCurrency[cur].total += Number(e.amount);
      byCurrency[cur].count += 1;
    }
    const categoryBreakdown = Object.entries(byCurrency).map(([category, v]) => ({
      category,
      total: v.total,
      count: v.count,
    }));

    // ── Per-member spending ────────────────────────────────────────────────
    const byMember: Record<string, number> = {};
    for (const e of expenses) {
      const addr = e.paidBy.walletAddress;
      byMember[addr] = (byMember[addr] ?? 0) + Number(e.amount);
    }
    const memberSpending = Object.entries(byMember).map(([walletAddress, total]) => ({
      walletAddress,
      total,
    }));

    // ── Daily timeline ─────────────────────────────────────────────────────
    const dailyTotals: Record<string, number> = {};
    for (const e of expenses) {
      const day = e.createdAt.toISOString().slice(0, 10);
      dailyTotals[day] = (dailyTotals[day] ?? 0) + Number(e.amount);
    }
    // Cumulative running total
    let running = 0;
    const timeline = Object.entries(dailyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => {
        running += amount;
        return { date, amount, cumulative: running };
      });

    // ── Summary ────────────────────────────────────────────────────────────
    const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);

    return {
      totalExpenses: expenses.length,
      totalAmount,
      categoryBreakdown,
      memberSpending,
      timeline,
    };
  }

  async transferOwnership(groupId: string, userId: string, dto: TransferOwnershipDto) {
    await this.assertCreator(groupId, userId);

    const newOwnerMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: dto.newOwnerId } },
    });
    if (!newOwnerMember) throw new NotFoundException('New owner is not a member of this group');

    // Swap roles in a transaction
    await this.prisma.$transaction([
      this.prisma.groupMember.update({
        where: { groupId_userId: { groupId, userId } },
        data: { role: 'MEMBER' },
      }),
      this.prisma.groupMember.update({
        where: { groupId_userId: { groupId, userId: dto.newOwnerId } },
        data: { role: 'CREATOR' },
      }),
    ]);

    await this.cache.del(`group:${groupId}`);
    this.logger.log({ groupId, fromUserId: userId, toUserId: dto.newOwnerId }, 'Ownership transferred');
    this.audit.log(
      { actorType: 'user', actorId: userId, groupId },
      { entityType: 'group', entityId: groupId, action: 'group.ownership_transferred',
        afterState: { newOwnerId: dto.newOwnerId } },
    );
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

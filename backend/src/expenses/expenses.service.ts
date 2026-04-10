import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { AuditService } from '../audit/audit.service';
import { CreateExpenseDto, SplitType } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly audit: AuditService,
  ) {}

  async findByGroup(groupId: string, userId: string, cursor?: string, limit = 20) {
    await this.assertMember(groupId, userId);
    const take = Math.min(limit, 100);
    const expenses = await this.prisma.expense.findMany({
      where: { groupId },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        paidBy: { select: { id: true, walletAddress: true } },
        splits: true,
      },
    });
    const hasMore = expenses.length > take;
    const items = hasMore ? expenses.slice(0, take) : expenses;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : undefined, hasMore };
  }

  async create(userId: string, dto: CreateExpenseDto) {
    await this.assertMember(dto.groupId, userId);

    // Resolve paidBy wallet to userId
    const paidByUser = await this.prisma.user.findUnique({ where: { walletAddress: dto.paidBy } });
    if (!paidByUser) throw new NotFoundException('Paid-by user not found');

    // Build splits
    const members = await this.prisma.groupMember.findMany({
      where: { groupId: dto.groupId },
      include: { user: { select: { id: true, walletAddress: true } } },
    });

    let splitsData: { userId: string; amount: number; percentage?: number }[] = [];

    if (dto.splitType === SplitType.EQUAL) {
      const perPerson = dto.amount / members.length;
      splitsData = members.map((m) => ({ userId: m.userId, amount: perPerson }));
    } else if (dto.splitType === SplitType.CUSTOM || dto.splitType === SplitType.PERCENTAGE) {
      if (!dto.splits?.length) {
        throw new BadRequestException('splits array required for CUSTOM and PERCENTAGE split types');
      }
      // Resolve wallet addresses to user IDs
      const walletToId = new Map(members.map((m) => [m.user.walletAddress, m.userId]));
      splitsData = dto.splits.map((s) => {
        const uid = walletToId.get(s.walletAddress);
        if (!uid) throw new BadRequestException(`Member ${s.walletAddress} is not in this group`);
        return { userId: uid, amount: s.amount, percentage: s.percentage };
      });
    }

    const expense = await this.prisma.expense.create({
      data: {
        groupId: dto.groupId,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency as any,
        paidById: paidByUser.id,
        splitType: dto.splitType as any,
        receiptUrl: dto.receiptUrl,
        splits: { create: splitsData },
      },
      include: { splits: true, paidBy: { select: { id: true, walletAddress: true } } },
    });

    this.logger.log({ expenseId: expense.id, groupId: dto.groupId, createdBy: userId }, 'Expense created');

    void this.events.publish({
      type: 'expense:added',
      groupId: dto.groupId,
      payload: { expenseId: expense.id, description: expense.description, amount: Number(expense.amount), paidBy: dto.paidBy },
      ts: Date.now(),
    });

    this.audit.log(
      { actorType: 'user', actorId: userId, groupId: dto.groupId },
      { entityType: 'expense', entityId: expense.id, action: 'expense.created',
        afterState: { description: expense.description, amount: Number(expense.amount), splitType: expense.splitType } },
    );

    return expense;
  }

  async cancel(expenseId: string, userId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      include: { group: { include: { members: true } } },
    });
    if (!expense) throw new NotFoundException('Expense not found');

    const membership = expense.group.members.find((m) => m.userId === userId);
    if (!membership) throw new ForbiddenException('Not a member of this group');

    // Only creator or expense payer can cancel
    if (expense.paidById !== userId && membership.role !== 'CREATOR') {
      throw new ForbiddenException('Only the payer or group creator can cancel this expense');
    }

    if (expense.status === 'CANCELLED') {
      throw new BadRequestException('Expense is already cancelled');
    }

    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data: { status: 'CANCELLED' },
    });

    this.logger.log({ expenseId, cancelledBy: userId }, 'Expense cancelled');

    void this.events.publish({
      type: 'expense:cancelled',
      groupId: expense.groupId,
      payload: { expenseId },
      ts: Date.now(),
    });

    this.audit.log(
      { actorType: 'user', actorId: userId, groupId: expense.groupId },
      { entityType: 'expense', entityId: expenseId, action: 'expense.cancelled',
        beforeState: { status: 'ACTIVE' }, afterState: { status: 'CANCELLED' } },
    );

    return updated;
  }

  private async assertMember(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this group');
    return member;
  }
}

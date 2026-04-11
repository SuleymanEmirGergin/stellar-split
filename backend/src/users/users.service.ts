import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GDPR data export — returns all data linked to the user as a JSON object.
   */
  async exportData(userId: string) {
    const [user, groups, expenses, settlements, notifications, auditLogs] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            walletAddress: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.groupMember.findMany({
          where: { userId },
          include: {
            group: {
              select: { id: true, name: true, currency: true, createdAt: true },
            },
          },
        }),
        this.prisma.expense.findMany({
          where: { paidById: userId },
          select: {
            id: true,
            description: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true,
          },
        }),
        this.prisma.settlement.findMany({
          where: { settledById: userId },
          select: {
            id: true,
            txHash: true,
            amount: true,
            status: true,
            timestamp: true,
          },
        }),
        this.prisma.notification.findMany({
          where: { userId },
          select: {
            id: true,
            type: true,
            payload: true,
            readAt: true,
            createdAt: true,
          },
        }),
        this.prisma.auditLog.findMany({
          where: { actorId: userId },
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            createdAt: true,
          },
        }),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      user,
      groups: groups.map((gm) => gm.group),
      expenses,
      settlements,
      notifications,
      auditLogs,
    };
  }

  /**
   * GDPR erasure — hard-deletes the user and all owned data.
   * Done in explicit order because some relations lack onDelete: Cascade.
   */
  async deleteAccount(userId: string): Promise<void> {
    // 1. Revoke sessions immediately
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    // 2. Relations without schema-level cascade
    await this.prisma.recoveryRequest.deleteMany({ where: { userId } });
    await this.prisma.guardian.deleteMany({
      where: { OR: [{ userId }, { guardianUserId: userId }] },
    });
    await this.prisma.settlement.deleteMany({ where: { settledById: userId } });

    // ExpenseSplit rows cascade from Expense; delete payer expenses
    await this.prisma.expense.deleteMany({ where: { paidById: userId } });

    // 3. Relations with cascade (groupMember, notification, userBadge, analyticsEvent)
    //    handled automatically, but we delete user which triggers them
    await this.prisma.user.delete({ where: { id: userId } });
  }
}

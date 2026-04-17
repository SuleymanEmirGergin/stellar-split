import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSavingsPoolDto } from './dto/create-savings-pool.dto';
import { ContributeSavingsDto } from './dto/contribute-savings.dto';
import { SavingsPoolStatus } from '@prisma/client';

@Injectable()
export class SavingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a new savings pool for a group */
  async createPool(userId: string, dto: CreateSavingsPoolDto) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: dto.groupId, userId } },
    });
    if (!membership) throw new ForbiddenException('Not a group member');

    return this.prisma.savingsPool.create({
      data: {
        groupId: dto.groupId,
        createdById: userId,
        title: dto.title,
        goalAmount: dto.goalAmount,
        currency: dto.currency ?? 'XLM',
        deadline: dto.deadline ? new Date(dto.deadline) : null,
      },
      include: { contributions: { include: { user: { select: { walletAddress: true } } } } },
    });
  }

  /** List all pools for a group */
  async findByGroup(groupId: string, userId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) throw new ForbiddenException('Not a group member');

    return this.prisma.savingsPool.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { walletAddress: true } },
        contributions: {
          include: { user: { select: { walletAddress: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /** Get a single pool */
  async findOne(poolId: string, userId: string) {
    const pool = await this.prisma.savingsPool.findUnique({
      where: { id: poolId },
      include: {
        createdBy: { select: { walletAddress: true } },
        contributions: {
          include: { user: { select: { walletAddress: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!pool) throw new NotFoundException('Pool not found');

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: pool.groupId, userId } },
    });
    if (!membership) throw new ForbiddenException('Not a group member');

    return pool;
  }

  /** Contribute to a pool */
  async contribute(poolId: string, userId: string, dto: ContributeSavingsDto) {
    const pool = await this.prisma.savingsPool.findUnique({ where: { id: poolId } });
    if (!pool) throw new NotFoundException('Pool not found');
    if (pool.status !== SavingsPoolStatus.ACTIVE) {
      throw new BadRequestException('Pool is not active');
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: pool.groupId, userId } },
    });
    if (!membership) throw new ForbiddenException('Not a group member');

    // Add contribution and update currentAmount in a transaction
    const [contribution, updatedPool] = await this.prisma.$transaction([
      this.prisma.savingsContribution.create({
        data: { poolId, userId, amount: dto.amount, note: dto.note ?? null },
        include: { user: { select: { walletAddress: true } } },
      }),
      this.prisma.savingsPool.update({
        where: { id: poolId },
        data: { currentAmount: { increment: dto.amount } },
      }),
    ]);

    // Check if goal reached → auto-complete
    const newAmount = Number(updatedPool.currentAmount);
    const goal = Number(pool.goalAmount);
    if (newAmount >= goal) {
      await this.prisma.savingsPool.update({
        where: { id: poolId },
        data: { status: SavingsPoolStatus.COMPLETED },
      });
    }

    return { contribution, goalReached: newAmount >= goal };
  }

  /** Cancel a pool (only creator can cancel) */
  async cancelPool(poolId: string, userId: string) {
    const pool = await this.prisma.savingsPool.findUnique({ where: { id: poolId } });
    if (!pool) throw new NotFoundException('Pool not found');
    if (pool.createdById !== userId) throw new ForbiddenException('Only creator can cancel');
    if (pool.status !== SavingsPoolStatus.ACTIVE) {
      throw new BadRequestException('Pool is not active');
    }

    return this.prisma.savingsPool.update({
      where: { id: poolId },
      data: { status: SavingsPoolStatus.CANCELLED },
    });
  }

  /**
   * Auto-expire pools past their deadline (called by cron).
   * Sets status to CANCELLED for overdue ACTIVE pools that haven't met their goal.
   */
  async expireOverdue() {
    return this.prisma.savingsPool.updateMany({
      where: {
        status: SavingsPoolStatus.ACTIVE,
        deadline: { lt: new Date() },
      },
      data: { status: SavingsPoolStatus.CANCELLED },
    });
  }
}

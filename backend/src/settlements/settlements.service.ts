import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { UpdateSettlementStatusDto } from './dto/update-settlement-status.dto';

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue('stellar-tx-monitor') private readonly stellarQueue: Queue,
  ) {}

  async findByGroup(groupId: string, userId: string, cursor?: string, limit = 20) {
    await this.assertMember(groupId, userId);
    const take = Math.min(limit, 100);
    const settlements = await this.prisma.settlement.findMany({
      where: { groupId },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { timestamp: 'desc' },
      include: { settledBy: { select: { id: true, walletAddress: true } } },
    });
    const hasMore = settlements.length > take;
    const items = hasMore ? settlements.slice(0, take) : settlements;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : undefined, hasMore };
  }

  async create(userId: string, dto: CreateSettlementDto) {
    await this.assertMember(dto.groupId, userId);

    // Idempotency: same txHash returns existing record
    const existing = await this.prisma.settlement.findUnique({ where: { txHash: dto.txHash } });
    if (existing) {
      this.logger.log({ txHash: dto.txHash }, 'Settlement already exists — returning existing record');
      return existing;
    }

    const settlement = await this.prisma.settlement.create({
      data: {
        groupId: dto.groupId,
        settledById: userId,
        txHash: dto.txHash,
        amount: dto.amount,
        status: 'PENDING',
      },
    });

    // Enqueue Stellar Horizon monitoring job
    try {
      await this.stellarQueue.add(
        'monitor-tx',
        { settlementId: settlement.id, txHash: dto.txHash },
        { attempts: 10, backoff: { type: 'exponential', delay: 3000 } },
      );
      this.logger.log(
        { settlementId: settlement.id, txHash: dto.txHash, groupId: dto.groupId },
        'Settlement created; monitoring job enqueued',
      );
    } catch (err) {
      this.logger.error(
        { err, settlementId: settlement.id, txHash: dto.txHash },
        'Settlement monitoring job enqueue failed — settlement recorded but will not be auto-confirmed',
      );
    }

    this.audit.log(
      { actorType: 'user', actorId: userId, groupId: dto.groupId },
      { entityType: 'settlement', entityId: settlement.id, action: 'settlement.submitted',
        afterState: { txHash: dto.txHash, amount: dto.amount, status: 'PENDING' } },
    );

    return settlement;
  }

  async updateStatus(settlementId: string, userId: string, dto: UpdateSettlementStatusDto) {
    const settlement = await this.prisma.settlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw new NotFoundException('Settlement not found');
    await this.assertMember(settlement.groupId, userId);

    const updated = await this.prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: dto.status,
        ...(dto.txHash ? { txHash: dto.txHash } : {}),
      },
    });

    this.logger.log({ settlementId, status: dto.status, updatedBy: userId }, 'Settlement status updated');
    this.audit.log(
      { actorType: 'user', actorId: userId, groupId: settlement.groupId },
      { entityType: 'settlement', entityId: settlementId, action: `settlement.${dto.status.toLowerCase()}`,
        afterState: { status: dto.status } },
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

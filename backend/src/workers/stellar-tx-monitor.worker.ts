import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';
import { ReputationService } from '../reputation/reputation.service';
import { EventsService } from '../events/events.service';

interface MonitorTxJobData {
  settlementId: string;
  txHash: string;
}

@Processor('stellar-tx-monitor')
export class StellarTxMonitorWorker extends WorkerHost {
  private readonly logger = new Logger(StellarTxMonitorWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stellar: StellarService,
    private readonly reputation: ReputationService,
    private readonly events: EventsService,
  ) {
    super();
  }

  async process(job: Job<MonitorTxJobData>): Promise<void> {
    const { settlementId, txHash } = job.data;
    this.logger.log({ settlementId, txHash, attempt: job.attemptsMade }, 'Checking Stellar tx status');

    const tx = await this.stellar.getTransaction(txHash);

    if (!tx) {
      this.logger.log({ txHash }, 'Transaction not found on Horizon yet — will retry');
      throw new Error(`Transaction ${txHash} not yet confirmed`);
    }

    if (tx.successful) {
      const settlement = await this.prisma.settlement.update({
        where: { id: settlementId },
        data: { status: 'CONFIRMED', confirmedAt: new Date(tx.createdAt) },
        include: { group: true },
      });

      // Mark group as settled if all active balances are zero
      await this.prisma.group.update({
        where: { id: settlement.groupId },
        data: { isSettled: true },
      });

      // Award reputation points to settler
      await this.reputation.updateScore(settlement.settledById, 10);

      // Publish SSE event
      void this.events.publish({
        type: 'settlement:confirmed',
        groupId: settlement.groupId,
        payload: { settlementId, txHash },
        ts: Date.now(),
      });

      this.logger.log({ settlementId, txHash }, 'Settlement confirmed on Stellar');
    } else {
      await this.prisma.settlement.update({
        where: { id: settlementId },
        data: { status: 'FAILED' },
      });

      void this.events.publish({
        type: 'settlement:failed',
        groupId: (await this.prisma.settlement.findUnique({ where: { id: settlementId }, select: { groupId: true } }))?.groupId ?? '',
        payload: { settlementId, txHash },
        ts: Date.now(),
      });

      this.logger.warn({ settlementId, txHash }, 'Settlement transaction failed on Stellar');
    }
  }
}

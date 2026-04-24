import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { StellarTxMonitorWorker } from './stellar-tx-monitor.worker';
import { RecurringExpenseWorker } from './recurring-expense.worker';
import { DlqWorker } from './dlq.worker';
import { StellarModule } from '../stellar/stellar.module';
import { ReputationModule } from '../reputation/reputation.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../common/prisma/prisma.module';

/**
 * Retry & DLQ policy
 * ─────────────────────────────────────────────────────────────
 * Each queue gets a typed retry configuration.  After all attempts
 * are exhausted BullMQ marks the job as `failed` (removeOnFail: false
 * in app.module.ts ensures it stays visible for ops replay).
 *
 * A separate `dlq` queue is available for explicit routing of jobs
 * that should never auto-retry (e.g. settlement double-spends).
 */
const STELLAR_TX_JOB_OPTIONS = {
  // 5 attempts: immediate, 2 s, 4 s, 8 s, 16 s
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2_000 },
  // Keep completed jobs for 500 entries, failed indefinitely (for replay)
  removeOnComplete: 500,
  removeOnFail: false,
};

const RECURRING_JOB_OPTIONS = {
  // 3 attempts: immediate, 5 min, 10 min
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5 * 60 * 1_000 },
  removeOnComplete: 200,
  removeOnFail: false,
};

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    BullModule.registerQueue({
      name: 'stellar-tx-monitor',
      defaultJobOptions: STELLAR_TX_JOB_OPTIONS,
    }),
    BullModule.registerQueue({
      name: 'recurring-expenses',
      defaultJobOptions: RECURRING_JOB_OPTIONS,
    }),
    // Dead Letter Queue — jobs land here explicitly (UnrecoverableError path)
    // or are routed manually for ops inspection.
    BullModule.registerQueue({
      name: 'dlq',
      defaultJobOptions: {
        // DLQ jobs must never auto-retry
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      },
    }),
    StellarModule,
    ReputationModule,
    EventsModule,
    NotificationsModule,
  ],
  providers: [StellarTxMonitorWorker, RecurringExpenseWorker, DlqWorker],
  exports: [DlqWorker],
})
export class WorkersModule {}

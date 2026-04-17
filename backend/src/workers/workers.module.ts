import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StellarTxMonitorWorker } from './stellar-tx-monitor.worker';
import { RecurringExpenseWorker } from './recurring-expense.worker';
import { StellarModule } from '../stellar/stellar.module';
import { ReputationModule } from '../reputation/reputation.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'stellar-tx-monitor' }),
    BullModule.registerQueue({ name: 'recurring-expenses' }),
    StellarModule,
    ReputationModule,
    EventsModule,
    NotificationsModule,
  ],
  providers: [StellarTxMonitorWorker, RecurringExpenseWorker],
})
export class WorkersModule {}

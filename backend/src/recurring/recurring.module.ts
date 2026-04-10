import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RecurringController } from './recurring.controller';
import { RecurringService } from './recurring.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'recurring-expenses' })],
  controllers: [RecurringController],
  providers: [RecurringService],
  exports: [RecurringService],
})
export class RecurringModule {}

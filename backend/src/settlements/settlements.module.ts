import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'stellar-tx-monitor' }), AuditModule],
  controllers: [SettlementsController],
  providers: [SettlementsService],
  exports: [SettlementsService],
})
export class SettlementsModule {}

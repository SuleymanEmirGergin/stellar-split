import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { EventsModule } from '../events/events.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [EventsModule, AuditModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}

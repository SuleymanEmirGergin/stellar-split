import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventsModule } from '../events/events.module';
import { StellarService } from './stellar.service';
import { SorobanEventPollerService } from './soroban-event-poller.service';

@Module({
  imports: [ScheduleModule.forRoot(), EventsModule],
  providers: [StellarService, SorobanEventPollerService],
  exports: [StellarService],
})
export class StellarModule {}

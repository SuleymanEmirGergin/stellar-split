import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationWorker } from './notification.worker';

@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' })],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationWorker],
  exports: [NotificationsService],
})
export class NotificationsModule {}

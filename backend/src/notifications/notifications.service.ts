import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { PushSubscriptionDto } from './dto/push-subscription.dto';

export type NotificationPayload = Record<string, unknown>;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('notifications') private readonly notifQueue: Queue,
  ) {}

  getVapidPublicKey(): string {
    return this.config.get<string>('VAPID_PUBLIC_KEY') ?? '';
  }

  async subscribePush(userId: string, dto: PushSubscriptionDto): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: { p256dh: dto.p256dh, auth: dto.auth, userId },
      create: { userId, endpoint: dto.endpoint, p256dh: dto.p256dh, auth: dto.auth },
    });
  }

  async unsubscribePush(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    });
  }

  async findAll(userId: string, cursor?: string, limit = 20) {
    const take = Math.min(limit, 100);
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });
    const hasMore = notifications.length > take;
    const items = hasMore ? notifications.slice(0, take) : notifications;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : undefined, hasMore };
  }

  async markRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async dispatch(userId: string, type: string, payload: NotificationPayload) {
    const notification = await this.prisma.notification.create({
      data: { userId, type: type as any, payload: payload as object },
    });

    await this.notifQueue.add(
      'send-notification',
      { notificationId: notification.id, userId, type, payload },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    );

    this.logger.log({ userId, type, notificationId: notification.id }, 'Notification dispatched');
    return notification;
  }
}

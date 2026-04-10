import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

interface NotificationJobData {
  notificationId: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
}

@Processor('notifications')
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { notificationId, userId, type, payload } = job.data;
    this.logger.log({ notificationId, userId, type }, 'Processing notification');

    const discordUrl = this.config.get<string>('DISCORD_WEBHOOK_URL');
    const discordSecret = this.config.get<string>('DISCORD_WEBHOOK_SECRET');

    if (discordUrl) {
      try {
        const body = JSON.stringify({ content: `[${type}] ${JSON.stringify(payload)}` });
        const sig = crypto.createHmac('sha256', discordSecret ?? '').update(body).digest('hex');
        await axios.post(discordUrl, body, {
          headers: { 'Content-Type': 'application/json', 'X-Signature': sig },
          timeout: 5000,
        });
        this.logger.log({ notificationId }, 'Discord notification sent');
      } catch (err) {
        this.logger.warn({ notificationId, err: String(err) }, 'Discord notification failed');
        throw err; // triggers BullMQ retry
      }
    }
  }
}

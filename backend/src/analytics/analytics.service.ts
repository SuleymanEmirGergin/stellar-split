import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export class TrackEventDto {
  event: string;
  userId?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async track(dto: TrackEventDto) {
    // Fire-and-forget — don't await in controller
    this.prisma.analyticsEvent
      .create({ data: { event: dto.event, userId: dto.userId, payload: dto.payload as object } })
      .then(() => this.logger.log({ event: dto.event }, 'Analytics event tracked'))
      .catch((err: unknown) => this.logger.warn({ err: String(err) }, 'Analytics event storage failed'));
  }
}

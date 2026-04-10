import { Injectable, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import { Subject, Observable, interval, merge } from 'rxjs';
import { map } from 'rxjs/operators';

export interface GroupEvent {
  type:
    | 'expense:added'
    | 'expense:cancelled'
    | 'settlement:confirmed'
    | 'settlement:failed'
    | 'member:joined'
    | 'member:left'
    | 'recurring:triggered';
  groupId: string;
  payload: Record<string, unknown>;
  ts: number;
}

const CHANNEL_PREFIX = 'stellarsplit:group:';
const HEARTBEAT_INTERVAL_MS = 25_000;

@Injectable()
export class EventsService implements OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private readonly subscriber: Redis;
  private readonly subjects = new Map<string, Subject<GroupEvent>>();

  constructor(
    private readonly config: ConfigService,
    @Inject('REDIS_CLIENT') private readonly publisher: Redis,
  ) {
    // Dedicated subscriber connection — cannot issue regular commands while subscribed
    this.subscriber = publisher.duplicate();

    this.subscriber.on('message', (channel: string, message: string) => {
      const groupId = channel.replace(CHANNEL_PREFIX, '');
      const subject = this.subjects.get(groupId);
      if (!subject) return;
      try {
        const event = JSON.parse(message) as GroupEvent;
        subject.next(event);
      } catch {
        this.logger.warn({ channel }, 'Failed to parse SSE message from Redis');
      }
    });
  }

  /** Publish a group event to all subscribers (works across instances). */
  async publish(event: GroupEvent): Promise<void> {
    const channel = `${CHANNEL_PREFIX}${event.groupId}`;
    await this.publisher.publish(channel, JSON.stringify(event));
    this.logger.debug({ type: event.type, groupId: event.groupId }, 'Group event published');
  }

  /** Returns an Observable<MessageEvent> suitable for NestJS @Sse(). */
  streamForGroup(groupId: string): Observable<MessageEvent> {
    // Ensure we're subscribed to this group's Redis channel
    if (!this.subjects.has(groupId)) {
      this.subjects.set(groupId, new Subject<GroupEvent>());
      this.subscriber.subscribe(`${CHANNEL_PREFIX}${groupId}`).catch((err) =>
        this.logger.error({ groupId, err: String(err) }, 'Redis subscribe failed'),
      );
    }

    const subject = this.subjects.get(groupId)!;

    const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map(() => ({ data: { type: 'heartbeat', ts: Date.now() } } as unknown as MessageEvent)),
    );

    const events$ = subject.pipe(
      map((event) => ({ data: event } as unknown as MessageEvent)),
    );

    return merge(events$, heartbeat$);
  }

  async onModuleDestroy() {
    await this.subscriber.quit();
  }
}

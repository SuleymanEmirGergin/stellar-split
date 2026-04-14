import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, take } from 'rxjs';
import { EventsService, GroupEvent } from './events.service';

// ─── Redis mock helpers ──────────────────────────────────────────────────────

type MessageHandler = (channel: string, message: string) => void;

function makeSubscriberMock() {
  let capturedMessageHandler: MessageHandler | null = null;

  const mock = {
    on: jest.fn().mockImplementation((event: string, handler: unknown) => {
      if (event === 'message') capturedMessageHandler = handler as MessageHandler;
    }),
    subscribe: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    _emit: (channel: string, message: string) => {
      capturedMessageHandler?.(channel, message);
    },
  };
  return mock;
}

function makePublisherMock(subscriber: ReturnType<typeof makeSubscriberMock>) {
  return {
    duplicate: jest.fn().mockReturnValue(subscriber),
    publish: jest.fn().mockResolvedValue(1),
  };
}

const GROUP_ID = 'group-1';
const CHANNEL = `stellarsplit:group:${GROUP_ID}`;

function makeEvent(overrides: Partial<GroupEvent> = {}): GroupEvent {
  return {
    type: 'expense:added',
    groupId: GROUP_ID,
    payload: { expenseId: 'exp-1' },
    ts: 1_000_000,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('EventsService', () => {
  let service: EventsService;
  let publisher: ReturnType<typeof makePublisherMock>;
  let subscriber: ReturnType<typeof makeSubscriberMock>;

  beforeEach(async () => {
    subscriber = makeSubscriberMock();
    publisher = makePublisherMock(subscriber);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: 'REDIS_CLIENT', useValue: publisher },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── constructor ────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('creates a dedicated subscriber by duplicating the publisher', () => {
      expect(publisher.duplicate).toHaveBeenCalledTimes(1);
    });

    it('registers a "message" handler on the subscriber', () => {
      expect(subscriber.on).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  // ─── publish() ──────────────────────────────────────────────────────────────

  describe('publish()', () => {
    it('publishes event to the correct Redis channel', async () => {
      const event = makeEvent();

      await service.publish(event);

      expect(publisher.publish).toHaveBeenCalledWith(CHANNEL, JSON.stringify(event));
    });

    it('uses the groupId from the event to form the channel name', async () => {
      const event = makeEvent({ groupId: 'group-xyz' });

      await service.publish(event);

      expect(publisher.publish).toHaveBeenCalledWith(
        'stellarsplit:group:group-xyz',
        expect.any(String),
      );
    });

    it('serializes the full event as JSON', async () => {
      const event = makeEvent({ payload: { amount: 42, description: 'Lunch' } });

      await service.publish(event);

      const serialized = publisher.publish.mock.calls[0][1] as string;
      expect(JSON.parse(serialized)).toEqual(event);
    });
  });

  // ─── streamForGroup() ───────────────────────────────────────────────────────

  describe('streamForGroup()', () => {
    it('returns an Observable', () => {
      const stream = service.streamForGroup(GROUP_ID);
      expect(typeof stream.subscribe).toBe('function');
    });

    it('subscribes to the Redis channel on first call', () => {
      service.streamForGroup(GROUP_ID);
      expect(subscriber.subscribe).toHaveBeenCalledWith(CHANNEL);
    });

    it('does not resubscribe when called again for the same group', () => {
      service.streamForGroup(GROUP_ID);
      service.streamForGroup(GROUP_ID);
      expect(subscriber.subscribe).toHaveBeenCalledTimes(1);
    });

    it('subscribes separately for each distinct group', () => {
      service.streamForGroup('g1');
      service.streamForGroup('g2');
      expect(subscriber.subscribe).toHaveBeenCalledTimes(2);
      expect(subscriber.subscribe).toHaveBeenCalledWith('stellarsplit:group:g1');
      expect(subscriber.subscribe).toHaveBeenCalledWith('stellarsplit:group:g2');
    });

    it('emits a MessageEvent when a matching Redis message arrives', async () => {
      const event = makeEvent();
      const stream = service.streamForGroup(GROUP_ID);

      const promise = firstValueFrom(stream.pipe(take(1)));

      subscriber._emit(CHANNEL, JSON.stringify(event));

      const received = await promise;
      expect((received as unknown as { data: GroupEvent }).data).toEqual(event);
    });

    it('does not emit for a different group channel', (done) => {
      const stream = service.streamForGroup('group-A');
      let emitted = false;

      stream.subscribe(() => { emitted = true; });

      // Emit for a different group
      subscriber._emit('stellarsplit:group:group-B', JSON.stringify(makeEvent({ groupId: 'group-B' })));

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 20);
    });

    it('silently ignores malformed JSON from Redis', () => {
      service.streamForGroup(GROUP_ID);
      expect(() => subscriber._emit(CHANNEL, 'not-valid-json')).not.toThrow();
    });

    it('silently ignores messages for unknown group channels', () => {
      // No stream created for this group — subject map will not have it
      expect(() => subscriber._emit('stellarsplit:group:unknown', '{}')).not.toThrow();
    });
  });

  // ─── onModuleDestroy() ──────────────────────────────────────────────────────

  describe('onModuleDestroy()', () => {
    it('quits the subscriber Redis connection', async () => {
      await service.onModuleDestroy();
      expect(subscriber.quit).toHaveBeenCalledTimes(1);
    });
  });
});

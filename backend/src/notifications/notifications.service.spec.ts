import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../common/prisma/prisma.service';

const USER_ID = 'user-uuid';

function makeMockPrisma() {
  return {
    notification: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

function makeMockQueue() {
  return { add: jest.fn() };
}

function makeNotif(id: string, overrides: Partial<{ readAt: Date | null }> = {}) {
  return { id, userId: USER_ID, type: 'EXPENSE_ADDED', readAt: null, createdAt: new Date(), ...overrides };
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: ReturnType<typeof makeMockPrisma>;
  let queue: ReturnType<typeof makeMockQueue>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    queue = makeMockQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('notifications'), useValue: queue },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAll() ───────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns items with hasMore=false when results fit within limit', async () => {
      const notifs = [makeNotif('n1'), makeNotif('n2')];
      prisma.notification.findMany.mockResolvedValue(notifs);

      const result = await service.findAll(USER_ID);

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('sets hasMore=true and nextCursor when results exceed limit', async () => {
      // limit=2, return 3 items → hasMore=true
      const notifs = [makeNotif('n1'), makeNotif('n2'), makeNotif('n3')];
      prisma.notification.findMany.mockResolvedValue(notifs);

      const result = await service.findAll(USER_ID, undefined, 2);

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('n2');
    });

    it('clamps limit to 100 when a higher value is requested', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, undefined, 500);

      const take = prisma.notification.findMany.mock.calls[0][0].take;
      expect(take).toBe(101); // clamped 100 + 1
    });

    it('uses default limit of 20 when none provided', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID);

      const take = prisma.notification.findMany.mock.calls[0][0].take;
      expect(take).toBe(21); // default 20 + 1
    });

    it('passes cursor and skip when cursor is provided', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, 'cursor-id');

      const call = prisma.notification.findMany.mock.calls[0][0];
      expect(call.cursor).toEqual({ id: 'cursor-id' });
      expect(call.skip).toBe(1);
    });

    it('does not pass cursor when not provided', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID);

      const call = prisma.notification.findMany.mock.calls[0][0];
      expect(call.cursor).toBeUndefined();
      expect(call.skip).toBeUndefined();
    });

    it('returns empty result for a user with no notifications', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      const result = await service.findAll(USER_ID);

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  // ─── markRead() ──────────────────────────────────────────────────────────────

  describe('markRead()', () => {
    it('calls updateMany with correct notificationId and userId composite filter', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markRead('notif-1', USER_ID);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: USER_ID },
        data: { readAt: expect.any(Date) },
      });
    });

    it('returns the updateMany result', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markRead('notif-1', USER_ID);

      expect(result).toEqual({ count: 1 });
    });

    it('returns count=0 when notification does not belong to the user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markRead('other-notif', USER_ID);

      expect(result.count).toBe(0);
    });
  });

  // ─── dispatch() ──────────────────────────────────────────────────────────────

  describe('dispatch()', () => {
    const notifType = 'EXPENSE_ADDED';
    const payload = { groupId: 'g1', expenseId: 'exp-1', amount: 50 };
    const createdNotif = makeNotif('notif-new');

    it('creates a notification record in the database', async () => {
      prisma.notification.create.mockResolvedValue(createdNotif);
      queue.add.mockResolvedValue({});

      await service.dispatch(USER_ID, notifType, payload);

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: { userId: USER_ID, type: notifType, payload },
      });
    });

    it('enqueues a send-notification job with retry config', async () => {
      prisma.notification.create.mockResolvedValue(createdNotif);
      queue.add.mockResolvedValue({});

      await service.dispatch(USER_ID, notifType, payload);

      expect(queue.add).toHaveBeenCalledWith(
        'send-notification',
        { notificationId: createdNotif.id, userId: USER_ID, type: notifType, payload },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
      );
    });

    it('returns the created notification', async () => {
      prisma.notification.create.mockResolvedValue(createdNotif);
      queue.add.mockResolvedValue({});

      const result = await service.dispatch(USER_ID, notifType, payload);

      expect(result).toEqual(createdNotif);
    });

    it('stores payload as object (not JSON string)', async () => {
      prisma.notification.create.mockResolvedValue(createdNotif);
      queue.add.mockResolvedValue({});

      await service.dispatch(USER_ID, notifType, payload);

      const createData = prisma.notification.create.mock.calls[0][0].data;
      expect(typeof createData.payload).toBe('object');
      expect(createData.payload).toEqual(payload);
    });
  });
});

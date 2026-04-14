import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, AuditContext, AuditEvent } from './audit.service';
import { PrismaService } from '../common/prisma/prisma.service';

const GROUP_ID = 'group-uuid';

function makeMockPrisma() {
  return {
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      findMany: jest.fn(),
    },
  };
}

function makeContext(overrides: Partial<AuditContext> = {}): AuditContext {
  return { actorType: 'user', actorId: 'user-1', groupId: GROUP_ID, ...overrides };
}

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return { entityType: 'expense', entityId: 'exp-1', action: 'CREATE', ...overrides };
}

function makeLog(id: string) {
  return { id, groupId: GROUP_ID, action: 'CREATE', entityType: 'expense', createdAt: new Date() };
}

describe('AuditService', () => {
  let service: AuditService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── log() — fire-and-forget ─────────────────────────────────────────────────

  describe('log()', () => {
    it('calls prisma.auditLog.create with correct data', async () => {
      service.log(makeContext(), makeEvent());

      // allow microtask queue to flush
      await Promise.resolve();

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorType: 'user',
          actorId: 'user-1',
          groupId: GROUP_ID,
          entityType: 'expense',
          entityId: 'exp-1',
          action: 'CREATE',
        }),
      });
    });

    it('returns void synchronously — does not throw or return a Promise to the caller', () => {
      const result = service.log(makeContext(), makeEvent());
      expect(result).toBeUndefined();
    });

    it('does not propagate errors thrown by Prisma', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('DB connection lost'));

      expect(() => service.log(makeContext(), makeEvent())).not.toThrow();
      // consume the rejection so jest doesn't treat it as unhandled
      await Promise.resolve();
    });

    it('scrubs sensitive keys from beforeState and afterState', async () => {
      service.log(
        makeContext(),
        makeEvent({
          beforeState: { amount: 100, password: 'secret123', apiKey: 'sk-xxx' },
          afterState: { amount: 200, token: 'tok_abc', normalField: 'visible' },
        }),
      );
      await Promise.resolve();

      const data = prisma.auditLog.create.mock.calls[0][0].data;
      expect(data.beforeState).toEqual({
        amount: 100,
        password: '[REDACTED]',
        apiKey: '[REDACTED]',
      });
      expect(data.afterState).toEqual({
        amount: 200,
        token: '[REDACTED]',
        normalField: 'visible',
      });
    });

    it('passes undefined for beforeState/afterState when not provided', async () => {
      service.log(makeContext(), makeEvent());
      await Promise.resolve();

      const data = prisma.auditLog.create.mock.calls[0][0].data;
      expect(data.beforeState).toBeUndefined();
      expect(data.afterState).toBeUndefined();
    });

    it('uses null for optional context fields when omitted', async () => {
      const minimalCtx: AuditContext = { actorType: 'system' };
      service.log(minimalCtx, makeEvent());
      await Promise.resolve();

      const data = prisma.auditLog.create.mock.calls[0][0].data;
      expect(data.actorId).toBeNull();
      expect(data.actorWallet).toBeNull();
      expect(data.groupId).toBeNull();
      expect(data.ipAddress).toBeNull();
      expect(data.userAgent).toBeNull();
    });
  });

  // ─── findByGroup() — cursor pagination ───────────────────────────────────────

  describe('findByGroup()', () => {
    it('returns items with hasMore=false when results fit within limit', async () => {
      const logs = [makeLog('a'), makeLog('b')];
      prisma.auditLog.findMany.mockResolvedValue(logs);

      const result = await service.findByGroup(GROUP_ID, { limit: 50 });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('sets hasMore=true and nextCursor when results exceed limit', async () => {
      // limit=2, return 3 items → hasMore=true
      const logs = [makeLog('a'), makeLog('b'), makeLog('c')];
      prisma.auditLog.findMany.mockResolvedValue(logs);

      const result = await service.findByGroup(GROUP_ID, { limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('b'); // last item of trimmed page
    });

    it('clamps limit to 200 when a higher value is requested', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.findByGroup(GROUP_ID, { limit: 500 });

      const take = prisma.auditLog.findMany.mock.calls[0][0].take;
      expect(take).toBe(201); // clamped 200 + 1
    });

    it('uses default limit of 50 when no limit is provided', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.findByGroup(GROUP_ID, {});

      const take = prisma.auditLog.findMany.mock.calls[0][0].take;
      expect(take).toBe(51); // default 50 + 1
    });

    it('passes cursor and skip when cursor is provided', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.findByGroup(GROUP_ID, { cursor: 'log-42' });

      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.cursor).toEqual({ id: 'log-42' });
      expect(call.skip).toBe(1);
    });

    it('does not pass cursor when not provided', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.findByGroup(GROUP_ID, {});

      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.cursor).toBeUndefined();
      expect(call.skip).toBeUndefined();
    });

    it('filters by entityType when provided', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.findByGroup(GROUP_ID, { entityType: 'expense' });

      const where = prisma.auditLog.findMany.mock.calls[0][0].where;
      expect(where.entityType).toBe('expense');
    });

    it('filters by action when provided', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.findByGroup(GROUP_ID, { action: 'DELETE' });

      const where = prisma.auditLog.findMany.mock.calls[0][0].where;
      expect(where.action).toBe('DELETE');
    });

    it('does not include entityType/action in where when not provided', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.findByGroup(GROUP_ID, {});

      const where = prisma.auditLog.findMany.mock.calls[0][0].where;
      expect(where.entityType).toBeUndefined();
      expect(where.action).toBeUndefined();
    });

    it('returns empty items with hasMore=false for an empty group', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      const result = await service.findByGroup(GROUP_ID, {});

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });
});

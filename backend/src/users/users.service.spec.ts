import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../common/prisma/prisma.service';

const USER_ID = 'user-uuid-123';

function makeMockPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    groupMember: {
      findMany: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    settlement: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
    },
    refreshToken: {
      deleteMany: jest.fn(),
    },
    recoveryRequest: {
      deleteMany: jest.fn(),
    },
    guardian: {
      deleteMany: jest.fn(),
    },
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ─── exportData ────────────────────────────────────────────────────────────

  describe('exportData', () => {
    it('returns all user data in structured format', async () => {
      const fakeUser = {
        id: USER_ID,
        walletAddress: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };
      const fakeGroupMember = {
        userId: USER_ID,
        group: { id: 'group-1', name: 'Trip', currency: 'USD', createdAt: new Date() },
      };
      const fakeExpense = {
        id: 'expense-1',
        description: 'Dinner',
        amount: 100,
        currency: 'USD',
        status: 'PENDING',
        createdAt: new Date(),
      };
      const fakeSettlement = {
        id: 'settlement-1',
        txHash: 'abc123',
        amount: 50,
        status: 'CONFIRMED',
        timestamp: new Date(),
      };
      const fakeNotification = {
        id: 'notif-1',
        type: 'EXPENSE_ADDED',
        payload: {},
        readAt: null,
        createdAt: new Date(),
      };
      const fakeAuditLog = {
        id: 'log-1',
        action: 'CREATE',
        entityType: 'Expense',
        entityId: 'expense-1',
        createdAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(fakeUser);
      prisma.groupMember.findMany.mockResolvedValue([fakeGroupMember]);
      prisma.expense.findMany.mockResolvedValue([fakeExpense]);
      prisma.settlement.findMany.mockResolvedValue([fakeSettlement]);
      prisma.notification.findMany.mockResolvedValue([fakeNotification]);
      prisma.auditLog.findMany.mockResolvedValue([fakeAuditLog]);

      const result = await service.exportData(USER_ID);

      expect(result.user).toEqual(fakeUser);
      expect(result.groups).toEqual([fakeGroupMember.group]);
      expect(result.expenses).toEqual([fakeExpense]);
      expect(result.settlements).toEqual([fakeSettlement]);
      expect(result.notifications).toEqual([fakeNotification]);
      expect(result.auditLogs).toEqual([fakeAuditLog]);
      expect(result.exportedAt).toBeDefined();
    });

    it('queries all collections with the correct userId', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.groupMember.findMany.mockResolvedValue([]);
      prisma.expense.findMany.mockResolvedValue([]);
      prisma.settlement.findMany.mockResolvedValue([]);
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.exportData(USER_ID);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: USER_ID } }),
      );
      expect(prisma.groupMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID } }),
      );
      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { paidById: USER_ID } }),
      );
      expect(prisma.settlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { settledById: USER_ID } }),
      );
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID } }),
      );
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { actorId: USER_ID } }),
      );
    });

    it('returns empty arrays when user has no related data', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.groupMember.findMany.mockResolvedValue([]);
      prisma.expense.findMany.mockResolvedValue([]);
      prisma.settlement.findMany.mockResolvedValue([]);
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.auditLog.findMany.mockResolvedValue([]);

      const result = await service.exportData(USER_ID);

      expect(result.groups).toEqual([]);
      expect(result.expenses).toEqual([]);
      expect(result.settlements).toEqual([]);
      expect(result.notifications).toEqual([]);
      expect(result.auditLogs).toEqual([]);
    });
  });

  // ─── deleteAccount ─────────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('deletes all related data and then the user', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
      prisma.recoveryRequest.deleteMany.mockResolvedValue({ count: 0 });
      prisma.guardian.deleteMany.mockResolvedValue({ count: 0 });
      prisma.settlement.deleteMany.mockResolvedValue({ count: 1 });
      prisma.expense.deleteMany.mockResolvedValue({ count: 2 });
      prisma.user.delete.mockResolvedValue({ id: USER_ID });

      await service.deleteAccount(USER_ID);

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
      expect(prisma.recoveryRequest.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
      expect(prisma.guardian.deleteMany).toHaveBeenCalledWith({
        where: { OR: [{ userId: USER_ID }, { guardianUserId: USER_ID }] },
      });
      expect(prisma.settlement.deleteMany).toHaveBeenCalledWith({ where: { settledById: USER_ID } });
      expect(prisma.expense.deleteMany).toHaveBeenCalledWith({ where: { paidById: USER_ID } });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
    });

    it('deletes refreshTokens before user (session revocation first)', async () => {
      const callOrder: string[] = [];

      prisma.refreshToken.deleteMany.mockImplementation(async () => {
        callOrder.push('refreshToken');
        return { count: 1 };
      });
      prisma.recoveryRequest.deleteMany.mockImplementation(async () => {
        callOrder.push('recoveryRequest');
        return { count: 0 };
      });
      prisma.guardian.deleteMany.mockImplementation(async () => {
        callOrder.push('guardian');
        return { count: 0 };
      });
      prisma.settlement.deleteMany.mockImplementation(async () => {
        callOrder.push('settlement');
        return { count: 0 };
      });
      prisma.expense.deleteMany.mockImplementation(async () => {
        callOrder.push('expense');
        return { count: 0 };
      });
      prisma.user.delete.mockImplementation(async () => {
        callOrder.push('user');
        return { id: USER_ID };
      });

      await service.deleteAccount(USER_ID);

      expect(callOrder[0]).toBe('refreshToken');
      expect(callOrder[callOrder.length - 1]).toBe('user');
    });

    it('resolves without throwing when all deletes succeed', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      prisma.recoveryRequest.deleteMany.mockResolvedValue({ count: 0 });
      prisma.guardian.deleteMany.mockResolvedValue({ count: 0 });
      prisma.settlement.deleteMany.mockResolvedValue({ count: 0 });
      prisma.expense.deleteMany.mockResolvedValue({ count: 0 });
      prisma.user.delete.mockResolvedValue({ id: USER_ID });

      await expect(service.deleteAccount(USER_ID)).resolves.toBeUndefined();
    });
  });
});

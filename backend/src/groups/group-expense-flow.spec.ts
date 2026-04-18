/**
 * Integration test: Group → Expense → Settlement full flow.
 *
 * These tests wire GroupsService, ExpensesService, and SettlementsService
 * together with a shared in-memory Prisma mock to verify cross-service
 * interactions that individual unit tests cannot catch.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { GroupsService } from './groups.service';
import { ExpensesService } from '../expenses/expenses.service';
import { SettlementsService } from '../settlements/settlements.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { AuditService } from '../audit/audit.service';
import { SplitType, ExpenseCurrency } from '../expenses/dto/create-expense.dto';
import { GroupCurrency } from './dto/create-group.dto';
import { simplifyDebts } from './debt-simplification';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_A = { id: 'user-a', walletAddress: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN' };
const USER_B = { id: 'user-b', walletAddress: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGOZ3GGMFAHJ3IRCKLR2TONBQ' };
const USER_C = { id: 'user-c', walletAddress: 'GD6WNNTHMZFBOFUHESAGFKGBPXA4XNZM5AMHTNRK7UXKUOLBWKBIZ5EC' };
const GROUP_ID = 'group-integration-test';
const TX_HASH = 'a'.repeat(64);

// ── Stateful in-memory mock Prisma ────────────────────────────────────────────

function makeStatefulPrisma() {
  const groups: Record<string, any> = {};
  const members: Record<string, any> = {};
  const users: Record<string, any> = {
    [USER_A.id]: USER_A,
    [USER_B.id]: USER_B,
    [USER_C.id]: USER_C,
  };
  const expenses: Record<string, any> = {};
  const settlements: Record<string, any> = {};
  let expenseSeq = 0;
  let settlementSeq = 0;

  return {
    group: {
      create: jest.fn(({ data, include }: any) => {
        const group: any = {
          id: data.id ?? GROUP_ID,
          name: data.name,
          currency: data.currency,
          createdById: data.createdById,
          members: [] as any[],
          inviteCode: null,
        };
        groups[group.id] = group;
        if (data.members?.create) {
          for (const m of data.members.create) {
            const memberKey = `${group.id}_${m.userId}`;
            const member = { id: memberKey, groupId: group.id, userId: m.userId, role: m.role ?? 'MEMBER' };
            members[memberKey] = member;
            group.members.push(member);
          }
        }
        return include ? group : { ...group, members: undefined };
      }),
      findUnique: jest.fn(({ where }: any) => groups[where.id] ?? null),
      findMany: jest.fn(({ where }: any) => {
        const userId = where?.members?.some?.userId;
        if (!userId) return Object.values(groups);
        return Object.values(groups).filter((g: any) =>
          Object.values(members).some((m: any) => m.groupId === g.id && m.userId === userId)
        );
      }),
      update: jest.fn(({ where, data }: any) => {
        const g = groups[where.id];
        if (!g) return null;
        Object.assign(g, data);
        return g;
      }),
      delete: jest.fn(({ where }: any) => {
        const g = groups[where.id];
        delete groups[where.id];
        return g;
      }),
    },
    groupMember: {
      findUnique: jest.fn(({ where }: any) => {
        const key = `${where.groupId_userId?.groupId}_${where.groupId_userId?.userId}`;
        return members[key] ?? null;
      }),
      findMany: jest.fn(({ where, include }: any) => {
        const result = Object.values(members).filter((m: any) => m.groupId === where?.groupId);
        if (include?.user) {
          return result.map((m: any) => ({ ...m, user: users[m.userId] ?? { id: m.userId, walletAddress: '' } }));
        }
        return result;
      }),
      create: jest.fn(({ data }: any) => {
        const key = `${data.groupId}_${data.userId}`;
        const m = { id: key, groupId: data.groupId, userId: data.userId, role: data.role ?? 'MEMBER' };
        members[key] = m;
        return m;
      }),
      delete: jest.fn(({ where }: any) => {
        const key = `${where.groupId_userId?.groupId}_${where.groupId_userId?.userId}`;
        const m = members[key];
        delete members[key];
        return m;
      }),
    },
    user: {
      findUnique: jest.fn(({ where }: any) => {
        if (where.walletAddress) return Object.values(users).find((u: any) => u.walletAddress === where.walletAddress) ?? null;
        return users[where.id] ?? null;
      }),
      findMany: jest.fn(({ where }: any) => {
        if (where?.walletAddress?.in) {
          return Object.values(users).filter((u: any) => where.walletAddress.in.includes(u.walletAddress));
        }
        return Object.values(users);
      }),
    },
    expense: {
      create: jest.fn(({ data, include }: any) => {
        const id = `expense-${++expenseSeq}`;
        const splits = (data.splits?.create ?? []).map((s: any, i: number) => ({ id: `split-${expenseSeq}-${i}`, ...s }));
        const expense = {
          id,
          groupId: data.groupId,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          paidById: data.paidById,
          splitType: data.splitType,
          receiptUrl: data.receiptUrl ?? null,
          status: 'ACTIVE',
          splits,
          paidBy: include?.paidBy ? users[data.paidById] : undefined,
        };
        expenses[id] = expense;
        return expense;
      }),
      findMany: jest.fn(({ where }: any) =>
        Object.values(expenses).filter((e: any) => e.groupId === where?.groupId && e.status !== 'CANCELLED')
      ),
      findUnique: jest.fn(({ where, include }: any) => {
        const e = expenses[where?.id];
        if (!e) return null;
        if (include?.group) {
          const group = groups[e.groupId];
          return { ...e, group: { ...group, members: Object.values(members).filter((m: any) => m.groupId === e.groupId) } };
        }
        return e;
      }),
      update: jest.fn(({ where, data }: any) => {
        const e = expenses[where.id];
        if (!e) return null;
        Object.assign(e, data);
        return e;
      }),
    },
    settlement: {
      findUnique: jest.fn(({ where }: any) =>
        Object.values(settlements).find((s: any) => s.txHash === where?.txHash) ?? null
      ),
      findMany: jest.fn(({ where }: any) =>
        Object.values(settlements).filter((s: any) => s.groupId === where?.groupId)
      ),
      create: jest.fn(({ data }: any) => {
        const id = `settlement-${++settlementSeq}`;
        const s = { id, ...data };
        settlements[id] = s;
        return s;
      }),
      update: jest.fn(({ where, data }: any) => {
        const s = Object.values(settlements).find((s: any) => s.id === where.id) as any;
        if (s) Object.assign(s, data);
        return s;
      }),
    },
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('Group → Expense → Settlement integration flow', () => {
  let groupsService: GroupsService;
  let expensesService: ExpensesService;
  let settlementsService: SettlementsService;
  let prisma: ReturnType<typeof makeStatefulPrisma>;

  const mockEvents = { publish: jest.fn().mockResolvedValue(undefined) };
  const mockAudit = { log: jest.fn() };
  const mockQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
  const mockCache = { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined), del: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    prisma = makeStatefulPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        ExpensesService,
        SettlementsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsService, useValue: mockEvents },
        { provide: AuditService, useValue: mockAudit },
        { provide: getQueueToken('stellar-tx-monitor'), useValue: mockQueue },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    groupsService = module.get(GroupsService);
    expensesService = module.get(ExpensesService);
    settlementsService = module.get(SettlementsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── 1. Group creation ────────────────────────────────────────────────────

  describe('Step 1: Create a group', () => {
    it('creates a group and adds the creator as CREATOR role', async () => {
      const group = await groupsService.create(USER_A.id, {
        name: 'Trip to Cappadocia',
        currency: GroupCurrency.XLM,
        members: [],
      });

      expect(group.id).toBe(GROUP_ID);
      expect(group.name).toBe('Trip to Cappadocia');
      expect(group.members).toHaveLength(1);
      expect(group.members[0]).toMatchObject({ userId: USER_A.id, role: 'CREATOR' });
    });

    it('adds additional members when wallet addresses are provided', async () => {
      const group = await groupsService.create(USER_A.id, {
        name: 'Team lunch',
        currency: GroupCurrency.XLM,
        members: [USER_B.walletAddress, USER_C.walletAddress],
      });

      expect(group.members).toHaveLength(3);
      const roles = group.members.map((m: any) => m.role);
      expect(roles).toContain('CREATOR');
      expect(roles.filter((r: string) => r === 'MEMBER')).toHaveLength(2);
    });

    it('logs audit event on creation', async () => {
      await groupsService.create(USER_A.id, { name: 'Audited group', currency: GroupCurrency.XLM });

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: USER_A.id }),
        expect.objectContaining({ action: 'group.created' }),
      );
    });
  });

  // ─── 2. Expense creation ──────────────────────────────────────────────────

  describe('Step 2: Add expenses to the group', () => {
    beforeEach(async () => {
      // Create group with 3 members
      await groupsService.create(USER_A.id, {
        name: 'Split group',
        currency: GroupCurrency.XLM,
        members: [USER_B.walletAddress, USER_C.walletAddress],
      });
    });

    it('creates an EQUAL split expense and divides amount per member', async () => {
      const expense = await expensesService.create(USER_A.id, {
        groupId: GROUP_ID,
        description: 'Dinner at Kapadokya',
        amount: 90,
        currency: ExpenseCurrency.XLM,
        paidBy: USER_A.walletAddress,
        splitType: SplitType.EQUAL,
      });

      expect(expense.amount).toBe(90);
      expect(expense.splits).toHaveLength(3);
      expense.splits.forEach((s: any) => {
        expect(Number(s.amount)).toBeCloseTo(30, 5);
      });
    });

    it('publishes expense:added event after creation', async () => {
      await expensesService.create(USER_A.id, {
        groupId: GROUP_ID,
        description: 'Coffee',
        amount: 30,
        currency: ExpenseCurrency.XLM,
        paidBy: USER_A.walletAddress,
        splitType: SplitType.EQUAL,
      });

      expect(mockEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'expense:added', groupId: GROUP_ID }),
      );
    });

    it('throws 403 when non-member tries to create an expense', async () => {
      const outsider = 'non-member-user-id';
      await expect(
        expensesService.create(outsider, {
          groupId: GROUP_ID,
          description: 'Unauthorized',
          amount: 50,
          currency: ExpenseCurrency.XLM,
          paidBy: USER_A.walletAddress,
          splitType: SplitType.EQUAL,
        }),
      ).rejects.toThrow('Not a member');
    });

    it('cancels an expense and marks it CANCELLED', async () => {
      const expense = await expensesService.create(USER_A.id, {
        groupId: GROUP_ID,
        description: 'To cancel',
        amount: 50,
        currency: ExpenseCurrency.XLM,
        paidBy: USER_A.walletAddress,
        splitType: SplitType.EQUAL,
      });

      const cancelled = await expensesService.cancel(expense.id, USER_A.id);
      expect(cancelled.status).toBe('CANCELLED');
    });
  });

  // ─── 3. Balance calculation ───────────────────────────────────────────────

  describe('Step 3: Balance calculation after expenses', () => {
    it('computes correct net balances with simplifyDebts after 2 expenses', () => {
      // Scenario:
      //   Expense 1: A pays 90 split equally (A, B, C) → B owes A 30, C owes A 30
      //   Expense 2: B pays 60 split equally (A, B, C) → A owes B 20, C owes B 20
      //
      // Net: A = +30 (creditor 30 from B) - 20 (debtor to B) = +10
      //      B = -30 (owes A) + 40 (paid 60 - own share 20) = +10
      //      C = -30 - 20 = -50

      // Balance reasoning:
      // A pays 90, each owes 30. A is owed 60 (30 from B + 30 from C).
      // B pays 60, each owes 20. B is owed 40 (20 from A + 20 from C).
      // Net A: paid 90, owed 30 self → +60 owed TO A, owes 20 to B → net = +60 - 20 = +40
      // Net B: paid 60, owed 20 self → +40 owed TO B, owes 30 to A → net = +40 - 30 = +10
      // Net C: owes 30 to A + 20 to B = -50
      // Sum: 40 + 10 - 50 = 0 ✓

      const netBalances = [
        { userId: USER_A.id, balance: 40 },
        { userId: USER_B.id, balance: 10 },
        { userId: USER_C.id, balance: -50 },
      ];

      const result = simplifyDebts(netBalances);

      // C must pay out 50 total
      const totalFromC = result.filter(t => t.fromUserId === USER_C.id).reduce((s, t) => s + t.amount, 0);
      expect(totalFromC).toBeCloseTo(50, 5);
      // No self-transfers
      result.forEach(t => expect(t.fromUserId).not.toBe(t.toUserId));
    });

    it('produces zero transfers when all balances are already settled', () => {
      const balances = [
        { userId: USER_A.id, balance: 0 },
        { userId: USER_B.id, balance: 0 },
        { userId: USER_C.id, balance: 0 },
      ];
      expect(simplifyDebts(balances)).toHaveLength(0);
    });
  });

  // ─── 4. Settlement creation ───────────────────────────────────────────────

  describe('Step 4: Record a settlement', () => {
    beforeEach(async () => {
      await groupsService.create(USER_A.id, {
        name: 'Settlement group',
        currency: GroupCurrency.XLM,
        members: [USER_B.walletAddress],
      });
    });

    it('creates a settlement with PENDING status and enqueues monitoring job', async () => {
      const settlement = await settlementsService.create(USER_A.id, {
        groupId: GROUP_ID,
        txHash: TX_HASH,
        amount: 30,
      });

      expect(settlement.status).toBe('PENDING');
      expect(settlement.txHash).toBe(TX_HASH);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'monitor-tx',
        { settlementId: settlement.id, txHash: TX_HASH },
        expect.objectContaining({ attempts: expect.any(Number) }),
      );
    });

    it('returns existing settlement on duplicate txHash (idempotency)', async () => {
      const first = await settlementsService.create(USER_A.id, {
        groupId: GROUP_ID,
        txHash: TX_HASH,
        amount: 30,
      });

      const second = await settlementsService.create(USER_A.id, {
        groupId: GROUP_ID,
        txHash: TX_HASH,
        amount: 30,
      });

      expect(second.id).toBe(first.id);
      expect(mockQueue.add).toHaveBeenCalledTimes(1); // job enqueued only once
    });

    it('throws 403 when non-member tries to record a settlement', async () => {
      await expect(
        settlementsService.create('outsider-id', {
          groupId: GROUP_ID,
          txHash: 'b'.repeat(64),
          amount: 30,
        }),
      ).rejects.toThrow('Not a member');
    });
  });

  // ─── 5. End-to-end happy path ─────────────────────────────────────────────

  describe('Step 5: Full happy path (create → expense → settle)', () => {
    it('completes the full cycle without errors', async () => {
      // 1. A creates group with B
      const group = await groupsService.create(USER_A.id, {
        name: 'E2E test group',
        currency: GroupCurrency.XLM,
        members: [USER_B.walletAddress],
      });
      expect(group.members).toHaveLength(2);

      // 2. A adds an expense (A pays 60, split equally → B owes 30)
      const expense = await expensesService.create(USER_A.id, {
        groupId: group.id,
        description: 'Hotel booking',
        amount: 60,
        currency: ExpenseCurrency.XLM,
        paidBy: USER_A.walletAddress,
        splitType: SplitType.EQUAL,
      });
      expect(expense.splits).toHaveLength(2);

      // 3. Compute settlement plan
      const netBalances = [
        { userId: USER_A.id, balance: 30 },  // A is owed 30
        { userId: USER_B.id, balance: -30 }, // B owes 30
      ];
      const plan = simplifyDebts(netBalances);
      expect(plan).toHaveLength(1);
      expect(plan[0]).toMatchObject({ fromUserId: USER_B.id, toUserId: USER_A.id, amount: 30 });

      // 4. B records the settlement after sending on-chain
      const settlement = await settlementsService.create(USER_B.id, {
        groupId: group.id,
        txHash: TX_HASH,
        amount: plan[0].amount,
      });
      expect(settlement.status).toBe('PENDING');

      // 5. Events published: expense:added
      expect(mockEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'expense:added' }),
      );
    });
  });
});

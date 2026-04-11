import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { AuditService } from '../audit/audit.service';
import { CreateExpenseDto, SplitType, ExpenseCurrency } from './dto/create-expense.dto';

const VALID_WALLET_C = 'GD6WNNTHMZFBOFUHESAGFKGBPXA4XNZM5AMHTNRK7UXKUOLBWKBIZ5EC';

const VALID_WALLET_A = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
const VALID_WALLET_B = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGOZ3GGMFAHJ3IRCKLR2TONBQ';

const USER_A_ID = 'user-a-uuid';
const USER_B_ID = 'user-b-uuid';
const GROUP_ID = 'group-uuid';

function makeMockPrisma() {
  return {
    groupMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('ExpensesService', () => {
  let service: ExpensesService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  const mockMembers = [
    { userId: USER_A_ID, user: { id: USER_A_ID, walletAddress: VALID_WALLET_A } },
    { userId: USER_B_ID, user: { id: USER_B_ID, walletAddress: VALID_WALLET_B } },
  ];

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsService, useValue: { publish: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create — EQUAL split ────────────────────────────────────────────────────

  describe('create() EQUAL split', () => {
    const dto: CreateExpenseDto = {
      groupId: GROUP_ID,
      description: 'Dinner',
      amount: 100,
      currency: ExpenseCurrency.XLM,
      paidBy: VALID_WALLET_A,
      splitType: SplitType.EQUAL,
    };

    it('divides amount equally by member count', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' }); // assertMember
      prisma.user.findUnique.mockResolvedValue({ id: USER_A_ID, walletAddress: VALID_WALLET_A });
      prisma.groupMember.findMany.mockResolvedValue(mockMembers);
      prisma.expense.create.mockResolvedValue({ id: 'exp-1', ...dto, splits: [] });

      await service.create(USER_A_ID, dto);

      const createCall = prisma.expense.create.mock.calls[0][0];
      const splits: Array<{ userId: string; amount: number }> = createCall.data.splits.create;

      expect(splits).toHaveLength(2);
      expect(splits[0].amount).toBe(50); // 100 / 2
      expect(splits[1].amount).toBe(50);
    });

    it('throws 403 when creator is not a group member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.create(USER_A_ID, dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws 404 when paidBy wallet is not found', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create(USER_A_ID, dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── create — CUSTOM split ───────────────────────────────────────────────────

  describe('create() CUSTOM split', () => {
    const dto: CreateExpenseDto = {
      groupId: GROUP_ID,
      description: 'Hotel',
      amount: 200,
      currency: ExpenseCurrency.USDC,
      paidBy: VALID_WALLET_A,
      splitType: SplitType.CUSTOM,
      splits: [
        { walletAddress: VALID_WALLET_A, amount: 120 },
        { walletAddress: VALID_WALLET_B, amount: 80 },
      ],
    };

    it('uses provided custom amounts', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.user.findUnique.mockResolvedValue({ id: USER_A_ID });
      prisma.groupMember.findMany.mockResolvedValue(mockMembers);
      prisma.expense.create.mockResolvedValue({ id: 'exp-2', splits: [] });

      await service.create(USER_A_ID, dto);

      const createCall = prisma.expense.create.mock.calls[0][0];
      const splits: Array<{ userId: string; amount: number }> = createCall.data.splits.create;

      expect(splits).toHaveLength(2);
      const splitA = splits.find((s) => s.userId === USER_A_ID);
      const splitB = splits.find((s) => s.userId === USER_B_ID);
      expect(splitA?.amount).toBe(120);
      expect(splitB?.amount).toBe(80);
    });

    it('throws 400 when a member wallet is not in the group', async () => {
      const outsideWallet = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGFM2O';
      const dtoWithOutsider: CreateExpenseDto = {
        ...dto,
        splits: [{ walletAddress: outsideWallet, amount: 200 }],
      };
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.user.findUnique.mockResolvedValue({ id: USER_A_ID });
      prisma.groupMember.findMany.mockResolvedValue(mockMembers);

      await expect(service.create(USER_A_ID, dtoWithOutsider)).rejects.toThrow(BadRequestException);
    });

    it('throws 400 when splits array is missing for CUSTOM type', async () => {
      const dtoNoSplits: CreateExpenseDto = { ...dto, splits: undefined };
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.user.findUnique.mockResolvedValue({ id: USER_A_ID });
      prisma.groupMember.findMany.mockResolvedValue(mockMembers);

      await expect(service.create(USER_A_ID, dtoNoSplits)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── create — PERCENTAGE split ───────────────────────────────────────────────

  describe('create() PERCENTAGE split', () => {
    const dto: CreateExpenseDto = {
      groupId: GROUP_ID,
      description: 'Taxi',
      amount: 50,
      currency: ExpenseCurrency.XLM,
      paidBy: VALID_WALLET_A,
      splitType: SplitType.PERCENTAGE,
      splits: [
        { walletAddress: VALID_WALLET_A, amount: 30, percentage: 60 },
        { walletAddress: VALID_WALLET_B, amount: 20, percentage: 40 },
      ],
    };

    it('uses provided percentage amounts', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.user.findUnique.mockResolvedValue({ id: USER_A_ID });
      prisma.groupMember.findMany.mockResolvedValue(mockMembers);
      prisma.expense.create.mockResolvedValue({ id: 'exp-3', splits: [] });

      await service.create(USER_A_ID, dto);

      const createCall = prisma.expense.create.mock.calls[0][0];
      const splits: Array<{ userId: string; amount: number; percentage?: number }> =
        createCall.data.splits.create;

      expect(splits).toHaveLength(2);
      const splitA = splits.find((s) => s.userId === USER_A_ID);
      expect(splitA?.percentage).toBe(60);
      expect(splitA?.amount).toBe(30);
    });
  });

  // ─── cancel ──────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    const expenseId = 'exp-uuid';
    const payerId = USER_A_ID;
    const creatorId = 'creator-uuid';
    const memberId = 'member-uuid';

    function buildExpense(overrides: Partial<{
      paidById: string;
      status: string;
      members: Array<{ userId: string; role: string }>;
    }> = {}) {
      return {
        id: expenseId,
        paidById: overrides.paidById ?? payerId,
        status: overrides.status ?? 'ACTIVE',
        group: {
          members: overrides.members ?? [
            { userId: payerId, role: 'MEMBER' },
            { userId: creatorId, role: 'CREATOR' },
          ],
        },
      };
    }

    it('sets status to CANCELLED for the payer', async () => {
      prisma.expense.findUnique.mockResolvedValue(buildExpense());
      prisma.expense.update.mockResolvedValue({ id: expenseId, status: 'CANCELLED' });

      const result = await service.cancel(expenseId, payerId);

      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: expenseId },
        data: { status: 'CANCELLED' },
      });
      expect(result.status).toBe('CANCELLED');
    });

    it('group creator can also cancel an expense', async () => {
      prisma.expense.findUnique.mockResolvedValue(
        buildExpense({ paidById: memberId }),
      );
      prisma.expense.update.mockResolvedValue({ id: expenseId, status: 'CANCELLED' });

      await expect(service.cancel(expenseId, creatorId)).resolves.toBeDefined();
    });

    it('throws 403 for a member who is neither payer nor creator', async () => {
      const otherUser = 'random-member';
      prisma.expense.findUnique.mockResolvedValue(
        buildExpense({
          members: [
            { userId: payerId, role: 'MEMBER' },
            { userId: creatorId, role: 'CREATOR' },
            { userId: otherUser, role: 'MEMBER' },
          ],
        }),
      );

      await expect(service.cancel(expenseId, otherUser)).rejects.toThrow(ForbiddenException);
    });

    it('throws 403 if user is not a member of the group at all', async () => {
      prisma.expense.findUnique.mockResolvedValue(
        buildExpense({ members: [{ userId: payerId, role: 'MEMBER' }] }),
      );

      await expect(service.cancel(expenseId, 'outsider')).rejects.toThrow(ForbiddenException);
    });

    it('throws 400 if expense is already cancelled', async () => {
      prisma.expense.findUnique.mockResolvedValue(buildExpense({ status: 'CANCELLED' }));

      await expect(service.cancel(expenseId, payerId)).rejects.toThrow(BadRequestException);
    });

    it('throws 404 if expense does not exist', async () => {
      prisma.expense.findUnique.mockResolvedValue(null);

      await expect(service.cancel(expenseId, payerId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findByGroup ─────────────────────────────────────────────────────────────

  describe('findByGroup()', () => {
    const userId = USER_A_ID;

    it('throws 403 when user is not a group member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.findByGroup(GROUP_ID, userId)).rejects.toThrow(ForbiddenException);
    });

    it('returns items and hasMore=false when within page size', async () => {
      const mockExpenses = [
        { id: 'e1', description: 'Coffee', amount: 10, paidBy: { id: userId }, splits: [] },
        { id: 'e2', description: 'Pizza', amount: 30, paidBy: { id: userId }, splits: [] },
      ];
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.expense.findMany.mockResolvedValue(mockExpenses);

      const result = await service.findByGroup(GROUP_ID, userId);

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('sets hasMore and nextCursor when result exceeds limit', async () => {
      // 21 expenses when limit=20 → hasMore=true
      const mockExpenses = Array.from({ length: 21 }, (_, i) => ({
        id: `e${i}`,
        description: `Expense ${i}`,
        amount: 10,
        paidBy: { id: userId },
        splits: [],
      }));
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.expense.findMany.mockResolvedValue(mockExpenses);

      const result = await service.findByGroup(GROUP_ID, userId, undefined, 20);

      expect(result.items).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('e19');
    });

    it('returns empty items when group has no expenses', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.expense.findMany.mockResolvedValue([]);

      const result = await service.findByGroup(GROUP_ID, userId);

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  // ─── create — EQUAL split with 3 members (rounding) ─────────────────────────

  describe('create() EQUAL split — 3 members', () => {
    const USER_C_ID = 'user-c-uuid';
    const threeMembers = [
      { userId: USER_A_ID, user: { id: USER_A_ID, walletAddress: VALID_WALLET_A } },
      { userId: USER_B_ID, user: { id: USER_B_ID, walletAddress: VALID_WALLET_B } },
      { userId: USER_C_ID, user: { id: USER_C_ID, walletAddress: VALID_WALLET_C } },
    ];

    it('splits 100 evenly among 3 — last member absorbs remainder', async () => {
      const dto: CreateExpenseDto = {
        groupId: GROUP_ID,
        description: 'Dinner for 3',
        amount: 100,
        currency: ExpenseCurrency.XLM,
        paidBy: VALID_WALLET_A,
        splitType: SplitType.EQUAL,
      };
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.user.findUnique.mockResolvedValue({ id: USER_A_ID, walletAddress: VALID_WALLET_A });
      prisma.groupMember.findMany.mockResolvedValue(threeMembers);
      prisma.expense.create.mockResolvedValue({ id: 'exp-3m', splits: [] });

      await service.create(USER_A_ID, dto);

      const createCall = prisma.expense.create.mock.calls[0][0];
      const splits: Array<{ amount: number }> = createCall.data.splits.create;
      const total = splits.reduce((sum, s) => sum + s.amount, 0);

      expect(splits).toHaveLength(3);
      // All splits together must sum to the full amount
      expect(total).toBe(100);
    });
  });
});

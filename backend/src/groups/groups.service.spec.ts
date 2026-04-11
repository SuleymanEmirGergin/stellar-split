import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { AuditService } from '../audit/audit.service';
import { CreateGroupDto, GroupCurrency } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

const VALID_WALLET_A = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
const VALID_WALLET_B = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGOZ3GGMFAHJ3IRCKLR2TONBQ';

function makeMockPrisma() {
  return {
    group: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    groupMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
    },
  };
}

describe('GroupsService', () => {
  let service: GroupsService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsService, useValue: { publish: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    const userId = 'user-1';

    it('returns paginated groups (hasMore = false when count ≤ limit)', async () => {
      const mockGroups = [
        { id: 'g1', name: 'Group 1', _count: { members: 2 } },
        { id: 'g2', name: 'Group 2', _count: { members: 3 } },
      ];
      prisma.group.findMany.mockResolvedValue(mockGroups);

      const result = await service.findAll(userId);

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('sets hasMore and nextCursor when there are more items', async () => {
      // 21 items returned when limit is 20 → hasMore = true
      const mockGroups = Array.from({ length: 21 }, (_, i) => ({
        id: `g${i}`,
        name: `Group ${i}`,
        _count: { members: 1 },
      }));
      prisma.group.findMany.mockResolvedValue(mockGroups);

      const result = await service.findAll(userId, undefined, 20);

      expect(result.items).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('g19');
    });

    it('passes search filter to query', async () => {
      prisma.group.findMany.mockResolvedValue([]);

      await service.findAll(userId, undefined, 20, 'holiday');

      expect(prisma.group.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'holiday', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('passes cursor when provided', async () => {
      prisma.group.findMany.mockResolvedValue([]);

      await service.findAll(userId, 'cursor-id');

      expect(prisma.group.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: 'cursor-id' }, skip: 1 }),
      );
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    const userId = 'user-1';
    const groupId = 'group-1';

    it('returns group when user is a member', async () => {
      const mockGroup = {
        id: groupId,
        name: 'Test',
        members: [{ userId, user: { id: userId, walletAddress: VALID_WALLET_A, reputationScore: 0 } }],
        creator: { id: userId, walletAddress: VALID_WALLET_A },
        _count: { expenses: 0, settlements: 0 },
        inviteCode: 'inv-code',
      };
      prisma.group.findUnique.mockResolvedValue(mockGroup);

      const result = await service.findOne(groupId, userId);

      expect(result.id).toBe(groupId);
    });

    it('throws 404 when group does not exist', async () => {
      prisma.group.findUnique.mockResolvedValue(null);

      await expect(service.findOne(groupId, userId)).rejects.toThrow(NotFoundException);
    });

    it('throws 403 when user is not a member', async () => {
      const mockGroup = {
        id: groupId,
        name: 'Test',
        members: [{ userId: 'other-user', user: {} }],
        creator: {},
        _count: {},
        inviteCode: 'inv-code',
      };
      prisma.group.findUnique.mockResolvedValue(mockGroup);

      await expect(service.findOne(groupId, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const userId = 'user-1';

    it('creates group with creator as first member', async () => {
      const dto: CreateGroupDto = { name: 'Holiday Trip', currency: GroupCurrency.XLM };
      const mockGroup = {
        id: 'new-group',
        name: dto.name,
        currency: dto.currency,
        members: [{ userId, role: 'CREATOR' }],
      };
      prisma.user.findMany.mockResolvedValue([]);
      prisma.group.create.mockResolvedValue(mockGroup);

      const result = await service.create(userId, dto);

      expect(prisma.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: dto.name,
            createdById: userId,
            members: {
              create: expect.arrayContaining([
                expect.objectContaining({ userId, role: 'CREATOR' }),
              ]),
            },
          }),
        }),
      );
      expect(result.id).toBe('new-group');
    });

    it('resolves wallet addresses to user IDs for additional members', async () => {
      const dto: CreateGroupDto = {
        name: 'Group',
        currency: GroupCurrency.USDC,
        members: [VALID_WALLET_B],
      };
      const resolvedUser = { id: 'user-2' };
      prisma.user.findMany.mockResolvedValue([resolvedUser]);
      prisma.group.create.mockResolvedValue({ id: 'g1', members: [] });

      await service.create(userId, dto);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { walletAddress: { in: [VALID_WALLET_B] } },
        select: { id: true },
      });
      expect(prisma.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            members: {
              create: expect.arrayContaining([
                expect.objectContaining({ userId: 'user-2', role: 'MEMBER' }),
              ]),
            },
          }),
        }),
      );
    });

    it('does not add creator twice when creator wallet is in members list', async () => {
      const dto: CreateGroupDto = {
        name: 'Group',
        currency: GroupCurrency.XLM,
        members: [VALID_WALLET_A],
      };
      // Resolved wallet belongs to the creating user
      prisma.user.findMany.mockResolvedValue([{ id: userId }]);
      prisma.group.create.mockResolvedValue({ id: 'g1', members: [] });

      await service.create(userId, dto);

      const createCall = prisma.group.create.mock.calls[0][0];
      const memberCreates: Array<{ userId: string }> = createCall.data.members.create;
      const creatorEntries = memberCreates.filter((m) => m.userId === userId);
      expect(creatorEntries).toHaveLength(1);
    });
  });

  // ─── join ────────────────────────────────────────────────────────────────────

  describe('join()', () => {
    const groupId = 'group-1';
    const userId = 'user-new';
    const mockGroup = { id: groupId, inviteCode: 'valid-code' };

    it('adds member successfully with correct invite code', async () => {
      prisma.group.findUnique.mockResolvedValue(mockGroup);
      prisma.groupMember.findUnique.mockResolvedValue(null);
      prisma.groupMember.create.mockResolvedValue({ id: 'm1', groupId, userId });

      const result = await service.join(groupId, userId, 'valid-code');

      expect(prisma.groupMember.create).toHaveBeenCalledWith({
        data: { groupId, userId },
      });
      expect(result.userId).toBe(userId);
    });

    it('adds member when no invite code required', async () => {
      const groupWithoutCode = { id: groupId, inviteCode: null };
      prisma.group.findUnique.mockResolvedValue(groupWithoutCode);
      prisma.groupMember.findUnique.mockResolvedValue(null);
      prisma.groupMember.create.mockResolvedValue({ id: 'm1', groupId, userId });

      await expect(service.join(groupId, userId)).resolves.toBeDefined();
    });

    it('throws 409 if user is already a member', async () => {
      prisma.group.findUnique.mockResolvedValue(mockGroup);
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.join(groupId, userId)).rejects.toThrow(ConflictException);
    });

    it('throws 403 for wrong invite code', async () => {
      prisma.group.findUnique.mockResolvedValue(mockGroup);

      await expect(service.join(groupId, userId, 'wrong-code')).rejects.toThrow(ForbiddenException);
    });

    it('throws 404 when group does not exist', async () => {
      prisma.group.findUnique.mockResolvedValue(null);

      await expect(service.join(groupId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── leave ───────────────────────────────────────────────────────────────────

  describe('leave()', () => {
    const groupId = 'group-1';
    const userId = 'user-1';

    it('removes member successfully', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'm1', role: 'MEMBER', groupId, userId });
      prisma.groupMember.delete.mockResolvedValue({});

      await service.leave(groupId, userId);

      expect(prisma.groupMember.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
    });

    it('throws 403 if creator tries to leave', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'm1', role: 'CREATOR', groupId, userId });

      await expect(service.leave(groupId, userId)).rejects.toThrow(ForbiddenException);
    });

    it('throws 404 if not a member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.leave(groupId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getBalances ─────────────────────────────────────────────────────────────

  describe('getBalances()', () => {
    const groupId = 'group-1';
    const userId = 'user-1';
    const payerId = 'user-1';
    const debtorId = 'user-2';

    it('computes correct net balances: payer gets +, debtors get -', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'm1', role: 'MEMBER' });
      prisma.expense.findMany.mockResolvedValue([
        {
          id: 'exp-1',
          amount: 100,
          paidById: payerId,
          status: 'ACTIVE',
          paidBy: { id: payerId, walletAddress: VALID_WALLET_A },
          splits: [
            { userId: payerId, amount: 50 },
            { userId: debtorId, amount: 50 },
          ],
        },
      ]);

      const result = await service.getBalances(groupId, userId);

      const payerBalance = result.find((b) => b.userId === payerId);
      const debtorBalance = result.find((b) => b.userId === debtorId);

      // payer gets +100 (paid) and -50 (their own split) = net 50
      expect(payerBalance?.balance).toBe(50);
      // debtor gets -50
      expect(debtorBalance?.balance).toBe(-50);
    });

    it('returns empty array when no active expenses', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'm1', role: 'MEMBER' });
      prisma.expense.findMany.mockResolvedValue([]);

      const result = await service.getBalances(groupId, userId);

      expect(result).toEqual([]);
    });

    it('throws 403 if user is not a member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.getBalances(groupId, userId)).rejects.toThrow(ForbiddenException);
    });

    it('stacks balances correctly across multiple expenses', async () => {
      const payer1 = 'payer-1';
      const payer2 = 'payer-2';
      const debtor = 'debtor-1';

      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1', role: 'MEMBER' });
      prisma.expense.findMany.mockResolvedValue([
        {
          id: 'exp-a',
          amount: 60,
          paidById: payer1,
          status: 'ACTIVE',
          paidBy: { id: payer1, walletAddress: VALID_WALLET_A },
          splits: [
            { userId: payer1, amount: 30 },
            { userId: debtor, amount: 30 },
          ],
        },
        {
          id: 'exp-b',
          amount: 40,
          paidById: payer2,
          status: 'ACTIVE',
          paidBy: { id: payer2, walletAddress: VALID_WALLET_B },
          splits: [
            { userId: payer2, amount: 20 },
            { userId: debtor, amount: 20 },
          ],
        },
      ]);

      const result = await service.getBalances(groupId, userId);

      expect(result.find((b) => b.userId === payer1)?.balance).toBe(30);  // +60 paid -30 split
      expect(result.find((b) => b.userId === payer2)?.balance).toBe(20);  // +40 paid -20 split
      expect(result.find((b) => b.userId === debtor)?.balance).toBe(-50); // -30 - 20
    });

    it('ignores cancelled expenses in balance calculation', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1', role: 'MEMBER' });
      // Service filters with status: 'ACTIVE'; mock returns only active expenses
      prisma.expense.findMany.mockResolvedValue([]);

      const result = await service.getBalances(groupId, userId);

      // Verify the query only requests ACTIVE expenses
      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
      expect(result).toEqual([]);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update()', () => {
    const groupId = 'group-1';
    const creatorId = 'creator-1';
    const memberId = 'member-1';
    const dto: UpdateGroupDto = { name: 'Renamed Group' };

    it('creator can update group name', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1', role: 'CREATOR' });
      prisma.group.update.mockResolvedValue({ id: groupId, name: dto.name });

      const result = await service.update(groupId, creatorId, dto);

      expect(prisma.group.update).toHaveBeenCalledWith({
        where: { id: groupId },
        data: dto,
      });
      expect(result.name).toBe(dto.name);
    });

    it('throws 403 when non-creator tries to update', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm2', role: 'MEMBER' });

      await expect(service.update(groupId, memberId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws 403 when user is not a member at all', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.update(groupId, 'outsider', dto)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    const groupId = 'group-1';
    const creatorId = 'creator-1';

    it('creator can delete the group', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1', role: 'CREATOR' });
      prisma.group.delete.mockResolvedValue({});

      await service.remove(groupId, creatorId);

      expect(prisma.group.delete).toHaveBeenCalledWith({ where: { id: groupId } });
    });

    it('throws 403 when non-creator tries to delete', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm2', role: 'MEMBER' });

      await expect(service.remove(groupId, 'member-1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getInviteLink ───────────────────────────────────────────────────────────

  describe('getInviteLink()', () => {
    const groupId = 'group-1';
    const userId = 'user-1';

    it('returns inviteCode and groupId for a member', async () => {
      const mockGroup = {
        id: groupId,
        inviteCode: 'secret-code-123',
        name: 'Test Group',
        members: [{ userId, user: { id: userId, walletAddress: VALID_WALLET_A, reputationScore: 0 } }],
        creator: { id: userId, walletAddress: VALID_WALLET_A },
        _count: { expenses: 0, settlements: 0 },
      };
      prisma.group.findUnique.mockResolvedValue(mockGroup);

      const result = await service.getInviteLink(groupId, userId);

      expect(result.inviteCode).toBe('secret-code-123');
      expect(result.groupId).toBe(groupId);
    });

    it('throws 403 when non-member requests invite link', async () => {
      const mockGroup = {
        id: groupId,
        inviteCode: 'secret-code-123',
        name: 'Test Group',
        members: [{ userId: 'other-user', user: {} }],
        creator: {},
        _count: {},
      };
      prisma.group.findUnique.mockResolvedValue(mockGroup);

      await expect(service.getInviteLink(groupId, 'non-member')).rejects.toThrow(ForbiddenException);
    });
  });
});

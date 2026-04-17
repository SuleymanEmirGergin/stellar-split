import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { SettlementsService } from './settlements.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { UpdateSettlementStatusDto } from './dto/update-settlement-status.dto';

const USER_ID = 'user-uuid-1';
const GROUP_ID = 'group-uuid-1';
const TX_HASH = 'a'.repeat(64); // valid 64-char hex

function makeMockPrisma() {
  return {
    groupMember: {
      findUnique: jest.fn(),
    },
    settlement: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

function makeMockQueue() {
  return {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  };
}

describe('SettlementsService', () => {
  let service: SettlementsService;
  let prisma: ReturnType<typeof makeMockPrisma>;
  let stellarQueue: ReturnType<typeof makeMockQueue>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    stellarQueue = makeMockQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementsService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('stellar-tx-monitor'), useValue: stellarQueue },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<SettlementsService>(SettlementsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const dto: CreateSettlementDto = {
      groupId: GROUP_ID,
      txHash: TX_HASH,
      amount: 50.5,
    };

    const mockSettlement = {
      id: 'settlement-uuid-1',
      groupId: GROUP_ID,
      settledById: USER_ID,
      txHash: TX_HASH,
      amount: 50.5,
      status: 'PENDING',
    };

    beforeEach(() => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.settlement.findUnique.mockResolvedValue(null); // no duplicate
      prisma.settlement.create.mockResolvedValue(mockSettlement);
    });

    it('creates settlement record with PENDING status', async () => {
      const result = await service.create(USER_ID, dto);

      expect(prisma.settlement.create).toHaveBeenCalledWith({
        data: {
          groupId: GROUP_ID,
          settledById: USER_ID,
          txHash: TX_HASH,
          amount: dto.amount,
          status: 'PENDING',
        },
      });
      expect(result.status).toBe('PENDING');
    });

    it('enqueues BullMQ job with settlementId and txHash', async () => {
      await service.create(USER_ID, dto);

      expect(stellarQueue.add).toHaveBeenCalledWith(
        'monitor-tx',
        { settlementId: mockSettlement.id, txHash: TX_HASH },
        expect.objectContaining({ attempts: 10 }),
      );
    });

    it('throws 403 when user is not a group member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.create(USER_ID, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── create — idempotency ────────────────────────────────────────────────────

  describe('create() idempotency', () => {
    const dto: CreateSettlementDto = {
      groupId: GROUP_ID,
      txHash: TX_HASH,
      amount: 50.5,
    };

    const existingSettlement = {
      id: 'settlement-existing',
      groupId: GROUP_ID,
      settledById: USER_ID,
      txHash: TX_HASH,
      amount: 50.5,
      status: 'CONFIRMED',
    };

    it('returns existing record without creating a duplicate', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.settlement.findUnique.mockResolvedValue(existingSettlement);

      const result = await service.create(USER_ID, dto);

      expect(prisma.settlement.create).not.toHaveBeenCalled();
      expect(stellarQueue.add).not.toHaveBeenCalled();
      expect(result.id).toBe('settlement-existing');
    });

    it('returns existing record regardless of its status', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.settlement.findUnique.mockResolvedValue({ ...existingSettlement, status: 'FAILED' });

      const result = await service.create(USER_ID, dto);

      expect(result.status).toBe('FAILED');
      expect(prisma.settlement.create).not.toHaveBeenCalled();
    });
  });

  // ─── findByGroup ─────────────────────────────────────────────────────────────

  describe('findByGroup()', () => {
    it('throws 403 when user is not a group member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.findByGroup(GROUP_ID, USER_ID)).rejects.toThrow(ForbiddenException);
    });

    it('returns items and hasMore=false when within page size', async () => {
      const mockSettlements = [
        { id: 's1', txHash: 'a'.repeat(64), amount: 50, status: 'CONFIRMED', settledBy: { id: USER_ID } },
        { id: 's2', txHash: 'b'.repeat(64), amount: 25, status: 'PENDING', settledBy: { id: USER_ID } },
      ];
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.settlement.findMany.mockResolvedValue(mockSettlements);

      const result = await service.findByGroup(GROUP_ID, USER_ID);

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('sets hasMore and nextCursor when result exceeds limit', async () => {
      const mockSettlements = Array.from({ length: 21 }, (_, i) => ({
        id: `s${i}`,
        txHash: String(i).padStart(64, '0'),
        amount: 10,
        status: 'CONFIRMED',
        settledBy: { id: USER_ID },
      }));
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.settlement.findMany.mockResolvedValue(mockSettlements);

      const result = await service.findByGroup(GROUP_ID, USER_ID, undefined, 20);

      expect(result.items).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('s19');
    });

    it('returns empty items when group has no settlements', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.settlement.findMany.mockResolvedValue([]);

      const result = await service.findByGroup(GROUP_ID, USER_ID);

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('queries only settlements for the given group', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.settlement.findMany.mockResolvedValue([]);

      await service.findByGroup(GROUP_ID, USER_ID);

      expect(prisma.settlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { groupId: GROUP_ID },
        }),
      );
    });
  });

  // ─── updateStatus ────────────────────────────────────────────────────────────

  describe('updateStatus()', () => {
    const SETTLEMENT_ID = 'settlement-uuid-1';
    const mockSettlement = {
      id: SETTLEMENT_ID,
      groupId: GROUP_ID,
      settledById: USER_ID,
      txHash: TX_HASH,
      amount: 50.5,
      status: 'PENDING',
    };

    it('updates status to CONFIRMED with txHash', async () => {
      const dto: UpdateSettlementStatusDto = { status: 'CONFIRMED', txHash: TX_HASH };
      const updated = { ...mockSettlement, status: 'CONFIRMED' };

      prisma.settlement.findUnique.mockResolvedValue(mockSettlement);
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.settlement.update.mockResolvedValue(updated);

      const result = await service.updateStatus(SETTLEMENT_ID, USER_ID, dto);

      expect(prisma.settlement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SETTLEMENT_ID },
          data: expect.objectContaining({ status: 'CONFIRMED' }),
        }),
      );
      expect(result.status).toBe('CONFIRMED');
    });

    it('updates status to FAILED without providing a txHash', async () => {
      const dto: UpdateSettlementStatusDto = { status: 'FAILED' };
      const updated = { ...mockSettlement, status: 'FAILED' };

      prisma.settlement.findUnique.mockResolvedValue(mockSettlement);
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.settlement.update.mockResolvedValue(updated);

      const result = await service.updateStatus(SETTLEMENT_ID, USER_ID, dto);

      expect(result.status).toBe('FAILED');
    });

    it('throws NotFoundException when settlement does not exist', async () => {
      prisma.settlement.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus(SETTLEMENT_ID, USER_ID, { status: 'CONFIRMED' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.settlement.update).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when caller is not a group member', async () => {
      prisma.settlement.findUnique.mockResolvedValue(mockSettlement);
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus(SETTLEMENT_ID, USER_ID, { status: 'CONFIRMED' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.settlement.update).not.toHaveBeenCalled();
    });
  });
});

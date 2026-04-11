import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { StellarTxMonitorWorker } from './stellar-tx-monitor.worker';
import { PrismaService } from '../common/prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';
import { ReputationService } from '../reputation/reputation.service';
import { EventsService } from '../events/events.service';

const SETTLEMENT_ID = 'settlement-uuid-1';
const TX_HASH = 'a'.repeat(64);
const SETTLER_ID = 'user-uuid-1';
const GROUP_ID = 'group-uuid-1';

function makeMockPrisma() {
  return {
    settlement: {
      update: jest.fn(),
      findUnique: jest.fn().mockResolvedValue({ groupId: GROUP_ID }),
    },
    group: {
      update: jest.fn(),
    },
  };
}

function makeMockStellar() {
  return {
    getTransaction: jest.fn(),
  };
}

function makeMockReputation() {
  return {
    updateScore: jest.fn().mockResolvedValue({}),
  };
}

function makeJob(overrides: Partial<{ settlementId: string; txHash: string }> = {}): Job {
  return {
    data: {
      settlementId: overrides.settlementId ?? SETTLEMENT_ID,
      txHash: overrides.txHash ?? TX_HASH,
    },
    attemptsMade: 0,
  } as unknown as Job;
}

describe('StellarTxMonitorWorker', () => {
  let worker: StellarTxMonitorWorker;
  let prisma: ReturnType<typeof makeMockPrisma>;
  let stellar: ReturnType<typeof makeMockStellar>;
  let reputation: ReturnType<typeof makeMockReputation>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    stellar = makeMockStellar();
    reputation = makeMockReputation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarTxMonitorWorker,
        { provide: PrismaService, useValue: prisma },
        { provide: StellarService, useValue: stellar },
        { provide: ReputationService, useValue: reputation },
        { provide: EventsService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    worker = module.get<StellarTxMonitorWorker>(StellarTxMonitorWorker);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── successful tx ───────────────────────────────────────────────────────────

  describe('process() — tx successful', () => {
    const confirmedAt = new Date().toISOString();
    const mockSettlement = {
      id: SETTLEMENT_ID,
      groupId: GROUP_ID,
      settledById: SETTLER_ID,
      status: 'CONFIRMED',
    };

    beforeEach(() => {
      stellar.getTransaction.mockResolvedValue({ successful: true, createdAt: confirmedAt });
      prisma.settlement.update.mockResolvedValue({ ...mockSettlement, group: { id: GROUP_ID } });
      prisma.group.update.mockResolvedValue({});
    });

    it('updates settlement status to CONFIRMED with confirmedAt timestamp', async () => {
      await worker.process(makeJob());

      expect(prisma.settlement.update).toHaveBeenCalledWith({
        where: { id: SETTLEMENT_ID },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(confirmedAt),
        },
        include: { group: true },
      });
    });

    it('marks the group as settled', async () => {
      await worker.process(makeJob());

      expect(prisma.group.update).toHaveBeenCalledWith({
        where: { id: GROUP_ID },
        data: { isSettled: true },
      });
    });

    it('awards 10 reputation points to the settler', async () => {
      await worker.process(makeJob());

      expect(reputation.updateScore).toHaveBeenCalledWith(SETTLER_ID, 10);
    });
  });

  // ─── tx not found ─────────────────────────────────────────────────────────────

  describe('process() — tx not found on Horizon', () => {
    it('throws error to trigger BullMQ retry', async () => {
      stellar.getTransaction.mockResolvedValue(null);

      await expect(worker.process(makeJob())).rejects.toThrow(
        `Transaction ${TX_HASH} not yet confirmed`,
      );
    });

    it('does not update settlement when tx is not found', async () => {
      stellar.getTransaction.mockResolvedValue(null);

      await expect(worker.process(makeJob())).rejects.toThrow();
      expect(prisma.settlement.update).not.toHaveBeenCalled();
    });
  });

  // ─── tx failed ───────────────────────────────────────────────────────────────

  describe('process() — tx failed on Stellar', () => {
    beforeEach(() => {
      stellar.getTransaction.mockResolvedValue({ successful: false, createdAt: new Date().toISOString() });
      prisma.settlement.update.mockResolvedValue({ id: SETTLEMENT_ID, status: 'FAILED' });
    });

    it('updates settlement status to FAILED', async () => {
      await worker.process(makeJob());

      expect(prisma.settlement.update).toHaveBeenCalledWith({
        where: { id: SETTLEMENT_ID },
        data: { status: 'FAILED' },
      });
    });

    it('does not award reputation on failed tx', async () => {
      await worker.process(makeJob());

      expect(reputation.updateScore).not.toHaveBeenCalled();
    });

    it('does not mark group as settled', async () => {
      await worker.process(makeJob());

      expect(prisma.group.update).not.toHaveBeenCalled();
    });
  });
});

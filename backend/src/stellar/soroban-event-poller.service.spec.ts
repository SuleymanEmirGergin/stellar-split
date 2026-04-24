import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SorobanEventPollerService } from './soroban-event-poller.service';
import { EventsService } from '../events/events.service';

// Mock the stellar-sdk rpc.Server
const mockGetEvents = jest.fn();
jest.mock('@stellar/stellar-sdk', () => ({
  rpc: {
    Server: jest.fn().mockImplementation(() => ({ getEvents: mockGetEvents })),
  },
  scValToNative: jest.fn((val: unknown) => val),
}));

// Mock ioredis
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    get: mockRedisGet,
    set: mockRedisSet,
  })),
}));

describe('SorobanEventPollerService', () => {
  let service: SorobanEventPollerService;
  let publishSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockGetEvents.mockReset();
    mockRedisGet.mockReset();
    mockRedisSet.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SorobanEventPollerService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: unknown) => {
              const cfg: Record<string, string> = {
                SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
                REDIS_URL: 'redis://localhost:6379',
                SOROBAN_CONTRACT_ID: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4',
              };
              return cfg[key] ?? def;
            },
          },
        },
        {
          provide: EventsService,
          useValue: { publish: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(SorobanEventPollerService);
    publishSpy = jest.spyOn(module.get(EventsService), 'publish');
  });

  it('should skip polling when no contract IDs configured', async () => {
    // Override contractIds to empty
    (service as unknown as { contractIds: string[] }).contractIds = [];
    await service.pollContractEvents();
    expect(mockGetEvents).not.toHaveBeenCalled();
  });

  it('should not publish when no events returned', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockGetEvents.mockResolvedValue({ events: [] });
    await service.pollContractEvents();
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it('should map expense_added topic to expense:added and publish', async () => {
    // Contract emits the Symbol `expense_added` (see contracts/stellar_split/
    // src/lib.rs add_expense entrypoint); the poller maps it to the
    // GroupEvent 'expense:added' type.
    mockRedisGet.mockResolvedValue('1000');
    mockGetEvents.mockResolvedValue({
      events: [
        {
          ledger: 1001,
          contractId: 'CTEST',
          txHash: 'abc123',
          topic: ['expense_added', 'group-42'],
          value: {},
        },
      ],
    });

    await service.pollContractEvents();

    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'expense:added', groupId: 'group-42' }),
    );
    expect(mockRedisSet).toHaveBeenCalledWith('soroban:last_ledger', '1001');
  });

  it('should map mint topic to token:minted', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockGetEvents.mockResolvedValue({
      events: [
        {
          ledger: 500,
          contractId: 'CTOKEN',
          txHash: 'def456',
          topic: ['mint', 'wallet-addr'],
          value: { amount: 100 },
        },
      ],
    });

    await service.pollContractEvents();

    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'token:minted' }),
    );
  });

  it('should ignore unknown topics without publishing', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockGetEvents.mockResolvedValue({
      events: [
        { ledger: 100, contractId: 'C1', txHash: 'x', topic: ['unknown_op'], value: {} },
      ],
    });

    await service.pollContractEvents();
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it('should not throw when RPC call fails', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockGetEvents.mockRejectedValue(new Error('RPC timeout'));
    await expect(service.pollContractEvents()).resolves.not.toThrow();
  });

  it('should update last ledger to highest ledger seen', async () => {
    mockRedisGet.mockResolvedValue('500');
    mockGetEvents.mockResolvedValue({
      events: [
        { ledger: 502, contractId: 'C1', txHash: 'a', topic: ['member_added', 'g1'], value: {} },
        { ledger: 501, contractId: 'C1', txHash: 'b', topic: ['group_settled', 'g2'], value: {} },
      ],
    });

    await service.pollContractEvents();

    expect(mockRedisSet).toHaveBeenCalledWith('soroban:last_ledger', '502');
  });
});

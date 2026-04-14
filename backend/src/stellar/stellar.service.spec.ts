import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarService } from './stellar.service';

// ─── Mock axios ──────────────────────────────────────────────────────────────

jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

// ─── Mock @stellar/stellar-sdk ───────────────────────────────────────────────
// jest.mock() is hoisted — factory must NOT reference outer const/let variables.
// Access mocks after import via the mocked module reference.

jest.mock('@stellar/stellar-sdk', () => ({
  Horizon: {
    Server: jest.fn().mockImplementation(() => ({
      loadAccount: jest.fn(),
    })),
  },
  Keypair: {
    fromPublicKey: jest.fn(),
  },
}));

import * as StellarSdk from '@stellar/stellar-sdk';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  return {
    get: jest.fn().mockImplementation((key: string, fallback?: string) => {
      return overrides[key] ?? fallback;
    }),
  } as unknown as ConfigService;
}

describe('StellarService', () => {
  let service: StellarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        { provide: ConfigService, useValue: makeConfig() },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getTransaction() ────────────────────────────────────────────────────────

  describe('getTransaction()', () => {
    const TX_HASH = 'abc123txhash';

    it('returns transaction data when Horizon responds successfully', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { successful: true, created_at: '2026-04-01T00:00:00Z' },
      });

      const result = await service.getTransaction(TX_HASH);

      expect(result).toEqual({ successful: true, createdAt: '2026-04-01T00:00:00Z' });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(TX_HASH),
        { timeout: 30000 },
      );
    });

    it('returns null when transaction is not found (404)', async () => {
      const err = Object.assign(new Error('Not Found'), { response: { status: 404 } });
      mockedAxios.get.mockRejectedValue(err);

      const result = await service.getTransaction(TX_HASH);

      expect(result).toBeNull();
    });

    it('rethrows non-404 Horizon errors', async () => {
      const err = Object.assign(new Error('Server Error'), { response: { status: 500 } });
      mockedAxios.get.mockRejectedValue(err);

      await expect(service.getTransaction(TX_HASH)).rejects.toThrow('Server Error');
    });
  });

  // ─── getAccountBalances() ────────────────────────────────────────────────────

  describe('getAccountBalances()', () => {
    it('returns balances from Horizon for a wallet address', async () => {
      const balances = [{ asset_type: 'native', balance: '100.0000000' }];
      const mockLoadAccount = jest.fn().mockResolvedValue({ balances });
      (StellarSdk.Horizon.Server as jest.Mock).mockImplementation(() => ({
        loadAccount: mockLoadAccount,
      }));

      const result = await service.getAccountBalances('GCUSTODIANWALLET123');

      expect(result).toEqual(balances);
      expect(mockLoadAccount).toHaveBeenCalledWith('GCUSTODIANWALLET123');
    });
  });

  // ─── getXlmPrice() ───────────────────────────────────────────────────────────

  describe('getXlmPrice()', () => {
    it('returns USD price when CoinGecko responds', async () => {
      mockedAxios.get.mockResolvedValue({ data: { stellar: { usd: 0.12 } } });

      const result = await service.getXlmPrice();

      expect(result).toBe(0.12);
    });

    it('returns null when CoinGecko request fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('network error'));

      const result = await service.getXlmPrice();

      expect(result).toBeNull();
    });

    it('returns null when price field is missing from response', async () => {
      mockedAxios.get.mockResolvedValue({ data: {} });

      const result = await service.getXlmPrice();

      expect(result).toBeNull();
    });
  });

  // ─── verifySignature() ───────────────────────────────────────────────────────

  describe('verifySignature()', () => {
    const PUBLIC_KEY = 'GCUSTODIANWALLET123';
    const MESSAGE = 'stellarsplit-auth-nonce-abc';
    const SIG_B64 = Buffer.from('valid-sig').toString('base64');

    it('returns true when signature is valid', () => {
      const mockVerify = jest.fn().mockReturnValue(true);
      (StellarSdk.Keypair.fromPublicKey as jest.Mock).mockReturnValue({ verify: mockVerify });

      const result = service.verifySignature(PUBLIC_KEY, MESSAGE, SIG_B64);

      expect(result).toBe(true);
      expect(StellarSdk.Keypair.fromPublicKey as jest.Mock).toHaveBeenCalledWith(PUBLIC_KEY);
    });

    it('returns false when signature does not match', () => {
      const mockVerify = jest.fn().mockReturnValue(false);
      (StellarSdk.Keypair.fromPublicKey as jest.Mock).mockReturnValue({ verify: mockVerify });

      const result = service.verifySignature(PUBLIC_KEY, MESSAGE, SIG_B64);

      expect(result).toBe(false);
    });

    it('returns false when public key is invalid (Keypair throws)', () => {
      (StellarSdk.Keypair.fromPublicKey as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid key');
      });

      const result = service.verifySignature('INVALID_KEY', MESSAGE, SIG_B64);

      expect(result).toBe(false);
    });
  });
});

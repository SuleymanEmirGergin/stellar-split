import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { SponsorService } from './sponsor.service';

// ─── Mock @stellar/stellar-sdk ──────────────────────────────────────────────
// Hoisted mock — the factory cannot close over outer variables. Tests read/write
// the mock via the imported module reference below.

jest.mock('@stellar/stellar-sdk', () => {
  class FakeFeeBumpTransaction {
    toXDR = jest.fn(() => 'FAKE_FEE_BUMP_XDR');
    sign = jest.fn();
  }
  class FakeTransaction {
    source = 'GUSERSOURCEACCOUNT';
  }

  return {
    Networks: {
      PUBLIC: 'Public Global Stellar Network ; September 2015',
      TESTNET: 'Test SDF Network ; September 2015',
    },
    Keypair: {
      fromSecret: jest.fn(),
    },
    TransactionBuilder: {
      fromXDR: jest.fn(),
      buildFeeBumpTransaction: jest.fn(),
    },
    // Exposed so `instanceof` checks work inside the service.
    FeeBumpTransaction: FakeFeeBumpTransaction,
    Transaction: FakeTransaction,
  };
});

import * as StellarSdk from '@stellar/stellar-sdk';

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_SPONSOR_SECRET = 'S'.padEnd(56, 'A'); // 56 chars starting with 'S'
const SPONSOR_PUBLIC = 'GSPONSORPUBLICKEY123456';

function makeConfig(overrides: Record<string, string | undefined> = {}): ConfigService {
  return {
    get: jest.fn().mockImplementation((key: string) => overrides[key]),
  } as unknown as ConfigService;
}

function fakeSponsorKeypair() {
  return {
    publicKey: () => SPONSOR_PUBLIC,
    // Just something truthy — the real `sign(kp)` on the fee-bump mock is a jest.fn.
    secret: () => VALID_SPONSOR_SECRET,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('SponsorService', () => {
  afterEach(() => jest.clearAllMocks());

  async function build(configOverrides: Record<string, string | undefined>) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SponsorService,
        { provide: ConfigService, useValue: makeConfig(configOverrides) },
      ],
    }).compile();
    return module.get<SponsorService>(SponsorService);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Success path — valid inner XDR yields a signed fee-bump XDR.
  // ───────────────────────────────────────────────────────────────────────────

  it('wraps a valid inner XDR into a signed fee-bump and returns all three fields', async () => {
    const service = await build({
      SPONSOR_SECRET_KEY: VALID_SPONSOR_SECRET,
      STELLAR_NETWORK: 'testnet',
    });

    const sponsorKp = fakeSponsorKeypair();
    (StellarSdk.Keypair.fromSecret as jest.Mock).mockReturnValue(sponsorKp);

    // fromXDR must return a plain Transaction (not a FeeBumpTransaction) so
    // the service's `instanceof FeeBumpTransaction` guard does not trip.
    const innerTx = new (StellarSdk as unknown as { Transaction: new () => unknown }).Transaction();
    (StellarSdk.TransactionBuilder.fromXDR as jest.Mock).mockReturnValue(innerTx);

    const fakeFeeBump = {
      toXDR: jest.fn(() => 'SIGNED_FEE_BUMP_XDR_BASE64'),
      sign: jest.fn(),
    };
    (StellarSdk.TransactionBuilder.buildFeeBumpTransaction as jest.Mock).mockReturnValue(
      fakeFeeBump,
    );

    const result = service.wrapAsFeeBump('AAAAAGfakeInnerXDR==');

    expect(result).toEqual({
      feeBumpXdr: 'SIGNED_FEE_BUMP_XDR_BASE64',
      sponsorAccount: SPONSOR_PUBLIC,
      network: 'testnet',
    });

    // fromXDR was called with the testnet passphrase
    expect(StellarSdk.TransactionBuilder.fromXDR).toHaveBeenCalledWith(
      'AAAAAGfakeInnerXDR==',
      StellarSdk.Networks.TESTNET,
    );

    // buildFeeBumpTransaction gets: sponsor kp, base fee, inner tx, passphrase
    expect(StellarSdk.TransactionBuilder.buildFeeBumpTransaction).toHaveBeenCalledWith(
      sponsorKp,
      '10000000',
      innerTx,
      StellarSdk.Networks.TESTNET,
    );

    // And the fee-bump was signed with the sponsor keypair
    expect(fakeFeeBump.sign).toHaveBeenCalledWith(sponsorKp);
  });

  it('uses the PUBLIC network passphrase when STELLAR_NETWORK=public', async () => {
    const service = await build({
      SPONSOR_SECRET_KEY: VALID_SPONSOR_SECRET,
      STELLAR_NETWORK: 'public',
    });

    (StellarSdk.Keypair.fromSecret as jest.Mock).mockReturnValue(fakeSponsorKeypair());
    (StellarSdk.TransactionBuilder.fromXDR as jest.Mock).mockReturnValue(
      new (StellarSdk as unknown as { Transaction: new () => unknown }).Transaction(),
    );
    (StellarSdk.TransactionBuilder.buildFeeBumpTransaction as jest.Mock).mockReturnValue({
      toXDR: () => 'FB_XDR',
      sign: jest.fn(),
    });

    const result = service.wrapAsFeeBump('AAAAAGfakeInnerXDR==');

    expect(result.network).toBe('public');
    expect(StellarSdk.TransactionBuilder.fromXDR).toHaveBeenCalledWith(
      'AAAAAGfakeInnerXDR==',
      StellarSdk.Networks.PUBLIC,
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Degraded mode — sponsorship is optional; unset key → 503.
  // ───────────────────────────────────────────────────────────────────────────

  it('throws 503 when SPONSOR_SECRET_KEY is not configured', async () => {
    const service = await build({ SPONSOR_SECRET_KEY: undefined });

    expect(() => service.wrapAsFeeBump('any-xdr')).toThrow(ServiceUnavailableException);
    expect(() => service.wrapAsFeeBump('any-xdr')).toThrow(
      /Fee sponsorship is not configured/,
    );
  });

  it('throws 503 when SPONSOR_SECRET_KEY is an empty string', async () => {
    const service = await build({ SPONSOR_SECRET_KEY: '   ' });
    expect(() => service.wrapAsFeeBump('any-xdr')).toThrow(ServiceUnavailableException);
  });

  it('throws 503 when SPONSOR_SECRET_KEY is present but Stellar SDK rejects it', async () => {
    const service = await build({ SPONSOR_SECRET_KEY: 'SINVALID' });
    (StellarSdk.Keypair.fromSecret as jest.Mock).mockImplementation(() => {
      throw new Error('bad secret');
    });

    expect(() => service.wrapAsFeeBump('any-xdr')).toThrow(ServiceUnavailableException);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Input validation — malformed inner XDR → 400.
  // ───────────────────────────────────────────────────────────────────────────

  it('throws 400 when inner XDR cannot be parsed', async () => {
    const service = await build({
      SPONSOR_SECRET_KEY: VALID_SPONSOR_SECRET,
      STELLAR_NETWORK: 'testnet',
    });

    (StellarSdk.Keypair.fromSecret as jest.Mock).mockReturnValue(fakeSponsorKeypair());
    (StellarSdk.TransactionBuilder.fromXDR as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid XDR');
    });

    expect(() => service.wrapAsFeeBump('garbage')).toThrow(BadRequestException);
    expect(() => service.wrapAsFeeBump('garbage')).toThrow(/not a valid/i);
  });

  it('throws 400 when the inner XDR is itself a fee-bump (no double-wrapping)', async () => {
    const service = await build({
      SPONSOR_SECRET_KEY: VALID_SPONSOR_SECRET,
      STELLAR_NETWORK: 'testnet',
    });

    (StellarSdk.Keypair.fromSecret as jest.Mock).mockReturnValue(fakeSponsorKeypair());
    const fakeFeeBumpInner = new (StellarSdk as unknown as {
      FeeBumpTransaction: new () => unknown;
    }).FeeBumpTransaction();
    (StellarSdk.TransactionBuilder.fromXDR as jest.Mock).mockReturnValue(fakeFeeBumpInner);

    expect(() => service.wrapAsFeeBump('ALREADY_FEE_BUMP_XDR')).toThrow(BadRequestException);
    expect(() => service.wrapAsFeeBump('ALREADY_FEE_BUMP_XDR')).toThrow(
      /already a fee-bump/i,
    );
  });

  it('throws 400 when buildFeeBumpTransaction itself fails', async () => {
    const service = await build({
      SPONSOR_SECRET_KEY: VALID_SPONSOR_SECRET,
      STELLAR_NETWORK: 'testnet',
    });

    (StellarSdk.Keypair.fromSecret as jest.Mock).mockReturnValue(fakeSponsorKeypair());
    (StellarSdk.TransactionBuilder.fromXDR as jest.Mock).mockReturnValue(
      new (StellarSdk as unknown as { Transaction: new () => unknown }).Transaction(),
    );
    (StellarSdk.TransactionBuilder.buildFeeBumpTransaction as jest.Mock).mockImplementation(
      () => {
        throw new Error('base fee too low');
      },
    );

    expect(() => service.wrapAsFeeBump('AAAAAGfakeInnerXDR==')).toThrow(BadRequestException);
  });
});

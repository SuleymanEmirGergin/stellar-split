import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { VerifyWalletDto } from './dto/verify-wallet.dto';

// Mock @stellar/stellar-sdk to avoid real key operations
jest.mock('@stellar/stellar-sdk', () => ({
  Keypair: {
    fromPublicKey: jest.fn().mockReturnValue({
      verify: jest.fn().mockReturnValue(true),
    }),
  },
}));

import * as StellarSdk from '@stellar/stellar-sdk';

const VALID_WALLET = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';

function makeMockPrisma() {
  return {
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

function makeMockRedis() {
  return {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
  };
}

function makeMockJwt() {
  return {
    sign: jest.fn().mockReturnValue('mock.access.token'),
  };
}

function makeMockConfig() {
  return {
    get: jest.fn().mockImplementation((key: string, defaultVal?: unknown) => {
      const values: Record<string, unknown> = {
        JWT_REFRESH_TTL: 604800,
        JWT_SECRET: 'test-secret',
      };
      return values[key] ?? defaultVal;
    }),
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makeMockPrisma>;
  let redis: ReturnType<typeof makeMockRedis>;
  let jwtService: ReturnType<typeof makeMockJwt>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    redis = makeMockRedis();
    jwtService = makeMockJwt();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: makeMockConfig() },
        { provide: 'REDIS_CLIENT', useValue: redis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── generateChallenge ──────────────────────────────────────────────────────

  describe('generateChallenge()', () => {
    it('returns nonce, message, and expiresAt', async () => {
      const result = await service.generateChallenge('127.0.0.1');

      expect(result).toHaveProperty('nonce');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('expiresAt');
      expect(typeof result.nonce).toBe('string');
      expect(result.nonce).toHaveLength(64); // 32 bytes hex
      expect(result.message).toContain(result.nonce);
    });

    it('stores nonce in Redis with TTL of 300s', async () => {
      const result = await service.generateChallenge('127.0.0.1');

      expect(redis.set).toHaveBeenCalledWith(
        `siws:nonce:${result.nonce}`,
        result.message,
        'EX',
        300,
      );
    });

    it('generates unique nonces on each call', async () => {
      const r1 = await service.generateChallenge('127.0.0.1');
      const r2 = await service.generateChallenge('127.0.0.1');
      expect(r1.nonce).not.toBe(r2.nonce);
    });
  });

  // ─── verifySiws ─────────────────────────────────────────────────────────────

  describe('verifySiws()', () => {
    const dto: VerifyWalletDto = {
      walletAddress: VALID_WALLET,
      signature: Buffer.from('valid-sig').toString('base64'),
      nonce: 'abc123nonce',
    };

    const storedMessage = `Sign this message to authenticate with StellarSplit.\nNonce: abc123nonce\nExpires: ${new Date().toISOString()}`;

    const mockUser = {
      id: 'user-uuid-1',
      walletAddress: VALID_WALLET,
      reputationScore: 0,
    };

    beforeEach(() => {
      redis.get.mockResolvedValue(storedMessage);
      prisma.user.upsert.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });
      // Ensure Stellar SDK verify returns true
      (StellarSdk.Keypair.fromPublicKey as jest.Mock).mockReturnValue({
        verify: jest.fn().mockReturnValue(true),
      });
    });

    it('valid signature → upserts user and returns accessToken + user', async () => {
      const result = await service.verifySiws(dto);

      expect(redis.get).toHaveBeenCalledWith(`siws:nonce:${dto.nonce}`);
      expect(redis.del).toHaveBeenCalledWith(`siws:nonce:${dto.nonce}`);
      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { walletAddress: dto.walletAddress },
        create: { walletAddress: dto.walletAddress },
        update: {},
      });
      expect(result.accessToken).toBe('mock.access.token');
      expect(result.user.walletAddress).toBe(VALID_WALLET);
    });

    it('invalid nonce (not in Redis) → throws 401', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.verifySiws(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.verifySiws(dto)).rejects.toThrow('Invalid or expired nonce');
    });

    it('bad signature → throws 401', async () => {
      (StellarSdk.Keypair.fromPublicKey as jest.Mock).mockReturnValue({
        verify: jest.fn().mockImplementation(() => {
          throw new Error('bad sig');
        }),
      });

      await expect(service.verifySiws(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('replay attack (nonce consumed) → 401 on second call', async () => {
      // First call succeeds — second call finds nonce missing
      redis.get
        .mockResolvedValueOnce(storedMessage)
        .mockResolvedValueOnce(null);

      // First call
      await service.verifySiws(dto);
      // Second call (replay)
      await expect(service.verifySiws(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('signature verify returning false → throws 401', async () => {
      (StellarSdk.Keypair.fromPublicKey as jest.Mock).mockReturnValue({
        verify: jest.fn().mockReturnValue(false),
      });

      await expect(service.verifySiws(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── refreshTokens ───────────────────────────────────────────────────────────

  describe('refreshTokens()', () => {
    const rawToken = 'raw-refresh-token-string';
    const mockStoredToken = {
      id: 'rt-id-1',
      userId: 'user-uuid-1',
      tokenHash: 'hashed-value',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 10 * 60 * 60 * 1000), // 10h from now
    };
    const mockUser = {
      id: 'user-uuid-1',
      walletAddress: VALID_WALLET,
      reputationScore: 0,
    };

    beforeEach(() => {
      prisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      prisma.refreshToken.update.mockResolvedValue({ ...mockStoredToken, revokedAt: new Date() });
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-new' });
    });

    it('valid token → rotates and returns new accessToken + refreshToken', async () => {
      const result = await service.refreshTokens(rawToken);

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockStoredToken.id },
          data: { revokedAt: expect.any(Date) },
        }),
      );
      expect(result.accessToken).toBe('mock.access.token');
      expect(result.refreshToken).toBeTruthy();
    });

    it('no token provided → throws 401', async () => {
      await expect(service.refreshTokens(undefined)).rejects.toThrow(UnauthorizedException);
    });

    it('revoked token → throws 401', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        revokedAt: new Date(),
      });

      await expect(service.refreshTokens(rawToken)).rejects.toThrow(UnauthorizedException);
    });

    it('expired token → throws 401', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockStoredToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refreshTokens(rawToken)).rejects.toThrow(UnauthorizedException);
    });

    it('token not found in DB → throws 401', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens(rawToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('revokes refresh token in DB', async () => {
      const userId = 'user-uuid-1';
      const rawToken = 'raw-token-to-revoke';
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout(userId, rawToken);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId, revokedAt: null }),
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });

    it('no token → returns without calling DB', async () => {
      await service.logout('user-uuid-1', undefined);

      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });
});

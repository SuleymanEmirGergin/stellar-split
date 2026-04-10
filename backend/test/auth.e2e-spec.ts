import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { APP_GUARD } from '@nestjs/core';

import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createMockPrisma } from './helpers/mock-prisma';
import { generateTestToken, TEST_JWT_SECRET, TEST_USER_A } from './helpers/mock-jwt';

// Mock Stellar SDK — no real keypair operations in tests
jest.mock('@stellar/stellar-sdk', () => ({
  Keypair: {
    fromPublicKey: jest.fn().mockReturnValue({
      verify: jest.fn().mockReturnValue(true),
    }),
  },
}));

const VALID_WALLET = TEST_USER_A.walletAddress;
const VALID_NONCE = 'deadbeef'.repeat(8); // 64 hex chars
const VALID_MESSAGE = `Sign this message to authenticate with StellarSplit.\nNonce: ${VALID_NONCE}\nExpires: ${new Date(Date.now() + 300_000).toISOString()}`;

describe('Auth E2E', () => {
  let app: INestApplication;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockRedis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeAll(async () => {
    mockPrisma = createMockPrisma();
    mockRedis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: unknown) => {
              const cfg: Record<string, unknown> = {
                JWT_SECRET: TEST_JWT_SECRET,
                JWT_REFRESH_TTL: 604800,
                NODE_ENV: 'test',
              };
              return key in cfg ? cfg[key] : def;
            },
            getOrThrow: () => TEST_JWT_SECRET,
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => jest.clearAllMocks());

  // ─── GET /auth/challenge ──────────────────────────────────────────────────────

  describe('GET /auth/challenge', () => {
    it('200 — returns nonce, message, and expiresAt', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/challenge')
        .expect(200);

      expect(res.body).toHaveProperty('nonce');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('expiresAt');
      expect(typeof res.body.nonce).toBe('string');
      expect(res.body.nonce).toHaveLength(64);
    });
  });

  // ─── POST /auth/verify ────────────────────────────────────────────────────────

  describe('POST /auth/verify', () => {
    it('401 — invalid nonce (not in Redis)', async () => {
      mockRedis.get.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/verify')
        .send({
          walletAddress: VALID_WALLET,
          signature: Buffer.from('sig').toString('base64'),
          nonce: 'nonexistent-nonce',
        })
        .expect(401);
    });

    it('200 — valid mock signature → sets refresh cookie, returns accessToken', async () => {
      mockRedis.get.mockResolvedValue(VALID_MESSAGE);
      mockPrisma.user.upsert.mockResolvedValue(TEST_USER_A);
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const res = await request(app.getHttpServer())
        .post('/auth/verify')
        .send({
          walletAddress: VALID_WALLET,
          signature: Buffer.from('valid-sig').toString('base64'),
          nonce: VALID_NONCE,
        })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.walletAddress).toBe(VALID_WALLET);

      const rawCookies = res.headers['set-cookie'] as string[] | string | undefined;
      const cookies = rawCookies
        ? Array.isArray(rawCookies)
          ? rawCookies
          : [rawCookies]
        : [];
      const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toMatch(/HttpOnly/i);
    });

    it('400 — missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify')
        .send({ walletAddress: VALID_WALLET }) // missing signature + nonce
        .expect(400);
    });

    it('400 — invalid wallet address format', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify')
        .send({
          walletAddress: 'not-a-stellar-address',
          signature: Buffer.from('sig').toString('base64'),
          nonce: 'some-nonce',
        })
        .expect(400);
    });
  });

  // ─── POST /auth/refresh ───────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('200 — valid cookie → rotates token', async () => {
      const rawToken = 'test-refresh-raw-token-value';
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: TEST_USER_A.id,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3_600_000),
      });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(TEST_USER_A);
      mockPrisma.refreshToken.update.mockResolvedValue({ id: 'rt-1', revokedAt: new Date() });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${rawToken}; Path=/auth; HttpOnly`)
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
    });

    it('401 — no refresh cookie', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .expect(401);
    });

    it('401 — revoked token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-revoked',
        userId: TEST_USER_A.id,
        revokedAt: new Date(Date.now() - 1000),
        expiresAt: new Date(Date.now() + 3_600_000),
      });

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=revoked-token; Path=/auth; HttpOnly')
        .expect(401);
    });
  });

  // ─── POST /auth/logout ────────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('200 — clears cookie with valid JWT', async () => {
      const accessToken = generateTestToken({ sub: TEST_USER_A.id, wallet: VALID_WALLET });
      mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_A);
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', 'refresh_token=some-raw-token; Path=/auth; HttpOnly')
        .expect(200);

      expect(res.body.message).toBe('Logged out');
    });

    it('401 — no authorization header', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });
});

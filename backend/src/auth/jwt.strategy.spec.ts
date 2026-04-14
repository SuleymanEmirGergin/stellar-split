import { UnauthorizedException } from '@nestjs/common';

// ─── Mock passport-jwt and @nestjs/passport before importing the strategy ─────
jest.mock('passport-jwt', () => ({
  ExtractJwt: {
    fromExtractors: jest.fn().mockReturnValue(() => null),
    fromAuthHeaderAsBearerToken: jest.fn().mockReturnValue(() => null),
  },
  Strategy: class MockJwtStrategy {
    constructor(_opts: unknown) {}
  },
}));

jest.mock('@nestjs/passport', () => ({
  PassportStrategy: (_Base: unknown) =>
    class MockBase {
      constructor() {}
    },
}));

import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const mockConfig = {
    get: jest.fn(),
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  } as unknown as ConfigService;
  const mockAuth = { validateUserById: jest.fn() } as unknown as AuthService;

  beforeEach(() => {
    strategy = new JwtStrategy(mockConfig, mockAuth);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns payload when user is found', async () => {
    const payload = { sub: 'user-uuid', walletAddress: 'GXXX' };
    (mockAuth.validateUserById as jest.Mock).mockResolvedValue({ id: 'user-uuid' });

    const result = await strategy.validate(payload as any);

    expect(result).toEqual(payload);
    expect(mockAuth.validateUserById).toHaveBeenCalledWith('user-uuid');
  });

  it('throws UnauthorizedException when user is not found', async () => {
    const payload = { sub: 'gone-user' };
    (mockAuth.validateUserById as jest.Mock).mockResolvedValue(null);

    await expect(strategy.validate(payload as any)).rejects.toThrow(UnauthorizedException);
  });
});

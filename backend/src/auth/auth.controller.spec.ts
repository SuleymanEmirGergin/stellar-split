import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const USER = { sub: 'user-uuid' } as any;

function makeRes() {
  return { cookie: jest.fn(), clearCookie: jest.fn() } as any;
}

describe('AuthController', () => {
  let controller: AuthController;
  const mockService = {
    generateChallenge: jest.fn(),
    verifySiws: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockService }],
    }).compile();
    controller = module.get(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('challenge()', () => {
    it('returns nonce from service', async () => {
      const req = { ip: '127.0.0.1' } as any;
      mockService.generateChallenge.mockResolvedValue({ nonce: 'abc123' });
      await expect(controller.challenge(req)).resolves.toMatchObject({ nonce: 'abc123' });
      expect(mockService.generateChallenge).toHaveBeenCalledWith('127.0.0.1');
    });

    it('uses "unknown" when ip is missing', async () => {
      const req = {} as any;
      mockService.generateChallenge.mockResolvedValue({ nonce: 'xyz' });
      await controller.challenge(req);
      expect(mockService.generateChallenge).toHaveBeenCalledWith('unknown');
    });
  });

  describe('verify()', () => {
    it('sets refresh cookie and returns accessToken + user', async () => {
      const dto = { walletAddress: 'GXXX', signature: 'sig', nonce: 'nonce' } as any;
      const res = makeRes();
      mockService.verifySiws.mockResolvedValue({
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
        user: { id: 'u1' },
      });

      const result = await controller.verify(dto, res);

      expect(mockService.verifySiws).toHaveBeenCalledWith(dto);
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'refresh-token', expect.any(Object));
      expect(result).toEqual({ accessToken: 'jwt-token', user: { id: 'u1' } });
    });
  });

  describe('refresh()', () => {
    it('uses cookie token to refresh and sets new cookie', async () => {
      const req = { cookies: { refresh_token: 'old-refresh' } } as any;
      const res = makeRes();
      mockService.refreshTokens.mockResolvedValue({
        accessToken: 'new-jwt',
        refreshToken: 'new-refresh',
      });

      const result = await controller.refresh(req, res);

      expect(mockService.refreshTokens).toHaveBeenCalledWith('old-refresh');
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'new-refresh', expect.any(Object));
      expect(result).toEqual({ accessToken: 'new-jwt' });
    });

    it('passes undefined when refresh cookie is absent', async () => {
      const req = { cookies: {} } as any;
      const res = makeRes();
      mockService.refreshTokens.mockResolvedValue({ accessToken: 'jwt', refreshToken: 'r' });
      await controller.refresh(req, res);
      expect(mockService.refreshTokens).toHaveBeenCalledWith(undefined);
    });
  });

  describe('logout()', () => {
    it('calls logout and clears cookie', async () => {
      const req = { cookies: { refresh_token: 'my-refresh' } } as any;
      const res = makeRes();
      mockService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(req, res, USER);

      expect(mockService.logout).toHaveBeenCalledWith(USER.sub, 'my-refresh');
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/auth' });
      expect(result).toEqual({ message: 'Logged out' });
    });
  });
});

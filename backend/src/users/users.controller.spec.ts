import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const USER = { sub: 'user-uuid' } as any;

describe('UsersController', () => {
  let controller: UsersController;
  const mockService = { exportData: jest.fn(), deleteAccount: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockService }],
    }).compile();
    controller = module.get(UsersController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('exportData()', () => {
    it('calls service, sets headers and responds with JSON', async () => {
      const data = { id: 'u1', email: 'test@test.com', expenses: [] };
      mockService.exportData.mockResolvedValue(data);

      const mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await controller.exportData(USER, mockRes);

      expect(mockService.exportData).toHaveBeenCalledWith(USER.sub);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining(USER.sub),
      );
      expect(mockRes.json).toHaveBeenCalledWith(data);
    });
  });

  describe('deleteAccount()', () => {
    it('calls service.deleteAccount', async () => {
      mockService.deleteAccount.mockResolvedValue(undefined);
      await expect(controller.deleteAccount(USER)).resolves.toBeUndefined();
      expect(mockService.deleteAccount).toHaveBeenCalledWith(USER.sub);
    });
  });
});

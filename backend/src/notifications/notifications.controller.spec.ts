import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

const USER = { sub: 'user-uuid' } as any;

describe('NotificationsController', () => {
  let controller: NotificationsController;
  const mockService = { findAll: jest.fn(), markRead: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockService }],
    }).compile();
    controller = module.get(NotificationsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('findAll() delegates to service', async () => {
    mockService.findAll.mockResolvedValue({ items: [], hasMore: false });
    await expect(controller.findAll(USER)).resolves.toMatchObject({ items: [] });
    expect(mockService.findAll).toHaveBeenCalledWith(USER.sub, undefined, undefined);
  });

  it('markRead() delegates to service', async () => {
    mockService.markRead.mockResolvedValue({ count: 1 });
    await expect(controller.markRead('notif-1', USER)).resolves.toMatchObject({ count: 1 });
    expect(mockService.markRead).toHaveBeenCalledWith('notif-1', USER.sub);
  });
});

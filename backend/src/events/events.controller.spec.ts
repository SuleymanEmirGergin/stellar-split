import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaService } from '../common/prisma/prisma.service';

const USER = { sub: 'user-uuid' } as any;

describe('EventsController', () => {
  let controller: EventsController;
  const mockEventsService = { streamForGroup: jest.fn() };
  const mockPrisma = { groupMember: { findUnique: jest.fn() } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        { provide: EventsService, useValue: mockEventsService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    controller = module.get(EventsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns SSE observable for a group member', async () => {
    const stream = of({ data: 'heartbeat' });
    mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
    mockEventsService.streamForGroup.mockReturnValue(stream);
    const mockRes = { setHeader: jest.fn() } as any;

    const result = await controller.streamGroupEvents('grp-1', USER, mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
    expect(mockEventsService.streamForGroup).toHaveBeenCalledWith('grp-1');
    expect(result).toBe(stream);
  });

  it('throws ForbiddenException when user is not a member', async () => {
    mockPrisma.groupMember.findUnique.mockResolvedValue(null);
    const mockRes = { setHeader: jest.fn() } as any;

    await expect(controller.streamGroupEvents('grp-1', USER, mockRes)).rejects.toThrow(ForbiddenException);
    expect(mockEventsService.streamForGroup).not.toHaveBeenCalled();
  });
});

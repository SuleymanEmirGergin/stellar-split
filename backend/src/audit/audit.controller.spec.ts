import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PrismaService } from '../common/prisma/prisma.service';

const USER = { sub: 'user-uuid' } as any;

describe('AuditController', () => {
  let controller: AuditController;
  const mockAuditService = { findByGroup: jest.fn() };
  const mockPrisma = { groupMember: { findUnique: jest.fn() } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        { provide: AuditService, useValue: mockAuditService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    controller = module.get(AuditController);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns audit logs for a group member', async () => {
    const logs = { items: [{ id: 'log-1' }], hasMore: false };
    mockPrisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
    mockAuditService.findByGroup.mockResolvedValue(logs);

    const result = await controller.getGroupAudit('grp-1', {}, USER);

    expect(mockAuditService.findByGroup).toHaveBeenCalledWith('grp-1', expect.any(Object));
    expect(result).toEqual(logs);
  });

  it('throws ForbiddenException when user is not a member', async () => {
    mockPrisma.groupMember.findUnique.mockResolvedValue(null);

    await expect(controller.getGroupAudit('grp-1', {}, USER)).rejects.toThrow(ForbiddenException);
    expect(mockAuditService.findByGroup).not.toHaveBeenCalled();
  });
});

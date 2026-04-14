import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { GuardiansService } from './guardians.service';
import { PrismaService } from '../common/prisma/prisma.service';

const GROUP_ID = 'group-uuid';
const USER_ID = 'user-uuid';
const GUARDIAN_USER_ID = 'guardian-user-uuid';
const GUARDIAN_ID = 'guardian-uuid';
const GUARDIAN_WALLET = 'GCUSTODIANWALLET123';

function makeMockPrisma() {
  return {
    groupMember: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    guardian: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('GuardiansService', () => {
  let service: GuardiansService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuardiansService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<GuardiansService>(GuardiansService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findByGroup() ────────────────────────────────────────────────────────────

  describe('findByGroup()', () => {
    it('returns guardians for a group member', async () => {
      const guardians = [{ id: GUARDIAN_ID, userId: USER_ID, groupId: GROUP_ID }];
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.guardian.findMany.mockResolvedValue(guardians);

      const result = await service.findByGroup(GROUP_ID, USER_ID);

      expect(prisma.guardian.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { groupId: GROUP_ID } }),
      );
      expect(result).toEqual(guardians);
    });

    it('throws ForbiddenException when user is not a group member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.findByGroup(GROUP_ID, USER_ID)).rejects.toThrow(ForbiddenException);
      expect(prisma.guardian.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── create() ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const dto = { groupId: GROUP_ID, guardianAddress: GUARDIAN_WALLET };

    it('creates a guardian for a group member', async () => {
      const guardianUser = { id: GUARDIAN_USER_ID, walletAddress: GUARDIAN_WALLET };
      const created = { id: GUARDIAN_ID, userId: USER_ID, groupId: GROUP_ID, guardianUserId: GUARDIAN_USER_ID };

      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.user.findUnique.mockResolvedValue(guardianUser);
      prisma.guardian.findUnique.mockResolvedValue(null);
      prisma.guardian.create.mockResolvedValue(created);

      const result = await service.create(USER_ID, dto);

      expect(prisma.guardian.create).toHaveBeenCalledWith({
        data: { userId: USER_ID, groupId: GROUP_ID, guardianUserId: GUARDIAN_USER_ID },
      });
      expect(result).toEqual(created);
    });

    it('throws ForbiddenException when user is not a group member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.create(USER_ID, dto)).rejects.toThrow(ForbiddenException);
      expect(prisma.guardian.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when guardian wallet address has no account', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create(USER_ID, dto)).rejects.toThrow(NotFoundException);
      expect(prisma.guardian.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when guardian is already added', async () => {
      const guardianUser = { id: GUARDIAN_USER_ID, walletAddress: GUARDIAN_WALLET };

      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.user.findUnique.mockResolvedValue(guardianUser);
      prisma.guardian.findUnique.mockResolvedValue({ id: GUARDIAN_ID }); // already exists

      await expect(service.create(USER_ID, dto)).rejects.toThrow(ConflictException);
      expect(prisma.guardian.create).not.toHaveBeenCalled();
    });
  });

  // ─── remove() ────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('removes a guardian owned by the requesting user', async () => {
      prisma.guardian.findUnique.mockResolvedValue({ id: GUARDIAN_ID, userId: USER_ID });

      await expect(service.remove(GUARDIAN_ID, USER_ID)).resolves.toBeUndefined();

      expect(prisma.guardian.delete).toHaveBeenCalledWith({ where: { id: GUARDIAN_ID } });
    });

    it('throws NotFoundException when guardian does not exist', async () => {
      prisma.guardian.findUnique.mockResolvedValue(null);

      await expect(service.remove(GUARDIAN_ID, USER_ID)).rejects.toThrow(NotFoundException);
      expect(prisma.guardian.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when user tries to remove another user\'s guardian', async () => {
      prisma.guardian.findUnique.mockResolvedValue({ id: GUARDIAN_ID, userId: 'other-user' });

      await expect(service.remove(GUARDIAN_ID, USER_ID)).rejects.toThrow(ForbiddenException);
      expect(prisma.guardian.delete).not.toHaveBeenCalled();
    });
  });
});

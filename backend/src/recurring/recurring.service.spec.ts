import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { RecurringService } from './recurring.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';

const GROUP_ID = 'group-uuid';
const USER_ID = 'user-uuid';
const TEMPLATE_ID = 'template-uuid';

const WALLET_A = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
const WALLET_B = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGOZ3GGMFAHJ3IRCKLR2TONBQ';

function makeMockPrisma() {
  return {
    recurringTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    groupMember: {
      findUnique: jest.fn(),
    },
  };
}

function makeMockQueue() {
  return {
    add: jest.fn(),
    getJob: jest.fn(),
  };
}

function makeTemplate(overrides: Partial<{ id: string; groupId: string; createdBy: string }> = {}) {
  return {
    id: overrides.id ?? TEMPLATE_ID,
    groupId: overrides.groupId ?? GROUP_ID,
    description: 'Netflix',
    amount: 15,
    frequency: 'MONTHLY',
    nextDue: new Date('2025-06-01'),
    memberIds: [],
  };
}

const futureDate = new Date(Date.now() + 86_400_000).toISOString(); // tomorrow
const pastDate = new Date(Date.now() - 86_400_000).toISOString(); // yesterday

const baseDto: CreateRecurringDto = {
  groupId: GROUP_ID,
  description: 'Netflix',
  amount: 15,
  frequency: 'MONTHLY' as any,
  nextDue: futureDate,
};

describe('RecurringService', () => {
  let service: RecurringService;
  let prisma: ReturnType<typeof makeMockPrisma>;
  let queue: ReturnType<typeof makeMockQueue>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    queue = makeMockQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('recurring-expenses'), useValue: queue },
      ],
    }).compile();

    service = module.get<RecurringService>(RecurringService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findByGroup ─────────────────────────────────────────────────────────────

  describe('findByGroup()', () => {
    it('returns templates when user is a group member', async () => {
      const templates = [makeTemplate()];
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.recurringTemplate.findMany.mockResolvedValue(templates);

      const result = await service.findByGroup(GROUP_ID, USER_ID);

      expect(prisma.groupMember.findUnique).toHaveBeenCalledWith({
        where: { groupId_userId: { groupId: GROUP_ID, userId: USER_ID } },
      });
      expect(result).toEqual(templates);
    });

    it('throws ForbiddenException when user is not a member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.findByGroup(GROUP_ID, USER_ID)).rejects.toThrow(ForbiddenException);
      expect(prisma.recurringTemplate.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates template and schedules BullMQ job for a future date', async () => {
      const template = makeTemplate();
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.recurringTemplate.create.mockResolvedValue(template);

      const result = await service.create(USER_ID, baseDto);

      expect(prisma.recurringTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ groupId: GROUP_ID, description: 'Netflix', amount: 15 }),
        }),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'process-recurring',
        { templateId: template.id },
        expect.objectContaining({ jobId: `recurring-${template.id}` }),
      );

      const callOptions = queue.add.mock.calls[0][2];
      expect(callOptions.delay).toBeGreaterThan(0);
      expect(result).toEqual(template);
    });

    it('clamps delay to 0 for a past nextDue date', async () => {
      const template = makeTemplate();
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.recurringTemplate.create.mockResolvedValue(template);

      await service.create(USER_ID, { ...baseDto, nextDue: pastDate });

      const callOptions = queue.add.mock.calls[0][2];
      expect(callOptions.delay).toBe(0);
    });

    it('resolves member wallet addresses to user IDs', async () => {
      const template = makeTemplate();
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-a' },
        { id: 'user-b' },
      ]);
      prisma.recurringTemplate.create.mockResolvedValue(template);

      await service.create(USER_ID, { ...baseDto, members: [WALLET_A, WALLET_B] });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { walletAddress: { in: [WALLET_A, WALLET_B] } },
        select: { id: true },
      });

      const createData = prisma.recurringTemplate.create.mock.calls[0][0].data;
      expect(createData.memberIds).toEqual(['user-a', 'user-b']);
    });

    it('skips wallet lookup when no members provided', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.recurringTemplate.create.mockResolvedValue(makeTemplate());

      await service.create(USER_ID, baseDto);

      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when user is not a group member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.create(USER_ID, baseDto)).rejects.toThrow(ForbiddenException);
      expect(prisma.recurringTemplate.create).not.toHaveBeenCalled();
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates allowed fields when user is a member', async () => {
      const template = makeTemplate();
      const updated = { ...template, description: 'Spotify', amount: 10 };
      prisma.recurringTemplate.findUnique.mockResolvedValue(template);
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.recurringTemplate.update.mockResolvedValue(updated);

      const result = await service.update(TEMPLATE_ID, USER_ID, { description: 'Spotify', amount: 10 });

      expect(prisma.recurringTemplate.update).toHaveBeenCalledWith({
        where: { id: TEMPLATE_ID },
        data: { description: 'Spotify', amount: 10 },
      });
      expect(result).toEqual(updated);
    });

    it('only includes provided fields in update data (partial update)', async () => {
      prisma.recurringTemplate.findUnique.mockResolvedValue(makeTemplate());
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      prisma.recurringTemplate.update.mockResolvedValue(makeTemplate());

      await service.update(TEMPLATE_ID, USER_ID, { amount: 20 });

      const updateData = prisma.recurringTemplate.update.mock.calls[0][0].data;
      expect(updateData).toEqual({ amount: 20 });
      expect(updateData.description).toBeUndefined();
      expect(updateData.frequency).toBeUndefined();
    });

    it('throws NotFoundException when template does not exist', async () => {
      prisma.recurringTemplate.findUnique.mockResolvedValue(null);

      await expect(service.update(TEMPLATE_ID, USER_ID, { amount: 20 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when user is not a group member', async () => {
      prisma.recurringTemplate.findUnique.mockResolvedValue(makeTemplate());
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.update(TEMPLATE_ID, USER_ID, { amount: 20 })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('deletes template and removes scheduled BullMQ job', async () => {
      const mockJob = { remove: jest.fn().mockResolvedValue(undefined) };
      prisma.recurringTemplate.findUnique.mockResolvedValue(makeTemplate());
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      queue.getJob.mockResolvedValue(mockJob);
      prisma.recurringTemplate.delete.mockResolvedValue(makeTemplate());

      await service.remove(TEMPLATE_ID, USER_ID);

      expect(queue.getJob).toHaveBeenCalledWith(`recurring-${TEMPLATE_ID}`);
      expect(mockJob.remove).toHaveBeenCalled();
      expect(prisma.recurringTemplate.delete).toHaveBeenCalledWith({ where: { id: TEMPLATE_ID } });
    });

    it('skips job removal when job no longer exists in queue', async () => {
      prisma.recurringTemplate.findUnique.mockResolvedValue(makeTemplate());
      prisma.groupMember.findUnique.mockResolvedValue({ id: 'gm1' });
      queue.getJob.mockResolvedValue(null);
      prisma.recurringTemplate.delete.mockResolvedValue(makeTemplate());

      await expect(service.remove(TEMPLATE_ID, USER_ID)).resolves.toBeUndefined();
      expect(prisma.recurringTemplate.delete).toHaveBeenCalled();
    });

    it('throws NotFoundException when template does not exist', async () => {
      prisma.recurringTemplate.findUnique.mockResolvedValue(null);

      await expect(service.remove(TEMPLATE_ID, USER_ID)).rejects.toThrow(NotFoundException);
      expect(prisma.recurringTemplate.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when user is not a group member', async () => {
      prisma.recurringTemplate.findUnique.mockResolvedValue(makeTemplate());
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.remove(TEMPLATE_ID, USER_ID)).rejects.toThrow(ForbiddenException);
      expect(prisma.recurringTemplate.delete).not.toHaveBeenCalled();
    });
  });
});

jest.mock('@nestjs/bullmq', () => ({
  Processor: () => () => {},
  WorkerHost: class { async process(_job: unknown): Promise<void> {} },
  InjectQueue: () => () => {},
}));

import { RecurringExpenseWorker } from './recurring-expense.worker';
import { PrismaService } from '../common/prisma/prisma.service';

const TEMPLATE_ID = 'tmpl-uuid';
const GROUP_ID = 'grp-uuid';

function makeMockPrisma() {
  return {
    recurringTemplate: { findUnique: jest.fn(), update: jest.fn() },
    groupMember: { findMany: jest.fn(), findFirst: jest.fn() },
    group: { findUnique: jest.fn() },
    expense: { create: jest.fn() },
  };
}

function makeTemplate(overrides = {}) {
  return {
    id: TEMPLATE_ID,
    groupId: GROUP_ID,
    description: 'Rent',
    amount: 500,
    frequency: 'MONTHLY',
    isActive: true,
    memberIds: [],
    nextDue: new Date('2026-05-01'),
    ...overrides,
  };
}

function makeWorker(prisma: ReturnType<typeof makeMockPrisma>) {
  const queue = { add: jest.fn() } as any;
  return new RecurringExpenseWorker(prisma as unknown as PrismaService, queue);
}

function makeJob(templateId = TEMPLATE_ID) {
  return { data: { templateId } } as any;
}

describe('RecurringExpenseWorker', () => {
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    prisma = makeMockPrisma();
  });

  afterEach(() => jest.clearAllMocks());

  it('skips processing when template is not found', async () => {
    prisma.recurringTemplate.findUnique.mockResolvedValue(null);
    const worker = makeWorker(prisma);

    await expect(worker.process(makeJob())).resolves.toBeUndefined();
    expect(prisma.expense.create).not.toHaveBeenCalled();
  });

  it('skips processing when template is inactive', async () => {
    prisma.recurringTemplate.findUnique.mockResolvedValue(makeTemplate({ isActive: false }));
    const worker = makeWorker(prisma);

    await expect(worker.process(makeJob())).resolves.toBeUndefined();
    expect(prisma.expense.create).not.toHaveBeenCalled();
  });

  it('skips processing when group is not found', async () => {
    prisma.recurringTemplate.findUnique.mockResolvedValue(makeTemplate());
    prisma.groupMember.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.group.findUnique.mockResolvedValue(null);
    const worker = makeWorker(prisma);

    await expect(worker.process(makeJob())).resolves.toBeUndefined();
    expect(prisma.expense.create).not.toHaveBeenCalled();
  });

  it('skips processing when creator member is not found', async () => {
    prisma.recurringTemplate.findUnique.mockResolvedValue(makeTemplate());
    prisma.groupMember.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.group.findUnique.mockResolvedValue({ id: GROUP_ID, currency: 'XLM' });
    prisma.groupMember.findFirst.mockResolvedValue(null);
    const worker = makeWorker(prisma);

    await expect(worker.process(makeJob())).resolves.toBeUndefined();
    expect(prisma.expense.create).not.toHaveBeenCalled();
  });

  it('creates expense, advances nextDue, and schedules next job', async () => {
    prisma.recurringTemplate.findUnique.mockResolvedValue(makeTemplate());
    prisma.groupMember.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
    prisma.group.findUnique.mockResolvedValue({ id: GROUP_ID, currency: 'XLM' });
    prisma.groupMember.findFirst.mockResolvedValue({ userId: 'u1' });
    prisma.expense.create.mockResolvedValue({ id: 'exp-1' });
    prisma.recurringTemplate.update.mockResolvedValue({});

    const queue = { add: jest.fn() };
    const worker = new RecurringExpenseWorker(prisma as unknown as PrismaService, queue as any);

    await expect(worker.process(makeJob())).resolves.toBeUndefined();

    expect(prisma.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: '[Recurring] Rent',
          groupId: GROUP_ID,
          splitType: 'EQUAL',
        }),
      }),
    );
    expect(prisma.recurringTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TEMPLATE_ID } }),
    );
    expect(queue.add).toHaveBeenCalledWith(
      'process-recurring',
      { templateId: TEMPLATE_ID },
      expect.objectContaining({ jobId: `recurring-${TEMPLATE_ID}` }),
    );
  });

  it('uses memberIds from template when non-empty', async () => {
    prisma.recurringTemplate.findUnique.mockResolvedValue(makeTemplate({ memberIds: ['u-specific'] }));
    prisma.group.findUnique.mockResolvedValue({ id: GROUP_ID, currency: 'XLM' });
    prisma.groupMember.findFirst.mockResolvedValue({ userId: 'u-specific' });
    prisma.expense.create.mockResolvedValue({ id: 'exp-2' });
    prisma.recurringTemplate.update.mockResolvedValue({});

    const queue = { add: jest.fn() };
    const worker = new RecurringExpenseWorker(prisma as unknown as PrismaService, queue as any);
    await worker.process(makeJob());

    // findMany should NOT be called — members come from template
    expect(prisma.groupMember.findMany).not.toHaveBeenCalled();
    expect(prisma.expense.create).toHaveBeenCalled();
  });
});

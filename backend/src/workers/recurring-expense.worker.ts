import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';

interface RecurringJobData {
  templateId: string;
}

const FREQUENCY_MS: Record<string, number> = {
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
  MONTHLY: 30 * 24 * 60 * 60 * 1000,
  YEARLY: 365 * 24 * 60 * 60 * 1000,
};

@Processor('recurring-expenses')
export class RecurringExpenseWorker extends WorkerHost {
  private readonly logger = new Logger(RecurringExpenseWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('recurring-expenses') private readonly recurringQueue: Queue,
    private readonly events: EventsService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<RecurringJobData>): Promise<void> {
    const { templateId } = job.data;
    const template = await this.prisma.recurringTemplate.findUnique({ where: { id: templateId } });

    if (!template || !template.isActive) {
      this.logger.log({ templateId }, 'Recurring template not found or inactive — skipping');
      return;
    }

    // Create the expense
    const memberIds = template.memberIds.length > 0
      ? template.memberIds
      : (await this.prisma.groupMember.findMany({ where: { groupId: template.groupId }, select: { userId: true } }))
          .map((m) => m.userId);

    const group = await this.prisma.group.findUnique({ where: { id: template.groupId } });
    if (!group) return;

    // Auto-create expense (paidBy = group creator)
    const creator = await this.prisma.groupMember.findFirst({
      where: { groupId: template.groupId, role: 'CREATOR' },
    });
    if (!creator) return;

    const perPerson = Number(template.amount) / memberIds.length;

    await this.prisma.expense.create({
      data: {
        groupId: template.groupId,
        description: `[Recurring] ${template.description}`,
        amount: template.amount,
        currency: group.currency,
        paidById: creator.userId,
        splitType: 'EQUAL',
        splits: { create: memberIds.map((uid) => ({ userId: uid, amount: perPerson })) },
      },
    });

    // Advance nextDue
    const intervalMs = FREQUENCY_MS[template.frequency] ?? FREQUENCY_MS.MONTHLY;
    const nextDue = new Date(template.nextDue.getTime() + intervalMs);
    await this.prisma.recurringTemplate.update({ where: { id: templateId }, data: { nextDue } });

    // Schedule next run
    await this.recurringQueue.add(
      'process-recurring',
      { templateId },
      { delay: intervalMs, jobId: `recurring-${templateId}` },
    );

    this.logger.log({ templateId, nextDue }, 'Recurring expense auto-created; next run scheduled');

    // SSE gerçek zamanlı bildirim
    this.events.publish({
      groupId: template.groupId,
      type: 'recurring:triggered',
      payload: { description: template.description, amount: String(template.amount) },
      ts: Date.now(),
    });

    // Tüm grup üyelerine kalıcı bildirim gönder
    for (const memberId of memberIds) {
      this.notifications.dispatch(memberId, 'RECURRING_TRIGGERED', {
        groupId: template.groupId,
        description: template.description,
        amount: String(template.amount),
      }).catch((err: unknown) =>
        this.logger.warn({ memberId, err: String(err) }, 'Recurring notification dispatch failed'),
      );
    }
  }
}

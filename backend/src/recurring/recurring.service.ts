import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('recurring-expenses') private readonly recurringQueue: Queue,
  ) {}

  async findByGroup(groupId: string, userId: string) {
    await this.assertMember(groupId, userId);
    return this.prisma.recurringTemplate.findMany({
      where: { groupId },
      orderBy: { nextDue: 'asc' },
    });
  }

  async create(userId: string, dto: CreateRecurringDto) {
    await this.assertMember(dto.groupId, userId);

    // Resolve member wallets to IDs
    let memberIds: string[] = [];
    if (dto.members?.length) {
      const users = await this.prisma.user.findMany({
        where: { walletAddress: { in: dto.members } },
        select: { id: true },
      });
      memberIds = users.map((u) => u.id);
    }

    const template = await this.prisma.recurringTemplate.create({
      data: {
        groupId: dto.groupId,
        description: dto.description,
        amount: dto.amount,
        frequency: dto.frequency as any,
        nextDue: new Date(dto.nextDue),
        memberIds,
      },
    });

    // Schedule BullMQ repeatable job
    await this.recurringQueue.add(
      'process-recurring',
      { templateId: template.id },
      {
        delay: Math.max(0, new Date(dto.nextDue).getTime() - Date.now()),
        jobId: `recurring-${template.id}`,
      },
    );

    this.logger.log({ templateId: template.id, groupId: dto.groupId }, 'Recurring template created');
    return template;
  }

  async update(templateId: string, userId: string, updates: Partial<CreateRecurringDto>) {
    const template = await this.getTemplate(templateId);
    await this.assertMember(template.groupId, userId);
    return this.prisma.recurringTemplate.update({
      where: { id: templateId },
      data: {
        ...(updates.description ? { description: updates.description } : {}),
        ...(updates.amount ? { amount: updates.amount } : {}),
        ...(updates.frequency ? { frequency: updates.frequency as any } : {}),
        ...(updates.nextDue ? { nextDue: new Date(updates.nextDue) } : {}),
      },
    });
  }

  async remove(templateId: string, userId: string) {
    const template = await this.getTemplate(templateId);
    await this.assertMember(template.groupId, userId);
    // Remove scheduled job
    const job = await this.recurringQueue.getJob(`recurring-${templateId}`);
    if (job) await job.remove();
    await this.prisma.recurringTemplate.delete({ where: { id: templateId } });
    this.logger.log({ templateId, deletedBy: userId }, 'Recurring template deleted');
  }

  private async getTemplate(id: string) {
    const t = await this.prisma.recurringTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Recurring template not found');
    return t;
  }

  private async assertMember(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a member of this group');
    return member;
  }
}

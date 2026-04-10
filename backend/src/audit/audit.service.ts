import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { scrub } from './helpers/scrub.helper';

export interface AuditContext {
  actorType: 'user' | 'system';
  actorId?: string;
  actorWallet?: string;
  groupId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditEvent {
  entityType: 'group' | 'expense' | 'settlement' | 'member' | 'guardian' | 'recurring';
  entityId: string;
  action: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append an audit log entry. Fire-and-forget — errors are logged but never
   * propagate to the caller so they don't block the main request flow.
   */
  log(ctx: AuditContext, event: AuditEvent): void {
    this.prisma.auditLog
      .create({
        data: {
          actorType: ctx.actorType,
          actorId: ctx.actorId ?? null,
          actorWallet: ctx.actorWallet ?? null,
          groupId: ctx.groupId ?? null,
          entityType: event.entityType,
          entityId: event.entityId,
          action: event.action,
          beforeState: event.beforeState ? (scrub(event.beforeState) as object) : undefined,
          afterState: event.afterState ? (scrub(event.afterState) as object) : undefined,
          ipAddress: ctx.ipAddress ?? null,
          userAgent: ctx.userAgent ?? null,
          metadata: event.metadata ? (event.metadata as object) : undefined,
        },
      })
      .catch((err: unknown) =>
        this.logger.error({ err: String(err), action: event.action }, 'Audit log write failed'),
      );
  }

  async findByGroup(
    groupId: string,
    opts: { cursor?: string; limit?: number; entityType?: string; action?: string },
  ) {
    const take = Math.min(opts.limit ?? 50, 200);
    const logs = await this.prisma.auditLog.findMany({
      where: {
        groupId,
        ...(opts.entityType ? { entityType: opts.entityType } : {}),
        ...(opts.action ? { action: opts.action } : {}),
      },
      take: take + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = logs.length > take;
    const items = hasMore ? logs.slice(0, take) : logs;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : undefined, hasMore };
  }
}

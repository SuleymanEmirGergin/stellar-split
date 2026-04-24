/**
 * Dead-Letter Queue (DLQ) Worker
 * ─────────────────────────────────────────────────────────────
 * BullMQ moves jobs to the `failed` state after all retry attempts
 * are exhausted.  This worker listens on the dedicated `dlq` queue
 * and provides:
 *
 *   1. Structured logging with full job metadata
 *   2. Audit trail in the database (AuditLog table)
 *   3. Prometheus counter increment (drives alertmanager rule)
 *   4. Optional Slack/webhook alert (if ALERT_WEBHOOK_URL is set)
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, UnrecoverableError } from 'bullmq';
import { Counter } from 'prom-client';
import { PrismaService } from '../common/prisma/prisma.service';
import { metricsRegistry } from '../common/observability/metrics';

export interface DlqJobData {
  /** Original queue the job came from */
  sourceQueue: string;
  /** Original job ID */
  sourceJobId: string;
  /** Original job name */
  sourceJobName: string;
  /** Original job data (any shape) */
  payload: unknown;
  /** Error message that caused exhaustion */
  failReason: string;
  /** ISO timestamp of original failure */
  failedAt: string;
}

// Singleton counter — registered once in the module-level registry
const dlqCounter = new Counter({
  name: 'stellarsplit_dlq_jobs_total',
  help: 'Total number of jobs moved to the Dead Letter Queue',
  labelNames: ['source_queue', 'job_name'],
  registers: [metricsRegistry],
});

@Processor('dlq')
export class DlqWorker extends WorkerHost {
  private readonly logger = new Logger(DlqWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<DlqJobData>): Promise<void> {
    const { sourceQueue, sourceJobId, sourceJobName, payload, failReason, failedAt } = job.data;

    this.logger.error(
      { sourceQueue, sourceJobId, sourceJobName, failReason, failedAt },
      '[DLQ] Job exhausted all retries — recording for manual inspection',
    );

    // Increment Prometheus counter (drives alertmanager rule)
    dlqCounter.inc({ source_queue: sourceQueue, job_name: sourceJobName });

    // Persist to audit log for ops visibility
    await this.prisma.auditLog
      .create({
        data: {
          actorType: 'system',
          actorId: null,
          actorWallet: null,
          entityType: 'QUEUE_JOB',
          entityId: sourceJobId,
          action: 'JOB_MOVED_TO_DLQ',
          afterState: {
            sourceQueue,
            sourceJobName,
            // Cast `unknown` payload to a JSON-serialisable shape for Prisma
            payload: payload as import('@prisma/client').Prisma.InputJsonValue,
            failReason,
            failedAt,
          },
        },
      })
      .catch((err: unknown) =>
        this.logger.warn({ err: String(err) }, 'DLQ: failed to persist audit log entry'),
      );

    // Optional webhook alert (Slack / PagerDuty / custom)
    const webhookUrl = this.config.get<string>('ALERT_WEBHOOK_URL');
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 *DLQ Alert* — Job \`${sourceJobName}\` from queue \`${sourceQueue}\` exhausted all retries.\n> ${failReason}`,
          source_job_id: sourceJobId,
          failed_at: failedAt,
        }),
      }).catch((err: unknown) =>
        this.logger.warn({ err: String(err) }, 'DLQ: webhook alert delivery failed'),
      );
    }

    // Mark as unrecoverable so BullMQ moves it to `failed` without further retries
    throw new UnrecoverableError('DLQ entry processed — manual investigation required');
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<DlqJobData> | undefined, err: Error): void {
    this.logger.log(
      { jobId: job?.id, err: err.message },
      '[DLQ] Job preserved in failed state — available for manual replay via Bull Board',
    );
  }
}

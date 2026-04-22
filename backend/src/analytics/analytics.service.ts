import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../common/prisma/prisma.service';

export class TrackEventDto {
  event: string;
  userId?: string;
  payload?: Record<string, unknown>;
}

export interface DauTrendPoint {
  /** ISO date (YYYY-MM-DD) */
  date: string;
  count: number;
}

export interface AnalyticsSummary {
  totalGroups: number;
  totalMembers: number;
  totalExpenses: number;
  totalSettled: number;
  /** Sum of confirmed settlement amounts, in XLM (decimal) */
  totalVolumeXlm: number;
  dau: number;
  wau: number;
  mau: number;
  /** DAU per day for the last 14 days (ascending by date) */
  dauTrend: DauTrendPoint[];
  /** ISO timestamp when this summary was computed */
  lastUpdated: string;
}

/** Cache TTL for /analytics/summary (ms) */
const SUMMARY_CACHE_TTL = 60_000;
const SUMMARY_CACHE_KEY = 'analytics:summary:v1';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async track(dto: TrackEventDto) {
    // Fire-and-forget — don't await in controller
    this.prisma.analyticsEvent
      .create({ data: { event: dto.event, userId: dto.userId, payload: dto.payload as object } })
      .then(() => this.logger.log({ event: dto.event }, 'Analytics event tracked'))
      .catch((err: unknown) => this.logger.warn({ err: String(err) }, 'Analytics event storage failed'));
  }

  /**
   * Returns aggregated public stats for the dashboard.
   * Result is cached in Redis for 60 seconds.
   *
   * Active-user definition (for DAU/WAU/MAU): a user who appears as
   * `paidById` on any Expense or `settledById` on any Settlement within the
   * rolling window. Groups the user only created but never interacted with
   * financially within the window are intentionally excluded — this matches
   * the "activity-based" definition rather than "presence".
   */
  async getSummary(): Promise<AnalyticsSummary> {
    const cached = await this.cache.get<AnalyticsSummary>(SUMMARY_CACHE_KEY);
    if (cached) return cached;

    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const since24h = new Date(now.getTime() - day);
    const since7d = new Date(now.getTime() - 7 * day);
    const since30d = new Date(now.getTime() - 30 * day);
    // 14-day trend — include today, so span = 13 days back
    const since14d = new Date(now.getTime() - 14 * day);

    const [
      totalGroups,
      totalMembers,
      totalExpenses,
      totalSettled,
      volumeAgg,
      dau,
      wau,
      mau,
      trendRows,
    ] = await Promise.all([
      this.prisma.group.count(),
      this.prisma.user.count({ where: { groupMemberships: { some: {} } } }),
      this.prisma.expense.count(),
      this.prisma.settlement.count({ where: { status: 'CONFIRMED' } }),
      this.prisma.settlement.aggregate({
        _sum: { amount: true },
        where: { status: 'CONFIRMED' },
      }),
      this.countActiveUsers(since24h),
      this.countActiveUsers(since7d),
      this.countActiveUsers(since30d),
      this.fetchDauTrend(since14d),
    ]);

    const totalVolumeXlm = volumeAgg._sum.amount ? Number(volumeAgg._sum.amount) : 0;

    const summary: AnalyticsSummary = {
      totalGroups,
      totalMembers,
      totalExpenses,
      totalSettled,
      totalVolumeXlm,
      dau,
      wau,
      mau,
      dauTrend: trendRows,
      lastUpdated: now.toISOString(),
    };

    try {
      await this.cache.set(SUMMARY_CACHE_KEY, summary, SUMMARY_CACHE_TTL);
    } catch (err: unknown) {
      this.logger.warn({ err: String(err) }, 'Failed to cache analytics summary');
    }

    return summary;
  }

  /**
   * Distinct users with expense or settlement activity since `since`.
   * We union the two disjoint sets in-memory — cheaper than a raw CTE and
   * keeps everything type-safe.
   */
  private async countActiveUsers(since: Date): Promise<number> {
    const [expenseActors, settlementActors] = await Promise.all([
      this.prisma.expense.findMany({
        where: { createdAt: { gte: since } },
        select: { paidById: true },
        distinct: ['paidById'],
      }),
      this.prisma.settlement.findMany({
        where: { timestamp: { gte: since } },
        select: { settledById: true },
        distinct: ['settledById'],
      }),
    ]);

    const set = new Set<string>();
    for (const row of expenseActors) set.add(row.paidById);
    for (const row of settlementActors) set.add(row.settledById);
    return set.size;
  }

  /**
   * Returns the last 14 days of DAU counts (including today), ascending by
   * date. A single `$queryRaw` groups by calendar day in UTC and unions the
   * two activity sources, deduplicating per day.
   */
  private async fetchDauTrend(since: Date): Promise<DauTrendPoint[]> {
    type Row = { day: Date; count: bigint };
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT day, COUNT(DISTINCT actor_id)::bigint AS count FROM (
        SELECT DATE_TRUNC('day', "createdAt") AS day, "paidById" AS actor_id
        FROM "Expense"
        WHERE "createdAt" >= ${since}
        UNION ALL
        SELECT DATE_TRUNC('day', "timestamp") AS day, "settledById" AS actor_id
        FROM "Settlement"
        WHERE "timestamp" >= ${since}
      ) AS activity
      GROUP BY day
      ORDER BY day ASC
    `;

    // Backfill any missing days with zero so the frontend can render a
    // continuous 14-point series without null-handling.
    const byDay = new Map<string, number>();
    for (const row of rows) {
      byDay.set(this.toIsoDate(row.day), Number(row.count));
    }

    const series: DauTrendPoint[] = [];
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(startOfToday.getTime() - i * 24 * 60 * 60 * 1000);
      const iso = this.toIsoDate(d);
      series.push({ date: iso, count: byDay.get(iso) ?? 0 });
    }
    return series;
  }

  private toIsoDate(d: Date): string {
    // YYYY-MM-DD in UTC
    return d.toISOString().slice(0, 10);
  }
}

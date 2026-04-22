import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * Public `SPLT holder` leaderboard.
 *
 * "SPLT balance" here == number of confirmed settlements a user has
 * initiated × 100 (each successful `settle_group` call mints 100 SPLT to
 * the settler via an inter-contract call). Using settlement counts as a
 * proxy for on-chain balance keeps the backend authoritative without
 * needing a Horizon/Soroban account-balance round trip per leaderboard
 * render — and stays consistent whether or not the reward token is
 * deployed at a given moment.
 */

/** SPLT awarded per confirmed settle_group call. Matches the contract. */
const SPLT_PER_SETTLEMENT = 100;

/** Default leaderboard length returned to the public client. */
const DEFAULT_LIMIT = 10;

/** How many entries we pre-compute and cache (≥ DEFAULT_LIMIT, for varying page sizes). */
const CACHE_POOL_SIZE = 50;

/** Cache TTL — 5 minutes. Leaderboard churns slowly vs /summary. */
const LEADERBOARD_CACHE_TTL = 5 * 60 * 1000;
const LEADERBOARD_CACHE_KEY = 'analytics:leaderboard:v1';

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  settlementsInitiated: number;
  spltBalance: number;
  totalVolumeXlm: number;
}

export interface LeaderboardResponse {
  top: LeaderboardEntry[];
  /** Populated when `?wallet=G...` is provided and the user is outside the top slice. */
  yourRank?: LeaderboardEntry;
  lastUpdated: string;
}

interface CachedPool {
  entries: LeaderboardEntry[];
  lastUpdated: string;
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Fetches the top N settlers + optionally the querying user's own rank.
   * If the requester supplied their wallet and they're not in the top N,
   * their rank is computed separately and returned under `yourRank` so the
   * UI can show "you're #47".
   */
  async getLeaderboard(opts: { wallet?: string; limit?: number } = {}): Promise<LeaderboardResponse> {
    const limit = clampLimit(opts.limit);
    const pool = await this.getCachedPool();
    const top = pool.entries.slice(0, limit);

    let yourRank: LeaderboardEntry | undefined;
    if (opts.wallet) {
      const inTop = top.find((e) => e.walletAddress === opts.wallet);
      if (inTop) {
        yourRank = inTop;
      } else {
        const computed = await this.computeUserRank(opts.wallet);
        if (computed) yourRank = computed;
      }
    }

    return { top, yourRank, lastUpdated: pool.lastUpdated };
  }

  /** Returns the cached pool, (re-)building it from Prisma on cache miss. */
  private async getCachedPool(): Promise<CachedPool> {
    const cached = await this.cache.get<CachedPool>(LEADERBOARD_CACHE_KEY);
    if (cached) return cached;

    const grouped = await this.prisma.settlement.groupBy({
      by: ['settledById'],
      where: { status: 'CONFIRMED' },
      _count: { _all: true },
      _sum: { amount: true },
      orderBy: { _count: { settledById: 'desc' } },
      take: CACHE_POOL_SIZE,
    });

    // Resolve wallet addresses from User table
    const userIds = grouped.map((g) => g.settledById).filter((id): id is string => !!id);
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, walletAddress: true },
        })
      : [];
    const addressById = new Map(users.map((u) => [u.id, u.walletAddress]));

    const entries: LeaderboardEntry[] = grouped
      .filter((g) => g.settledById && addressById.has(g.settledById))
      .map((g, idx) => ({
        rank: idx + 1,
        walletAddress: addressById.get(g.settledById!) ?? 'unknown',
        settlementsInitiated: g._count._all,
        spltBalance: g._count._all * SPLT_PER_SETTLEMENT,
        totalVolumeXlm: toNumber(g._sum.amount),
      }));

    const pool: CachedPool = { entries, lastUpdated: new Date().toISOString() };
    await this.cache.set(LEADERBOARD_CACHE_KEY, pool, LEADERBOARD_CACHE_TTL);
    this.logger.debug(`Rebuilt leaderboard pool: ${entries.length} entries`);
    return pool;
  }

  /** Computes a single user's rank by counting users ahead of them. */
  private async computeUserRank(walletAddress: string): Promise<LeaderboardEntry | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { walletAddress },
      select: { id: true },
    });
    if (!user) return undefined;

    const myCount = await this.prisma.settlement.count({
      where: { settledById: user.id, status: 'CONFIRMED' },
    });
    if (myCount === 0) return undefined;

    // Users with *strictly more* confirmed settlements than me are ranked ahead.
    // Use groupBy + count to get the number of such users, not total settlement rows.
    const higherGroups = await this.prisma.settlement.groupBy({
      by: ['settledById'],
      where: { status: 'CONFIRMED' },
      _count: { _all: true },
      having: { settledById: { _count: { gt: myCount } } },
    });
    const rank = higherGroups.length + 1;

    const mySum = await this.prisma.settlement.aggregate({
      where: { settledById: user.id, status: 'CONFIRMED' },
      _sum: { amount: true },
    });

    return {
      rank,
      walletAddress,
      settlementsInitiated: myCount,
      spltBalance: myCount * SPLT_PER_SETTLEMENT,
      totalVolumeXlm: toNumber(mySum._sum.amount),
    };
  }
}

function clampLimit(limit: number | undefined): number {
  if (!limit || limit < 1) return DEFAULT_LIMIT;
  return Math.min(limit, CACHE_POOL_SIZE);
}

/** Prisma Decimal → number (nullable-safe). */
function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

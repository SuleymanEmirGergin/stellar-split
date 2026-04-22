import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Trophy, Medal, Award, ExternalLink } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useAppStore } from '../store/useAppStore';
import { analyticsApi, type LeaderboardEntry, type LeaderboardResponse } from '../lib/api';

/**
 * Public `/leaderboard` page — top SPLT holders on Birik.
 *
 * "SPLT balance" is derived server-side from confirmed `settle_group`
 * calls × 100 (the inter-contract mint amount). Using settle count as a
 * proxy keeps the ranking authoritative without a per-request on-chain
 * balance lookup per wallet.
 *
 * If the viewer's wallet is connected, the API returns `yourRank` which
 * shows their position whether or not they're in the top 10 — good
 * gamification loop ("you're #47, only 3 settlements away from #10").
 */
export default function LeaderboardPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const walletAddress = useAppStore((s) => s.walletAddress);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', 'leaderboard', walletAddress ?? 'anon'],
    queryFn: async () => {
      const res = await analyticsApi.leaderboard({ wallet: walletAddress ?? undefined });
      return res.data;
    },
    // Server caches 5 min; refetch every 6 min on client so we're always
    // within ~1 min of server truth.
    staleTime: 5 * 60_000,
    refetchInterval: 6 * 60_000,
  });

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        {/* Header */}
        <header className="mb-10">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
            data-testid="leaderboard-back"
          >
            <ArrowLeft size={16} />
            {t('leaderboard.back_to_home')}
          </button>

          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-amber-400/15 text-amber-300 flex items-center justify-center">
              <Trophy size={22} />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight mb-2">
                {t('leaderboard.title')}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
                {t('leaderboard.subtitle')}
              </p>
            </div>
          </div>
        </header>

        {/* Body */}
        {isError && <ErrorBanner />}
        {!isError && isLoading && <LeaderboardSkeleton />}
        {!isError && !isLoading && data && <LeaderboardBody data={data} viewerWallet={walletAddress} />}

        {/* CTA */}
        <footer className="mt-12 pt-8 border-t border-edge text-center">
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-[0.2em] font-bold">
            {t('leaderboard.want_in_cta')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-birik"
            data-testid="leaderboard-cta"
          >
            {t('leaderboard.start_settling')}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ErrorBanner() {
  const { t } = useI18n();
  return (
    <div
      data-testid="leaderboard-error"
      className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 text-sm text-rose-300"
    >
      {t('leaderboard.error')}
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div
      data-testid="leaderboard-skeleton"
      aria-busy="true"
      className="space-y-2"
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
      ))}
    </div>
  );
}

function LeaderboardBody({
  data,
  viewerWallet,
}: {
  data: LeaderboardResponse;
  viewerWallet: string | null;
}) {
  const { t } = useI18n();

  if (data.top.length === 0) {
    return (
      <div
        data-testid="leaderboard-empty"
        className="rounded-2xl border border-white/[0.07] bg-card/40 p-8 text-center"
      >
        <p className="text-sm text-muted-foreground">{t('leaderboard.empty_state')}</p>
      </div>
    );
  }

  // Show yourRank row only when the viewer is NOT inside the top slice
  const inTop = data.top.some((e) => e.walletAddress === viewerWallet);
  const showYourRankRow = data.yourRank && !inTop;

  return (
    <>
      {/* Header row */}
      <div className="hidden md:grid grid-cols-12 gap-3 px-4 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        <div className="col-span-1">{t('leaderboard.rank_label')}</div>
        <div className="col-span-5">{t('leaderboard.address_label')}</div>
        <div className="col-span-2 text-right">{t('leaderboard.settlements_label')}</div>
        <div className="col-span-2 text-right">{t('leaderboard.splt_label')}</div>
        <div className="col-span-2 text-right">{t('leaderboard.volume_label')}</div>
      </div>

      {/* Rows */}
      <div className="space-y-2" data-testid="leaderboard-list">
        {data.top.map((e) => (
          <LeaderboardRow
            key={e.walletAddress}
            entry={e}
            isViewer={e.walletAddress === viewerWallet}
          />
        ))}
      </div>

      {/* Your rank (if outside top) */}
      {showYourRankRow && data.yourRank && (
        <div className="mt-6" data-testid="leaderboard-your-rank">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-birik mb-2 px-4">
            {t('leaderboard.your_rank_label')}
          </div>
          <LeaderboardRow entry={data.yourRank} isViewer={true} highlighted={true} />
        </div>
      )}

      {/* Last updated */}
      <div className="mt-6 text-[10px] font-mono text-muted-foreground text-right">
        {t('leaderboard.last_updated')}:{' '}
        <time dateTime={data.lastUpdated}>{new Date(data.lastUpdated).toLocaleString()}</time>
      </div>
    </>
  );
}

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function rankIcon(rank: number) {
  if (rank === 1) return <Trophy size={14} className="text-amber-400" />;
  if (rank === 2) return <Medal size={14} className="text-slate-300" />;
  if (rank === 3) return <Award size={14} className="text-amber-600" />;
  return null;
}

function LeaderboardRow({
  entry,
  isViewer,
  highlighted = false,
}: {
  entry: LeaderboardEntry;
  isViewer: boolean;
  highlighted?: boolean;
}) {
  const icon = rankIcon(entry.rank);
  const bgClass = highlighted
    ? 'bg-birik/10 border-birik/30'
    : isViewer
      ? 'bg-indigo-500/5 border-indigo-500/20'
      : 'bg-card/40 border-white/[0.05]';

  return (
    <a
      href={`https://stellar.expert/explorer/testnet/account/${entry.walletAddress}`}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={`leaderboard-row-${entry.rank}`}
      className={`grid grid-cols-12 gap-2 md:gap-3 items-center px-4 py-3 rounded-xl border ${bgClass} hover:bg-white/[0.06] transition-colors group`}
    >
      <div className="col-span-2 md:col-span-1 flex items-center gap-1.5 font-display text-xl font-black tabular-nums">
        {icon}
        <span className={entry.rank <= 3 ? 'text-foreground' : 'text-muted-foreground'}>
          {entry.rank}
        </span>
      </div>
      <div className="col-span-10 md:col-span-5 font-mono text-sm truncate flex items-center gap-1.5">
        {truncateAddress(entry.walletAddress)}
        <ExternalLink
          size={11}
          className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          aria-hidden="true"
        />
      </div>
      <div className="col-span-4 md:col-span-2 text-right text-sm tabular-nums">
        {entry.settlementsInitiated}
      </div>
      <div className="col-span-4 md:col-span-2 text-right font-display text-lg font-black tabular-nums text-birik">
        {entry.spltBalance.toLocaleString('tr-TR')}
      </div>
      <div className="col-span-4 md:col-span-2 text-right text-xs tabular-nums text-muted-foreground">
        {entry.totalVolumeXlm.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
      </div>
    </a>
  );
}

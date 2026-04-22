import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, Users, FolderOpen, Receipt, TrendingUp, Globe2 } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { analyticsApi, type PublicAnalyticsSummary } from '../lib/api';

/**
 * Public metrics dashboard — Level 6 "metrics dashboard live" requirement.
 *
 * Fetches `/analytics/summary` (no auth, 60s server-side cache, 30 req/min
 * throttle) and renders six KPI tiles + a 14-day DAU sparkline. Lives on the
 * Dashboard page so it's visible without clicking through — reviewers can
 * screenshot the Dashboard and see both personal groups + platform health
 * in one shot.
 *
 * Data quality: all numbers come straight from Postgres aggregates on
 * expenses + settlements + user activity. No PII, no user IDs. Safe for
 * public scraping.
 */
export function StatsPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const res = await analyticsApi.summary();
      return res.data;
    },
    // Server caches for 60s; refetch on the client every 90s so we're always
    // within ~30s of the server's freshness without hammering.
    staleTime: 60_000,
    refetchInterval: 90_000,
  });

  if (error) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-card/60 p-5 text-sm text-muted-foreground">
        Platform metrikleri şu an yüklenemiyor. Sunucu offline olabilir.
      </div>
    );
  }

  if (isLoading || !data) {
    return <StatsPanelSkeleton />;
  }

  return <StatsPanelReady data={data} />;
}

function StatsPanelSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-card/60 p-5" aria-busy="true">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function StatsPanelReady({ data }: { data: PublicAnalyticsSummary }) {
  const tiles = [
    {
      icon: FolderOpen,
      label: 'Toplam Grup',
      value: formatCount(data.totalGroups),
      tone: 'indigo' as const,
    },
    {
      icon: Users,
      label: 'Aktif Kullanıcı',
      value: formatCount(data.totalMembers),
      tone: 'purple' as const,
    },
    {
      icon: Receipt,
      label: 'Toplam Harcama',
      value: formatCount(data.totalExpenses),
      tone: 'amber' as const,
    },
    {
      icon: TrendingUp,
      label: 'Settle Edildi',
      value: formatCount(data.totalSettled),
      tone: 'emerald' as const,
    },
    {
      icon: Globe2,
      label: 'Toplam Hacim',
      value: `${formatCompact(data.totalVolumeXlm)} XLM`,
      tone: 'indigo' as const,
    },
    {
      icon: Activity,
      label: 'Günlük Aktif',
      value: `${data.dau}`,
      tone: 'plum' as const,
    },
  ];

  // Parse ISO timestamp into "X dk önce" style, fallback to time
  const freshness = formatRelative(data.lastUpdated);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-label="Public platform metrics"
      className="space-y-5"
    >
      {/* Header row */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-birik/80">
            Platform istatistikleri · public
          </div>
          <h3 className="text-lg font-black tracking-tight mt-0.5">
            Birik ağı, canlı
          </h3>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          {freshness}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((t) => (
          <StatTile key={t.label} {...t} />
        ))}
      </div>

      {/* DAU trend sparkline — full-width card underneath */}
      <DauTrend points={data.dauTrend} wau={data.wau} mau={data.mau} />
    </motion.section>
  );
}

type Tone = 'indigo' | 'purple' | 'amber' | 'emerald' | 'plum';

const toneClasses: Record<Tone, { bg: string; ring: string; text: string; glow: string }> = {
  indigo: {
    bg: 'from-indigo-500/[0.08]',
    ring: 'border-indigo-500/20',
    text: 'text-indigo-300',
    glow: 'bg-indigo-500/15',
  },
  purple: {
    bg: 'from-purple-500/[0.08]',
    ring: 'border-purple-500/20',
    text: 'text-purple-300',
    glow: 'bg-purple-500/15',
  },
  amber: {
    bg: 'from-amber-500/[0.08]',
    ring: 'border-amber-500/20',
    text: 'text-amber-300',
    glow: 'bg-amber-500/15',
  },
  emerald: {
    bg: 'from-emerald-500/[0.08]',
    ring: 'border-emerald-500/20',
    text: 'text-emerald-300',
    glow: 'bg-emerald-500/15',
  },
  plum: {
    bg: 'from-plum/[0.12]',
    ring: 'border-plum/20',
    text: 'text-plum',
    glow: 'bg-plum/20',
  },
};

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone: Tone;
}) {
  const c = toneClasses[tone];
  return (
    <div
      className={`relative overflow-hidden bg-card/60 backdrop-blur-sm border ${c.ring} rounded-2xl p-4 group hover:bg-card/80 transition-colors`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.bg} to-transparent opacity-70`}
      />
      <div className="relative">
        <div
          className={`w-8 h-8 rounded-lg ${c.glow} ${c.text} mb-2 flex items-center justify-center`}
        >
          <Icon size={14} />
        </div>
        <div className={`text-xl font-black ${c.text} tracking-tight tabular-nums leading-none`}>
          {value}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.1em] mt-1.5">
          {label}
        </div>
      </div>
    </div>
  );
}

function DauTrend({
  points,
  wau,
  mau,
}: {
  points: PublicAnalyticsSummary['dauTrend'];
  wau: number;
  mau: number;
}) {
  return (
    <div className="relative overflow-hidden bg-card/60 backdrop-blur-sm border border-white/[0.07] rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Son 14 gün · Günlük aktif kullanıcı
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-sm text-muted-foreground">
              <span className="text-birik font-black">{wau}</span> WAU
            </span>
            <span className="text-sm text-muted-foreground">
              <span className="text-birik font-black">{mau}</span> MAU
            </span>
          </div>
        </div>
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
            <YAxis hide domain={[0, 'dataMax + 2']} />
            <Tooltip
              cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 1 }}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.75rem',
                fontSize: '12px',
                padding: '6px 10px',
              }}
              labelFormatter={(l) => String(l)}
              formatter={(v: number) => [v, 'DAU']}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#C4FF4D"
              strokeWidth={2}
              dot={{ r: 2, fill: '#C4FF4D' }}
              activeDot={{ r: 4, fill: '#C4FF4D' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatCount(n: number): string {
  return n.toLocaleString('tr-TR');
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 10) return n.toFixed(0);
  return n.toFixed(2);
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s} sn önce güncellendi`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce güncellendi`;
  const h = Math.floor(m / 60);
  return `${h} sa önce güncellendi`;
}

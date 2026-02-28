import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface DashboardChartsProps {
  /** Balance over time (mock or from API). Each item: { label: string, value: number }. */
  balanceHistory?: { label: string; value: number }[];
  /** Last 7 tx counts or amounts per day. */
  last7Tx?: { day: string; count: number }[];
  /** Fee distribution (e.g. [{ name: 'Settle', value: 0.01 }]). */
  feeDistribution?: { name: string; value: number }[];
  /** Asset distribution (e.g. [{ name: 'XLM', value: 100 }]). */
  assetDistribution?: { name: string; value: number }[];
  className?: string;
}

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function DashboardCharts({
  balanceHistory = [],
  last7Tx = [],
  feeDistribution = [],
  assetDistribution = [],
  className = '',
}: DashboardChartsProps) {
  const hasBalance = balanceHistory.length > 0;
  const hasTx = last7Tx.length > 0;
  const hasFees = feeDistribution.length > 0;
  const hasAssets = assetDistribution.length > 0;

  const defaultAsset = [{ name: 'XLM', value: 100 }];

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`.trim()}>
      {/* Balance change line chart */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Balance (last 7)</h4>
        {hasBalance ? (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={balanceHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={36} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${Number(v).toFixed(2)} XLM`, 'Balance']} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm rounded-xl border border-dashed border-border">
            No balance history yet
          </div>
        )}
      </div>

      {/* Last 7 transactions histogram */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Last 7 days (tx)</h4>
        {hasTx ? (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Tx} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={24} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm rounded-xl border border-dashed border-border">
            No transactions in the last 7 days
          </div>
        )}
      </div>

      {/* Fee distribution (small donut) */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Fee distribution</h4>
        {hasFees ? (
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={feeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={32} outerRadius={48} paddingAngle={2}>
                  {feeDistribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${Number(v).toFixed(4)} XLM`, 'Fee']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[140px] flex items-center justify-center text-muted-foreground text-sm rounded-xl border border-dashed border-border">
            No fee data yet
          </div>
        )}
      </div>

      {/* Asset distribution (XLM 100% when single asset) */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Assets</h4>
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={assetDistribution.length ? assetDistribution : defaultAsset} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={32} outerRadius={48} paddingAngle={0}>
                <Cell fill="hsl(var(--chart-1))" />
                {assetDistribution.length > 1 && assetDistribution.slice(1).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[(i + 1) % CHART_COLORS.length]} />
                ))}
              </PieChart>
              <Tooltip formatter={(v: number) => [`${Number(v)}%`, 'Share']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {!hasAssets && (
          <p className="text-[10px] text-muted-foreground text-center mt-1">XLM 100%</p>
        )}
      </div>
    </div>
  );
}

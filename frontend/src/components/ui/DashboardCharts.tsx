/**
 * Dashboard data viz: balance line, last 7 tx histogram, fee/asset distribution.
 * Uses Recharts; shows empty states when no data.
 */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

export interface BalancePoint {
  date: string;
  balance: number;
}

export interface TxByDay {
  day: string;
  count: number;
  amount?: number;
}

export interface DashboardChartsProps {
  balanceHistory?: BalancePoint[];
  txByDay?: TxByDay[];
  feeTotal?: number;
  assetLabel?: string;
  assetPercent?: number;
  className?: string;
}

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export function DashboardCharts({
  balanceHistory = [],
  txByDay = [],
  feeTotal = 0,
  assetLabel = 'XLM',
  assetPercent = 100,
  className = '',
}: DashboardChartsProps) {
  const hasBalance = balanceHistory.length > 0;
  const hasTx = txByDay.length > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Balance change line chart */}
      <div className="rounded-2xl border border-border bg-card/50 p-4">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Balance (last 7 days)
        </h4>
        {hasBalance ? (
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={balanceHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={36} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  formatter={(v: number) => [`${v.toFixed(2)} XLM`, 'Balance']}
                />
                <Line type="monotone" dataKey="balance" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm rounded-lg border border-dashed border-border">
            No balance history yet
          </div>
        )}
      </div>

      {/* Last 7 transactions histogram */}
      <div className="rounded-2xl border border-border bg-card/50 p-4">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Last 7 days (transactions)
        </h4>
        {hasTx ? (
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={txByDay} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={24} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {txByDay.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[140px] flex items-center justify-center text-muted-foreground text-sm rounded-lg border border-dashed border-border">
            No transactions in the last 7 days
          </div>
        )}
      </div>

      {/* Asset distribution (single asset placeholder) */}
      <div className="rounded-2xl border border-border bg-card/50 p-4">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Asset distribution
        </h4>
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full border-4 border-chart-1 flex items-center justify-center text-xs font-bold text-foreground"
            style={{ borderColor: 'hsl(var(--chart-1))' }}
          >
            {assetPercent}%
          </div>
          <div>
            <p className="font-bold text-foreground">{assetLabel}</p>
            <p className="text-xs text-muted-foreground">Single asset</p>
          </div>
        </div>
      </div>
    </div>
  );
}

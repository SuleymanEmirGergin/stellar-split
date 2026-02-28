import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import DonutChart from '../DonutChart';

export interface WalletChartsProps {
  /** Balance over time (e.g. last 7 points). Mock if no API. */
  balanceHistory?: { date: string; balance: number }[];
  /** Last 7 days tx count or amount per day. */
  txByDay?: { day: string; count: number; amount?: number }[];
  /** Fee totals per period (for fee distribution donut). */
  feeDistribution?: { label: string; value: number; color: string }[];
  /** Asset distribution (e.g. [{ label: 'XLM', value: 100, color: '#6366f1' }]). */
  assetDistribution?: { label: string; value: number; color: string }[];
  /** Translation function. */
  t?: (key: string) => string;
  className?: string;
}

const DEFAULT_BALANCE_HISTORY = [
  { date: 'Mon', balance: 1200 },
  { date: 'Tue', balance: 1180 },
  { date: 'Wed', balance: 1250 },
  { date: 'Thu', balance: 1220 },
  { date: 'Fri', balance: 1280 },
  { date: 'Sat', balance: 1240 },
  { date: 'Sun', balance: 1250 },
];

const DEFAULT_TX_BY_DAY = [
  { day: 'Mon', count: 2 },
  { day: 'Tue', count: 0 },
  { day: 'Wed', count: 3 },
  { day: 'Thu', count: 1 },
  { day: 'Fri', count: 2 },
  { day: 'Sat', count: 0 },
  { day: 'Sun', count: 1 },
];

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', '#22c55e', '#f59e0b'];

/** Tick text and tooltip readable on light and dark backgrounds */
const chartTextFill = 'hsl(var(--foreground))';
/** Day labels on X-axis: visible and distinct (e.g. Çar, Per) */
const chartDayFill = 'hsl(var(--primary))';

export function WalletCharts({
  balanceHistory = DEFAULT_BALANCE_HISTORY,
  txByDay = DEFAULT_TX_BY_DAY,
  feeDistribution = [],
  assetDistribution = [{ label: 'XLM', value: 100, color: 'hsl(var(--primary))' }],
  t = (k) => k,
  className = '',
}: WalletChartsProps) {
  const hasBalanceData = balanceHistory.length > 0;
  const formatDay = (val: string) => t(`charts.day_${val.toLowerCase()}`) || val;
  const hasTxData = txByDay.length > 0;
  const hasFeeData = feeDistribution.length > 0;
  const hasAssetData = assetDistribution.length > 0 && assetDistribution.some((a) => a.value > 0);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {/* Balance change line chart */}
      <div className="bg-card/50 border border-border rounded-2xl p-5 card-glass-hover">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          {t('charts.balance_history') || 'Balance (last 7)'}
        </h4>
        {hasBalanceData ? (
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={balanceHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border opacity-50" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartDayFill }} stroke={chartDayFill} tickFormatter={formatDay} />
                <YAxis tick={{ fontSize: 10, fill: chartTextFill }} stroke={chartTextFill} width={40} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', color: chartTextFill }}
                  labelStyle={{ fontWeight: 700, color: chartTextFill }}
                  labelFormatter={(label) => formatDay(String(label))}
                  formatter={(value: number) => [value.toFixed(2), 'XLM']}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
            {t('charts.empty_balance') || 'No balance history yet'}
          </div>
        )}
      </div>

      {/* Last 7 transactions histogram */}
      <div className="bg-card/50 border border-border rounded-2xl p-5 card-glass-hover">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          {t('charts.tx_last_7') || 'Transactions (last 7 days)'}
        </h4>
        {hasTxData ? (
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={txByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border opacity-50" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: chartDayFill }} stroke={chartDayFill} tickFormatter={formatDay} />
                <YAxis tick={{ fontSize: 10, fill: chartTextFill }} stroke={chartTextFill} width={24} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', color: chartTextFill }}
                  labelStyle={{ fontWeight: 700, color: chartTextFill }}
                  labelFormatter={(label) => formatDay(String(label))}
                  formatter={(value: number) => [value, t('charts.tx_count') || 'tx']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))">
                  {txByDay.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
            {t('charts.empty_tx') || 'No transactions yet'}
          </div>
        )}
      </div>

      {/* Fee distribution (small donut or bars) */}
      <div className="bg-card/50 border border-border rounded-2xl p-5 card-glass-hover">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          {t('charts.fee_distribution') || 'Fee distribution'}
        </h4>
        {hasFeeData ? (
          <DonutChart
            slices={feeDistribution.map((f) => ({ ...f, icon: '' }))}
            size={120}
            title={t('charts.fees') || 'Fees'}
          />
        ) : (
          <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
            {t('charts.empty_fees') || 'No fee data yet'}
          </div>
        )}
      </div>

      {/* Asset distribution (XLM 100% placeholder) */}
      <div className="bg-card/50 border border-border rounded-2xl p-5 card-glass-hover">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          {t('charts.asset_distribution') || 'Assets'}
        </h4>
        {hasAssetData ? (
          <DonutChart
            slices={assetDistribution.map((a) => ({ ...a, icon: '●' }))}
            size={120}
            title={t('charts.assets') || 'Assets'}
          />
        ) : (
          <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
            {t('charts.empty_assets') || 'XLM 100%'}
          </div>
        )}
      </div>
    </div>
  );
}

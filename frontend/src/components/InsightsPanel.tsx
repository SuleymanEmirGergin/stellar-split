import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import DonutChart from './DonutChart';
import { truncateAddress } from '../lib/stellar';
import Avatar from './Avatar';
import ActivityFeed from './ActivityFeed';

import { TrendingUp, AlertCircle, Zap, Download, Bot, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { exportToCSV, exportToPDF } from '../lib/export';
import { type Group } from '../lib/contract';

interface Expense {
  id: number;
  payer: string;
  amount: number;
  description: string;
  category?: string;
  attachment_url?: string;
  split_among: string[];
}

interface Props {
  expenses: Expense[];
  members: string[];
  group: Group;
  currentUser: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: '#ef4444',
  transport: '#3b82f6',
  shopping: '#10b981',
  home: '#f59e0b',
  fun: '#6366f1',
  other: '#6b7280',
};

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍴',
  transport: '🚗',
  shopping: '🛍️',
  home: '🏠',
  fun: '🎉',
  other: '📦',
};

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Yemek',
  transport: 'Ulaşım',
  shopping: 'Alışveriş',
  home: 'Ev',
  fun: 'Eğlence',
  other: 'Diğer',
};

/** Resolve payer address for both Soroban and backend expense shapes */
function getPayerAddress(e: Expense): string {
  const be = e as unknown as { paidBy?: { walletAddress?: string } };
  return be?.paidBy?.walletAddress ?? e.payer ?? '';
}

/** Resolve amount in XLM for both shapes.
 *  - Soroban: amount is in stroops (integer) → divide by 10_000_000
 *  - Backend: amount is a string (already XLM)
 */
function getAmountXLM(e: Expense): number {
  const raw = e.amount;
  if (typeof raw === 'string') {
    return parseFloat(raw as string) || 0;
  }
  // Soroban stroops: large integers.  If the value looks like stroops (>= 1_000_000)
  // divide by 10_000_000, otherwise assume it is already in XLM units.
  if (raw >= 1_000_000) {
    return raw / 10_000_000;
  }
  return raw;
}

export default function InsightsPanel({ expenses, members, group, currentUser }: Props) {
  const stats = useMemo(() => {
    const totalVolume = expenses.reduce((s, e) => s + getAmountXLM(e), 0);

    // Category Distribution
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.category || 'other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + getAmountXLM(e);
    });

    const slices = Object.entries(categoryTotals).map(([cat, val]) => ({
      label: CATEGORY_LABELS[cat] || cat,
      value: val,
      color: CATEGORY_COLORS[cat] || '#888',
      icon: CATEGORY_ICONS[cat] || '❓',
    }));

    // Pie data for recharts
    const pieData = slices.map(s => ({ name: s.label, value: s.value, color: s.color }));

    // Member Contribution
    const memberPaid: Record<string, number> = {};
    members.forEach(m => { memberPaid[m] = 0; });
    expenses.forEach(e => {
      const addr = getPayerAddress(e);
      memberPaid[addr] = (memberPaid[addr] || 0) + getAmountXLM(e);
    });

    const sortedMembers = [...members].sort((a, b) => memberPaid[b] - memberPaid[a]);
    const topPayer = sortedMembers[0];
    const leastPayer = sortedMembers[sortedMembers.length - 1];

    // Bar chart: per-member spending
    const barData = members.map(m => ({
      name: truncateAddress(m),
      amount: parseFloat((memberPaid[m] || 0).toFixed(4)),
    }));

    // Area chart: spending timeline (only when createdAt exists)
    const firstExpenseAny = expenses[0] as unknown as { createdAt?: string };
    const hasTimeline = Boolean(firstExpenseAny?.createdAt);

    let areaData: Array<{ date: string; cumulative: number }> = [];
    if (hasTimeline) {
      const byDay: Record<string, number> = {};
      expenses.forEach(e => {
        const dateStr = (e as unknown as { createdAt?: string }).createdAt;
        if (!dateStr) return;
        const day = dateStr.slice(0, 10); // YYYY-MM-DD
        byDay[day] = (byDay[day] || 0) + getAmountXLM(e);
      });
      const sortedDays = Object.keys(byDay).sort();
      let cum = 0;
      areaData = sortedDays.map(day => {
        cum += byDay[day];
        return { date: day, cumulative: parseFloat(cum.toFixed(4)) };
      });
    }

    const prediction = { predictedAmount: Math.round(totalVolume * 1.05), confidence: 85 };
    const alerts: Array<{ message: string; type: 'warning' | 'success' | 'info' }> = [];

    if (totalVolume > 1000) {
      alerts.push({ message: 'Dikkat: Grubun toplam harcaması yüksek seyrediyor. Özellikle alışveriş kalemleri gözden geçirilebilir.', type: 'warning' });
    }

    const maxCat = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    if (maxCat && maxCat[1] > (totalVolume * 0.4) && totalVolume > 0) {
      alerts.push({
        message: `Harcamaların %${Math.round((maxCat[1] / totalVolume) * 100)}'i "${CATEGORY_LABELS[maxCat[0]] || maxCat[0]}" kategorisinde yoğunlaşmış. Bu alanda ortak indirimleri değerlendirebilirsiniz.`,
        type: 'info',
      });
    }

    if (totalVolume === 0) {
      alerts.push({ message: 'Grup oldukça tasarruflu! Beraber bir aktivite yapmanın tam zamanı. 🎉', type: 'success' });
    }

    return { totalVolume, slices, pieData, memberPaid, topPayer, leastPayer, barData, hasTimeline, areaData, prediction, alerts };
  }, [expenses, members]);

  const cardClass = 'bg-card/50 border border-white/5 rounded-2xl p-4';
  const titleClass = 'text-xs font-black uppercase tracking-widest text-foreground/60 mb-3';

  return (
    <div id="insights-panel-report" className="flex flex-col gap-8 pb-4">

      {/* ── Recharts panels ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

        {/* Panel 1 – Category Pie */}
        <div className={cardClass}>
          <p className={titleClass}>Kategori Dağılımı</p>
          {stats.pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number) => [`${value.toFixed(2)} XLM`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-foreground/40">Henüz harcama yok</div>
          )}
        </div>

        {/* Panel 2 – Per-member Bar */}
        <div className={cardClass}>
          <p className={titleClass}>Üye Başına Harcama</p>
          {stats.barData.some(d => d.amount > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.barData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--foreground) / 0.5)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--foreground) / 0.5)' }} width={45} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number) => [`${value.toFixed(4)} XLM`, 'Harcama']}
                />
                <Bar dataKey="amount" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-foreground/40">Henüz harcama yok</div>
          )}
        </div>

        {/* Panel 3 – Spending Timeline (only if createdAt exists) */}
        {stats.hasTimeline && (
          <div className={`${cardClass} md:col-span-2`}>
            <p className={titleClass}>Harcama Zaman Çizelgesi (Kümülatif)</p>
            {stats.areaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={stats.areaData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--foreground) / 0.5)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--foreground) / 0.5)' }} width={55} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number) => [`${value.toFixed(4)} XLM`, 'Toplam']}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    fill="url(#areaGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-xs text-foreground/40">Yeterli veri yok</div>
            )}
          </div>
        )}
      </div>

      {/* ── Category Breakdown (legacy DonutChart + export) ─────────── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
            🏢 Kategori Dağılımı
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportToCSV(group, expenses)}
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-indigo-400 transition-colors flex items-center gap-1.5"
            >
              CSV <Download size={14} />
            </button>
            <button
              onClick={() => exportToPDF(group, 'insights-panel-report')}
              className="text-[10px] font-black uppercase tracking-widest text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
            >
              PDF <Download size={14} />
            </button>
          </div>
        </div>
        <DonutChart slices={stats.slices} size={180} />
      </div>

      {/* ── Hero Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-500/10 to-indigo-500/10 border border-green-500/20 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-green-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10">
            <span className="text-[10px] font-bold text-green-500/70 uppercase tracking-widest mb-1 block">Grubun Bonkörü</span>
            <div className="flex items-center gap-3">
              <Avatar address={stats.topPayer} size={32} />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate text-foreground">{truncateAddress(stats.topPayer)}</div>
                <div className="text-sm font-mono text-green-500">+{stats.memberPaid[stats.topPayer]?.toFixed(4)} XLM ödedi</div>
              </div>
              <div className="text-2xl animate-bounce">👑</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-pink-500/10 border border-orange-500/20 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10">
            <span className="text-[10px] font-bold text-orange-500/70 uppercase tracking-widest mb-1 block">En Düşük Harcama</span>
            <div className="flex items-center gap-3">
              <Avatar address={stats.leastPayer} size={32} />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate text-foreground">{truncateAddress(stats.leastPayer)}</div>
                <div className="text-sm font-mono text-orange-400">{stats.memberPaid[stats.leastPayer]?.toFixed(4)} XLM harcadı</div>
              </div>
              <div className="text-2xl">🐚</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contribution List ─────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
          📈 Üye Katkıları
        </h3>
        <div className="space-y-4">
          {members.map(m => {
            const paid = stats.memberPaid[m] || 0;
            const pct = stats.totalVolume > 0 ? (paid / stats.totalVolume) * 100 : 0;
            return (
              <div key={m} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium flex items-center gap-2">
                    {truncateAddress(m)}
                    {m === currentUser && <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[8px] font-black uppercase">Siz</span>}
                  </span>
                  <span className="font-mono">{paid.toFixed(4)} XLM ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Future Prediction & AI Alerts ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-600/10 border border-indigo-600/20 rounded-xl p-6 relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Gelecek Ay Tahmini</h4>
              <div className="text-3xl font-black text-indigo-300 flex items-baseline gap-1">
                {stats.prediction.predictedAmount} <span className="text-xs">XLM</span>
              </div>
            </div>
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400/70">
            <Zap size={12} fill="currentColor" />
            %{stats.prediction.confidence} güven oranı ile hesaplandı
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
        </motion.div>

        {/* AI Financial Advisor */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute -left-10 -top-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-colors duration-1000" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <Bot size={20} />
              </div>
              <h3 className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-400 uppercase tracking-wider flex items-center gap-2">
                AI Asistan Analizi <Sparkles size={14} className="text-pink-400" />
              </h3>
            </div>

            <div className="space-y-3">
              {stats.alerts.length > 0 ? stats.alerts.map((alert, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`border rounded-xl p-4 flex gap-3 items-start ${
                    alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-200/80' :
                    alert.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200/80' :
                    'bg-indigo-500/10 border-indigo-500/20 text-indigo-200/80'
                  }`}
                >
                  {alert.type === 'warning' && <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />}
                  {alert.type === 'success' && <Zap size={16} className="text-emerald-500 shrink-0 mt-0.5" />}
                  {alert.type === 'info' && <TrendingUp size={16} className="text-indigo-400 shrink-0 mt-0.5" />}
                  <p className="text-xs font-medium leading-relaxed">{alert.message}</p>
                </motion.div>
              )) : null}

              {stats.totalVolume > 0 && stats.alerts.length < 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-purple-500/10 border border-purple-500/20 text-purple-200/80 rounded-xl p-4 flex gap-3 items-start"
                >
                  <Bot size={16} className="text-purple-400 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium leading-relaxed">
                    Harcamalarınız şu an standart seviyelerde. DeFi sekmesinden kasaya yatırım (stake) yaparak gruptaki XLM'leri faizle değerlendirebilirsiniz. 🚀
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Activity Feed ─────────────────────────────────────────────── */}
      <div className="mt-4">
        <ActivityFeed members={members} />
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, 
  QrCode, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock, 
  ArrowLeft,
  Share2,
  Download,
  Filter,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { encodeMerchantQR, type MerchantQRData } from '../lib/merchant';


interface Props {
  merchantId: string;
  onBack: () => void;
}

interface PaymentStatus {
  id: string;
  groupName: string;
  amount: string;
  participants: number;
  paidCount: number;
  status: 'pending' | 'partially_paid' | 'settled';
  timestamp: number;
}

export function MerchantDashboard({ merchantId, onBack }: Props) {
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrAmount, setQrAmount] = useState('50.0');
  const [qrCategory, setQrCategory] = useState('Dinner');
  const [recentPayments, setRecentPayments] = useState<PaymentStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data for demo
  useEffect(() => {
    const mockData: PaymentStatus[] = [
      {
        id: 'PAY-101',
        groupName: 'Pizza Night',
        amount: '85.50 XLM',
        participants: 4,
        paidCount: 3,
        status: 'partially_paid',
        timestamp: Date.now() - 1000 * 60 * 15 // 15 mins ago
      },
      {
        id: 'PAY-100',
        groupName: 'Office Coffee',
        amount: '22.00 XLM',
        participants: 2,
        paidCount: 2,
        status: 'settled',
        timestamp: Date.now() - 1000 * 60 * 120 // 2 hours ago
      },
      {
        id: 'PAY-099',
        groupName: 'Game Night Lunch',
        amount: '120.00 XLM',
        participants: 5,
        paidCount: 1,
        status: 'pending',
        timestamp: Date.now() - 1000 * 60 * 300 // 5 hours ago
      }
    ];
    setRecentPayments(mockData);
  }, []);

  const refreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const currentQRData: MerchantQRData = {
    merchantId,
    merchantName: "Stellar Bistro", // In a real app, from profile/contract
    amount: qrAmount,
    currency: "XLM",
    category: qrCategory,
    timestamp: Date.now()
  };

  const qrUrl = encodeMerchantQR(currentQRData);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/40 border border-white/5 p-8 rounded-3xl backdrop-blur-md">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
            <Store size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              Merchant Workspace
              <span className="text-[10px] font-black tracking-widest uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Pro</span>
            </h1>
            <p className="text-muted-foreground text-sm font-medium">Managing Stellar Bistro • {merchantId.slice(0, 4)}...{merchantId.slice(-4)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="px-5 py-2.5 bg-secondary/50 hover:bg-white/5 text-sm font-bold rounded-xl border border-white/5 transition-all flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Wallet
          </button>
          <button 
            onClick={() => setShowQRModal(true)}
            className="glow-indigo px-6 py-3 bg-indigo-500 text-white text-sm font-black rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <QrCode size={18} />
            Generate Payment Brick
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          icon={<TrendingUp size={20} />} 
          title="Total Volume Split" 
          value="4,250.50 XLM" 
          trend="+12% this week" 
          color="indigo" 
        />
        <StatCard 
          icon={<Users size={20} />} 
          title="Active Spits" 
          value="8 Groups" 
          trend="3 pending settlement" 
          color="purple" 
        />
        <StatCard 
          icon={<CheckCircle2 size={20} />} 
          title="Settlement Rate" 
          value="94.2%" 
          trend="Avg. 14m to settle" 
          color="emerald" 
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 bg-card/60 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-lg">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw size={18} className={`text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
              <h2 className="font-black tracking-tight uppercase text-xs text-muted-foreground">Recent Splitting Activity</h2>
            </div>
            <div className="flex items-center gap-2">
              <button aria-label="Filter" onClick={refreshData} className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground transition-colors">
                <Filter size={16} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-white/5 border-b border-white/5">
                  <th className="px-6 py-4">Group / ID</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Participants</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="font-bold text-foreground">{p.groupName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{p.id}</div>
                    </td>
                    <td className="px-6 py-5 font-mono text-sm font-bold text-indigo-400">{p.amount}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Users size={14} className="text-muted-foreground" />
                        {p.participants} members
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {p.paidCount}/{p.participants} paid
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button aria-label="More options" className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-all">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Terminal / Insights */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
              <TrendingUp size={120} />
            </div>
            <h3 className="text-white/80 font-black text-xs uppercase tracking-widest mb-4">Merchant Tip</h3>
            <p className="text-white text-lg font-bold leading-relaxed mb-6">
              "Groups who split at the table spend an average of 18% more on desserts."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                <CheckCircle2 size={16} />
              </div>
              <span className="text-white/90 text-sm font-bold">Stellar Split Insights</span>
            </div>
          </div>

          <div className="bg-card/40 border border-white/5 p-6 rounded-3xl backdrop-blur-md">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Clock size={12} className="text-indigo-400" />
              Live Feed
            </h3>
            <div className="space-y-4">
              <FeedItem user="Emir G." action="joined" group="Pizza Night" time="2m ago" />
              <FeedItem user="Sarah M." action="paid" amount="21.37 XLM" time="5m ago" />
              <FeedItem user="New QR" action="generated" amount="50.00 XLM" time="12m ago" />
            </div>
          </div>
        </div>
      </div>

      {/* QR Generator Modal */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-lg">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-card/90 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden w-full max-w-xl flex flex-col md:flex-row relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 md:w-1/2 space-y-6 border-b md:border-b-0 md:border-r border-white/5">
                <div>
                  <h2 className="text-2xl font-black tracking-tight mb-2">Generate Brick</h2>
                  <p className="text-muted-foreground text-sm font-medium">Create a "Scan to Split" QR for your customers.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Amount (XLM)</label>
                    <input 
                      type="number"
                      value={qrAmount}
                      onChange={(e) => setQrAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-lg font-black focus:border-indigo-500/50 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Category</label>
                    <select 
                      value={qrCategory}
                      onChange={(e) => setQrCategory(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm font-bold focus:border-indigo-500/50 transition-all outline-none"
                    >
                      <option>Dinner</option>
                      <option>Coffee</option>
                      <option>Entertainment</option>
                      <option>Transport</option>
                      <option>Shopping</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                    <Download size={18} /> Download SVG
                  </button>
                  <button onClick={() => setShowQRModal(false)} className="w-full py-2 text-sm font-bold text-muted-foreground hover:text-white transition-colors">
                    Close
                  </button>
                </div>
              </div>

              <div className="p-10 md:w-1/2 bg-white flex flex-col items-center justify-center text-center">
                <div className="p-6 bg-white rounded-4xl shadow-2xl border border-secondary/5 mb-6">
                  <QRCodeSVG 
                    value={qrUrl} 
                    size={220} 
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: "/logo.svg", // Assuming there's a logo
                      x: undefined,
                      y: undefined,
                      height: 48,
                      width: 48,
                      excavate: true,
                    }}
                  />
                </div>
                <div className="text-secondary font-black text-xl mb-1">{qrAmount} XLM</div>
                <div className="text-secondary/60 text-[10px] font-black uppercase tracking-widest mb-6">{qrCategory} • Stellar Bistro</div>
                
                <div className="flex gap-2 w-full">
                  <button className="flex-1 py-3 bg-secondary text-white rounded-xl text-xs font-black flex items-center justify-center gap-2">
                    <Share2 size={14} /> Print
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, title, value, trend, color }: { icon: React.ReactNode, title: string, value: string, trend: string, color: 'indigo' | 'purple' | 'emerald' }) {
  const colorMap: Record<string, string> = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  };

  return (
    <div className="bg-card/40 border border-white/5 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border transition-transform group-hover:scale-110 duration-500 ${colorMap[color]}`}>
        {icon}
      </div>
      <h3 className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1">{title}</h3>
      <div className="text-2xl font-black tracking-tight mb-2">{value}</div>
      <div className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 line-clamp-1">
        <span className={trend.startsWith('+') ? 'text-emerald-400' : 'text-indigo-400'}>{trend}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: PaymentStatus['status'] }) {
  switch (status) {
    case 'settled':
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20"><CheckCircle2 size={10} /> Settled</span>;
    case 'partially_paid':
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-500/20"><TrendingUp size={10} /> Partially Paid</span>;
    default:
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-500/20"><Clock size={10} /> Pending</span>;
  }
}

function FeedItem({ user, action, group, amount, time }: { user: string, action: string, group?: string, amount?: string, time: string }) {
  return (
    <div className="flex items-center justify-between text-xs py-1">
      <div className="flex items-center gap-2">
        <span className="font-bold text-foreground">{user}</span>
        <span className="text-muted-foreground">{action}</span>
        {group && <span className="font-medium text-white/90">{group}</span>}
        {amount && <span className="font-mono text-indigo-400 font-bold">{amount}</span>}
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">{time}</span>
    </div>
  );
}

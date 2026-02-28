import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StrKey } from '@stellar/stellar-sdk';
import { 
  Plus, 
  Camera, 
  FolderOpen, 
  Users, 
  Zap, 
  DollarSign, 
  Search, 
  Rocket, 
  AlertTriangle,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createGroup, isGroupSettled, estimateCreateGroupFee, type EstimatedFee } from '../lib/contract';
import { truncateAddress } from '../lib/stellar';
import OnRampGuide from './OnRampGuide';
import Scanner from './Scanner';
import { useI18n } from '../lib/i18n';
import { AvatarGroup } from './Avatar';
import NetworkStats from './NetworkStats';
import ImpactPanel from './ImpactPanel';
import GlobalImpact from './GlobalImpact';
import UserAnalytics from './UserAnalytics';
import { addressBook } from '../lib/contacts';
import { track } from '../lib/analytics';
import OnboardingTour from './OnboardingTour';
import { useXlmUsd } from '../lib/xlmPrice';
import { WalletCharts } from './ui/WalletCharts';

interface Props {
  walletAddress: string;
  onSelectGroup: (id: number) => void;
  isDemo?: boolean;
}

interface LocalGroup {
  id: number;
  name: string;
  memberCount: number;
  members?: string[];
  currency?: 'XLM' | 'USDC';
}

function isValidStellarAddress(addr: string): boolean {
  try {
    return StrKey.isValidEd25519PublicKey(addr);
  } catch {
    return false;
  }
}

const containerVars = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVars = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

/** Testnet test adresleri – grup oluştururken "Test adresleriyle doldur" ile kullanılır. */
const TEST_ADDRESSES = [
  'GDJJRRMBK4IWLEPJGIE6SXD2LP7FILNK6I6NMDPKPWUK4TTE4M7PXVK',
  'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
];

export default function Dashboard({ walletAddress, onSelectGroup, isDemo }: Props) {
  const [groups, setGroups] = useState<LocalGroup[]>(() => {
    const saved = localStorage.getItem('stellarsplit_groups');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMembers, setNewMembers] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState<'XLM' | 'USDC'>('XLM');
  const [showScanner, setShowScanner] = useState(false);
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archive'>('active');
  const [settledIds, setSettledIds] = useState<Set<number>>(new Set());
  const [estimatedCreateFee, setEstimatedCreateFee] = useState<EstimatedFee | null>(null);

  const { t } = useI18n();
  const xlmUsd = useXlmUsd();
  const [contacts] = useState<Record<string, string>>(() => addressBook.getAll());

  const saveGroups = useCallback((gs: LocalGroup[]) => {
    setGroups(gs);
    localStorage.setItem('stellarsplit_groups', JSON.stringify(gs));
  }, []);

  useEffect(() => {
    const handler = () => setShowCreate(true);
    window.addEventListener('stellarsplit:new-group', handler);
    return () => window.removeEventListener('stellarsplit:new-group', handler);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showCreate) setShowCreate(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCreate]);

  useEffect(() => {
    if (!showCreate || !walletAddress || !newName.trim()) {
      setEstimatedCreateFee(null);
      return;
    }
    const raw = newMembers.split(/[\n,]+/).map(m => m.trim()).filter(Boolean);
    const memberAddresses = [...raw];
    if (!memberAddresses.includes(walletAddress)) memberAddresses.push(walletAddress);
    let cancelled = false;
    estimateCreateGroupFee(walletAddress, newName.trim(), memberAddresses, currency)
      .then((fee) => { if (!cancelled) setEstimatedCreateFee(fee); })
      .catch(() => { if (!cancelled) setEstimatedCreateFee(null); });
    return () => { cancelled = true; };
  }, [showCreate, walletAddress, newName, newMembers, currency]);

  useEffect(() => {
    if (groups.length === 0 || isDemo) {
      setSettledIds(new Set());
      return;
    }
    let cancelled = false;
    Promise.all(
      groups.map(async (g) => {
        const settled = await isGroupSettled(walletAddress, g.id);
        return { id: g.id, settled };
      })
    ).then((results) => {
      if (cancelled) return;
      setSettledIds(new Set(results.filter((r) => r.settled).map((r) => r.id)));
    });
    return () => { cancelled = true; };
  }, [groups, walletAddress, isDemo]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) {
      setError('Grup adı gerekli');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const rawAddresses = newMembers
        .split(/[\n,]+/)
        .map((m) => m.trim())
        .filter((m) => m.length > 0);

      for (const addr of rawAddresses) {
        if (!isValidStellarAddress(addr)) {
          setError(`Geçersiz Stellar adresi: ${addr}`);
          setCreating(false);
          return;
        }
      }

      const memberAddresses = [...rawAddresses];
      if (!memberAddresses.includes(walletAddress)) {
        memberAddresses.push(walletAddress);
      }

      const uniqueMembers = [...new Set(memberAddresses)];
      if (uniqueMembers.length < 2) {
        setError(t('create.min_members_error'));
        setCreating(false);
        return;
      }

      const groupId = await createGroup(walletAddress, newName.trim(), uniqueMembers, currency);
      track('group_created');
      const newGroup: LocalGroup = {
        id: groupId,
        name: newName.trim(),
        memberCount: memberAddresses.length,
        members: memberAddresses,
        currency,
      };
      saveGroups([...groups, newGroup]);
      setShowCreate(false);
      setNewName('');
      setNewMembers('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grup oluşturulamadı');
    } finally {
      setCreating(false);
    }
  }, [walletAddress, newName, newMembers, groups, saveGroups, currency]);

  const totalMembers = groups.reduce((s, g) => s + g.memberCount, 0);
  const filteredGroups = groups
    .filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    .filter((g) =>
      archiveFilter === 'active' ? !settledIds.has(g.id) : settledIds.has(g.id)
    );

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVars}
      className="space-y-8"
    >
      <OnboardingTour />
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">{t('dash.welcome')}</h2>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {truncateAddress(walletAddress)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            data-testid="ai-scan-btn"
            onClick={() => setShowScanner(true)} 
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors rounded-xl text-sm font-bold border border-white/5"
          >
            <Camera size={18} />
            {t('group.ai_scan').split(' ')[0]}
          </button>
          <button 
            data-testid="create-group-btn"
            onClick={() => setShowCreate(true)} 
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:bg-indigo-500 transition-all active:scale-95"
          >
            <Plus size={20} />
            {t('nav.create')}
          </button>
        </div>
      </div>

      <UserAnalytics walletAddress={walletAddress} groups={groups} />
      <GlobalImpact />

      {/* Quick Stats Grid */}
      <motion.div 
        variants={containerVars}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { value: groups.length, label: t('dash.total_groups'), icon: FolderOpen, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { value: totalMembers, label: t('dash.total_members'), icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { value: '~5s', label: t('dash.avg_finality'), icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { value: '$0.00005', label: t('dash.fee'), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((s, i) => (
          <motion.div 
            key={i} 
            variants={itemVars}
            className="card-glass-hover bg-card/50 backdrop-blur-sm border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group"
          >
            <div className={`p-2 w-fit rounded-lg ${s.bg} ${s.color} mb-3 group-hover:scale-110 transition-transform`}>
              <s.icon size={20} />
            </div>
            <div className={`text-2xl font-black ${s.color} tracking-tight`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.1em] mt-1">{s.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Data viz: balance line, tx histogram, fee/asset donuts */}
      <WalletCharts t={t} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              <LayoutGrid size={14} />
              {t('dash.groups_title')}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl border border-white/5 bg-secondary/30 p-0.5">
                <button
                  type="button"
                  onClick={() => setArchiveFilter('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${archiveFilter === 'active' ? 'bg-indigo-500 text-white' : 'text-muted-foreground hover:text-white'}`}
                >
                  {t('dash.filter_active')}
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveFilter('archive')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${archiveFilter === 'archive' ? 'bg-indigo-500 text-white' : 'text-muted-foreground hover:text-white'}`}
                >
                  {t('dash.filter_archive')}
                </button>
              </div>
              <div className="relative group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-indigo-400 transition-colors" />
              <input 
                className="bg-secondary/50 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all w-48 md:w-64" 
                placeholder={t('dash.search')} 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
            </div>
          </div>
          
          <motion.div variants={containerVars} className="space-y-4">
            {filteredGroups.length > 0 ? filteredGroups.map(g => (
              <motion.div key={g.id} variants={itemVars}>
                <Link
                  to={`/group/${g.id}`}
                  className="block card-glass-hover bg-card/40 backdrop-blur-sm border border-white/5 p-6 rounded-2xl cursor-pointer hover:border-indigo-500/30 hover:bg-card/60 transition-all group no-underline shadow-sm hover:shadow-indigo-500/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/5 text-indigo-400 font-bold">
                        {g.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-lg font-black group-hover:text-indigo-400 transition-colors tracking-tight">{g.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <Users size={12} />
                          {g.memberCount} {t('group.members_count')}
                          <span className="w-1 h-1 bg-white/20 rounded-full" />
                          #{g.id}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <AvatarGroup addresses={g.members || []} max={3} />
                      <div className="text-xs font-bold px-3 py-1 bg-white/5 rounded-full border border-white/5 text-muted-foreground">
                        {g.currency || 'XLM'}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="text-center py-16 bg-white/5 rounded-3xl border border-dashed border-white/10 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <FolderOpen size={48} className="mx-auto text-indigo-500/30 mb-4 drop-shadow-xl" />
                </motion.div>
                <p className="text-base font-black text-white/90 tracking-tight">{archiveFilter === 'archive' ? t('dash.archive_empty') : (t('dash.empty') || 'Hiç Grup Yok')}</p>
                <p className="text-xs font-bold text-muted-foreground mt-2 max-w-[200px] mx-auto">
                  {archiveFilter === 'archive' ? t('dash.archive_empty_hint') : t('dash.empty_hint')}
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
        
        <div className="flex flex-col gap-6">
          <OnRampGuide />
          <ImpactPanel expensesCount={groups.length * 2} totalVolume={groups.length * 100} isDemo={isDemo} />
          <NetworkStats />
        </div>
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
              onClick={() => setShowCreate(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-card w-full max-w-md border border-white/10 rounded-3xl p-8 relative shadow-2xl overflow-hidden" 
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute -right-12 -top-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
              
              <h3 className="text-2xl font-black mb-6 tracking-tight flex items-center gap-3">
                <Plus className="text-indigo-500" />
                {t('nav.create')}
              </h3>
              
              <div className="space-y-4 relative">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block ml-1">{t('create.group_name_label')}</label>
                  <input 
                    className="w-full bg-secondary/50 border border-white/5 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50 transition-all font-medium" 
                    placeholder={t('create.name_placeholder')} 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block ml-1">{t('create.participants_label')}</label>
                  <textarea 
                    className="w-full bg-secondary/50 border border-white/5 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/50 transition-all font-medium" 
                    placeholder={t('create.members_placeholder')} 
                    value={newMembers} 
                    onChange={e => setNewMembers(e.target.value)} 
                    rows={4} 
                  />
                  <button
                    type="button"
                    onClick={() => setNewMembers(TEST_ADDRESSES.join('\n'))}
                    className="mt-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {t('create.fill_test_addresses')}
                  </button>
                  {Object.keys(contacts).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(contacts).map(([addr, name]) => {
                        const isAdded = newMembers.includes(addr);
                        return (
                          <button
                            key={addr}
                            type="button"
                            onClick={() => {
                              if (!isAdded) {
                                setNewMembers(prev => prev ? `${prev}\n${addr}` : addr);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                              isAdded 
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
                                : 'bg-secondary border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            + {name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block ml-1">{t('group.currency_label')}</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setCurrency('XLM')} 
                      className={`flex-1 py-3 rounded-xl border font-black text-xs transition-all ${currency === 'XLM' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-secondary/50 border-white/5 text-muted-foreground hover:bg-secondary'}`}
                    >
                      {t('group.currency_xlm')}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setCurrency('USDC')} 
                      className={`flex-1 py-3 rounded-xl border font-black text-xs transition-all ${currency === 'USDC' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-secondary/50 border-white/5 text-muted-foreground hover:bg-secondary'}`}
                    >
                      {t('group.currency_usdc')}
                    </button>
                  </div>
                  {currency === 'USDC' && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">{t('group.currency_usdc_hint')}</p>
                  )}
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs text-red-400 flex items-center gap-2 bg-red-400/10 p-3 rounded-xl border border-red-400/20"
                  >
                    <AlertTriangle size={14} />
                    {error}
                  </motion.div>
                )}

                {estimatedCreateFee && (
                  <p className="text-xs text-muted-foreground">
                    {t('fee.estimated_fee')}: {estimatedCreateFee.stroops.toLocaleString()} stroops (~{estimatedCreateFee.xlm} XLM)
                    {xlmUsd != null && (() => {
                      const usd = parseFloat(estimatedCreateFee.xlm) * xlmUsd;
                      return usd > 0 ? ` (~$${usd < 0.01 ? usd.toFixed(4) : usd.toFixed(2)})` : '';
                    })()}
                  </p>
                )}

                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => setShowCreate(false)} 
                    className="flex-1 py-3.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors rounded-xl font-bold"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    data-testid="create-group-submit"
                    onClick={handleCreate} 
                    disabled={creating} 
                    className="flex-[2] py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                  >
                    {creating ? (
                      <Zap size={18} className="animate-spin" />
                    ) : (
                      <Rocket size={18} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                    )}
                    {creating ? t('common.loading') : t('nav.create')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showScanner && (
        <Scanner onScan={gid => { setShowScanner(false); onSelectGroup(gid); }} onClose={() => setShowScanner(false)} />
      )}
    </motion.div>
  );
}

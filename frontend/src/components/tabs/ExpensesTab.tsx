import { useRef, useState, useMemo, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, FileText, Camera, Trash2, ChevronRight, Plus, Filter, CheckSquare, Square, X as XIcon, AlertTriangle, Upload } from 'lucide-react';
import { type Group, type Expense } from '../../lib/contract';
import { formatStroopsWithUsd } from '../../lib/xlmPrice';
import { truncateAddress } from '../../lib/stellar';
import { exportToCSV, exportToPrintReport } from '../../lib/export';
import type { TranslationKey } from '../../lib/i18n';
import EmptyState from '../EmptyState';
import { getExpenseCreatedAt, getExpenseStatus } from '../../lib/expense-utils';

interface ExpensesTabProps {
  group: Group;
  expenses: Expense[];
  onImport?: () => void;
  walletAddress: string;
  currencyLabel: string;
  xlmUsd: number | null;
  cancelling: boolean;
  filterSearch: string;
  setFilterSearch: (val: string) => void;
  filterCategory: string;
  setFilterCategory: (val: string) => void;
  setViewingReceipt: (url: string) => void;
  handleCancelLastExpense: () => void;
  setShowAdd: (val: boolean) => void;
  setAddExpenseError: (val: string | null) => void;
  t: (key: TranslationKey) => string;
  onDispute?: (expense: Expense) => void;
}

const containerVars = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVars = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 }
};

export default memo(function ExpensesTab({
  group,
  expenses,
  walletAddress,
  currencyLabel,
  xlmUsd,
  cancelling,
  filterSearch,
  setFilterSearch,
  filterCategory,
  setFilterCategory,
  setViewingReceipt,
  handleCancelLastExpense,
  setShowAdd,
  setAddExpenseError,
  t,
  onDispute,
  onImport,
}: ExpensesTabProps) {
  const getCategoryLabel = (cat: string) => t(`group.category_${cat}` as Parameters<typeof t>[0]) || cat;

  // Bulk select state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const exitBulkMode = () => { setBulkMode(false); clearSelection(); };

  // Advanced filter state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterPayerAddr, setFilterPayerAddr] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [filterShowCancelled, setFilterShowCancelled] = useState(false);
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  const hasCreatedAt = expenses.length > 0 && getExpenseCreatedAt(expenses[0]) !== undefined;

  const uniquePayers = useMemo(() =>
    [...new Set(expenses.map(e => e.payer))],
    [expenses]
  );

  const filteredExpenses = useMemo(() => {
    let list = [...expenses];

    // existing filters
    if (filterCategory) list = list.filter(e => (e.category || '') === filterCategory);
    if (filterSearch) list = list.filter(e => e.description.toLowerCase().includes(filterSearch.toLowerCase()));

    // new filters
    if (filterPayerAddr) list = list.filter(e => e.payer === filterPayerAddr);
    if (filterAmountMin) list = list.filter(e => (e.amount / 10_000_000) >= parseFloat(filterAmountMin));
    if (filterAmountMax) list = list.filter(e => (e.amount / 10_000_000) <= parseFloat(filterAmountMax));
    if (!filterShowCancelled) list = list.filter(e => getExpenseStatus(e) !== 'CANCELLED');

    // date filter — only if createdAt exists
    if (hasCreatedAt) {
      if (filterDateFrom) list = list.filter(e => new Date(getExpenseCreatedAt(e)!) >= new Date(filterDateFrom));
      if (filterDateTo) list = list.filter(e => new Date(getExpenseCreatedAt(e)!) <= new Date(filterDateTo + 'T23:59:59'));
    }

    // sort
    switch (sortMode) {
      case 'oldest': list.sort((a, b) => a.id - b.id); break;
      case 'highest': list.sort((a, b) => b.amount - a.amount); break;
      case 'lowest': list.sort((a, b) => a.amount - b.amount); break;
      default: list.sort((a, b) => b.id - a.id);
    }

    return list;
  }, [expenses, filterCategory, filterSearch, filterPayerAddr, filterAmountMin, filterAmountMax, filterShowCancelled, filterDateFrom, filterDateTo, sortMode, hasCreatedAt]);

  const activeFilterCount = [filterCategory, filterSearch, filterPayerAddr, filterAmountMin, filterAmountMax, filterDateFrom, filterDateTo, filterShowCancelled].filter(Boolean).length;

  const resetAllFilters = () => {
    setFilterCategory('');
    setFilterSearch('');
    setFilterPayerAddr('');
    setFilterAmountMin('');
    setFilterAmountMax('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterShowCancelled(false);
    setSortMode('newest');
  };

  const selectAll = () => setSelectedIds(new Set(filteredExpenses.map(e => e.id)));
  const handleBulkExportCSV = () => {
    const selected = filteredExpenses.filter(e => selectedIds.has(e.id));
    if (selected.length > 0) exportToCSV(group, selected);
  };

  const inputCls = 'bg-background/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs w-full focus:outline-none focus:border-white/20';

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredExpenses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });
  const useVirtual = filteredExpenses.length > 40;

  const CATEGORY_ICON: Record<string, { emoji: string; bg: string; text: string }> = {
    food:          { emoji: '🍽️', bg: 'bg-amber-500/15',   text: 'text-amber-400' },
    transport:     { emoji: '🚗', bg: 'bg-blue-500/15',    text: 'text-blue-400' },
    accommodation: { emoji: '🏠', bg: 'bg-green-500/15',   text: 'text-green-400' },
    entertainment: { emoji: '🎮', bg: 'bg-purple-500/15',  text: 'text-purple-400' },
    market:        { emoji: '🛍️', bg: 'bg-pink-500/15',    text: 'text-pink-400' },
    other:         { emoji: '📦', bg: 'bg-slate-500/15',   text: 'text-slate-400' },
  };
  const getExpIcon = (cat?: string) => CATEGORY_ICON[cat || ''] ?? { emoji: '💰', bg: 'bg-indigo-500/15', text: 'text-indigo-400' };

  return (
    <div className="space-y-6">
      {/* Search + filter row */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input
              className="w-full bg-secondary/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:border-indigo-500/50 transition-all outline-none"
              placeholder={t('group.search')}
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
            />
          </div>

          <div className="relative sm:w-[200px]">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full pl-12 pr-10 py-4 bg-secondary/30 border border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium appearance-none"
            >
              <option value="">{t('group.all_categories')}</option>
              {['food', 'transport', 'accommodation', 'entertainment', 'market', 'other'].map(cat => (
                <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {/* Advanced filter toggle */}
          <button
            onClick={() => setFiltersOpen(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
              filtersOpen || activeFilterCount > 0
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                : 'bg-white/5 border-white/10 text-foreground/60 hover:bg-white/10'
            }`}
          >
            <Filter size={13} />
            {t('expenses.filters')}
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-indigo-500 text-white rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setBulkMode(b => !b); if (bulkMode) clearSelection(); }}
            disabled={!expenses.length}
            className={`p-4 rounded-2xl border transition-all disabled:opacity-50 shrink-0 ${
              bulkMode
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                : 'bg-secondary/50 border-white/5 hover:border-indigo-500/30 text-muted-foreground hover:text-indigo-400'
            }`}
            title={t('group.bulk_select')}
          >
            <CheckSquare size={18} />
          </button>
          <button
            type="button"
            onClick={() => exportToCSV(group, expenses)}
            disabled={!expenses.length}
            className="p-4 rounded-2xl bg-secondary/50 border border-white/5 hover:border-indigo-500/30 text-muted-foreground hover:text-indigo-400 transition-all disabled:opacity-50 shrink-0"
            title={t('group.export_csv')}
          >
            <Download size={18} />
          </button>
          <button
            type="button"
            onClick={() => exportToPrintReport(group, expenses)}
            disabled={!expenses.length}
            className="p-4 rounded-2xl bg-secondary/50 border border-white/5 hover:border-indigo-500/30 text-muted-foreground hover:text-indigo-400 transition-all disabled:opacity-50 shrink-0"
            title={t('group.export_pdf')}
          >
            <FileText size={18} />
          </button>
          {onImport && (
            <button
              type="button"
              onClick={onImport}
              className="p-4 rounded-2xl bg-secondary/50 border border-white/5 hover:border-emerald-500/30 text-muted-foreground hover:text-emerald-400 transition-all shrink-0"
              title={t('import.title')}
            >
              <Upload size={18} />
            </button>
          )}
        </div>

        {/* Collapsible advanced filter panel */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 pt-2 pb-1 sm:grid-cols-3">
                {/* Date From */}
                {hasCreatedAt && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-foreground/40 uppercase tracking-wider">{t('expenses.filter_start_date')}</label>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={e => setFilterDateFrom(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                )}

                {/* Date To */}
                {hasCreatedAt && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-foreground/40 uppercase tracking-wider">{t('expenses.filter_end_date')}</label>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={e => setFilterDateTo(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                )}

                {/* Payer select */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-foreground/40 uppercase tracking-wider">{t('expenses.filter_payer')}</label>
                  <select
                    value={filterPayerAddr}
                    onChange={e => setFilterPayerAddr(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">{t('expenses.all_payers')}</option>
                    {uniquePayers.map(addr => (
                      <option key={addr} value={addr}>{truncateAddress(addr)}</option>
                    ))}
                  </select>
                </div>

                {/* Amount min */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-foreground/40 uppercase tracking-wider">{t('expenses.filter_amount_min')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={filterAmountMin}
                    onChange={e => setFilterAmountMin(e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Amount max */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-foreground/40 uppercase tracking-wider">{t('expenses.filter_amount_max')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="∞"
                    value={filterAmountMax}
                    onChange={e => setFilterAmountMax(e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Sort select */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-foreground/40 uppercase tracking-wider">{t('expenses.sort_label')}</label>
                  <select
                    value={sortMode}
                    onChange={e => setSortMode(e.target.value as typeof sortMode)}
                    className={inputCls}
                  >
                    <option value="newest">{t('expenses.sort_newest')}</option>
                    <option value="oldest">{t('expenses.sort_oldest')}</option>
                    <option value="highest">{t('expenses.sort_highest')}</option>
                    <option value="lowest">{t('expenses.sort_lowest')}</option>
                  </select>
                </div>

                {/* Show cancelled toggle */}
                <div className="flex items-center gap-2 col-span-full sm:col-span-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-foreground/60">
                    <input
                      type="checkbox"
                      checked={filterShowCancelled}
                      onChange={e => setFilterShowCancelled(e.target.checked)}
                      className="rounded"
                    />
                    {t('expenses.show_cancelled')}
                  </label>
                </div>

                {/* Reset button */}
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="col-span-full text-xs text-foreground/40 hover:text-foreground/60 underline text-center py-1"
                >
                  {t('expenses.reset_filters')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon="💸"
          title={t('group.empty_expenses')}
          description={t('group.empty_expenses_hint')}
          action={{ label: t('group.add_expense'), onClick: () => { setAddExpenseError(null); setShowAdd(true); } }}
        />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          icon="💸"
          title={activeFilterCount > 0 ? t('expenses.no_matching_expenses') : t('group.empty_expenses')}
          description={activeFilterCount > 0 ? t('expenses.clear_filters_hint') : undefined}
          action={activeFilterCount > 0
            ? { label: t('expenses.clear_filters'), onClick: resetAllFilters }
            : { label: t('group.add_expense'), onClick: () => { setAddExpenseError(null); setShowAdd(true); } }
          }
        />
      ) : useVirtual ? (
        <div ref={parentRef} className="overflow-auto max-h-[60vh] rounded-2xl border border-white/5" style={{ contain: 'strict' }}>
          <div
            style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const exp = filteredExpenses[virtualRow.index]!;
              const isLastExpense = exp.id === (expenses.length > 0 ? Math.max(...expenses.map(e => e.id)) : -1);
              const canCancel = isLastExpense && exp.payer === walletAddress && !cancelling;
              const isSelected = selectedIds.has(exp.id);
              return (
                <div
                  key={exp.id}
                  data-testid="expense-row"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="py-1.5"
                  onClick={bulkMode ? () => toggleSelect(exp.id) : undefined}
                >
                  <div className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 backdrop-blur-sm border rounded-3xl transition-all gap-4 ${
                    isSelected ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-secondary/30 border-white/5 hover:border-white/10 hover:bg-secondary/40'
                  }`}>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      {bulkMode && (
                        <div className="shrink-0 text-indigo-400">
                          {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-white/30" />}
                        </div>
                      )}
                      <div className={`w-12 h-12 rounded-2xl ${getExpIcon(exp.category).bg} flex items-center justify-center shrink-0 text-xl`}>
                        {getExpIcon(exp.category).emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div data-testid="expense-title" className="font-black text-sm tracking-tight truncate">{exp.description}</div>
                        <div className="text-[10px] text-muted-foreground font-bold mt-0.5 flex items-center gap-1.5 uppercase flex-wrap">
                          <span className="text-indigo-400">{t('group.paid_by')}</span> {truncateAddress(exp.payer)}
                          {exp.category && (
                            <>
                              <span className="w-1 h-1 bg-white/20 rounded-full shrink-0" />
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground whitespace-nowrap">{getCategoryLabel(exp.category)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 items-center justify-between sm:justify-end w-full sm:w-auto pl-16 sm:pl-0">
                      <div className="text-left sm:text-right">
                        <div data-testid="expense-amount" className="font-black text-base tabular-nums">{currencyLabel === 'XLM' ? formatStroopsWithUsd(exp.amount, xlmUsd) : `${(exp.amount / 10_000_000).toFixed(2)} ${currencyLabel}`}</div>
                        {exp.attachment_url && (
                          <button
                            type="button"
                            onClick={() => setViewingReceipt(exp.attachment_url!)}
                            className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors flex items-center gap-1 justify-start sm:justify-end mt-0.5"
                          >
                            <Camera size={10} /> {t('group.receipt')}
                          </button>
                        )}
                      </div>
                      {!bulkMode && (
                    <div className="flex items-center gap-1.5">
                      {onDispute && (
                        <button
                          type="button"
                          onClick={() => onDispute(exp)}
                          className="p-2 rounded-xl text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-all shrink-0 opacity-0 group-hover:opacity-100"
                          title={t('group.dispute_btn')}
                        >
                          <AlertTriangle size={15} />
                        </button>
                      )}
                      {canCancel ? (
                        <button
                          type="button"
                          onClick={handleCancelLastExpense}
                          disabled={cancelling}
                          className="p-2 rounded-xl text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all disabled:opacity-50 shrink-0"
                          title={t('group.cancel_expense')}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <ChevronRight size={16} className="text-white/10 group-hover:text-white/40 transition-colors shrink-0" />
                      )}
                    </div>
                  )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <motion.div variants={containerVars} initial="hidden" animate="visible" className="space-y-3">
          {filteredExpenses.map((exp: Expense) => {
            const isLastExpense = exp.id === (expenses.length > 0 ? Math.max(...expenses.map(e => e.id)) : -1);
            const canCancel = isLastExpense && exp.payer === walletAddress && !cancelling;
            const isSelected = selectedIds.has(exp.id);
            return (
              <motion.div
                key={exp.id}
                data-testid="expense-row"
                variants={itemVars}
                className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 backdrop-blur-sm border rounded-3xl transition-all gap-4 ${
                  isSelected
                    ? 'bg-indigo-500/10 border-indigo-500/30'
                    : 'bg-secondary/30 border-white/5 hover:border-white/10 hover:bg-secondary/40'
                }`}
                onClick={bulkMode ? () => toggleSelect(exp.id) : undefined}
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  {bulkMode && (
                    <div className="shrink-0 text-indigo-400">
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-white/30" />}
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-2xl ${getExpIcon(exp.category).bg} flex items-center justify-center shrink-0 text-xl`}>
                    {getExpIcon(exp.category).emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div data-testid="expense-title" className="font-black text-sm tracking-tight truncate">{exp.description}</div>
                    <div className="text-[10px] text-muted-foreground font-bold mt-0.5 flex items-center gap-1.5 uppercase flex-wrap">
                      <span className="text-indigo-400">{t('group.paid_by')}</span> {truncateAddress(exp.payer)}
                      {exp.category && (
                        <>
                          <span className="w-1 h-1 bg-white/20 rounded-full shrink-0" />
                          <span className="px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground whitespace-nowrap">{getCategoryLabel(exp.category)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 items-center justify-between sm:justify-end w-full sm:w-auto pl-16 sm:pl-0">
                  <div className="text-left sm:text-right">
                    <div data-testid="expense-amount" className="font-black text-base tabular-nums">{currencyLabel === 'XLM' ? formatStroopsWithUsd(exp.amount, xlmUsd) : `${(exp.amount / 10_000_000).toFixed(2)} ${currencyLabel}`}</div>
                    {exp.attachment_url && (
                      <button
                        type="button"
                        onClick={() => setViewingReceipt(exp.attachment_url!)}
                        className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors flex items-center gap-1 justify-start sm:justify-end mt-0.5"
                      >
                        <Camera size={10} /> {t('group.receipt')}
                      </button>
                    )}
                  </div>
                  {!bulkMode && (
                    <div className="flex items-center gap-1.5">
                      {onDispute && (
                        <button
                          type="button"
                          onClick={() => onDispute(exp)}
                          className="p-2 rounded-xl text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-all shrink-0 opacity-0 group-hover:opacity-100"
                          title={t('group.dispute_btn')}
                        >
                          <AlertTriangle size={15} />
                        </button>
                      )}
                      {canCancel ? (
                        <button
                          type="button"
                          onClick={handleCancelLastExpense}
                          disabled={cancelling}
                          className="p-2 rounded-xl text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all disabled:opacity-50 shrink-0"
                          title={t('group.cancel_expense')}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <ChevronRight size={16} className="text-white/10 group-hover:text-white/40 transition-colors shrink-0" />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Bulk mode bottom action bar */}
      <AnimatePresence>
        {bulkMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="sticky bottom-4 z-10 flex items-center gap-2 p-3 bg-background/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
          >
            <button
              type="button"
              onClick={exitBulkMode}
              className="p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-white/10 transition-all shrink-0"
              title={t('settings.leave_cancel')}
            >
              <XIcon size={16} />
            </button>
            <span className="text-xs font-black text-muted-foreground flex-1">
              {selectedIds.size > 0 ? `${selectedIds.size} ${t('group.selected_count')}` : t('group.no_selection')}
            </span>
            <button
              type="button"
              onClick={selectedIds.size === filteredExpenses.length ? clearSelection : selectAll}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all"
            >
              {selectedIds.size === filteredExpenses.length ? t('group.deselect_all') : t('group.select_all')}
            </button>
            <button
              type="button"
              onClick={handleBulkExportCSV}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-black hover:bg-indigo-500/30 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <Download size={13} /> {t('group.bulk_export_csv')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!bulkMode && expenses.length > 0 && (
        <button
          data-testid="add-expense-btn"
          onClick={() => { setAddExpenseError(null); setShowAdd(true); }}
          className="w-full py-5 bg-indigo-600 text-white font-black rounded-[24px] shadow-lg shadow-indigo-500/20 hover:bg-indigo-500/30 hover:-translate-y-1 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
        >
          <Plus size={20} /> {t('group.add_expense')}
        </button>
      )}
    </div>
  );
});

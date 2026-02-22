import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { Search, Download, FileText, Receipt, Camera, Trash2, ChevronRight, Plus, Filter } from 'lucide-react';
import { type Group, type Expense } from '../../lib/contract';
import { formatStroopsWithUsd } from '../../lib/xlmPrice';
import { truncateAddress } from '../../lib/stellar';
import { exportToCSV, exportToPrintReport } from '../../lib/export';
import type { TranslationKey } from '../../lib/i18n';

interface ExpensesTabProps {
  group: Group;
  expenses: Expense[];
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
}

const containerVars = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVars = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 }
};

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Yeme İçme',
  transport: 'Ulaşım',
  accommodation: 'Konaklama',
  entertainment: 'Eğlence',
  market: 'Market',
  other: 'Diğer'
};

export default function ExpensesTab({
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
  t
}: ExpensesTabProps) {
  const getCategoryLabel = (cat: string) => CATEGORY_LABELS[cat] || cat;
  const filteredExpenses = expenses
    .filter(e => (!filterCategory || (e.category || '') === filterCategory) && e.description.toLowerCase().includes(filterSearch.toLowerCase()))
    .reverse();
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredExpenses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });
  const useVirtual = filteredExpenses.length > 40;

  return (
    <div className="space-y-6">
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
      </div>
      
      {expenses.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-white/10 bg-white/5">
          <Receipt className="mx-auto w-14 h-14 text-indigo-500/40 mb-4" />
          <p className="text-lg font-black text-white/90">{t('group.empty_expenses')}</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-[260px] mx-auto">{t('group.empty_expenses_hint')}</p>
          <button
            data-testid="add-expense-btn"
            type="button"
            onClick={() => { setAddExpenseError(null); setShowAdd(true); }}
            className="mt-6 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors inline-flex items-center gap-2"
          >
            <Plus size={18} /> {t('group.add_expense')}
          </button>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border border-dashed border-white/10 bg-white/5">
          <p className="font-bold text-muted-foreground">{t('group.filter_by_category')} — {t('group.no_matches')}</p>
        </div>
      ) : useVirtual ? (
        <div ref={parentRef} className="overflow-auto max-h-[60vh] rounded-2xl border border-white/5" style={{ contain: 'strict' }}>
          <div
            style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const exp = filteredExpenses[virtualRow.index]!;
              const isLastExpense = exp.id === (expenses.length > 0 ? Math.max(...expenses.map(e => e.id)) : -1);
              const canCancel = isLastExpense && exp.payer === walletAddress && !cancelling;
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
                >
                  <div className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-secondary/30 backdrop-blur-sm border border-white/5 rounded-3xl hover:border-white/10 transition-all hover:bg-secondary/40 gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors shrink-0">
                        <Receipt className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div data-testid="expense-title" className="font-black text-sm tracking-tight truncate">{exp.description}</div>
                        <div className="text-[10px] text-muted-foreground font-bold mt-0.5 flex items-center gap-1.5 uppercase flex-wrap">
                          <span className="text-indigo-400">{t('group.paid_by')}</span> {truncateAddress(exp.payer)}
                          {exp.category && (
                            <>
                              <span className="w-1 h-1 bg-white/20 rounded-full shrink-0" />
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground whitespace-nowrap">{CATEGORY_LABELS[exp.category] || exp.category}</span>
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
          return (
          <motion.div 
            key={exp.id} 
            data-testid="expense-row"
            variants={itemVars}
            className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-secondary/30 backdrop-blur-sm border border-white/5 rounded-3xl hover:border-white/10 transition-all hover:bg-secondary/40 gap-4"
          >
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors shrink-0">
                <Receipt className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div data-testid="expense-title" className="font-black text-sm tracking-tight truncate">{exp.description}</div>
                <div className="text-[10px] text-muted-foreground font-bold mt-0.5 flex items-center gap-1.5 uppercase flex-wrap">
                  <span className="text-indigo-400">{t('group.paid_by')}</span> {truncateAddress(exp.payer)}
                  {exp.category && (
                    <>
                      <span className="w-1 h-1 bg-white/20 rounded-full shrink-0" />
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground whitespace-nowrap">{CATEGORY_LABELS[exp.category] || exp.category}</span>
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
          </motion.div>
        );})}
      </motion.div>
      )}

      {expenses.length > 0 && (
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
}

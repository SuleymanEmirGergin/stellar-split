import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, AlertTriangle, CheckCircle2, ChevronRight, ArrowRight, Building2 } from 'lucide-react';
import { parseWithFormat, BANK_OPTIONS, type ImportedExpense, type ImportResult, type BankFormat } from '../lib/import';
import type { TranslationKey } from '../lib/i18n';

interface MemberMapping {
  [rawName: string]: string; // rawName → stellar address (or empty)
}

interface ImportModalProps {
  groupMembers: string[]; // stellar addresses already in the group
  onImport: (expenses: ImportedExpense[], mapping: MemberMapping) => Promise<void>;
  onClose: () => void;
  t: (key: TranslationKey) => string;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

export default function ImportModal({ groupMembers, onImport, onClose, t }: ImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [parseResult, setParseResult] = useState<ImportResult | null>(null);
  const [mapping, setMapping] = useState<MemberMapping>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState('');
  const [bankFormat, setBankFormat] = useState<BankFormat>('auto');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      setError(t('import.only_csv'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const result = parseWithFormat(text, bankFormat);
        if (result.expenses.length === 0) {
          setError(t('import.no_expenses'));
          return;
        }
        setParseResult(result);
        // Pre-select all expenses
        setSelectedIds(new Set(result.expenses.map((_, i) => i)));
        // Init mapping: try to auto-match to wallet addresses
        const initMap: MemberMapping = {};
        for (const p of result.participants) {
          // If the name looks like a Stellar address, map directly
          const match = groupMembers.find(
            (m) => m.toLowerCase() === p.toLowerCase() || m.slice(0, 6) === p.slice(0, 6),
          );
          initMap[p] = match ?? '';
        }
        setMapping(initMap);
        setStep('preview');
        setError('');
      } catch {
        setError(t('import.parse_error'));
      }
    };
    reader.readAsText(file, 'utf-8');
  }, [groupMembers, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImportClick = async () => {
    if (!parseResult) return;
    const toImport = parseResult.expenses.filter((_, i) => selectedIds.has(i));
    setStep('importing');
    try {
      await onImport(toImport, mapping);
      setImportedCount(toImport.length);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('import.import_failed'));
      setStep('preview');
    }
  };

  const toggleSelect = (i: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#0e1118]/95 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)] max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="font-black text-base tracking-tight">{t('import.title')}</h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">
                  Splitwise · Tricount · Banks · CSV
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-white/10 transition-all">
              <X size={18} />
            </button>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-5 shrink-0">
            {(['upload', 'preview', 'done'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${
                  step === s ? 'bg-indigo-500 text-white' :
                  (['upload', 'preview', 'done'].indexOf(step) > i) ? 'bg-indigo-500/30 text-indigo-400' :
                  'bg-white/10 text-muted-foreground'
                }`}>{i + 1}</div>
                {i < 2 && <ChevronRight size={12} className="text-white/20" />}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* ── Upload Step ── */}
            {step === 'upload' && (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                    dragOver ? 'border-indigo-500/60 bg-indigo-500/10' : 'bg-white/[0.03] border-white/[0.12] hover:bg-white/[0.05] hover:border-indigo-500/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                  <FileText size={36} className="mx-auto text-indigo-400/50 mb-3" />
                  <p className="font-bold text-sm">{t('import.drop_hint')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('import.supported_formats')}</p>
                </div>
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                    <AlertTriangle size={14} /> {error}
                  </div>
                )}
                {/* Bank format selector */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    <Building2 size={11} />
                    {t('import.bank_format_label')}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {BANK_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setBankFormat(opt.id)}
                        className={`text-left px-3 py-2 rounded-xl text-xs border transition-all ${
                          bankFormat === opt.id
                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                            : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
                        }`}
                      >
                        <div className="font-bold">
                          {opt.flag ? `${opt.flag} ` : ''}{opt.name}
                        </div>
                        <div className="text-[9px] opacity-70 truncate">{opt.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-secondary/20 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-bold text-white/60">{t('import.how_to')}</p>
                  <p>• Splitwise: Account → Export → Download as CSV</p>
                  <p>• Tricount: Share → Export CSV</p>
                  <p>• TR Banks: İnternet bankacılığı → Hesap Hareketleri → CSV indir</p>
                  <p>• YNAB: Budget → Export → CSV</p>
                </div>
              </div>
            )}

            {/* ── Preview Step ── */}
            {(step === 'preview') && parseResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-muted-foreground">
                    {t('import.detected')} <span className="text-indigo-400 font-black">{parseResult.source}</span> · {parseResult.expenses.length} {t('import.expenses_found')}
                  </span>
                  <span className="text-muted-foreground">{selectedIds.size} {t('import.selected')}</span>
                </div>

                {/* Member mapping */}
                {parseResult.participants.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('import.member_mapping')}</p>
                    {parseResult.participants.map((p) => (
                      <div key={p} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white/70 w-24 truncate shrink-0">{p}</span>
                        <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                        <select
                          value={mapping[p] ?? ''}
                          onChange={(e) => setMapping((prev) => ({ ...prev, [p]: e.target.value }))}
                          className="flex-1 bg-white/[0.04] border border-white/[0.09] rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500/40"
                        >
                          <option value="">{t('import.skip_member')}</option>
                          {groupMembers.map((addr) => (
                            <option key={addr} value={addr}>{addr.slice(0, 8)}…{addr.slice(-4)}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {/* Expense list */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {parseResult.expenses.map((exp, i) => (
                    <div
                      key={i}
                      onClick={() => toggleSelect(i)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                        selectedIds.has(i)
                          ? 'bg-indigo-500/10 border-indigo-500/20'
                          : 'bg-white/[0.02] border-white/[0.05] opacity-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedIds.has(i) ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'
                      }`}>
                        {selectedIds.has(i) && <CheckCircle2 size={10} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">{exp.description}</div>
                        <div className="text-[10px] text-muted-foreground">{exp.payer} · {exp.date}</div>
                      </div>
                      <div className="text-xs font-black text-indigo-400 shrink-0">
                        {exp.amount.toFixed(2)} {exp.originalCurrency ?? 'XLM'}
                      </div>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                    <AlertTriangle size={14} /> {error}
                  </div>
                )}

                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={handleImportClick}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(99,102,241,0.3)]"
                >
                  {t('import.import_btn')} ({selectedIds.size})
                </button>
              </div>
            )}

            {/* ── Importing ── */}
            {step === 'importing' && (
              <div className="py-10 text-center">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="font-bold text-sm">{t('import.importing')}</p>
              </div>
            )}

            {/* ── Done ── */}
            {step === 'done' && (
              <div className="py-10 text-center space-y-3">
                <CheckCircle2 size={48} className="mx-auto text-emerald-400" />
                <p className="font-black text-lg tracking-tight">{t('import.done_title')}</p>
                <p className="text-sm text-muted-foreground">{importedCount} {t('import.done_desc')}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 px-6 py-3 rounded-2xl bg-emerald-500 text-black font-black text-sm uppercase tracking-widest"
                >
                  {t('import.close')}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

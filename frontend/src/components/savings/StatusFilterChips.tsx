/**
 * Pool status filter chips.
 *
 * Replaces the old three-section layout (active / completed / cancelled
 * stacked) with a single filtered list driven by a chip selector. Tab key
 * "ALL" shows everything; otherwise the parent filters by status before
 * mapping to PoolCard.
 *
 * See `docs/design/savings-redesign.md` §4.3.
 */

import { useI18n } from '../../lib/i18n';

export type SavingsFilterStatus = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

interface StatusFilterChipsProps {
  status: SavingsFilterStatus;
  counts: { ALL: number; ACTIVE: number; COMPLETED: number; CANCELLED: number };
  onChange: (status: SavingsFilterStatus) => void;
}

interface ChipDef {
  value: SavingsFilterStatus;
  labelKey:
    | 'savings.filter_all'
    | 'savings.filter_active'
    | 'savings.filter_completed'
    | 'savings.filter_cancelled';
  /** Tailwind classes for the active state — color carries the status semantic in addition to the text. */
  activeClass: string;
}

const CHIPS: ChipDef[] = [
  {
    value: 'ALL',
    labelKey: 'savings.filter_all',
    activeClass: 'bg-white/[0.08] border-white/20 text-foreground',
  },
  {
    value: 'ACTIVE',
    labelKey: 'savings.filter_active',
    activeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  },
  {
    value: 'COMPLETED',
    labelKey: 'savings.filter_completed',
    activeClass: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
  },
  {
    value: 'CANCELLED',
    labelKey: 'savings.filter_cancelled',
    activeClass: 'bg-rose-500/10 border-rose-500/25 text-rose-300',
  },
];

export default function StatusFilterChips({
  status,
  counts,
  onChange,
}: StatusFilterChipsProps) {
  const { t } = useI18n();

  return (
    <div
      role="tablist"
      aria-label={t('savings.filter_aria_label')}
      className="flex items-center gap-1.5 flex-wrap"
    >
      {CHIPS.map((chip) => {
        const active = status === chip.value;
        const count = counts[chip.value];
        return (
          <button
            key={chip.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(chip.value)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${
              active
                ? chip.activeClass
                : 'bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-foreground/80 hover:border-white/[0.12]'
            }`}
          >
            {t(chip.labelKey)}
            <span
              aria-hidden="true"
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md ${
                active ? 'bg-white/10' : 'bg-white/[0.04]'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Top-contributors leaderboard for the savings tab.
 *
 * Renders an ordered list (`<ol>`) of the highest-contributing wallets in the
 * group across all non-cancelled pools. Top 3 get medal emoji prefixes; the
 * rest are plain rows. Below `maxRows`, a "+N more" toggle reveals the
 * remainder. The whole component returns `null` when there are zero
 * contributors so we never render an empty leaderboard frame.
 *
 * See `docs/design/savings-redesign.md` §4.2.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { truncateAddress } from '../../lib/stellar';
import type { SavingsContributorRollup } from './useSavingsPools';

interface SavingsLeaderboardProps {
  contributors: SavingsContributorRollup[];
  currency: 'XLM' | 'USDC';
  maxRows?: number;
}

const MEDALS = ['🥇', '🥈', '🥉'] as const;

function formatAmount(n: number): string {
  if (n === 0) return '0.00';
  if (n < 1) return n.toFixed(4);
  if (n < 1_000) return n.toFixed(2);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export default function SavingsLeaderboard({
  contributors,
  currency,
  maxRows = 5,
}: SavingsLeaderboardProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  if (contributors.length === 0) return null;

  const visible = expanded ? contributors : contributors.slice(0, maxRows);
  const hidden = Math.max(0, contributors.length - maxRows);

  return (
    <section
      aria-labelledby="savings-leaderboard-heading"
      className="bg-white/[0.025] border border-white/[0.07] rounded-3xl p-5"
    >
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-400" />
          <h3
            id="savings-leaderboard-heading"
            className="font-black text-sm tracking-tight"
          >
            {t('savings.leaderboard_title')}
          </h3>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
          {contributors.length} {t('savings.leaderboard_count_suffix')}
        </span>
      </header>

      <ol role="list" className="space-y-1.5">
        <AnimatePresence initial={false}>
          {visible.map((c, idx) => {
            const isTopThree = idx < 3;
            const medal = isTopThree ? MEDALS[idx] : null;
            const sharePct = (c.share * 100).toFixed(1);

            return (
              <motion.li
                key={c.walletAddress}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18, delay: idx * 0.04 }}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl transition-colors ${
                  isTopThree
                    ? 'bg-amber-500/[0.04] border border-amber-500/15 hover:bg-amber-500/[0.08]'
                    : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Rank — medal for top 3, monospace digit otherwise.
                       The number is announced via sr-only span; the medal is decorative. */}
                  <span
                    aria-hidden="true"
                    className={`shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-sm ${
                      isTopThree
                        ? ''
                        : 'bg-white/[0.05] border border-white/[0.07] font-mono text-[11px] text-muted-foreground'
                    }`}
                  >
                    {medal ?? idx + 1}
                  </span>
                  <span className="sr-only">{idx + 1}.</span>
                  <span className="font-mono font-bold text-xs text-foreground/80 truncate">
                    {truncateAddress(c.walletAddress)}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                    {sharePct}%
                  </span>
                  <span className="font-mono text-xs font-black text-emerald-300 tabular-nums">
                    +{formatAmount(c.totalAmount)}
                    <span className="text-[9px] ml-1 text-muted-foreground/60">{currency}</span>
                  </span>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-2xl text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp size={12} />
              {t('savings.leaderboard_collapse')}
            </>
          ) : (
            <>
              <ChevronDown size={12} />
              {t('savings.leaderboard_more').replace('{{n}}', String(hidden))}
            </>
          )}
        </button>
      )}
    </section>
  );
}

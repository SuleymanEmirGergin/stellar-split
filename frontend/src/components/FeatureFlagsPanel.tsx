/**
 * Feature flags audit panel for the Settings page.
 *
 * Lists every flag exposed by `lib/featureFlags.ts` with its current value,
 * the env var name (so a power user can override per-environment), and a
 * "copy as .env" button that emits the full `VITE_FF_*=…` block ready to
 * paste into Vercel / Railway env settings.
 *
 * Flags are read-only at runtime — they're build-time constants from Vite's
 * `import.meta.env`. The panel exists to make the wiring visible during
 * demo / debug, not to mutate state.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, ToggleRight, ToggleLeft, Info } from 'lucide-react';
import { getAllFlags, type FlagKey } from '../lib/featureFlags';

const FLAG_DESCRIPTIONS: Record<FlagKey, string> = {
  FEEDBACK_WIDGET:  'Floating feedback FAB + modal (logged-in users only).',
  REFERRAL_UI:      '/referral page + the F keyboard shortcut.',
  SAVINGS_POOL:     'Group savings tab — backend-backed pools.',
  GUARDIAN:         'Account recovery via group guardians (security tab).',
  MERCHANT_QR:      'Merchant dashboard + QR-based pay-to-merchant flow.',
  RECURRING_SPLITS: 'Recurring expense templates (subscriptions tab).',
  SMART_VAULTS:     'DeFi yield deposits via the DeFi tab.',
  AI_CHAT:          'AI assistant (the small "AI" button in the dashboard header).',
};

export function FeatureFlagsPanel() {
  const flags = getAllFlags();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const envBlock = Object.entries(flags)
      .map(([key, value]) => `VITE_FF_${key}=${value}`)
      .join('\n');
    void navigator.clipboard.writeText(envBlock).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/[0.05] border border-amber-500/15 text-amber-200/90">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p className="text-[11px] leading-relaxed">
          These flags are read-only at runtime — they come from{' '}
          <code className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">
            VITE_FF_*
          </code>{' '}
          environment variables baked at build time. To toggle, change the value in
          your hosting provider's env settings and redeploy.
        </p>
      </div>

      <ol role="list" className="space-y-1.5">
        {(Object.entries(flags) as [FlagKey, boolean][]).map(([key, value], i) => (
          <motion.li
            key={key}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/[0.025] border border-white/[0.05]"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] font-black tracking-tight text-foreground">
                  VITE_FF_{key}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${
                    value
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                  aria-label={value ? 'Enabled' : 'Disabled'}
                >
                  {value ? (
                    <>
                      <ToggleRight size={9} /> ON
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={9} /> OFF
                    </>
                  )}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                {FLAG_DESCRIPTIONS[key]}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>

      <button
        type="button"
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.15] text-xs font-bold transition-colors"
      >
        {copied ? (
          <>
            <Check size={12} className="text-emerald-400" />
            Copied to clipboard
          </>
        ) : (
          <>
            <Copy size={12} />
            Copy as .env block
          </>
        )}
      </button>
    </div>
  );
}


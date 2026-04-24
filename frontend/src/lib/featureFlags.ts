/**
 * Feature flags — read from VITE_FF_* environment variables.
 *
 * Each flag defaults to `true` unless explicitly set to the string "false".
 * This means features are ON in development by default and can be toggled
 * off per-environment via Vercel/Railway env var overrides without a code
 * change or a redeploy.
 *
 * Usage:
 *   import { useFlag } from '../lib/featureFlags';
 *   const feedbackEnabled = useFlag('FEEDBACK_WIDGET');
 */

export type FlagKey =
  | 'FEEDBACK_WIDGET'
  | 'REFERRAL_UI'
  | 'SAVINGS_POOL'
  | 'GUARDIAN'
  | 'MERCHANT_QR'
  | 'RECURRING_SPLITS'
  | 'SMART_VAULTS'
  | 'AI_CHAT';

/**
 * Read a feature flag synchronously.
 * Returns `true` if the env var is absent or any value other than "false".
 */
export function getFlag(key: FlagKey): boolean {
  // Vite exposes VITE_* at build time via import.meta.env
  const raw = (import.meta.env as Record<string, string | undefined>)[`VITE_FF_${key}`];
  // Explicitly disabled only when the string equals "false"
  return raw !== 'false';
}

/**
 * React hook that returns the flag value (stable across renders — env is build-time).
 * Works in any component without a provider.
 */
export function useFlag(key: FlagKey): boolean {
  // getFlag is pure + memoised implicitly by JS module caching
  return getFlag(key);
}

/**
 * Returns a snapshot of all flags — useful for a debug panel.
 */
export function getAllFlags(): Record<FlagKey, boolean> {
  const keys: FlagKey[] = [
    'FEEDBACK_WIDGET',
    'REFERRAL_UI',
    'SAVINGS_POOL',
    'GUARDIAN',
    'MERCHANT_QR',
    'RECURRING_SPLITS',
    'SMART_VAULTS',
    'AI_CHAT',
  ];
  return Object.fromEntries(keys.map((k) => [k, getFlag(k)])) as Record<FlagKey, boolean>;
}

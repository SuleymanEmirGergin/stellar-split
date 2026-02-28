/**
 * Formatting primitives for amounts and addresses.
 * Tree-shakeable; no heavy deps.
 */

/** Format XLM amount with optional decimal places (default 2). */
export function formatXLM(amount: number, decimals: number = 2): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '0.00';
  const v = Math.max(0, amount);
  const fixed = v.toFixed(decimals);
  return decimals > 0 ? fixed.replace(/\.?0+$/, '') || '0' : fixed;
}

/** Mask address: show start and end characters (e.g. GABC...WXYZ). */
export function maskAddress(
  addr: string,
  start: number = 4,
  end: number = 4
): string {
  if (!addr || typeof addr !== 'string') return '';
  const s = addr.trim();
  if (s.length <= start + end) return s;
  return `${s.slice(0, start)}...${s.slice(-end)}`;
}

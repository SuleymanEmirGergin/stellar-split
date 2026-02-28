import { isMainnet } from '../../lib/stellar';

export interface NetworkBadgeProps {
  /** Override: when true show TESTNET, when false show MAINNET. If not set, uses isMainnet(). */
  isTestnet?: boolean;
  className?: string;
}

/**
 * Network badge: TESTNET (warning-ish but calm) or MAINNET (neutral/primary).
 */
export function NetworkBadge({ isTestnet, className = '' }: NetworkBadgeProps) {
  const testnet = isTestnet ?? !isMainnet();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
        testnet
          ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20'
          : 'text-primary bg-primary/10 border border-primary/20'
      } ${className}`.trim()}
    >
      {testnet ? 'Testnet' : 'Mainnet'}
    </span>
  );
}

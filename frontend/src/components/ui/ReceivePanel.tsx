import { QRCodeSVG } from 'qrcode.react';
import { maskAddress } from '../../lib/format';
import CopyButton from '../CopyButton';

export interface ReceivePanelProps {
  address: string;
  onCopy?: () => void;
  onClose?: () => void;
  /** Optional translation: (key) => string */
  t?: (key: string) => string;
  className?: string;
}

/** Receive panel: masked address, QR code, Copy address, optional Share. */
export function ReceivePanel({
  address,
  onCopy,
  onClose,
  t = (k) => k,
  className = '',
}: ReceivePanelProps) {
  const qrValue = address; // Raw address for receiving; could use web+stellar:account?account=...
  const canShare = typeof navigator !== 'undefined' && navigator.share;

  const handleShare = async () => {
    if (!canShare) return;
    try {
      await navigator.share({
        title: 'My Stellar address',
        text: address,
      });
      onCopy?.();
    } catch {
      // User cancelled or not supported
    }
  };

  return (
    <div className={`rounded-2xl border border-border bg-card p-6 shadow-xl ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
          {t('receive.title') || 'Receive'}
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
        {t('receive.wallet_address') || 'Wallet address'}
      </p>
      <p className="font-mono text-sm font-bold text-foreground break-all mb-4 tabular-nums">
        {maskAddress(address, 4, 4)}
      </p>
      <div className="inline-block p-4 bg-white rounded-2xl shadow-lg mb-4 dark:bg-white/95">
        <QRCodeSVG
          value={qrValue}
          size={200}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
          includeMargin={false}
          className="rounded-lg"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={address} size="md" onCopy={onCopy} />
        {canShare && (
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground text-sm font-medium transition-colors"
          >
            {t('receive.share') || 'Share'}
          </button>
        )}
      </div>
    </div>
  );
}

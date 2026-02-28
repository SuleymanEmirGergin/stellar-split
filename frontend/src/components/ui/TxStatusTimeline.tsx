import { CheckCircle2, XCircle, Loader2, Copy, ExternalLink } from 'lucide-react';
import { maskAddress } from '../../lib/format';
import { getExplorerTxUrl } from '../../lib/stellar';
import CopyButton from '../CopyButton';

export type TxStatus =
  | 'draft'
  | 'signing'
  | 'submitted'
  | 'pending'
  | 'confirmed'
  | 'failed';

export interface TxStatusTimelineProps {
  status: TxStatus;
  hash?: string | null;
  error?: string | null;
  submittedAt?: Date | number | null;
  feePaid?: string | null;
  onCopyHash?: () => void;
  /** Optional translation for labels; defaults to English. */
  t?: (key: string) => string;
  /** Retry CTA when failed. */
  onRetry?: () => void;
  className?: string;
}

const STEP_ORDER: TxStatus[] = ['draft', 'signing', 'submitted', 'pending', 'confirmed'];
const LABELS: Record<TxStatus, string> = {
  draft: 'Draft',
  signing: 'Signing',
  submitted: 'Submitted',
  pending: 'Pending',
  confirmed: 'Confirmed',
  failed: 'Failed',
};

function stepIndex(s: TxStatus): number {
  const i = STEP_ORDER.indexOf(s);
  return i >= 0 ? i : STEP_ORDER.length;
}

export function TxStatusTimeline({
  status,
  hash,
  error,
  feePaid,
  onCopyHash,
  t = (k) => k,
  onRetry,
  className = '',
}: TxStatusTimelineProps) {
  const isFailed = status === 'failed';
  const currentStep = isFailed ? stepIndex('submitted') : stepIndex(status);
  const explorerUrl = hash ? getExplorerTxUrl(hash) : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Stepper: dots + labels */}
      <div className="flex items-center justify-between gap-0">
        {STEP_ORDER.map((step, i) => {
          const done = i < currentStep || (step === 'confirmed' && status === 'confirmed');
          const active = i === currentStep && !isFailed;
          const isSigning = step === 'signing' && status === 'signing';
          return (
            <div key={step} className="flex flex-col items-center flex-1 min-w-0">
              <div className="flex items-center w-full">
                {i > 0 && (
                  <div
                    className={`flex-1 h-0.5 rounded mx-0.5 ${
                      i <= currentStep && !isFailed ? 'bg-green-500/50' : 'bg-border'
                    }`}
                  />
                )}
                <div
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    done
                      ? 'bg-green-500/20 border-green-500 text-green-500'
                      : active
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-muted border-border text-muted-foreground'
                  }`}
                >
                  {done ? (
                    <CheckCircle2 size={14} className="text-green-500" />
                  ) : active && isSigning ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < STEP_ORDER.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded mx-0.5 ${
                      i < currentStep && !isFailed ? 'bg-green-500/50' : 'bg-border'
                    }`}
                  />
                )}
              </div>
              <span
                className={`mt-1 text-[10px] font-bold uppercase tracking-wider truncate max-w-full text-center ${
                  done ? 'text-green-600 dark:text-green-400' : active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {t(`tx_status.${step}`) || LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>

      {isFailed && error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
          <XCircle size={18} />
          <span className="text-sm font-medium flex-1">{error}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1.5 rounded-lg bg-destructive/20 hover:bg-destructive/30 font-bold text-sm transition-colors"
            >
              {t('common.retry') || 'Retry'}
            </button>
          )}
        </div>
      )}

      {hash && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-full sm:w-auto">
            {t('tx_status.transaction_hash') || 'Transaction hash'}
          </span>
          <code className="font-mono text-xs tabular-nums break-all flex-1 min-w-0">
            {maskAddress(hash, 8, 8)}
          </code>
          <div className="flex items-center gap-1">
            <CopyButton text={hash} size="sm" onCopy={onCopyHash} />
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground text-xs font-medium transition-colors"
              >
                <ExternalLink size={12} />
                {t('tx_status.view_on_explorer') || 'View on Explorer'}
              </a>
            )}
          </div>
        </div>
      )}

      {feePaid && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">
            {t('tx_status.fee_paid') || 'Fee paid'}
          </span>
          <span className="font-mono font-bold tabular-nums">{feePaid}</span>
        </div>
      )}
    </div>
  );
}

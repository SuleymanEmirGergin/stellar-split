import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../lib/i18n';

interface LedgerInfo {
  sequence: number;
  closedAt: string;
  txCount: number;
  opCount: number;
  protocolVersion: number;
}

interface HorizonLedgerRecord {
  sequence: string;
  closed_at: string;
  successful_transaction_count: number;
  failed_transaction_count?: number;
  operation_count: number;
  protocol_version: number;
}

const HORIZON = 'https://horizon-testnet.stellar.org';

export default function NetworkStats() {
  const { t } = useI18n();
  const [ledger, setLedger] = useState<LedgerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = useCallback(async () => {
    try {
      const resp = await fetch(`${HORIZON}/ledgers?order=desc&limit=1`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = (await resp.json()) as { _embedded?: { records?: HorizonLedgerRecord[] } };
      const rec = data._embedded?.records?.[0];
      if (rec) {
        setLedger({
          sequence: Number(rec.sequence),
          closedAt: rec.closed_at,
          txCount: rec.successful_transaction_count + (rec.failed_transaction_count || 0),
          opCount: rec.operation_count,
          protocolVersion: rec.protocol_version,
        });
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ağ durumu yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedger();
    const iv = setInterval(fetchLedger, 10000); // Poll every 10s
    return () => clearInterval(iv);
  }, [fetchLedger]);

  function timeSince(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 5) return 'az önce';
    if (seconds < 60) return `${seconds} sn önce`;
    return `${Math.floor(seconds / 60)} dk önce`;
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-3" />
        <div className="h-8 bg-muted rounded w-2/3" />
      </div>
    );
  }

  if (error || !ledger) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-destructive" />
          <span>Ağ bağlantısı yok</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {t('network.stellar_testnet')}
        </h3>
        <span className="text-xs text-muted-foreground">{timeSince(ledger.closedAt)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('network.ledger')}</div>
          <div className="text-lg font-bold text-foreground">#{ledger.sequence.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('network.transactions')}</div>
          <div className="text-lg font-bold text-foreground">{ledger.txCount}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('network.operations')}</div>
          <div className="text-lg font-bold text-foreground">{ledger.opCount}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('network.protocol')}</div>
          <div className="text-lg font-bold text-foreground">v{ledger.protocolVersion}</div>
        </div>
      </div>
    </div>
  );
}

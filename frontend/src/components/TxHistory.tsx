import { useState, useEffect } from 'react';
import { truncateAddress, getExplorerTxUrl } from '../lib/stellar';
import { SkeletonShimmer } from './ui';

interface TxRecord {
  id: string;
  type: string;
  created_at: string;
  source_account: string;
  transaction_hash: string;
}

interface TxHistoryProps {
  walletAddress: string;
}

const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org';

export default function TxHistory({ walletAddress }: TxHistoryProps) {
  const [transactions, setTransactions] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [walletAddress]);

  async function fetchTransactions() {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(
        `${HORIZON_TESTNET}/accounts/${walletAddress}/operations?order=desc&limit=20`
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      interface HorizonOpRecord {
        id: string;
        type: string;
        created_at: string;
        source_account: string;
        transaction_hash: string;
      }
      const records: TxRecord[] = ((data._embedded?.records || []) as HorizonOpRecord[]).map((r) => ({
        id: r.id,
        type: r.type,
        created_at: r.created_at,
        source_account: r.source_account,
        transaction_hash: r.transaction_hash,
      }));
      setTransactions(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function typeLabel(type: string) {
    const labels: Record<string, string> = {
      invoke_host_function: '📜 Kontrat Çağrısı',
      create_account: '🆕 Hesap Oluştur',
      payment: '💸 Ödeme',
      path_payment_strict_receive: '🔄 Yol Ödemesi',
      manage_sell_offer: '📊 Satış Teklifi',
      manage_buy_offer: '📊 Alış Teklifi',
      change_trust: '🔑 Trust Değiştir',
    };
    return labels[type] || `⚡ ${type}`;
  }

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">📋 İşlem Geçmişi</h3>
        <button
          className="px-3 py-1.5 bg-muted border border-border rounded-lg text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
          onClick={fetchTransactions}
        >
          🔄 Yenile
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
              <div className="flex flex-col gap-2">
                <SkeletonShimmer className="h-4 w-32" />
                <SkeletonShimmer className="h-3 w-24" />
              </div>
              <SkeletonShimmer className="h-3 w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-6 text-destructive text-sm">❌ {error}</div>
      )}

      {/* Empty */}
      {!loading && !error && transactions.length === 0 && (
        <div className="text-center py-8 rounded-2xl border border-dashed border-white/10 bg-white/5">
          <p className="text-sm font-medium text-muted-foreground">No transactions yet.</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">Make your first testnet transaction from the Settle tab or by adding an expense.</p>
        </div>
      )}

      {/* List */}
      {!loading && transactions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {transactions.map((tx) => (
            <a
              key={tx.id}
              className="flex items-center justify-between p-3 bg-card border border-border rounded-lg no-underline text-foreground hover:border-primary/30 hover:bg-muted/50 transition-all group"
              href={getExplorerTxUrl(tx.transaction_hash)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{typeLabel(tx.type)}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {truncateAddress(tx.transaction_hash)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatTime(tx.created_at)}</span>
                <span className="text-sm text-accent opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

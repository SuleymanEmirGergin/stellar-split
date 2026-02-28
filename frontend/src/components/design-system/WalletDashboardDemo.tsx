/**
 * Mini demo: wallet dashboard layout using design-system tokens and classes.
 * Shows hero bg + glass balance card + tx list. VC-ready dashboard aesthetic.
 */

import React from "react";

export function WalletDashboardDemo() {
  return (
    <div className="min-h-screen surface-base bg-hero-aurora">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-[length:var(--text-title-md)] font-semibold tracking-[var(--tracking-tight)] text-[hsl(var(--color-text-hsl))]">
            Wallet
          </h1>
          <button type="button" className="btn-base btn-primary">
            Connect
          </button>
        </header>

        {/* Glass balance card */}
        <section className="mb-8">
          <div className="card-balance glow-recipe-card">
            <span className="balance-label">Total balance</span>
            <p className="balance-metric mt-1">12,450.00 XLM</p>
            <p className="mt-1 text-[length:var(--text-body-sm)] text-[hsl(var(--color-text-muted-hsl))]">
              ≈ $1,245.00 USD
            </p>
          </div>
        </section>

        {/* Actions */}
        <div className="mb-6 flex gap-3">
          <button type="button" className="btn-base btn-primary flex-1">
            Send
          </button>
          <button type="button" className="btn-base btn-secondary flex-1">
            Receive
          </button>
        </div>

        {/* Transaction list */}
        <section>
          <h2 className="mb-3 text-[length:var(--text-label)] font-medium uppercase tracking-[var(--tracking-wide)] text-[hsl(var(--color-text-muted-hsl))]">
            Recent transactions
          </h2>
          <div className="surface-panel overflow-hidden">
            <div className="tx-row">
              <div>
                <p className="tx-meta">Received from alice*stellar.org</p>
                <p className="text-[length:var(--text-caption)] text-[hsl(var(--color-text-muted-hsl))]">
                  2 min ago
                </p>
              </div>
              <span className="tx-amount credit">+1,200.00 XLM</span>
            </div>
            <div className="tx-row border-t border-[hsl(var(--color-border-hsl))]">
              <div>
                <p className="tx-meta">Sent to bob*stellar.org</p>
                <p className="text-[length:var(--text-caption)] text-[hsl(var(--color-text-muted-hsl))]">
                  1 hour ago
                </p>
              </div>
              <span className="tx-amount debit">−350.00 XLM</span>
            </div>
            <div className="tx-row border-t border-[hsl(var(--color-border-hsl))]">
              <div>
                <p className="tx-meta">Swap • XLM → USDC</p>
                <p className="text-[length:var(--text-caption)] text-[hsl(var(--color-text-muted-hsl))]">
                  Yesterday
                </p>
              </div>
              <span className="tx-amount debit">−500.00 XLM</span>
            </div>
          </div>
        </section>

        {/* Status pill example */}
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="pill-status pill-status-success">Completed</span>
          <span className="pill-status pill-status-pending">Pending</span>
          <span className="pill-status pill-status-error">Failed</span>
        </div>
      </div>
    </div>
  );
}

export default WalletDashboardDemo;

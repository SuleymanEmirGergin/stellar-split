/**
 * Mini wallet dashboard demo — uses design system tokens and classes
 * Drop-in: hero bg + glass balance card + tx list. VC-ready dashboard aesthetic.
 *
 * Usage:
 *   1. Import design-system CSS in your app entry (see index.css or main.tsx).
 *   2. Wrap with <div className="dark"> for dark mode.
 *   3. Use <WalletDashboardDemo /> in a route or layout.
 */

import React from "react";

export function WalletDashboardDemo() {
  const balance = "12,450.00";
  const currency = "XLM";
  const txs = [
    { id: "1", label: "Received from Alice", amount: "+1,200.00", type: "credit", time: "2m ago" },
    { id: "2", label: "Send to Bob", amount: "-350.00", type: "debit", time: "1h ago" },
    { id: "3", label: "Swap USDC → XLM", amount: "+2,100.00", type: "credit", time: "3h ago" },
  ] as const;

  return (
    <div className="min-h-screen surface-base">
      {/* Hero background: grid + crypto glow */}
      <div className="relative min-h-[40vh] bg-fintech-grid bg-crypto-glow rounded-b-[24px] overflow-hidden">
        <div className="absolute inset-0 bg-hero-aurora opacity-40 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center justify-center px-4 py-12">
          <h1 className="text-ds-title-xl font-semibold tracking-tight text-[hsl(var(--color-text))]">
            Wallet
          </h1>
          <p className="text-ds-body-sm text-[hsl(var(--color-muted))] mt-1">
            Connect · Balance · Send
          </p>
        </div>
      </div>

      {/* Content area */}
      <div className="relative z-20 -mt-8 px-4 pb-12">
        {/* Glass balance card */}
        <div className="card-balance mb-8">
          <p className="balance-label mb-1">Total balance</p>
          <p className="balance-metric">
            {balance} <span className="text-ds-body font-medium text-[hsl(var(--color-muted))]">{currency}</span>
          </p>
          <div className="flex gap-2 mt-4">
            <button type="button" className="btn-primary">
              Send
            </button>
            <button type="button" className="btn-secondary">
              Receive
            </button>
          </div>
        </div>

        {/* Transaction list */}
        <div className="surface-panel p-4">
          <h2 className="text-ds-title-md font-semibold text-[hsl(var(--color-text))] mb-4">
            Recent activity
          </h2>
          <ul className="divide-y divide-[hsl(var(--color-border)/0.6)]">
            {txs.map((tx) => (
              <li key={tx.id} className="tx-row">
                <div>
                  <p className="font-medium text-[15px] text-[hsl(var(--color-text))]">{tx.label}</p>
                  <p className="tx-meta">{tx.time}</p>
                </div>
                <span className={`tx-amount ${tx.type}`}>{tx.amount} {currency}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Status pill example */}
        <div className="mt-6 flex gap-2 flex-wrap">
          <span className="toast-pill success">Success</span>
          <span className="toast-pill error">Error</span>
          <span className="toast-pill info">Pending</span>
        </div>
      </div>
    </div>
  );
}

export default WalletDashboardDemo;

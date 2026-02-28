/**
 * Mini demo — wallet dashboard layout
 * Hero bg + glass balance card + tx list. VC-ready dashboard aesthetic.
 * Uses design-system tokens and class recipes.
 */

import React from "react";

export function DemoDashboard() {
  return (
    <div className="min-h-screen surface-base bg-fintech-grid">
      {/* Hero area with subtle glow */}
      <header className="relative bg-hero-aurora px-6 pt-8 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-crypto-glow pointer-events-none" aria-hidden />
        <div className="relative flex items-center justify-between">
          <h1 className="text-dashboard-title text-[hsl(var(--text))]">Wallet</h1>
          <button
            type="button"
            className="recipe-btn-secondary"
            aria-label="Connect wallet"
          >
            Connect
          </button>
        </div>
      </header>

      {/* Glass balance card (overlap hero) */}
      <main className="relative px-6 -mt-16">
        <section
          className="recipe-balance-card surface-glass glow-recipe-card border-hairline-subtle rounded-xl shadow-elev3 max-w-md mx-auto"
          aria-labelledby="balance-label"
        >
          <p id="balance-label" className="text-dashboard-label mb-1">
            Total balance
          </p>
          <p className="text-dashboard-metric tabular-nums">12,450.00 XLM</p>
          <p className="text-dashboard-caption mt-1">≈ $2,341.00 USD</p>
          <div className="flex gap-3 mt-4">
            <button type="button" className="recipe-btn-primary flex-1">
              Send
            </button>
            <button type="button" className="recipe-btn-secondary flex-1">
              Receive
            </button>
          </div>
        </section>

        {/* Transaction list */}
        <section className="mt-8 max-w-md mx-auto" aria-labelledby="tx-label">
          <h2 id="tx-label" className="text-dashboard-label mb-3">
            Recent activity
          </h2>
          <ul className="surface surface-elevated rounded-xl border-hairline-subtle shadow-elev1 divide-y divide-[hsl(var(--border-subtle))] overflow-hidden">
            <li>
              <div className="recipe-tx-row">
                <span className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center text-success text-sm font-medium" aria-hidden>
                  ↓
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-dashboard-body font-medium truncate">Received from …7f3a</p>
                  <p className="text-dashboard-caption">2 min ago</p>
                </div>
                <span className="text-dashboard-metric-sm text-success tabular-nums">+1,200 XLM</span>
              </div>
            </li>
            <li>
              <div className="recipe-tx-row">
                <span className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-medium" aria-hidden>
                  ↑
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-dashboard-body font-medium truncate">Sent to …4b2c</p>
                  <p className="text-dashboard-caption">1 hour ago</p>
                </div>
                <span className="text-dashboard-metric-sm text-[hsl(var(--text))] tabular-nums">-450 XLM</span>
              </div>
            </li>
            <li>
              <div className="recipe-tx-row">
                <span className="w-9 h-9 rounded-full bg-[hsl(var(--muted-foreground))]/15 flex items-center justify-center text-muted-foreground text-sm font-medium" aria-hidden>
                  •
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-dashboard-body font-medium truncate">Swap XLM → USDC</p>
                  <p className="text-dashboard-caption">Yesterday</p>
                </div>
                <span className="recipe-status-pill text-dashboard-caption" data-status="success">
                  Completed
                </span>
              </div>
            </li>
          </ul>
        </section>

        {/* Toast example (positioned for demo) */}
        <div
          className="recipe-toast mt-6 max-w-md mx-auto"
          role="status"
          aria-live="polite"
        >
          <span className="w-2 h-2 rounded-full bg-success shrink-0" aria-hidden />
          <span>Transaction confirmed</span>
        </div>
      </main>
    </div>
  );
}

export default DemoDashboard;

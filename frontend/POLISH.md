# UX + UI Polish Pack

Summary of changes from the Web3 wallet dashboard polish implementation.

## 0. Setup / shared primitives

- **`src/lib/motion.ts`** – `motionEnabled()` (reads `prefers-reduced-motion`), `clearMotionCache()`, and `MOTION` constants (durations, easing). Used to gate animations app-wide.
- **`src/lib/format.ts`** – `formatXLM(amount, decimals?)`, `maskAddress(addr, start?, end?)`. Tree-shakeable, no heavy deps.
- **`src/components/ui/Toast.tsx`** – Re-exports `ToastProvider`, `useToast`, and `ToastType` from existing `components/Toast.tsx` for a single import path.
- **`src/components/ui/Glow.tsx`** – Small radial glow overlay (color, blur, size, inset). Used for Send pending and card emphasis.
- **`src/components/ui/SkeletonShimmer.tsx`** – Shimmer skeleton that falls back to static pulse when `prefers-reduced-motion` is set.
- **Tests** – `src/lib/format.test.ts`, `src/lib/motion.test.ts` for format and motion helpers.

## 1. Micro-interactions

- **BalanceMetric** (`src/components/ui/BalanceMetric.tsx`) – Animated balance display: count-up over ~650ms, tabular-nums. No animation when `motionEnabled()` is false. Used in App header for wallet balance.
- **Send glow** – Settle “Mark group settled” button and card use `Glow` when `settling` is true (gradient/glow ring + faint radial glow).
- **Success pulse** – Success toasts get a green pulse overlay (900–1200ms, fades out). Pulse only when `motionEnabled()`; static success state otherwise. Implemented in `components/Toast.tsx` with `animate-success-pulse` (Tailwind).
- **Glass hover** – `.card-hover` utility in `index.css`: light sweep overlay + slight lift on hover; disabled when `prefers-reduced-motion: reduce`. Applied to Dashboard group cards and SettleTab settlement cards.
- **Skeleton shimmer** – Balance loading in App header and Tx list / GroupDetail loading use `SkeletonShimmer` instead of spinners.

## 2. Financial trust

- **TxStatusTimeline** (`src/components/ui/TxStatusTimeline.tsx`) – Stepper for draft → signing → submitted → pending → confirmed/failed. Optional hash row with Copy + “View on Explorer”. Used in SettleTab with `lastSettleStatus` / `lastSettleError` and retry CTA on failure.
- **Pending → confirmed** – GroupDetail tracks `lastSettleStatus` and `lastSettleError`; SettleTab shows timeline during and after settle. No change to contract polling (already in `signAndSubmit`).
- **Copy tx hash** – TxStatusTimeline “Copy” uses `navigator.clipboard` with fallback and shows “Copied” toast. CopyButton also shows “Copied” toast on copy.
- **Explorer link** – `getExplorerTxUrl(hash)` and `isTestnet()` in `src/lib/stellar.ts`. TxHistory and TxStatusTimeline use it for “View on Explorer” (network-aware).
- **Fee transparency** – SettleTab shows estimated fee before send and “Fee paid” (using same estimate) after success. Fee in XLM (and stroops in copy).

## 3. Premium wallet

- **ReceiveModal** (`src/components/ui/ReceiveModal.tsx`) – Receive panel: QR from address, masked address, “Copy address”, “Share” (if `navigator.share`). Modal opens with soft scale (0.98 → 1) and fade.
- **Copy address animation** – CopyButton shows 600ms highlight (animate-copy-highlight) and checkmark when copied; no highlight when `motionEnabled()` is false.
- **Mask address** – Header and ReceiveModal use `maskAddress()` from `format.ts` (e.g. GABC...WXYZ). Full address via Copy.
- **NetworkBadge** (`src/components/ui/NetworkBadge.tsx`) – TESTNET (amber) / MAINNET (primary) near header when wallet connected, using `isTestnet()` from stellar.
- **Fee preview** – SettleTab fee estimate row is the pre-send fee preview; unchanged.

## 4. Motion identity

- **Gradient drift** – `.gradient-drift` in `index.css`: slow background gradient animation. Disabled when `prefers-reduced-motion: reduce`. Applied as fixed overlay in App layout.
- **Page transition** – Main content wrapped in `AnimatePresence` + `motion.div` keyed by `pathname`: fade + 8px depth (y) on route change (duration from `MOTION_DURATION_PAGE`).
- **Modal soft scale** – ReceiveModal opens with scale 0.98 → 1 and fade (framer-motion, `MOTION_DURATION_MODAL`).

## 5. Data visualization

- **DashboardCharts** (`src/components/ui/DashboardCharts.tsx`) – Balance line (last 7 days), last 7 days tx histogram, asset distribution (XLM 100% placeholder). Uses Recharts; empty states when no data. Rendered on Dashboard.

## 6. Dark / light mode

- Existing theme (default dark, light toggle) and CSS variables unchanged. Glow and chart colors use `hsl(var(--chart-1))` etc., so they follow theme.

## 7. UX polish

- **“Copied” toast** – CopyButton and TxStatusTimeline copy both call `addToast('Copied', 'success')`.
- **Empty states** – TxHistory: friendly “No transactions yet” + CTA. SettleTab and Dashboard already had empty states; TxStatusTimeline shows clear failed state + Retry.
- **Human error messages** – `lib/errors.ts`: added mappings for insufficient balance and invalid address (TR/EN).
- **Offline** – Existing offline banner (App) and `useOffline`. Send (settle) disabled when `isOffline`; `isOffline` passed from App → GroupDetail → SettleTab. Button shows disabled style and title “You’re offline”.

## File map

| Area | Files |
|------|--------|
| Primitives | `src/lib/motion.ts`, `src/lib/format.ts`, `src/lib/format.test.ts`, `src/lib/motion.test.ts` |
| UI components | `src/components/ui/Toast.tsx`, `src/components/ui/Glow.tsx`, `src/components/ui/SkeletonShimmer.tsx`, `src/components/ui/BalanceMetric.tsx`, `src/components/ui/TxStatusTimeline.tsx`, `src/components/ui/ReceiveModal.tsx`, `src/components/ui/NetworkBadge.tsx`, `src/components/ui/DashboardCharts.tsx` |
| Stellar | `src/lib/stellar.ts` (getExplorerTxUrl, isTestnet) |
| Styles | `src/index.css` (card-hover, gradient-drift, success-pulse, copy-highlight in Tailwind) |
| Integrations | `App.tsx`, `components/Toast.tsx`, `components/CopyButton.tsx`, `components/GroupDetail.tsx`, `components/tabs/SettleTab.tsx`, `components/Dashboard.tsx`, `components/TxHistory.tsx`, `lib/errors.ts`, `tailwind.config.js` |

## Constraints respected

- Interactions kept subtle and premium (Apple/Stripe feel).
- No heavy full-screen filters; gradient drift is low-opacity and CSS-only.
- `prefers-reduced-motion` respected via `motionEnabled()` and CSS `@media (prefers-reduced-motion: reduce)`.
- Unit tests for format and motion; deterministic where possible.
- Existing flows (wallet connect, balance fetch, send/settle) unchanged; polish layered on top.

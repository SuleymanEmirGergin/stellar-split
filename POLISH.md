# UX/UI Polish Pack — Summary

This document describes the UX and UI polish applied to the Web3 wallet dashboard (StellarSplit). All changes respect **prefers-reduced-motion**, keep interactions **subtle and premium** (Apple/Stripe vibe), and avoid breaking existing flows (wallet connect, balance fetch, send/settle).

---

## 0. Setup / shared primitives

**New files**

- **`frontend/src/lib/motion.ts`**  
  - `motionEnabled()` — reads `prefers-reduced-motion` (returns `false` when user prefers reduced motion).  
  - `useMotionEnabled()` — React hook that updates when the preference changes.  
  - `MOTION` — shared durations (e.g. `balance: 650`, `successPulse: 1000`) and easing strings.

- **`frontend/src/lib/format.ts`**  
  - `formatXLM(amount, decimals?)` — formats XLM for display; default 2 decimals.  
  - `maskAddress(addr, start?, end?)` — e.g. `GABC...WXYZ` (default 4…4).

- **`frontend/src/components/ui/Toast.tsx`**  
  - Re-exports existing `ToastProvider`, `useToast`, and `ToastType` from `../Toast` for consistent UI imports.

- **`frontend/src/components/ui/Glow.tsx`**  
  - Small overlay component for radial/linear glow. Props: `intensity`, `color` (primary/success/neutral), `radial`, `children`. Used for pending states and card feedback.

- **`frontend/src/components/ui/SkeletonShimmer.tsx`**  
  - Shimmer skeleton base. Uses CSS shimmer when motion is enabled; falls back to static pulse when `prefers-reduced-motion` is set. Supports `rounded` variants.

**Tests**

- **`frontend/src/lib/format.test.ts`** — `formatXLM` and `maskAddress`.  
- **`frontend/src/lib/motion.test.ts`** — `motionEnabled()` and `MOTION` constants.

---

## 1. Micro-interactions

- **Animated balance counter**  
  - **`frontend/src/components/ui/BalanceMetric.tsx`** — Count-up from previous value to new over ~650 ms, `tabular-nums`. Used in the header for wallet balance. No animation when reduced motion.

- **Send (settle) glow feedback**  
  - In **`SettleTab`**: when “Mark group settled” is pending, the button gets a subtle ring/glow and the card area gets a faint radial glow via `Glow` (success). Disabled state remains clear.

- **Success soft green pulse**  
  - In **`Toast.tsx`**: success toasts use class `toast-success-pulse` (green pulse behind toast, ~1 s, fades out). Pulse is disabled when `prefers-reduced-motion: reduce` (see **`index.css`**).

- **Glass hover (cards)**  
  - **`index.css`**: utility `.card-glass-hover` — light sweep overlay (::after) + slight lift on hover. No layout shift. Applied to Dashboard group cards, quick stats, and SettleTab settlement cards. Motion disabled when reduced motion.

- **Skeleton shimmer loading**  
  - **`GroupDetail`** loading state now uses `SkeletonShimmer` instead of plain `Skeleton`. Shimmer respects reduced motion (static pulse when disabled).

---

## 2. Financial trust pack

- **Transaction status timeline**  
  - **`frontend/src/components/ui/TxStatusTimeline.tsx`** — Stepper: draft → signing → submitted → pending → confirmed (or failed). Shows transaction hash row when available, “Fee paid” row, “View on Explorer” link, and retry CTA on failure. Used in GroupDetail after settle flow.

- **Pending → confirmed flow**  
  - **`frontend/src/lib/contract.ts`** — `settleGroup` now returns `{ settlements, txHash }`. Existing polling inside `signAndSubmit` unchanged. GroupDetail shows timeline with status `signing` then `confirmed`/`failed` and stores `lastTxHash`, `lastFeePaid` for the receipt.

- **Copy tx hash**  
  - **`CopyButton`** — New optional `onCopy` callback (e.g. show “Copied” toast). TxStatusTimeline uses it for the hash row. Uses `navigator.clipboard` with execCommand fallback.

- **Blockchain explorer link**  
  - **`frontend/src/lib/stellar.ts`** — `getExplorerTxUrl(hash)` builds testnet/mainnet URL (Stellar Expert). `isTestnet()` added for network badge.

- **Fee transparency**  
  - Before send: SettleTab already shows estimated fee row.  
  - After send: TxStatusTimeline shows “Fee paid” (e.g. `~0.01 XLM`) in the receipt when available.

---

## 3. Premium wallet experience

- **QR share address (Receive panel)**  
  - **`frontend/src/components/ui/ReceivePanel.tsx`** — Shows masked address, QR code (raw address), “Copy address” (with toast via `onCopy`), and “Share” when `navigator.share` is available.  
  - **App.tsx** — “Receive” button in header opens a modal with `ReceivePanel`; backdrop click closes.

- **Copy address animation**  
  - **`CopyButton`** — After copy, applies class `copy-just-copied` for 600 ms (subtle ring highlight). **`index.css`** defines the animation and disables it when `prefers-reduced-motion: reduce`. Toast “Copied” via `onCopy` in header and Receive panel.

- **Mask address**  
  - Header and Receive panel use `maskAddress()` from `format.ts` (e.g. `GABC...WXYZ`). Full address available via copy.

- **Network badge**  
  - **App.tsx** header — Badge “Testnet” (amber) or “Mainnet” (primary) using `isTestnet()` from `stellar.ts`. Visible when wallet is connected.

- **Fee preview (pre-send)**  
  - SettleTab continues to show estimated fee row that updates when relevant (e.g. when on Settle tab with settlements).

---

## 4. Motion identity

- **Hero gradient drift**  
  - **`index.css`** — `.hero-gradient-drift` with slow gradient animation (~20 s).  
  - **Landing.tsx** — Hero section has a subtle gradient drift layer; animation disabled when reduced motion.

- **Page transition (fade + depth)**  
  - **App.tsx** — Main content wrapped in `AnimatePresence` and `motion.div` with `key={pathname}`. Enter: fade in + 8 px upward; exit: fade out + 8 px upward. Reduced motion: no y offset (fade only). Uses `useMotionEnabled()`.

- **Modal soft scale**  
  - **`index.css`** — `.modal-soft-scale`: open animation scale 0.98 → 1 with fade (0.25 s). Disabled when reduced motion.  
  - Receive panel modal uses this class. Other modals (e.g. Dashboard create, GroupDetail) use existing framer-motion scale/fade.

---

## 5. Data visualization pack

- **`frontend/src/components/ui/WalletCharts.tsx`**  
  - **Balance change line chart** — Last N points (mock data if no API), smooth line, tooltip on hover (Recharts).  
  - **Last 7 transactions histogram** — Bars by day (count).  
  - **Fee distribution** — Small donut (Recharts/DonutChart) when fee data exists; empty state otherwise.  
  - **Asset distribution** — Donut (e.g. “XLM 100%” placeholder when single asset).  
  - Empty states for each chart when no data. Responsive layout.

- **Dashboard** — New “Data viz” section using `WalletCharts` (below quick stats, above main grid).

---

## 6. Dark / light mode

- **Theme** — App already defaults to dark; light mode uses existing tokens.  
- **`index.css`** — `--glow-intensity` added for `:root` (light) and `.dark` so glow intensity can be adapted per mode in future (e.g. in `Glow` component).

---

## 7. UX polish details

- **“Copied” toast** — Every copy action (address, tx hash) uses `CopyButton` with `onCopy` that calls `addToast(t('common.copied') || 'Copied')`. i18n: `common.copied` (EN/TR).

- **Empty states** — SettleTab (no settlements), WalletCharts (no balance/tx/fee/asset data), and existing dashboard/group empty states. Receive panel is only shown when address exists.

- **Human error messages** — **`frontend/src/lib/errors.ts`** — `translateError()` already maps many contract/network errors. Added patterns for “insufficient balance” and “invalid address” (TR/EN).

- **Offline indicator** — **App.tsx** — Existing offline banner (e.g. “Offline — Try again when connected”) using `useOffline()` and `navigator.onLine` + events. **GroupDetail** and **SettleTab** — New `isOffline` prop; settle button is disabled when offline with a title hint.

---

## File / import overview

| Area              | New/updated files |
|-------------------|--------------------|
| Primitives        | `lib/motion.ts`, `lib/format.ts`, `components/ui/Toast.tsx`, `Glow.tsx`, `SkeletonShimmer.tsx` |
| Micro-interactions | `ui/BalanceMetric.tsx`, `Toast.tsx` (success pulse), `SettleTab.tsx`, `Dashboard.tsx`, `GroupDetail.tsx`, `index.css` |
| Financial trust   | `ui/TxStatusTimeline.tsx`, `lib/stellar.ts` (explorer URL, isTestnet), `lib/contract.ts` (SettleGroupResult, txHash), `CopyButton.tsx` (onCopy), `GroupDetail.tsx` |
| Premium wallet    | `ui/ReceivePanel.tsx`, `App.tsx` (Receive modal, network badge, maskAddress), `CopyButton.tsx`, `index.css` (copy highlight) |
| Motion            | `Landing.tsx`, `App.tsx` (page transition, motionEnabled), `index.css` (gradient drift, modal scale) |
| Data viz          | `ui/WalletCharts.tsx`, `Dashboard.tsx` |
| Theming           | `index.css` (--glow-intensity) |
| UX polish         | `errors.ts`, `i18n.ts` (common.copied, receive.*), `SettleTab.tsx`, `GroupDetail.tsx`, `App.tsx` (isOffline to GroupDetail) |

---

## Constraints respected

- **prefers-reduced-motion** — All non-essential motion (balance count-up, success pulse, glass hover, gradient drift, page transition, modal scale, copy highlight, shimmer) are disabled or reduced when the user prefers reduced motion.  
- **No heavy deps** — Primitives are tree-shakeable; Recharts and framer-motion were already in the project.  
- **Existing flows** — Wallet connect, balance fetch, and send (settle) flow unchanged in behavior; only UX/UI and return type of `settleGroup` (now `{ settlements, txHash }`) extended.

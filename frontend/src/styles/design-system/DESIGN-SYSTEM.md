# Web3 / Fintech Design System

Apple clarity + Stripe gradients + Web3 dashboard. Dark-first, VC-ready.

---

## 1. Color Tokens (HSL + HEX fallback)

### Semantic mapping table

| Token | Purpose | Light (default) | Dark | Min contrast note |
|-------|---------|-----------------|------|-------------------|
| `--color-primary` | CTAs, links, focus | 217 91% 60% (#4D8AFF) | same | Use on bg ≥ 4.5:1 for text |
| `--color-secondary` | Secondary actions, chips | 224 30% 24% | 224 22% 18% | Pair with secondary-foreground |
| `--color-accent` | Highlights, badges | 268 75% 58% (#8B5CF6) | same | Decorative or on light bg |
| `--color-bg` | Page background | 220 20% 98% | 224 28% 8% | Base layer |
| `--color-surface` | Cards, panels | 0 0% 100% | 224 22% 12% | Content on top |
| `--color-elevated` | Modals, dropdowns | 0 0% 100% | 224 20% 16% | One step above surface |
| `--color-border` | Dividers, outlines | 220 14% 90% | 224 18% 22% | Subtle separation |
| `--color-text` | Primary text | 222 25% 14% | 210 25% 96% | ≥ 4.5:1 on bg/surface |
| `--color-text-muted` | Secondary text | 220 12% 48% | 215 16% 58% | ≥ 3:1 on bg |
| `--color-success` | Success state | 152 58% 42% | same | Use success-foreground on fill |
| `--color-warn` | Warning state | 38 92% 50% | same | Prefer dark text on light |
| `--color-error` | Error, destructive | 0 72% 51% | same | Use error-foreground on fill |
| `--color-info` | Info state | 199 89% 48% | same | Use info-foreground on fill |
| `--color-chart-1..8` | Data viz series | See tokens.css | same | Distinguishable in charts |
| `--color-crypto-xlm/btc/eth` | Crypto accents (subtle) | Context only | same | Not for long text |

### Text-on-background pairings (recommended)

- **Primary text** on `--color-bg`, `--color-surface`, `--color-elevated`: OK (contrast met).
- **Muted text** on same: OK for secondary copy.
- **Primary button** (primary-foreground on primary): OK.
- **White/primary-foreground** on primary/accent/success/error: OK for short labels and buttons.

### Themes

- **Default**: Light `:root`, dark `.dark` or `[data-theme="dark"]`.
- **Midnight Neon**: `[data-theme="midnight-neon"]` — purple/teal accents, very dark base; neon only as controlled glow.

---

## 2. Gradient Palette

| # | Name | Usage | Intensity |
|---|------|--------|------------|
| 1 | `--gradient-hero-1` | Primary CTA, hero buttons | Full |
| 2 | `--gradient-hero-2` | Dark hero background base | Full |
| 3 | `--gradient-hero-3` | Top fade overlay | Soft |
| 4 | `--gradient-hero-4` | Horizontal accent strip | Soft |
| 5 | `--gradient-glow-1` | Card glow (top) | soft/medium/strong via `--glow-opacity` |
| 6 | `--gradient-glow-2` | Card glow (side) | soft/medium/strong |
| 7 | `--gradient-glow-3` | Corner accent | soft |
| 8 | `--gradient-glow-4` | Bottom glow | soft |
| 9 | `--gradient-success-1` | Success button/fill | Full |
| 10 | `--gradient-success-2` | Success pill/background | Soft |
| 11 | `--gradient-warn-1` | Warning pill/background | Soft |
| 12 | `--gradient-error-1` | Error pill/background | Soft |

**Glow recipes**: `.glow-recipe-card`, `.glow-recipe-card-medium`, `.glow-recipe-hero` (see tokens.css).

**Shimmer**: `--gradient-shimmer`, `--gradient-shimmer-moving`; use with `.shimmer-skeleton` for skeleton loaders.

**Banding**: Gradients use multiple stops (e.g. 0%, 25%, 50%, 100%); avoid large single-step jumps.

---

## 3. Style Pack (Surfaces, Typography, Components)

### Radius

`--radius-sm` (6px), `--radius-md` (10px), `--radius-lg` (14px), `--radius-xl` (18px), `--radius-2xl` (24px), `--radius-full`.

### Spacing

`--space-1` (4px) through `--space-16` (64px).

### Borders

- Hairline: `--border-width-hair` (1px).
- Gradient border: `.border-gradient-subtle` (uses `--border-gradient`).

### Shadows (elevation 0..4)

`--shadow-0` (none), `--shadow-1` … `--shadow-4` (Apple-like soft). Optional: `--shadow-glow-subtle`, `--shadow-glow-medium`.

### Blur

`--blur-sm` (8px) … `--blur-2xl` (40px). Fallback 0 when `backdrop-filter` unsupported.

### Typography

- **Title**: `--text-title-lg/md/sm` (24/20/18px).
- **Metric** (balance, big numbers): `--text-metric`, `--text-metric-sm`; use `font-variant-numeric: tabular-nums`.
- **Body**: `--text-body`, `--text-body-sm`.
- **Label / caption**: `--text-label`, `--text-caption`.
- **Tracking**: `--tracking-tight`, `--tracking-normal`, `--tracking-wide`, `--tracking-tabular`.

### Component recipes (Tailwind-ish)

| Component | Classes |
|-----------|---------|
| Surface base | `surface-base` |
| Surface panel | `surface-panel` |
| Surface elevated | `surface-elevated` |
| Glass panel | `surface-glass` |
| Wallet balance card | `card-balance` + `.balance-metric` + `.balance-label` |
| Transaction row | `tx-row` + `.tx-amount` (`.credit`/`.debit`) + `.tx-meta` |
| Primary button | `btn-base btn-primary` |
| Secondary button | `btn-base btn-secondary` |
| Ghost button | `btn-base btn-ghost` |
| Input | `input-field` |
| Status pill | `pill-status pill-status-success|warn|error|info|pending` |
| Gradient border | `border-gradient-subtle` |

**Micro details**: Focus ring 2px primary; hover lift/brightness where defined; disabled opacity 0.5 and no pointer events.

---

## 4. Background System

| Class | Description |
|-------|-------------|
| `bg-fintech-grid` | CSS-only grid |
| `bg-fintech-grid-svg` | SVG grid overlay |
| `bg-node-network` | CSS-only node dots |
| `bg-node-network-svg` | SVG node overlay |
| `bg-crypto-glow` | Subtle gradient + glow |
| `bg-hero-aurora` | Hero gradient stack |
| `bg-hero-aurora-animated` | Hero with gradient drift (respects reduced-motion) |
| `shimmer-skeleton` | Skeleton loader (reduced-motion: no animation) |

**Motion**: `gradient-drift`, `shimmer-token` keyframes; particle-style optional. All decorative motion gated by `prefers-reduced-motion: reduce`.

**Performance**: Prefer transforms/opacity; avoid heavy blur on full viewport; use CSS-only patterns when possible.

---

## 5. Do / Don’t (premium, trustworthy)

**Do**

- Use semantic tokens (e.g. `--color-text`, `--color-surface`) instead of one-off hex.
- Keep glows subtle and behind content; use `--glow-opacity-soft` by default.
- Use tabular-nums for amounts and metrics.
- Support dark and light; test contrast for text and interactive elements.
- Use focus-visible rings and clear hover/disabled states.

**Don’t**

- Avoid pure neon everywhere; limit to controlled accents (e.g. Midnight Neon theme).
- Don’t put strong gradients behind long text blocks.
- Don’t use heavy backdrop-filter on full-page layers.
- Don’t skip reduced-motion for decorative animations.

---

## 6. Drop-in usage

1. **CSS**: Import in order: `tokens.css` → `components.css` → `backgrounds.css` (after Tailwind base).
2. **Tailwind**: Use `tailwind.design-system.extend.js` (or merge into `theme.extend`); use `hsl(var(--color-*))` and semantic names.
3. **Theme**: Set `class="dark"` or `data-theme="midnight-neon"` on `<html>` or a wrapper.

---

## 7. Mini demo snippet (HTML)

Minimal wallet dashboard layout: hero bg + glass balance card + tx list. Use with design-system CSS loaded.

```html
<div class="min-h-screen surface-base bg-hero-aurora">
  <div class="mx-auto max-w-2xl px-4 py-8">
    <header class="mb-8 flex items-center justify-between">
      <h1 class="text-[length:var(--text-title-md)] font-semibold text-[hsl(var(--color-text-hsl))]">Wallet</h1>
      <button type="button" class="btn-base btn-primary">Connect</button>
    </header>
    <section class="mb-8">
      <div class="card-balance glow-recipe-card">
        <span class="balance-label">Total balance</span>
        <p class="balance-metric mt-1">12,450.00 XLM</p>
        <p class="mt-1 text-[length:var(--text-body-sm)] text-[hsl(var(--color-text-muted-hsl))]">≈ $1,245.00 USD</p>
      </div>
    </section>
    <div class="mb-6 flex gap-3">
      <button type="button" class="btn-base btn-primary flex-1">Send</button>
      <button type="button" class="btn-base btn-secondary flex-1">Receive</button>
    </div>
    <section>
      <h2 class="mb-3 text-[length:var(--text-label)] uppercase tracking-wide text-[hsl(var(--color-text-muted-hsl))]">Recent transactions</h2>
      <div class="surface-panel overflow-hidden">
        <div class="tx-row">
          <div><p class="tx-meta">Received from alice*stellar.org</p><p class="text-[length:var(--text-caption)] text-[hsl(var(--color-text-muted-hsl))]">2 min ago</p></div>
          <span class="tx-amount credit">+1,200.00 XLM</span>
        </div>
        <div class="tx-row border-t border-[hsl(var(--color-border-hsl))]">
          <div><p class="tx-meta">Sent to bob*stellar.org</p><p class="text-[length:var(--text-caption)] text-[hsl(var(--color-text-muted-hsl))]">1 hour ago</p></div>
          <span class="tx-amount debit">−350.00 XLM</span>
        </div>
      </div>
    </section>
    <div class="mt-6 flex gap-2">
      <span class="pill-status pill-status-success">Completed</span>
      <span class="pill-status pill-status-pending">Pending</span>
    </div>
  </div>
</div>
```

React: use `<WalletDashboardDemo />` from `src/components/design-system/WalletDashboardDemo.tsx`.

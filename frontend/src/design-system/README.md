# Web3 Wallet / Fintech Design System

Apple clarity + Stripe gradients + Web3 dashboard. Dark-first, HSL tokens, accessibility-conscious.

---

## Drop-in usage

```ts
// In main.tsx or your root CSS (before Tailwind):
import "./design-system/index.css";
```

Tailwind is already extended in `tailwind.config.js` with design-system colors, shadows, blur, and keyframes.

---

## 1. Color tokens (HSL + HEX fallback)

### Semantic mapping table

| Token | Role | Light | Dark | Contrast note |
|-------|------|-------|------|----------------|
| `--primary` | Primary actions, links | Blue 52% | Blue 58% | Use `--primary-foreground` on top (AAA) |
| `--secondary` | Secondary surfaces | Light gray | Dark gray | Text: `--secondary-foreground` |
| `--accent` | Highlights, badges | Purple | Purple | Foreground white (AAA) |
| `--bg` | Page background | Near white | Near black | Base layer |
| `--surface` | Cards, panels | White | Dark gray | Default content surface |
| `--surface-elevated` | Modals, dropdowns | White | Slightly lighter | Elevation 1 |
| `--border` | Borders, dividers | Light gray | Mid gray | 4.5:1 not required for borders |
| `--border-subtle` | Hairlines | Lighter | Darker | Subtle separation |
| `--text` | Primary text | Dark | Light | Min 7:1 on `--bg` (AAA) |
| `--text-muted` | Secondary text | Gray | Mid gray | Min 4.5:1 on `--bg` (AA) |
| `--success` | Success state | Green | Green | Use on `--surface` with pill/badge |
| `--warn` | Warning | Amber | Amber | Dark text on light bg |
| `--error` | Error, destructive | Red | Red | White text (AAA) |
| `--info` | Info | Blue | Blue | White or dark text by context |
| `--chart-1..8` | Data viz | Semantic set | Brighter set | Distinct series, avoid red/green only |
| `--crypto-xlm` | XLM-like accent | Teal | Teal | Controlled glow only |
| `--crypto-btc` | BTC-like accent | Orange | Orange | Not for large fills |
| `--crypto-eth` | ETH-like accent | Blue-purple | Blue-purple | Accent only |

### Themes

- **Default**: `:root` (light), `.dark` (dark).
- **Midnight Neon**: `.theme-midnight-neon` or `.dark.theme-midnight-neon` (teal primary, controlled glow).

---

## 2. Gradient palette (12 + glow + shimmer)

| Name | Class | Usage |
|------|--------|--------|
| Primary hero | `.gradient-hero-primary` | Hero CTA |
| Hero slate | `.gradient-hero-slate` | Neutral hero |
| Hero aurora | `.gradient-hero-aurora` | Dark hero bg |
| Hero accent | `.gradient-hero-accent` | Brand hero |
| Card glow primary | `.gradient-card-glow-primary` | Behind cards |
| Card glow accent | `.gradient-card-glow-accent` | Halo |
| Card glow xlm | `.gradient-card-glow-xlm` | XLM context |
| Card glow multi | `.gradient-card-glow-multi` | Multi-color halo |
| Success | `.gradient-success` | Success CTA/pill |
| Success soft | `.gradient-success-soft` | Success halo |
| Warning | `.gradient-warning` | Warn state |
| Error | `.gradient-error` | Error state |
| Glow recipe card | `.glow-recipe-card` | Border + radial behind card |
| Glow recipe hero | `.glow-recipe-hero` | 3-layer radial (hero/balance card) |
| Shimmer | `.gradient-shimmer` | Skeleton loaders (respects reduced-motion) |

Intensity: `--gradient-opacity-soft`, `--gradient-opacity-medium`, `--gradient-opacity-strong`. Anti-banding: gradients use multiple stops.

---

## 3. Style pack — component recipes

### Surfaces
- `.surface-base` — page bg  
- `.surface` — card/panel  
- `.surface-elevated` — elevated panel + shadow  
- `.surface-glass` — glassmorphism (blur fallback for no-backdrop-filter)  

### Borders
- `.border-hairline` / `.border-hairline-subtle`  
- `.border-gradient-subtle` — subtle gradient border  

### Shadow
- `.shadow-elev-0` … `.shadow-elev-4`  

### Typography (dashboard)
- `.text-dashboard-title` / `.text-dashboard-title-lg`  
- `.text-dashboard-metric` / `.text-dashboard-metric-sm` (tabular-nums)  
- `.text-dashboard-body` / `.text-dashboard-body-sm`  
- `.text-dashboard-label` / `.text-dashboard-caption`  

### Component recipes (Tailwind-ish; use as classes or copy)
- `.recipe-balance-card` — wallet balance card  
- `.recipe-tx-row` — transaction list row (hover, focus, disabled)  
- `.recipe-btn-primary` / `.recipe-btn-secondary`  
- `.recipe-input` — text input (focus ring, disabled)  
- `.recipe-toast` — toast container  
- `.recipe-status-pill` — `[data-status="success"|"warn"|"error"|"info"]`  

### Focus
- `.focus-ring` — visible only for `:focus-visible`  

---

## 4. Background system

| Class | Description |
|-------|-------------|
| `.bg-fintech-grid` | CSS-only grid |
| `.bg-node-network` | CSS-only dots |
| `.bg-crypto-glow` | Faint gradient orbs (GPU-friendly) |
| `.bg-hero-aurora` | Hero gradient + subtle drift |
| `.bg-fintech-grid-svg` | SVG grid (from `/design-system/grid-pattern.svg`) |
| `.bg-node-network-svg` | SVG nodes |
| `.bg-wave-svg` | SVG wave |

Motion: `.motion-gradient-drift`, `.motion-dots` — both respect `prefers-reduced-motion`.

---

## 5. Tailwind mapping (suggestions)

Already in `tailwind.config.js`:
- **Colors**: `surface`, `surface-elevated`, `success`, `warn`, `info`, `chart-6`–`chart-8`, `crypto-xlm`, `crypto-btc`, `crypto-eth`
- **Border radius**: `xs`, `2xl`
- **Box shadow**: `elev1`–`elev4`, `glow-subtle`, `glow-medium`, `glow-strong`
- **Blur**: `blur-sm`, `blur-md`, `blur-lg`, `blur-xl`
- **Keyframes**: `aurora-drift`, `shimmer-drift`

Class recipe examples:
- Balance card: `bg-surface rounded-xl border border-border-subtle shadow-elev2 p-6`
- Primary button: `bg-primary text-primary-foreground font-semibold rounded-md px-4 py-2 shadow-elev1 hover:shadow-elev2 focus-visible:ring-2 ring-ring`
- Tx row: `flex items-center gap-4 p-3 rounded-md hover:bg-surface-elevated/60`

---

## 6. Do / Don’t (premium, VC-ready)

**Do**
- Use semantic tokens (e.g. `--text`, `--surface`) instead of raw hex.
- Keep glows subtle and behind content; use `--gradient-opacity-soft` for halos.
- Use `tabular-nums` for amounts and IDs.
- Respect `prefers-reduced-motion` for animations.
- Use focus-visible rings (2px ring) for keyboard users.
- Prefer dark mode as default for dashboard; light for marketing.

**Don’t**
- Avoid pure neon or oversaturated fills; use neon only as controlled glow.
- Don’t put heavy `filter` or `backdrop-filter` on large full-screen layers.
- Don’t use more than 2–3 glow layers per view.
- Don’t skip contrast: text on `--bg`/`--surface` must meet AA (4.5:1) or AAA (7:1) where required.

---

## 7. Performance checklist

- **Backgrounds**: CSS-only patterns preferred; SVG overlay is low-weight and repeatable.
- **Motion**: Use `transform` and `opacity` only for animations; avoid animating `box-shadow` or `filter` on large areas.
- **Blur**: Use `backdrop-filter` on small panels (cards, modals), not on full-page layers; provide fallback (e.g. solid bg) when `backdrop-filter` is unsupported or disabled.
- **Gradients**: Multiple stops to avoid banding; avoid huge radial gradients with many color stops in one layer.
- **Reduced motion**: All design-system animations (shimmer, aurora, dots) are gated by `@media (prefers-reduced-motion: reduce)`.

---

## 8. Mini demo snippet

A minimal wallet dashboard layout (hero bg + glass balance card + tx list) is in `DemoDashboard.tsx`. To use:

```tsx
import { DemoDashboard } from "./design-system/DemoDashboard";

// In your router or App:
<DemoDashboard />
```

Ensure the app has the design-system CSS loaded (e.g. `import "./design-system/index.css"` in your root CSS) and add `class="dark"` to `<html>` for dark mode. The demo uses:

- **Hero**: `bg-hero-aurora` + `bg-crypto-glow` (subtle orbs)
- **Balance card**: `recipe-balance-card` + `surface-glass` + `glow-recipe-card`
- **Tx list**: `recipe-tx-row` on `surface surface-elevated` list
- **Buttons**: `recipe-btn-primary` / `recipe-btn-secondary`
- **Toast**: `recipe-toast`; status pills: `recipe-status-pill` with `data-status="success"|"warn"|"error"|"info"`

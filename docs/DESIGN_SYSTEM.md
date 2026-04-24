# Birik Design System

> Version 2.0 — April 2026  
> Single source of truth for all UI decisions in the Birik frontend.

---

## Token Reference

All design tokens live in **`frontend/src/lib/tokens.ts`** and are mirrored as Tailwind utilities in **`frontend/tailwind.config.js`**.

### Glass Layers

Dark-mode glass effect levels for surface layering:

| Token | CSS Value | Tailwind Class | Use For |
|-------|-----------|----------------|---------|
| `glass.faint` | `rgba(255,255,255,0.02)` | `bg-glass-faint` | Outermost container tint |
| `glass.subtle` | `rgba(255,255,255,0.04)` | `bg-glass-subtle` | Cards, list rows |
| `glass.medium` | `rgba(255,255,255,0.07)` | `bg-glass-medium` | Elevated panels, hover |
| `glass.emphasis` | `rgba(255,255,255,0.12)` | `bg-glass-emphasis` | Active/selected, toasts |

### Border Opacity

| Token | Tailwind Equivalent |
|-------|---------------------|
| `border.faint` | `border-white/[0.04]` |
| `border.subtle` | `border-white/[0.07]` |
| `border.medium` | `border-white/[0.10]` |
| `border.emphasis` | `border-white/[0.16]` |

### Spacing Scale

| Token | Value | Tailwind Class |
|-------|-------|----------------|
| `space.xs` | 4 px | `p-space-xs` / `m-space-xs` |
| `space.sm` | 8 px | `p-space-sm` |
| `space.md` | 16 px | `p-space-md` |
| `space.lg` | 24 px | `p-space-lg` |
| `space.xl` | 40 px | `p-space-xl` |
| `space.2xl` | 64 px | `p-space-2xl` |

### Border Radius

| Token | Value | Tailwind Class | Use For |
|-------|-------|----------------|---------|
| `radius.chip` | 8 px | `rounded-chip` | Compact chips, badge pills |
| `radius.btn` | 12 px | `rounded-btn` | Buttons, small inputs |
| `radius.card` | 16 px | `rounded-card` | Cards, inputs |
| `radius.panel` | 24 px | `rounded-panel` | Elevated panels, sheets |
| `radius.modal` | 32 px | `rounded-modal` | Modals, drawer tops |
| `radius.pill` | 9999 px | `rounded-pill` | Full pill shapes |

### Box Shadow

| Token | Tailwind Class | Use For |
|-------|----------------|---------|
| `shadow.card` | `shadow-card` | Lifted card depth |
| `shadow.modal` | `shadow-modal` | Modals, bottom sheets |
| `shadow.brand` | `shadow-brand` | Brand accent glow |
| `shadow.indigo` | `shadow-indigo` | Indigo UI glow |
| `shadow.toast` | `shadow-toast` | Floating toasts |

### Animation

**Easing curves** (use in Framer Motion `transition.ease` or CSS `cubic-bezier`):

| Token | Curve | Feel |
|-------|-------|------|
| `ease.snappy` | `(0.25, 0.46, 0.45, 0.94)` | Most interactive elements |
| `ease.smooth` | `(0.22, 1, 0.36, 1)` | Menus, sheets opening |
| `ease.spring` | `(0.34, 1.56, 0.64, 1)` | Celebration moments |
| `ease.out` | `(0, 0, 0.2, 1)` | Standard ease-out |

**Duration** (CSS ms / Framer Motion seconds):

| Token | ms | Framer | Tailwind Class | Use For |
|-------|----|--------|----------------|---------|
| `duration.micro` | 80 | 0.08s | `duration-micro` | Hover states, instant |
| `duration.fast` | 150 | 0.15s | `duration-fast` | Transitions, dropdowns |
| `duration.base` | 250 | 0.25s | `duration-base` | Standard animations |
| `duration.slow` | 400 | 0.40s | `duration-slow` | Modals, page transitions |
| `duration.lazy` | 600 | 0.60s | `duration-lazy` | Scroll-triggered reveals |

**Framer Motion preset transitions** (`import { motionTransition } from '../lib/tokens'`):

```tsx
// Snappy feel — most interactive elements
<motion.div transition={motionTransition.snappy}>

// Smooth entrance — modals, sheets
<motion.div transition={motionTransition.smooth}>

// Micro feedback — quick state changes
<motion.div transition={motionTransition.micro}>
```

### Z-index Scale

| Token | Value | Tailwind Equivalent | Use For |
|-------|-------|---------------------|---------|
| `z.base` | 0 | `z-0` | Normal document flow |
| `z.raised` | 10 | `z-10` | Raised cards within context |
| `z.dropdown` | 100 | `z-[100]` | Dropdowns, tooltips |
| `z.sticky` | 200 | `z-[200]` | Sticky headers, nav |
| `z.overlay` | 300 | `z-[300]` | Modal backdrops |
| `z.modal` | 400 | `z-[400]` | Modal panels |
| `z.scanner` | 450 | `z-[450]` | QR scanner (above modals) |
| `z.toast` | 500 | `z-[500]` | Toast notifications |
| `z.confetti` | 600 | `z-[600]` | Celebration overlay |

---

## Component Library

### Modal / Dialog

All modal components **must** include:

```tsx
<motion.div
  role="dialog"
  aria-modal="true"
  aria-labelledby="<unique-id>-title"
>
  <h2 id="<unique-id>-title">Modal Title</h2>
  ...
</motion.div>
```

And an Escape key handler:

```tsx
useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [onClose]);
```

**Audited modal components** (14 total as of F2):

| Component | role | aria-modal | aria-labelledby | Escape |
|-----------|------|------------|-----------------|--------|
| `DisputeModal` | ✅ | ✅ | ✅ | ✅ |
| `PaymentRequestModal` | ✅ | ✅ | ✅ | ✅ |
| `Scanner` | ✅ | ✅ | ✅ (aria-label) | ✅ |
| `ImportModal` | ✅ | ✅ | ✅ | ✅ |
| `SavingsPool` (create) | ✅ | ✅ | ✅ | ✅ |
| `SavingsPool` (contribute) | ✅ | ✅ | ✅ | ✅ |
| `NewUserWizard` | ✅ | ✅ | ✅ | ✅ |
| `BottomSheet` | ✅ | ✅ | ✅ | ✅ |
| `Dashboard` (create group) | ✅ | ✅ | ✅ | ✅ |
| `MerchantDashboard` (QR) | ✅ | ✅ | ✅ | — |
| `GroupDetail` (add-expense) | ✅ | ✅ | ✅ | ✅ |
| `GroupDetail` (rename) | ✅ | ✅ | ✅ | ✅ |
| `GroupDetail` (QR/invite) | ✅ | ✅ | ✅ | — |
| `GroupDetail` (delete) | ✅ | ✅ | ✅ | ✅ |

### Card

Standard glass card pattern:

```tsx
<div className="bg-glass-subtle border border-white/[0.07] rounded-card p-space-md">
  {/* content */}
</div>
```

### Chip / Badge

```tsx
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-chip
                 bg-indigo-500/10 border border-indigo-500/20
                 text-[10px] font-black uppercase tracking-widest text-indigo-400">
  Label
</span>
```

### Button

Primary action:
```tsx
<button className="px-4 py-2.5 rounded-btn bg-indigo-600 hover:bg-indigo-500
                   text-white font-bold text-sm transition-colors duration-fast ease-snappy
                   focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black">
  Action
</button>
```

Destructive action:
```tsx
<button className="px-4 py-2.5 rounded-btn bg-rose-500/20 hover:bg-rose-500/30
                   border border-rose-500/30 text-rose-400 font-bold text-sm
                   transition-colors duration-fast ease-snappy">
  Delete
</button>
```

Ghost / secondary:
```tsx
<button className="px-4 py-2.5 rounded-btn bg-glass-subtle hover:bg-glass-medium
                   border border-white/[0.07] text-foreground font-bold text-sm
                   transition-all duration-fast ease-snappy">
  Cancel
</button>
```

### Input

```tsx
<input className="w-full bg-glass-subtle border border-white/[0.09] rounded-card
                  px-4 py-2.5 text-sm font-mono outline-none
                  focus:border-indigo-500/40 transition-colors duration-fast" />
```

### Toast

```tsx
<div className="bg-glass-emphasis border border-white/[0.16] rounded-panel
                shadow-toast px-4 py-3 text-sm font-medium">
  Message
</div>
```

---

## Colors

Brand palette (defined in `tailwind.config.js`):

| Name | Hex | Use |
|------|-----|-----|
| `ink` | `#0A0A0A` | Page background |
| `mist` | `#111111` | Surface layer 1 |
| `fog` | `#1A1A1A` | Surface layer 2 |
| `edge` | `#262626` | Borders |
| `bone` | `#F5F5F0` | Light text on dark |
| `birik` | `#C4FF4D` | Brand green (CTAs) |
| `birik.hot` | `#E5FF66` | Hover state |
| `birik.deep` | `#8FCC00` | Active state |
| `heat` | `#FF5B2E` | Warning / destructive |
| `plum` | `#7C3AED` | Secondary accent |

Semantic colors (via CSS custom properties, shadcn/ui compatible):

```
--background, --foreground
--primary, --primary-foreground
--muted, --muted-foreground
--card, --card-foreground
--border, --input, --ring
--destructive, --destructive-foreground
```

---

## Typography

| Token | Tailwind | Size | Usage |
|-------|----------|------|-------|
| `mega` | `text-mega` | clamp(3.5rem → 9rem) | Hero headings |
| `huge` | `text-huge` | clamp(2.5rem → 5rem) | Section titles |
| `big` | `text-big` | clamp(1.75rem → 3rem) | Card titles |
| — | `text-xl font-black` | 20 px | Modal titles |
| — | `text-base font-black` | 16 px | Card headings |
| — | `text-sm font-bold` | 14 px | Body emphasis |
| — | `text-xs` | 12 px | Secondary labels |
| — | `text-[10px] uppercase tracking-widest` | 10 px | Micro-labels, chips |

Font families:
- `font-sans` — Inter (UI body)
- `font-mono` — JetBrains Mono (addresses, amounts)
- `font-display` — Archivo Black (headings, brand)
- `font-serif` — Source Serif 4 (marketing copy)

---

## Bundle Architecture

Lazy-loaded chunks (never block initial paint):

| Chunk | Libraries | Trigger |
|-------|-----------|---------|
| `vendor-ocr` | `tesseract.js` | User scans a receipt |
| `vendor-pdf` | `jspdf`, `html2canvas` | User exports PDF |
| `vendor-stellar` | `@stellar/*`, `@creit.tech/*` | Loaded eagerly (auth flow) |
| `vendor-charts` | `recharts`, `d3-*` | Insights tab render |
| `vendor-motion` | `framer-motion` | Loaded eagerly (animations) |

Run `npm run analyze` to visualize current bundle sizes.

---

## FOUC Prevention

A blocking `<style>` in `index.html` sets the dark background before any JS loads:

```html
<style>
  :root, html { background-color: #0A0A0A; color-scheme: dark; }
  body { margin: 0; background-color: #0A0A0A; }
  #root { min-height: 100dvh; }
</style>
```

This eliminates the white flash between server response and React hydration.

# Style pack — Apple + Stripe + Web3

Surfaces, borders, shadows, blur, typography, component recipes (Tailwind class strings), do/don’t.

---

## Design tokens

### Radius
| Token | Value |
|-------|--------|
| `--radius-xs` | 4px |
| `--radius-sm` | 6px |
| `--radius-md` | 8px |
| `--radius-lg` | 12px |
| `--radius-xl` | 16px |
| `--radius-2xl` | 24px |
| `--radius-full` | 9999px |

### Spacing (4px base)
| Token | Value |
|-------|--------|
| `--space-1` … `--space-16` | 4px … 64px |

### Border
| Token | Value |
|-------|--------|
| `--border-width-hair` | 1px |
| `--border-width-thin` | 1.5px |
| `--border-color` | `hsl(var(--color-border))` |
| `--border-gradient` | Subtle gradient border |

### Shadow (elevation 0..4)
| Token | Use |
|-------|-----|
| `--shadow-0` | none |
| `--shadow-1` | Cards, inputs |
| `--shadow-2` | Elevated cards |
| `--shadow-3` | Modals, dropdowns |
| `--shadow-4` | Overlays |
| `--shadow-focus` | Focus ring |

### Blur (glassmorphism)
| Token | Value |
|-------|--------|
| `--blur-sm` | 8px |
| `--blur-md` | 12px |
| `--blur-lg` | 20px |
| `--blur-xl` | 32px |

Use with `backdrop-filter: blur(var(--blur-lg))` and fallback for perf.

### Typography scale
| Token | Size | Use |
|-------|------|-----|
| `--text-title-xl` | 24px | Page title |
| `--text-title-lg` | 20px | Section title |
| `--text-title-md` | 18px | Card title |
| `--text-metric` | 28px | Balance, big numbers |
| `--text-metric-sm` | 20px | Secondary metric |
| `--text-body` | 15px | Body |
| `--text-body-sm` | 13px | Secondary body |
| `--text-label` | 12px | Labels, caps |
| `--text-caption` | 11px | Captions |

Use `font-variant-numeric: var(--tabular-nums)` for numbers.  
Tracking: `--tracking-tight`, `--tracking-normal`, `--tracking-wide`.

---

## Component recipes (Tailwind class strings)

Use these as reference; implementation is in `components.css` and can be mirrored with Tailwind utilities.

### Wallet balance card
```
relative overflow-hidden rounded-xl p-6
bg-[hsl(var(--color-surface)/0.72)] dark:bg-[hsl(var(--color-surface)/0.6)]
backdrop-blur-[20px] border border-[hsl(var(--color-border)/0.5)]
shadow-[var(--shadow-2)]
before:absolute before:inset-0 before:bg-[var(--gradient-glow-card-1)] before:pointer-events-none
```
Metric: `text-[28px] font-semibold tabular-nums tracking-tight text-[hsl(var(--color-text))]`  
Label: `text-xs uppercase tracking-wide text-[hsl(var(--color-muted))]`

### Transaction list row
```
flex items-center justify-between gap-4 py-3 px-4 rounded-lg
border-b border-[hsl(var(--color-border)/0.6)]
hover:bg-[hsl(var(--color-surface)/0.8)] transition-colors
```
Amount credit: `tabular-nums text-[15px] font-medium text-[hsl(var(--color-success))]`  
Amount debit: `tabular-nums text-[15px] font-medium text-[hsl(var(--color-text))]`  
Meta: `text-[13px] text-[hsl(var(--color-muted))]`

### Primary button
```
inline-flex items-center justify-center gap-2 py-2 px-4
text-[13px] font-medium rounded-lg
bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]
shadow-[var(--shadow-1)]
hover:brightness-110 hover:shadow-[var(--shadow-2)]
focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--color-primary)/0.25)]
disabled:opacity-50 disabled:cursor-not-allowed
```

### Secondary button
```
inline-flex items-center justify-center gap-2 py-2 px-4
text-[13px] font-medium rounded-lg
bg-[hsl(var(--color-secondary))] text-[hsl(var(--color-secondary-foreground))]
border border-[hsl(var(--color-border))]
hover:bg-[hsl(var(--color-border)/0.3)]
focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--color-primary)/0.25)]
disabled:opacity-50 disabled:cursor-not-allowed
```

### Input field
```
w-full py-2 px-3 text-[15px] tabular-nums rounded-lg
bg-[hsl(var(--color-surface))] text-[hsl(var(--color-text))]
border border-[hsl(var(--color-border))]
placeholder:text-[hsl(var(--color-muted))]
hover:border-[hsl(var(--color-muted)/0.8)]
focus:outline-none focus:border-[hsl(var(--color-primary))] focus:ring-[3px] focus:ring-[hsl(var(--color-primary)/0.25)]
disabled:opacity-60 disabled:cursor-not-allowed
```

### Toast / status pill
```
inline-flex items-center gap-2 py-1 px-3 text-xs font-medium rounded-full shadow-[var(--shadow-2)]
```
Success: `bg-[hsl(var(--color-success)/0.15)] text-[hsl(var(--color-success))] border border-[hsl(var(--color-success)/0.3)]`  
Error: same pattern with `--color-error`. Warn/Info: `--color-warn`, `--color-info`.

---

## Do / Don’t (premium, avoid oversaturation)

**Do**
- Use glows **behind** content; keep them subtle (low opacity).
- Prefer semantic tokens (`--color-primary`, `--color-text`) over raw hex.
- Use tabular-nums for amounts and IDs.
- Respect `prefers-reduced-motion` (handled in tokens.css).
- Use elevation scale 0..4 for hierarchy.

**Don’t**
- Use pure neon (#ff00ff, #00ff00) at full saturation; tone with opacity or softer hues.
- Put heavy blur or filters on large full-screen layers.
- Mix more than two strong gradient directions in one component.
- Use more than one “hero” gradient per view; keep one focal gradient.

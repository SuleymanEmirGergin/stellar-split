# Apple + Stripe + Web3 Style Pack

## Design tokens (radius, spacing, border, shadow, blur)

Defined in `tokens.css`:

- **Radius:** `--radius-none` through `--radius-full`; default `--radius` = `--radius-lg`.
- **Spacing:** `--space-0` … `--space-16` (4px base).
- **Border:** `--border-width`, `--border-width-hairline`, `--border-color`, `--border-gradient`.
- **Shadow:** `--shadow-0` … `--shadow-4` (Apple-like soft; elevation scale).
- **Blur:** `--blur-sm` … `--blur-2xl`; glass: `--glass-bg`, `--glass-border`.

## Typography scale

| Role | Variable | Typical use |
|------|----------|-------------|
| Title | `--text-title` (1.5rem) | Page/section title |
| Metric | `--text-metric` (1.75rem) | Balance, big numbers; use `tabular-nums` |
| Body | `--text-body` (0.9375rem) | Default copy |
| Label | `--text-label` (0.8125rem) | Form labels, list labels |
| Caption | `--text-caption` (0.75rem) | Timestamps, hints |

Tracking: `--tracking-tight`, `--tracking-normal`, `--tracking-wide`.  
Fonts: `--font-sans`, `--font-mono`.

## Component recipes (Tailwind class strings)

### Wallet balance card (glass)

```
rounded-[var(--radius-xl)] border border-[hsl(var(--border))] bg-[var(--glass-bg)] shadow-[var(--shadow-2)] backdrop-blur-[var(--blur-lg)] p-6
```

Optional: add `ds-glow-card` for soft glow behind.

### Transaction list row

```
flex items-center justify-between gap-4 rounded-[var(--radius-md)] border-b border-[hsl(var(--border))] px-4 py-3 text-[length:var(--text-body)] last:border-b-0 hover:bg-[hsl(var(--color-elevated))]
```

### Primary button

```
rounded-[var(--radius-md)] bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-1)] transition-[box-shadow,transform] duration-[var(--motion-duration-normal)] ease-[var(--motion-ease)] hover:shadow-[var(--shadow-2)] hover:translate-y-[-1px)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))] disabled:pointer-events-none disabled:opacity-50
```

### Secondary button

```
rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--secondary-foreground))] transition-colors duration-[var(--motion-duration-normal)] hover:bg-[hsl(var(--color-elevated))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
```

### Input field

```
w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-[length:var(--text-body)] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50
```

### Toast / status pill

```
inline-flex items-center gap-2 rounded-[var(--radius-full)] border border-[hsl(var(--border))] bg-[hsl(var(--elevated))] px-3 py-1.5 text-[length:var(--text-label)] text-[hsl(var(--foreground))] shadow-[var(--shadow-1)]
```

Success variant: `border-[hsl(var(--success))] text-[hsl(var(--success))]`.  
Error: `border-[hsl(var(--destructive))] text-[hsl(var(--destructive))]`.

## Micro details

- **Focus ring:** 2px ring with `--ring`, offset 2px; use `ring-offset-background`.
- **Hover:** Buttons: slight lift + stronger shadow; rows: `bg-elevated`.
- **Disabled:** `opacity-50`, `pointer-events-none`; keep contrast for accessibility.

## Do / Don’t (premium, VC-ready)

**Do:**

- Use semantic tokens; avoid one-off hex in UI.
- Keep glows behind content and subtle (soft opacity).
- Use tabular-nums for amounts and IDs.
- Prefer soft shadows (elevation scale 0–4).
- Respect `prefers-reduced-motion`.

**Don’t:**

- Use pure neon on large areas; limit to small accents/glows.
- Overload one view with multiple hero gradients.
- Use heavy blur on large layers (performance).
- Skip focus styles; always provide visible focus ring.

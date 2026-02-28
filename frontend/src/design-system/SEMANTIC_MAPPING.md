# Semantic Color Mapping (Web3 Dashboard)

## Token → Purpose → Contrast

| Token | Purpose | Use on background | Min contrast |
|-------|---------|-------------------|--------------|
| `--background` | Page base | — | — |
| `--foreground` | Primary text | `--background`, `--surface` | 4.5:1+ |
| `--primary` | CTAs, links, brand | `--background`, `--surface` | 4.5:1+ |
| `--primary-foreground` | Text on primary | `--primary` | 4.5:1+ |
| `--secondary` | Secondary actions, chips | `--background`, `--surface` | 4.5:1+ |
| `--secondary-foreground` | Text on secondary | `--secondary` | 4.5:1+ |
| `--accent` | Highlights, badges | `--surface`, `--elevated` | 4.5:1+ |
| `--accent-foreground` | Text on accent | `--accent` | 4.5:1+ |
| `--muted` | Surfaces, panels | — | — |
| `--muted-foreground` | Secondary text, captions | `--background`, `--surface`, `--muted` | 4.5:1+ |
| `--border` | Dividers, outlines | Adjacent to `--surface` | — |
| `--success` | Success state, positive delta | `--surface` | 4.5:1+ |
| `--warn` | Warnings, pending | `--surface` | 4.5:1+ |
| `--error` / `--destructive` | Errors, negative delta | `--surface` | 4.5:1+ |
| `--info` | Info, neutral state | `--surface` | 4.5:1+ |

## Raw tokens (HSL components)

| Token | Light (hex fallback) | Dark (hex fallback) |
|-------|----------------------|---------------------|
| `--color-bg` | `0 0% 99%` (#fcfcfc) | `222 47% 6%` (#0a0e17) |
| `--color-surface` | `0 0% 100%` (#ffffff) | `222 40% 9%` (#111827) |
| `--color-elevated` | `0 0% 98%` (#fafafa) | `222 38% 12%` (#1a2234) |
| `--color-border` | `220 13% 91%` (#e2e8f0) | `220 20% 22%` (#2d3748) |
| `--color-text` | `222 47% 11%` (#0f172a) | `210 40% 98%` (#f8fafc) |
| `--color-muted` | `220 9% 46%` (#64748b) | `215 16% 57%` (#94a3b8) |
| `--color-primary` | `218 89% 58%` (#3b82f6) | same |
| `--color-accent` | `262 52% 58%` (#8b5cf6) | same |
| `--color-success` | `142 71% 45%` (#22c55e) | same |
| `--color-warn` | `38 92% 50%` (#f59e0b) | same |
| `--color-error` | `0 84% 60%` (#ef4444) | same |

## Recommended pairings

- **Body text:** `foreground` on `background` or `surface`.
- **Labels / captions:** `muted-foreground` on `surface` or `elevated`.
- **Primary button:** `primary-foreground` on `primary`.
- **Secondary button:** `secondary-foreground` on `secondary`.
- **Balance / metric:** `foreground` on `surface`; use `tabular-nums` for numbers.
- **Positive delta:** `success` text on `surface`.
- **Negative delta:** `error` or `destructive` text on `surface`.

## Themes

- **Default:** `:root` (light), `.dark` (dark). Primary blue, accent violet.
- **Midnight Neon:** `[data-theme="midnight-neon"]`. Deeper base, violet primary, teal accent. Use for dark-only “premium” variant.

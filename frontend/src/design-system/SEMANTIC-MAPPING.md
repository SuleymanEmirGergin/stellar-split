# Semantic mapping — Web3 Fintech design system

## Color tokens (HSL + HEX fallback)

### Light (`:root`)

| Token | Role | HSL (light) | HEX | Text on this (min contrast) |
|-------|------|-------------|-----|-----------------------------|
| `--color-primary` | Primary actions, links | 224 76% 52% | #4f7cff | White (4.5:1+) |
| `--color-secondary` | Secondary surfaces | 220 14% 96% | #e8eaf0 | 224 20% 28% (4.5:1+) |
| `--color-accent` | Accent highlights | 188 72% 48% | #1eb8c9 | White (4.5:1+) |
| `--color-bg` | Page background | 0 0% 99% | #fafafa | — |
| `--color-surface` | Cards, panels | 0 0% 100% | #ffffff | — |
| `--color-elevated` | Modals, popovers | 0 0% 100% | #ffffff | — |
| `--color-border` | Borders, dividers | 220 13% 91% | #e4e6eb | — |
| `--color-text` | Primary text | 224 20% 18% | #252a33 | On bg/surface ≥4.5:1 |
| `--color-muted` | Secondary text, labels | 220 9% 46% | #6b7280 | On bg ≥3:1 |
| `--color-success` | Success states | 152 52% 42% | #2d9d6b | White on fill |
| `--color-warn` | Warnings | 38 92% 50% | #e6a800 | Dark on fill |
| `--color-error` | Errors, destructive | 0 72% 50% | #dc3545 | White on fill |
| `--color-info` | Info states | 208 90% 55% | #0ea5e9 | White on fill |

### Dark (`.dark`)

| Token | Role | HSL (dark) | HEX | Notes |
|-------|------|------------|-----|-------|
| `--color-bg` | Page background | 224 22% 8% | #0f1219 | Dark-first base |
| `--color-surface` | Cards, panels | 224 20% 11% | #161b24 | |
| `--color-elevated` | Modals | 224 18% 14% | #1c222d | |
| `--color-border` | Borders | 224 16% 22% | #2d3544 | |
| `--color-text` | Primary text | 220 14% 94% | #e8eaef | ≥4.5:1 on bg |
| `--color-muted` | Secondary text | 220 10% 58% | #8891a0 | ≥3:1 on bg |

### Data viz (chart series 1–8)

Use `hsl(var(--chart-1))` … `hsl(var(--chart-8))`. All tuned for contrast on dark/light bg.

### Crypto context accents (not literal logos)

| Token | Intent | Use |
|-------|--------|-----|
| `--crypto-xlm` | XLM-like (cool cyan-blue) | Stellar/XLM context |
| `--crypto-btc` | BTC-like (warm amber) | Bitcoin context |
| `--crypto-eth` | ETH-like (cool violet) | Ethereum context |

Use as subtle accents (badges, icons, chart lines), not large fills.

---

## Themes

1. **Default** — `:root` / `.dark`: Stripe-style blue primary, teal accent, neutral grays.
2. **Midnight Neon** — `.theme-midnight-neon.dark`: Deeper background, cyan primary, purple accent; glows stay controlled (opacity-based).

---

## Contrast notes

- **Body text** on `--color-bg` or `--color-surface`: use `--color-text` (meets 4.5:1).
- **Muted text**: use `--color-muted` (meets 3:1 for large/UI).
- **Primary button**: `--color-primary-foreground` on `--color-primary` (WCAG AA).
- **Focus ring**: `0 0 0 3px hsl(var(--color-primary) / 0.25)` for visible focus.

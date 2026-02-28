# Gradient Palette — Usage & Recipes

## Intensity (opacity)

Use with gradient overlays:

- **Soft:** `--gradient-opacity-soft` (0.15) — card glows, subtle hero
- **Medium:** `--gradient-opacity-medium` (0.35) — hero sections, banners
- **Strong:** `--gradient-opacity-strong` (0.55) — CTAs, badges (sparingly)

## Primary hero (4)

| Name | CSS variable | Usage |
|------|--------------|--------|
| Hero 1 | `--gradient-hero-1` | Primary CTA, hero headline bg |
| Hero 2 | `--gradient-hero-2` | Dark hero background (dark mode) |
| Hero 3 | `--gradient-hero-3` | Vertical hero strip, feature banners |
| Hero 4 | `--gradient-hero-4` | Accent borders, premium badges |

## Card glow (4)

All subtle; use behind content. Prefer **soft** opacity.

| Name | CSS variable | Usage |
|------|--------------|--------|
| Glow card 1 | `--gradient-glow-card-1` | Balance card, main panels |
| Glow card 2 | `--gradient-glow-card-2` | Secondary cards, side panels |
| Glow card 3 | `--gradient-glow-card-3` | Left-edge accent |
| Glow card 4 | `--gradient-glow-card-4` | Bottom glow, footers |

## Success (2)

| Name | CSS variable | Usage |
|------|--------------|--------|
| Success 1 | `--gradient-success-1` | Success buttons, positive badges |
| Success 2 | `--gradient-success-2` | Success state background wash |

## Warning / Error (2)

| Name | CSS variable | Usage |
|------|--------------|--------|
| Warn 1 | `--gradient-warn-1` | Warning buttons, pending state |
| Error 1 | `--gradient-error-1` | Destructive actions, error banners |

## Shimmer (skeleton)

- **Variable:** `--gradient-shimmer`
- **Usage:** Skeleton loaders only. Use with `background-size: 200% 100%` and keyframe `ds-shimmer` (see `backgrounds.css`).
- **Banding:** Gradient uses 5+ stops to avoid visible banding.

## Glow recipes (radial spotlights)

- **Single:** `.ds-glow-card` — one radial behind card.
- **Dual:** `.ds-glow-card-dual` — primary + accent radials.
- **Hero:** `.ds-glow-hero` — three radial layers for hero sections.

Keep glows **behind** content (z-index -1); never overlay critical text.

## Banding guidelines

1. Use **multiple stops** (4–6+) in gradients instead of 2-stop sharp transitions.
2. Slightly **vary saturation/luminance** in mid stops.
3. For large areas, prefer **radial** or **angled linear** (e.g. 135deg, 160deg) over 90deg/180deg.
4. Shimmer: use **200% background-size** and animate position so the gradient moves.

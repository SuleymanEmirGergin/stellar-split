# Gradient palette — Web3 Fintech

All gradients use multiple stops to reduce banding. Use CSS variables from `tokens.css`.

---

## Primary hero (4)

| Name | Usage | Code (variable) |
|------|--------|-----------------|
| Hero 1 | Hero CTA, feature headers | `var(--gradient-hero-1)` — blue → violet |
| Hero 2 | Secondary hero, banners | `var(--gradient-hero-2)` — teal → blue → indigo |
| Hero 3 | Dark hero background | `var(--gradient-hero-3)` — dark surface gradient |
| Hero 4 | Accent hero, highlights | `var(--gradient-hero-4)` — violet → blue → teal |

**Usage:** hero sections, large CTAs, page headers. Not for small UI chips.

---

## Card glow (4, subtle)

| Name | Usage | Code (variable) |
|------|--------|-----------------|
| Glow card 1 | Balance card, primary card | `var(--gradient-glow-card-1)` |
| Glow card 2 | Secondary cards | `var(--gradient-glow-card-2)` |
| Glow card 3 | Accent corner glow | `var(--gradient-glow-card-3)` |
| Glow card 4 | Soft fill | `var(--gradient-glow-card-4)` |

**Usage:** as overlay (e.g. `::before`) behind cards; keep behind content.

---

## Success / positive (2)

| Name | Usage | Code (variable) |
|------|--------|-----------------|
| Success 1 | Success buttons, badges | `var(--gradient-success-1)` |
| Success 2 | Success background tint | `var(--gradient-success-2)` |

---

## Warning / error (2)

| Name | Usage | Code (variable) |
|------|--------|-----------------|
| Warn 1 | Warning CTA, alert gradient | `var(--gradient-warn-1)` |
| Error 1 | Error area tint | `var(--gradient-error-1)` |

---

## Intensity (opacity)

- `--gradient-opacity-soft`: 0.06  
- `--gradient-opacity-medium`: 0.12  
- `--gradient-opacity-strong`: 0.2  

Use with overlays: `hsl(var(--color-primary) / var(--gradient-opacity-soft))`.

---

## Glow recipes (radial spotlights behind cards)

Apply to a wrapper or `::before` **behind** the card.

**Recipe 1 (2 layers):**
- `var(--glow-recipe-1-layer-1)` — primary blue ellipse top
- `var(--glow-recipe-1-layer-2)` — teal ellipse center

**Recipe 2 (3 layers):**
- `var(--glow-recipe-2-layer-1)` — violet circle corner
- `var(--glow-recipe-2-layer-2)` — teal circle opposite
- `var(--glow-recipe-2-layer-3)` — blue ellipse center

Stack as multiple backgrounds:  
`background-image: var(--glow-recipe-1-layer-1), var(--glow-recipe-1-layer-2);`

---

## Shimmer (skeleton loaders)

- **Light:** `var(--gradient-shimmer)` + `background-size: 200% 100%` + `animation: shimmer-slide 1.5s ease-in-out infinite`
- **Dark:** `var(--gradient-shimmer-dark)` (same animation)

Class: `.bg-shimmer` in `backgrounds.css`.

---

## Anti-banding guidelines

1. Use **5+ color stops** for long gradients.
2. Slightly vary **saturation and lightness** between stops.
3. Prefer **ellipse/radial** with different radii for radial glows.
4. Avoid **single huge solid bands**; blend with transparency at edges.

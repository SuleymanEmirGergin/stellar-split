# Background system & motion — Web3 Fintech

## Background class recipes

| Class | Description |
|-------|-------------|
| `.bg-fintech-grid` | CSS-only grid lines on `--color-bg` |
| `.bg-node-network` | CSS-only dot grid |
| `.bg-crypto-glow` | Subtle radial glow (glow recipe 1) behind content |
| `.bg-hero-aurora` | Dark hero gradient (hero-3); use with `.animate-gradient-drift` for drift |
| `.bg-shimmer` | Skeleton loader gradient (light/dark aware) |
| `.pattern-svg-grid` | SVG overlay grid (repeatable, low-weight) |
| `.pattern-svg-dots` | SVG overlay dots |

### CSS-only grid (no SVG)

```css
.bg-fintech-grid {
  background-color: hsl(var(--color-bg));
  background-image:
    linear-gradient(hsl(var(--color-border) / var(--pattern-line-opacity)) 1px, transparent 1px),
    linear-gradient(90deg, hsl(var(--color-border) / var(--pattern-line-opacity)) 1px, transparent 1px);
  background-size: var(--pattern-grid-size) var(--pattern-grid-size);
}
```

### SVG overlay (inline data URI)

Grid:
```css
background-image: url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 1h24M1 0v24' stroke='%238891a0' stroke-opacity='0.12' stroke-width='0.5' fill='none'/%3E%3C/svg%3E");
background-size: 24px 24px;
```

Dots:
```css
background-image: url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='0.5' fill='%238891a0' fill-opacity='0.35'/%3E%3C/svg%3E");
background-size: 24px 24px;
```

---

## Motion keyframes

| Keyframe | Use |
|----------|-----|
| `gradient-drift` | Large hero gradient slow shift (background-position) |
| `aurora-shift` | Aurora-style opacity/transform (use on overlay) |
| `shimmer-slide` | Skeleton loader shimmer |
| `particle-float` | Optional subtle particle dots |

All animations are disabled when `prefers-reduced-motion: reduce` (see `tokens.css`).

---

## Performance checklist

**Do**
- Use `transform` and `opacity` for motion (GPU-friendly).
- Keep blur on small/medium elements (cards, modals), not full viewport.
- Use `will-change: transform` sparingly and only when animating.
- Prefer CSS-only patterns for grid/dots when one pattern covers the page.

**Avoid**
- `filter: blur()` on very large layers (e.g. full-screen divs).
- Many simultaneous box-shadows or gradients on one element.
- Heavy SVG filters (feGaussianBlur, etc.) on big areas.
- Non-reduced-motion animations when user has `prefers-reduced-motion: reduce`.

**Optional particles**
- Keep particle count low (e.g. 5–15 dots).
- Use small elements and opacity/transform only; no blur on particles.

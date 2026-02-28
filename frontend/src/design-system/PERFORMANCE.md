# Background & Motion — Performance Checklist

## Do

- Use **transform** and **opacity** for animations (GPU-friendly).
- Keep **blur** on small/medium elements (e.g. glass panels, not full viewport).
- Use **will-change: transform** sparingly and only on animated elements; remove when idle.
- Prefer **CSS-only** patterns (grid, nodes, gradient) when possible; add SVG only if needed.
- **Reduce motion:** all keyframes are no-op when `prefers-reduced-motion: reduce` (see `backgrounds.css`).

## Avoid

- **Heavy filters** (blur, drop-shadow) on large layers or many elements at once.
- **Box-shadow** on many elements; prefer a single shadow per card/panel.
- **Animated gradients** on full-page backgrounds (use static or very subtle drift).
- **Particle animations** on more than a few small dots; skip if low-end devices matter.
- **SVG pattern** with complex paths or large repeat area; keep pattern tile small (e.g. 32×32).

## SVG overlay option

Use `patterns.svg` as a repeating background image for grid + nodes:

```css
.bg-fintech-grid-svg {
  background-color: hsl(var(--color-bg));
  background-image: url("./patterns.svg");
  background-size: 320px 320px;
}
```

Color is controlled via `currentColor` in the SVG; set `color` on the element or a parent to match theme.

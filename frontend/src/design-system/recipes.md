# Component class recipes (Tailwind class strings)

Copy-paste these Tailwind class strings for consistency. Design-system CSS classes (e.g. `recipe-*`, `surface-glass`) are defined in `surfaces.css` and work alongside Tailwind.

## Wallet balance card

```
min-w-0 rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--surface))] p-6 shadow-[var(--shadow-2)] recipe-balance-card surface-glass glow-recipe-card
```

Or use only design-system: `recipe-balance-card surface-glass glow-recipe-card border-hairline-subtle rounded-xl shadow-elev2` (radius/shadows from tokens).

## Transaction list row

```
recipe-tx-row flex items-center gap-4 p-3 rounded-md
```

Hover/focus/disabled are in `.recipe-tx-row`.

## Primary button

```
recipe-btn-primary
```

Or Tailwind-only: `inline-flex items-center justify-center gap-2 px-4 py-2 text-[length:var(--text-body)] font-semibold text-primary-foreground bg-primary rounded-md shadow-elev1 hover:shadow-elev2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-50`

## Secondary button

```
recipe-btn-secondary
```

## Input field

```
recipe-input w-full
```

## Toast

```
recipe-toast flex items-center gap-3
```

## Status pill

```
recipe-status-pill
```
Add `data-status="success"|"warn"|"error"|"info"`.

## Typography (dashboard)

- Title: `text-dashboard-title`
- Title large: `text-dashboard-title-lg`
- Metric: `text-dashboard-metric tabular-nums`
- Metric small: `text-dashboard-metric-sm tabular-nums`
- Body: `text-dashboard-body`
- Body small: `text-dashboard-body-sm`
- Label: `text-dashboard-label`
- Caption: `text-dashboard-caption`

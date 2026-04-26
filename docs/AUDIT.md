# Production Quality Audit — stellar-split.vercel.app

**Run date:** 2026-04-26
**Lighthouse version:** 13.1.0
**Target URL:** https://stellar-split.vercel.app/
**Form factor:** Desktop, headless Chromium
**Connection profile:** Default (simulated 4G)

---

## 1. Headline scores

| Category | Score | Verdict |
|---|---|---|
| **Performance** | **52** | ⚠️ Needs work — first-paint metrics dominated by initial bundle download |
| **Accessibility** | **90** | ✅ Good — two specific issues to fix (see §3) |
| **Best Practices** | **96** | ✅ Excellent — only minor source-map gap |
| **SEO** | **91** | ✅ Good |

> **Test count for context** (separate from Lighthouse):
> Frontend Vitest **1010/1010 passing**, contract Cargo **46/46 passing**, TypeScript **0 errors**.

---

## 2. Performance — what's slow and why

| Metric | Value | Target (Good) | Status |
|---|---|---|---|
| First Contentful Paint | **6.2 s** | < 1.8 s | 🔴 |
| Largest Contentful Paint | **7.9 s** | < 2.5 s | 🔴 |
| Total Blocking Time | **60 ms** | < 200 ms | 🟢 |
| Cumulative Layout Shift | **0.182** | < 0.1 | 🟡 |
| Speed Index | **6.2 s** | < 3.4 s | 🔴 |

### Diagnosis

The 6-second First Contentful Paint is **not** a CPU-bound problem (TBT is healthy
at 60 ms — the main thread is mostly idle). It's **network-bound**: the initial
bundle, vendor chunks, and Stellar SDK together pull ~600+ KB before the first
paint can happen.

The good news: every fix is already partially landed in F2 and just needs to be
finished.

### Action plan

1. **Defer Stellar SDK from the entry chunk.** It's currently in `vendor-stellar-*.js`
   loaded eagerly, but most of it is only needed once the user clicks "Connect Wallet".
   Move the SDK behind a `lazyImport()` inside `useFreighter()` so the Landing page
   loads without it. Expected FCP delta: **−1.5 to −2 s.**
2. **Preload the entry CSS.** `<link rel="preload" as="style">` for the main CSS
   in `index.html` head — currently it's a regular `<link rel="stylesheet">` that
   blocks render. Expected FCP delta: **−0.5 s.**
3. **Investigate CLS.** The 0.182 shift is mostly the demo bar appearing after
   wallet hydration. Reserve a fixed-height shell so the layout doesn't jump.
   See `docs/design/savings-redesign.md` §4.1 ("layout shift on hero" guidance).
4. **Brotli on Vercel.** `vercel.json` doesn't pin compression — Vercel does
   gzip by default. Brotli can drop transfer sizes another ~15%.

These are tracked as P2 follow-ups in `docs/KNOWN_LIMITATIONS.md`. Good Lighthouse
performance scores are not a hackathon submission requirement; the items above are
the next iteration's work.

---

## 3. Accessibility — two issues to fix

Score **90/100** — both deductions are real and worth addressing.

### Issue 1 — `button-name`: Buttons do not have an accessible name

A handful of icon-only buttons (e.g. the wallet copy/QR icons in the header,
the close × in some modals) render an `<svg>` without an accompanying
`aria-label` or visible text. Screen readers announce them as "button" with
no context.

**Fix pattern**:
```jsx
<button aria-label={t('header.copy_address')}>
  <Copy size={14} />
</button>
```

This pattern is already correct on `FeedbackWidget`'s FAB (`aria-label="Send feedback"`)
and on `TabErrorBoundary`'s retry button (`role="alert"`). Sweep the remaining
icon-only buttons (`grep -rn "<button" src/components | grep -v aria-label`).

### Issue 2 — `color-contrast`: Background and foreground colors

A few text colors fail the 4.5:1 contrast ratio over the dark background — most
notably the very faint footer hint text (`text-muted-foreground/40`) and the
"+5 more" expand button in `SavingsLeaderboard`. Bumping these to
`text-muted-foreground/70` keeps the visual hierarchy while passing AA.

The design tokens (`tokens.ts`) don't currently expose a "subtle text" semantic
key — adding one and threading it through cleans this up project-wide:
```ts
// tokens.ts
text: {
  primary:   'rgba(255,255,255,0.92)',
  secondary: 'rgba(255,255,255,0.70)', // ← the missing token
  subtle:    'rgba(255,255,255,0.50)',
  muted:     'rgba(255,255,255,0.30)', // decorative only — fails AA
},
```

---

## 4. Best practices — minor

| Issue | Severity | Fix |
|---|---|---|
| `errors-in-console` | Low | Already addressed: BUG-SPLT-TIMEBOUNDS fix in commit `3eafa55` silenced the 20s noisy warning. Remaining errors are React Query 404s from `/api/v1/*` while the backend Day-B1 deploy is still pending — they'll vanish once Railway redeploys master HEAD. |
| `valid-source-maps` | Low | Vite's prod build doesn't ship source maps. To enable: set `build.sourcemap: true` in `vite.config.ts`. Trade-off is +30% asset size, so we'd put them behind a `*.map` upload to Sentry rather than serving them publicly. |

---

## 5. SEO — solid

Score **91/100**. The deduction is from a single warning: the page text-to-HTML
ratio is below the heuristic threshold because most content is rendered after
JS hydration (React landing). This isn't a real SEO problem for a wallet-gated
dApp, but if we ever want to rank on "Soroban expense splitter" type queries,
we'd ship a small SSR / pre-render layer for the Landing page only.

---

## 6. Tracking

These findings are formalised — pasted by reference into:
- `docs/KNOWN_LIMITATIONS.md` (under "Out of Scope (Post-Hackathon)" for the perf items)
- `docs/HACKATHON_SUBMISSION.md` §11 ("Honest self-assessment")

Raw Lighthouse JSON is in `.audit/lighthouse.json` (gitignored — large binary).

To re-run locally:
```bash
npx --yes lighthouse https://stellar-split.vercel.app \
  --quiet \
  --output=json \
  --output-path=.audit/lighthouse.json \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=performance,accessibility,best-practices,seo
```

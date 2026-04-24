# Lighthouse Report — Birik

Tracking document for the Lighthouse 95+ objective across Performance, Accessibility, Best Practices, SEO, and PWA.

- **Target:** all five categories ≥ 95 on mobile simulation
- **Source of truth:** `https://stellar-split.vercel.app` (production)
- **Last run:** _TBD — run after first deploy with PWA manifest + raster icons_

---

## 🚀 How to run

### One-time setup

```bash
npm install -g lighthouse @lhci/cli
```

### Run against production (recommended for the score screenshot)

```bash
# Mobile simulation (default + the one that matters for mobile-first claim)
lighthouse https://stellar-split.vercel.app \
  --preset=mobile \
  --output html \
  --output-path ./docs/lighthouse-mobile.html \
  --chrome-flags="--headless=new --no-sandbox"

# Desktop — sanity check
lighthouse https://stellar-split.vercel.app \
  --preset=desktop \
  --output html \
  --output-path ./docs/lighthouse-desktop.html \
  --chrome-flags="--headless=new --no-sandbox"
```

### Run against local build (faster iteration)

```bash
cd frontend
npm run build
npx vite preview --port 4173 &   # serve the built dist/
lighthouse http://localhost:4173 --preset=mobile --output html
kill %1                           # stop preview when done
```

---

## 📊 Current scores

Replace with real numbers after the first run.

### Mobile

| Category | Score | Notes |
|----------|-------|-------|
| Performance | _TBD_ | |
| Accessibility | _TBD_ | |
| Best Practices | _TBD_ | |
| SEO | _TBD_ | |
| PWA | _TBD_ | |

### Desktop

| Category | Score | Notes |
|----------|-------|-------|
| Performance | _TBD_ | |
| Accessibility | _TBD_ | |
| Best Practices | _TBD_ | |
| SEO | _TBD_ | |

---

## ✅ What we optimized (Session 6 deliverables)

### PWA — installability path (192/512 icons + manifest + apple-touch)
- Added 6 raster assets to `frontend/public/`:
  - `icon-192.png` — standard Android home-screen icon
  - `icon-512.png` — high-res Android splash
  - `icon-192-maskable.png` + `icon-512-maskable.png` — safe-zoned for OEM masks (circle / squircle)
  - `apple-touch-icon.png` (180×180) — iOS home-screen icon
  - `og-image.png` (1200×630) — social embed raster fallback
- Icons emitted by `scripts/generate-pwa-icons.mjs` from `favicon.svg` (one source of truth)
- `frontend/public/manifest.json` rewritten with explicit PNG `sizes`, `purpose: any` + `purpose: maskable` variants
- `vite.config.ts` manifest reconciled with `public/manifest.json` (was "StellarSplit", now "Birik")
- `index.html` now references manifest + apple-touch-icon + raster favicon sizes

### SEO — raster OG image + iOS meta
- `og:image` / `twitter:image` swapped from SVG to `og-image.png` (social hosts don't embed SVG)
- Added `og:image:width` / `og:image:height` / `og:image:alt` (Lighthouse SEO + Twitter/FB completeness)
- Added `apple-mobile-web-app-*` meta tags (iOS PWA polish)
- Added `viewport-fit=cover` for iOS Safari edge-to-edge

### PWA — iOS "Add to Home Screen" flow
- `InstallPrompt.tsx` detects iOS Safari (no `beforeinstallprompt` fires)
- On iOS, renders the same banner + opens a step-by-step modal ("Share → Add to Home Screen → Add")
- 4 new i18n keys × 4 languages for the iOS guide (TR/EN/DE/ES)
- Desktop/Android flow unchanged — existing tests still pass

### Accessibility baseline (already strong)
- 4 `aria-label`s on icon-only buttons added in earlier sessions
- All new components (KPICard, InstallPrompt iOS modal) include `aria-busy`/`aria-label`

---

## 🎯 Items we deliberately deferred

| Item | Why deferred |
|------|--------------|
| Offline fallback (`offline.html`) | Workbox SW already precaches the app shell — true offline is nice-to-have, not required for Lighthouse PWA 95+ |
| WebP image pipeline | Zero `<img>` tags on landing; all icons are PNG/SVG — WebP impact is near-zero for this app |
| Bundle-size visualizer (rollup-plugin-visualizer) | vite-plugin-pwa build logs already show chunk sizes; separate visualizer doc is low-ROI for a Lighthouse push |
| `LazyImage` wrapper | No hero imagery to lazy-load; component would be dead code |

Document them here so future sessions don't re-evaluate.

---

## 🔁 Re-running after code changes

Lighthouse numbers drift when:
- We add a new route (check Performance — initial bundle grew?)
- We add new `<img>` tags without `loading="lazy"` (LCP regression)
- We add a large dependency (Performance)
- We add a new untranslated string (no Lighthouse impact, but check i18n coverage)

Cadence: re-run Lighthouse before each major release or whenever a CI green-to-red Performance budget alert fires (TBD — we haven't wired Lighthouse CI yet; could be a future Session 6B).

---

## 📎 Screenshot embedded in README

Once you have a green-across-the-board run:

```bash
lighthouse https://stellar-split.vercel.app \
  --preset=mobile \
  --output html \
  --output-path ./docs/lighthouse-mobile.html

# Open the HTML, screenshot the top "score gauges" row at 1440x400 viewport
# Save as: docs/screenshots/lighthouse-mobile.png
# Reference from README in the Screenshots section.
```

# Screenshot inventory

Canonical screenshot set for the project. All captures are automated via
Playwright and kept under version control so pull requests can review
visual changes alongside code.

## Automation

Regenerate the full set:

```bash
cd frontend
npx playwright test e2e/screenshots.spec.ts e2e/screenshots-states.spec.ts --project=chromium
```

Secondary capture scripts:

- `frontend/scripts/capture-metrics-dashboard.mjs` — regenerates
  `metrics-dashboard.png` against the live `/analytics/summary`
  endpoint (useful when KPI numbers drift).
- `frontend/scripts/capture-monitoring-dashboard.mjs` — regenerates
  `monitoring-dashboard.png` against an authenticated dashboard view.

See [`docs/SCREENSHOT_CHECKLIST.md`](../SCREENSHOT_CHECKLIST.md) for the
full surface-area checklist that defines what each image must cover and
when to retake.

## Canonical set (currently committed)

| File | Use |
|------|------|
| `landing.png` / `landing-*.png` | README hero + light/dark/mobile variants |
| `dashboard.png` / `dashboard-*.png` | Authenticated dashboard, desktop + mobile, dark/light |
| `settle-modal-minflow.png` | Min-flow "10 transfers → 3" value-prop screenshot |
| `savings-roadmap.png` | Savings Pool roadmap teaser |
| `splt-reward.png` | Inter-contract mint moment (0 → 100 SPLT) |
| `activity-feed.png` | Insights + activity feed over Horizon |
| `mobile-bottomsheet.png` | Mobile settle bottom-sheet FAB (feedback iteration) |
| `metrics-dashboard.png` | Public `/analytics/summary` KPI strip |
| `monitoring-dashboard.png` | In-app live `StatsPanel` + ops KPIs |
| `tests-passing.png` / `ci-passing.png` | CI / test evidence |

## Removed 2026-04-24

`01-wallet-connected.png` through `07-stellar-testnet.png` plus the
duplicate `03-success-tx1.png` and Windows `desktop.ini` were deleted.
These were Level 1 tutorial captures from early in the project; the
README-referenced screenshot set above supersedes them and the old files
were unreferenced anywhere in source.

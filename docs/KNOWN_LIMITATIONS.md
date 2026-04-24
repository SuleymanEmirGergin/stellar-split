# Known Limitations — Birik (Stellar Split)

> Last updated: **2026-04-24** (post-B2 contract redeploy, post-G feature launch)
> 
> This document tracks known bugs, scope cuts, and limitations that are out of
> scope for the hackathon submission (April 30, 2026). Each item includes the
> observed symptom, the root cause (where known), severity, and a follow-up plan.

---

## 🐛 Active Bugs

### BUG-STALE-CHUNK — Lazy chunk 404 after mid-session redeploy ✅ **FIXED**

**Observed 2026-04-24** during automated smoke test, right after we pushed a
new commit while the browser tab was open.

**Symptom:**
- User opens a page using React.lazy (e.g. `/group/:id`, `/referral`,
  `/settings`).
- Vercel had deployed a new build since the tab was loaded.
- Browser tries `import('/assets/GroupDetail-<oldhash>.js')` → server returns
  404 because the new deploy has a fresh chunk map.
- React Suspense bubbles up `TypeError: Failed to fetch dynamically imported
  module`; the ErrorBoundary caught it and showed "Something went wrong".

**Console evidence:**
```
[ERROR] TypeError: Failed to fetch dynamically imported module:
        https://stellar-split.vercel.app/assets/GroupDetail-D1SacDOj.js
[ERROR] [Birik] ErrorBoundary caught: TypeError: Failed to fetch dynamically imported module
```

**Fix (shipped 2026-04-24):** `ErrorBoundary.tsx` now detects lazy-chunk errors
(Vite, Safari, Webpack variants, `ChunkLoadError` by name) and auto-reloads
the page with a `sessionStorage`-backed 30-second debounce to prevent
infinite reload loops on genuinely-broken deploys. During the reload it
shows a soft "Updating to latest version" UI with a spinner instead of the
generic "Something went wrong" panel. Full coverage: 13 unit tests in
`ErrorBoundary.test.tsx`.

**Severity before fix:** Medium-high (demo-day risk — a last-minute redeploy
would have broken judges' already-open tabs).

**Severity after fix:** Negligible — the auto-reload is silent from the
user's perspective and the debounce prevents loops.

---

### BUG-DEMO-01 — Demo mode group detail navigation redirects to dashboard

**Observed 2026-04-24 during automated smoke test.**

**Symptom:**
- In **Demo Mode** (no Freighter, offline-first), the user creates a group via the
  New Group modal. The group appears in the dashboard ("TOTAL GROUPS: 2", badge
  unlocked), and the group card shows a link to `/group/420`.
- Clicking the group card OR navigating directly to `/group/:id` results in a
  redirect back to `/dashboard` — the group detail page never renders.

**Scope:**
- **Only affects Demo Mode.** Testnet (live Freighter) flow is unaffected.
- Applies to any group created while Demo Mode is active.

**Probable root cause:**
`useGroup(groupId)` hook in `useGroupQuery.ts` correctly calls `getGroup()` which
reads from localStorage in demo mode. However, one of the auth-guard `useEffect`s
in `App.tsx` (around lines 270–284) or an in-component guard inside
`GroupDetail.tsx` trips before the React Query settles — causing an early
redirect. Specifically suspected: the combination of `demoMode` global state and
`walletAddress` store state de-sync after a demo-session refresh.

**Severity:** Low (demo-only), but annoying for marketing walkthroughs.

**Workaround:**
- Use **Testnet Mode** (live mode) for any end-to-end demo that requires entering
  the group detail view. Freighter must be connected.
- If you must demo offline: record the walkthrough video against Testnet, not
  Demo Mode.

**Follow-up:**
- Add a defensive empty-state inside `GroupDetail.tsx` for demo mode: when
  `isDemo && !group && !loading`, render "Demo group detail coming soon" instead
  of relying on the redirect.
- Long-term: unify demo mode state handling through a single `demoStore` slice
  with full CRUD for groups, expenses, and balances, so all hooks read from the
  same source without conditional branching.

---

### BUG-DEMO-02 — Demo → Testnet toggle leaves dashboard content unloaded

**Observed 2026-04-24 during automated smoke test.**

**Symptom:**
- While on `/dashboard` in demo mode, clicking the "Switch to Testnet" button
  switches the top badge (DEMO MODE → TESTNET) and dismisses the demo bar, but
  the main dashboard content (welcome header, KPI cards, charts, group list)
  remains blank until the page is reloaded.
- Header balance chips continue to show demo values (1250.45 XLM / 1200 SPLT)
  instead of transitioning back to the live Horizon-sourced values.

**Probable root cause:**
`useAppStore.demoMode` flag flips correctly, but several cached React Query
entries keyed on `callerAddress + demo flag` don't invalidate on toggle. The
page stays in a half-rendered state until a hard refresh clears the cache.

**Severity:** Low — recoverable with a single page refresh.

**Workaround:** **Press F5 / Cmd+R** immediately after toggling Demo → Testnet.

**Follow-up:** Call `queryClient.invalidateQueries({ queryKey: ['groups'] })` and
clear balance queries on demo toggle. Also trigger a wallet-balance refetch.

---

## ⚠️ Deployment Gaps

### INFRA-01 — Backend not deployed to production

**Status as of 2026-04-24:**
- Frontend lives at `https://stellar-split.vercel.app` (fully deployed, F2 + G
  features live).
- **Backend (NestJS + BullMQ + Postgres + Redis) is NOT deployed.** Attempts to
  reach `api.stellarsplit.app`, `stellarsplit-api.up.railway.app`, and staging
  variants all return Railway's "Application not found" error.

**Consequences (what doesn't work in prod):**
- Real-time SSE events (`/events` stream) — falls back to Soroban contract polling
- Receipt IPFS uploads via backend
- Dead Letter Queue dashboard + admin endpoints
- Prometheus metrics scrape (`/metrics`)
- Database-backed audit log (`/api/v1/groups/:id/audit`)
- Prisma-backed user profile metadata (app falls back to SIWS-only auth)
- Feedback widget POST — feedback is queued only in `localStorage`

**What still works offline-first:**
- All Soroban contract interactions (create_group, add_expense, settle, etc.)
- Wallet connect via SIWS (the backend `/auth` is optional — silent refresh just
  fails gracefully)
- Frontend-only features: analytics, i18n, theme, feature flags, referral code
  generation, feedback widget UI + local queue

**Follow-up:** Deploy the backend to Railway. Env vars are prepared in
`backend/.env.staging.example`. GitHub Action `deploy-staging` is ready and
guarded on `RAILWAY_STAGING_SERVICE_ID` secret — set that to trigger deploys.

---

### INFRA-02 — Contract SPLT reward token balance shows 0 for admin wallet

**Observed 2026-04-24.**

- The B2-redeployed contract (`CAUKBMO5...DDAOA`) has `set_reward_token`
  wired to the existing SPLT token contract (`CBPN3COE...3APE`).
- The admin wallet (`GDTIW2V3...NRYGB`) shows **0 SPLT** in the header balance
  pill, even though it previously accumulated SPLT on the old contract.

**Root cause:** SPLT balance is stored per-token-contract, not per-split-contract.
The admin's old SPLT is still in the SPLT token contract — it's not lost. The UI
just reads via the token contract's `balance(admin)` call. Needs verification:
the balance pill may have cached a 0 from a past read before `set_reward_token`
was fully applied.

**Severity:** Cosmetic.

**Workaround:** Hard-refresh the dashboard after setup. The balance refetch loop
will pick up the new value.

**Follow-up:** None needed — the reward token remains the same across redeploys.

---

## ⏭ Intentionally Out-of-Scope (Post-Hackathon)

| Area | What's missing | Target |
|------|---------------|--------|
| SPLT | Full SEP-41 interface (transfer, approve, allowance, burn, clawback) | 30 days post-submission — see `docs/SPLT_TOKEN_SPEC.md` |
| Governance | On-chain voting contract integration | Q3 2026 |
| AI | OCR receipts run entirely client-side (no backend LLM enrichment) | Phase 2 — after backend is stable |
| Push | VAPID public key not set in prod → web push disabled | Included in backend deploy checklist |
| Mainnet | Contract deployed on testnet only | Requires audit + multisig admin |

---

## 🧪 Automated Test Coverage Gaps

Even though we have **46 contract tests** + **942 frontend tests**, these paths
are NOT yet covered:

- `settle_group_flex` on a brand-new pair (only tested against pre-existing
  Soroswap pools).
- Freighter signing timeout / user-rejection flows — E2E uses mock wallet.
- Concurrent expense additions (race between two members posting simultaneously).
- `register_referral` when the inviter has NEVER called any other entrypoint
  (cold-start referral reward minting).

These are tracked as follow-ups; not blockers for the demo.

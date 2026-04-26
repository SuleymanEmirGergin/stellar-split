# Birik — Stellar Hackathon Submission Package

> **One-pager.** Read this first. Everything else (`DEMO_DAY.md`, `DEMO_VIDEO_SCRIPT.md`,
> `DEMO_DAY_PITCH.md`, `KNOWN_LIMITATIONS.md`) is supporting detail.

---

## 0 · TL;DR

**Birik is a decentralized group expense-splitting dApp built on Stellar + Soroban.**

Friends create a group, log shared expenses on-chain, and settle in any token —
even cross-currency — in a single atomic transaction. No custodian, no chargebacks,
no FX desk. The whole stack is production-grade: 46 contract tests, 986 frontend
tests, daily Postgres backups, Prometheus alerts, emergency-pause circuit-breaker.

| | Value |
|---|---|
| **Live demo** | https://stellar-split.vercel.app |
| **Demo video** | https://youtu.be/ZmqJI9Y7UTc |
| **Repository** | https://github.com/SuleymanEmirGergin/Birik |
| **Main contract (testnet)** | `CAUKBMO5OAWHDDWAR3WHDYBJSJDTQUAD53L3JDD53DFIYTAVPW3DDAOA` |
| **SPLT reward token** | `CBPN3COESIYKJSBSGE474E55TAMCH7GDMV6MP5N43CI4XBGVTNGM3APE` |
| **Backend API** | https://stellar-split-production.up.railway.app |

---

## 1 · The 60-Second Pitch

> *Splitting bills with friends across borders is broken. Bank transfers cost
> too much, take 3–5 days, and break completely when one person has XLM and the
> other wants USDC. Birik fixes this.*
>
> *In Birik, every expense is logged on a Soroban smart contract — immutable,
> auditable, censorship-resistant. Settlement runs through a min-flow algorithm
> that minimises the number of payments, then if the creditor wants a different
> token, the contract atomically swaps it via Soroswap inside the same
> transaction. One click. One signature. Zero custodians.*
>
> *Built in five days during the hardening sprint. Already running on testnet
> with real users. Production-grade safety: emergency pause circuit-breaker,
> 46 contract tests with property-based invariants, automated DB backups,
> Prometheus alerts, mid-deploy chunk-error auto-recovery.*
>
> *This isn't a demo. This is shippable.*

---

## 2 · What Makes Birik Different

| Pattern | How others do it | What Birik does |
|---|---|---|
| **Cross-currency settle** | "Sorry, same currency only" | Atomic Soroswap pair swap inside the settle tx (Path B — bypasses router auth quirks) |
| **Reward token mint** | Off-chain points stored in a database | On-chain SPLT minted via cross-contract call from `register_referral` |
| **Identity** | Email + password | Sign-In With Stellar (SIWS) — wallet-native, no PII at rest |
| **Receipts** | Server-side OCR | Client-side Tesseract WASM (vendor-ocr chunk, lazy-loaded) |
| **Failure recovery** | "Try again later" | Emergency pause (admin-only, < 5 min recovery) + ErrorBoundary auto-reload on stale chunks |
| **Demo mode** | None — sign up to see anything | Offline-first localStorage path, no wallet required for the first 30 seconds |

---

## 3 · Stellar / Soroban Integrations Used

- **Soroban contract** (`stellar_split.wasm`, 33 KB after wasm-opt) — Rust, `#![no_std]`, soroban-sdk 22
- **Cross-contract call** — `register_referral` mints SPLT via the token contract (`token::Client`)
- **Direct pair swap** — `settle_group_flex` calls Soroswap pair's `swap()` directly after a manual `transfer()` to the pool, bypassing the router's nested-auth recording quirk (Path B)
- **SAC integration** — XLM and USDC via Stellar Asset Contracts; settlement reads `Asset::native().contractId()` and the `VITE_USDC_CONTRACT_ID` env var
- **Horizon REST** — wallet balance polling (15s interval), tx confirmation watching for SSE
- **Soroban RPC** — read-only `simulateTransaction` for `get_group`, `get_balances`, `compute_settlements`, all SPLT balance reads, plus full settlement signing path
- **SEP-7** — payment request URIs for mobile wallet bridging (`anchor.ts`)
- **SIWS** — Sign-In With Stellar nonce-challenge auth (`siws.ts`) backed by JWT (15 min access + 7 day HttpOnly refresh)

---

## 4 · Architecture at a Glance

```
┌─ Frontend (React 19 + Vite, Vercel) ─────┐
│ • Lazy routes + vendor chunks            │
│ • SIWS auth + JWT in memory              │
│ • Zustand store (persisted wallet)        │
│ • TanStack Query for cache + retries     │
└──────────────┬───────────────────────────┘
               │  HTTPS / SSE / WS
               ▼
┌─ Backend (NestJS, Railway) ──────────────┐
│ • PostgreSQL (Prisma) for off-chain      │
│   metadata, audit log, push subs         │
│ • Redis + BullMQ (recurring, tx-monitor, │
│   DLQ)                                    │
│ • Prometheus /metrics + Sentry            │
└──────────────┬───────────────────────────┘
               │
               ▼  contract calls / RPC reads
┌─ Stellar / Soroban Testnet ──────────────┐
│ stellar_split.wasm   ←  this is the only  │
│   ├ create_group         place where      │
│   ├ add_expense          balances and     │
│   ├ settle_group(_flex)  expenses live    │
│   └ register_referral                     │
│        ↓ cross-contract                   │
│   stellar_split_token.wasm  (SPLT)        │
└──────────────────────────────────────────┘
```

Diagrams in [`architecture/SYSTEM_OVERVIEW.md`](architecture/SYSTEM_OVERVIEW.md) — 8 Mermaid charts covering the SIWS flow, expense → settlement sequence, contract state machine, BullMQ pipeline, bundle topology, emergency-pause circuit-breaker, and receipt import.

---

## 5 · Production-Grade Quality Bar

| | Detail |
|---|---|
| **Tests** | Contract 46/46 ✅, Frontend 986/986 ✅, plus backend Jest suite |
| **Type safety** | Strict TS, 0 errors; `RUSTFLAGS="-D warnings"` on contract |
| **CI** | `.github/workflows/ci.yml` runs contract test, clippy, frontend build/test/E2E (Playwright), backend test/build, npm-audit, Codecov upload |
| **Observability** | Prometheus alert rules (`monitoring/alerts.yml`), Sentry, Pino logs, `/health/live` + `/health/ready` |
| **Security** | Emergency pause (admin only, < 5 min recovery), property-based balance-sum invariant, `overflow-checks=true` retained even in release |
| **Reliability** | Daily Postgres backup → S3 (RPO 24 h, RTO ~15 min), DLQ worker with `UnrecoverableError`, ErrorBoundary auto-reload on stale chunks |
| **Performance** | wasm-opt: 39 KB → 33 KB (-15%); main JS bundle 180 KB gzip; vendor-ocr lazy chunk |

---

## 6 · The 5-Day Hardening Sprint (April 22–26, 2026)

| Day | Theme | Headline | PR |
|---|---|---|---|
| **F1** | Frontend quality | GroupDetail refactor + multi-currency E2E + i18n sweep + 14-modal a11y audit | #29 |
| **F2** | Design system | Tokens (`tokens.ts`), FOUC fix, vendor-ocr/pdf lazy chunks | #30 |
| **B1** | Backend hardening | BullMQ ioredis fix, API v1 versioning, DLQ worker, Prometheus alerts, DB backup script | #31 |
| **B2** | Contract hardening | Emergency pause circuit-breaker, wasm-opt profile, 11 property-based tests, rollback playbook | #32 |
| **G**  | Growth | Feature flags, feedback widget, analytics catalog (22 events), `/referral` route, 8 Mermaid arch diagrams | #33 |
| **+ Hotfixes** | Live tuning | Stale-chunk auto-reload, wallet persist, demo↔testnet cache invalidation, SPLT TimeBounds, TabErrorBoundary | `b16ad6b`, `3eafa55` |

Total: **5 PRs squashed to master + 3 hotfix commits** in 5 days, no broken master, every step shipped to Vercel within 2 minutes.

---

## 7 · Demo Flow (3 minutes — judges should follow along)

| t | Action | What's showcased |
|---|---|---|
| 0:00 | Open https://stellar-split.vercel.app | Landing, no white flash (FOUC fix), feature flags live |
| 0:15 | Click "Connect Wallet" | Freighter popup — SIWS nonce signed, JWT minted, dashboard hydrated from persisted wallet |
| 0:30 | "+ New Group" → 2 friends + XLM | Soroban `create_group` tx, fee chip shows ~106 stroops (~$0.0017) |
| 0:50 | "+ Add Expense" → 5 XLM Dinner | `add_expense` event, AI category hint live |
| 1:10 | Switch to "Bakiyeler" tab | Min-flow algorithm shows Bob owes Alice 2.5 XLM |
| 1:25 | Switch to "Takas" → choose USDC for Alice | Trustline pre-flight banner + one-click trustline add |
| 1:50 | Confirm settle | Atomic Soroswap pair swap inside `settle_group_flex` |
| 2:10 | Stellar Expert tab → tx events | `pair_swap`, `multi_currency_settle`, transfer chain — verifiable on-chain |
| 2:30 | `F` keyboard shortcut → /referral | Referral code copy + analytics event fired |
| 2:50 | Click feedback FAB → submit a 1-line note | Feedback widget POSTs to backend, queues locally as fallback |

---

## 8 · What's Behind the "Why Stellar" Choice

1. **5-second finality, ~$0.000005 per operation.** A coffee splits into 4 transactions cost ≈ $0.00002 total. No other L1 makes this UX possible.
2. **Soroban native asset contracts.** XLM and USDC are first-class — no bridging, no wrapped tokens, no extra contracts to deploy.
3. **Soroswap for cross-currency.** Real liquidity, real auth shape — we found and worked around the router's nested-auth quirk (Path B) and documented the entire investigation in `docs/MULTI_CURRENCY.md`.
4. **SEP-7 + Freighter UX.** Mobile users scan a payment URI, sign in their wallet, done. No separate Birik app required.
5. **Sign-In With Stellar.** Wallet-native auth means no PII at rest. The backend stores only public keys.

---

## 9 · Where We're Going Next

| | |
|---|---|
| **30 days post-submission** | SPLT → full SEP-41 (transfer, approve, allowance, burn, clawback) — see [`SPLT_TOKEN_SPEC.md`](SPLT_TOKEN_SPEC.md) |
| **60 days** | Mainnet deploy with multisig admin + audit |
| **90 days** | On-chain governance contract (proposal + vote weighting by SPLT) |
| **Ongoing** | Soroswap multi-hop router for groups whose preferred token isn't paired with the source asset |

---

## 10 · Files a Judge Should Open

**Code:**
1. [`contracts/stellar_split/src/lib.rs`](../contracts/stellar_split/src/lib.rs) — main contract (settle_group_flex around line 600)
2. [`contracts/stellar_split/src/test.rs`](../contracts/stellar_split/src/test.rs) — 46 tests including property-based balance-sum invariant and emergency-pause coverage
3. [`frontend/src/lib/contract.ts`](../frontend/src/lib/contract.ts) — Soroban client (`getSPLTBalance`, `settleGroupFlex` around line 800)
4. [`backend/src/main.ts`](../backend/src/main.ts) — NestJS bootstrap with API v1 versioning + Swagger setup
5. [`frontend/src/components/ErrorBoundary.tsx`](../frontend/src/components/ErrorBoundary.tsx) — stale-chunk auto-reload (mid-deploy resilience)

**Docs:**
1. [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) — every bug we found and either fixed or documented
2. [`ROLLBACK_PLAYBOOK.md`](ROLLBACK_PLAYBOOK.md) — emergency procedures
3. [`architecture/SYSTEM_OVERVIEW.md`](architecture/SYSTEM_OVERVIEW.md) — 8 Mermaid diagrams
4. [`MULTI_CURRENCY.md`](MULTI_CURRENCY.md) — Path B investigation log (Session 10A → 10C → C1 → live deploy)

---

## 11 · Honest Self-Assessment

What we'd do differently with another week:

- **Backend Day-B1 prod deploy.** It's been failing on Railway and we're shipping the frontend against the pre-Day-B1 backend. Re-deploy of master HEAD will close the gap and unlock the AuditTab + DLQ admin endpoints.
- **Demo mode parity.** Demo mode currently uses a placeholder for `/group/:id` detail. We'd unify it through a single `demoStore` slice instead of branching inside every contract helper.
- **A real Lighthouse pass.** We did a self-audit during the hardening sprint; a formal Lighthouse + axe run would be the next CI gate.

These are tracked in [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) — nothing is hidden.

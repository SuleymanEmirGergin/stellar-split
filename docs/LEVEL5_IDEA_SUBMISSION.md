# Level 5/6 Idea Submission — Birik

**Project**: Birik (StellarSplit) — group expense splitting on Stellar + Soroban
**Current level complete**: L1–L4 (mini-dApp ✅ · tests 1,293 passing ✅ · CI/CD ✅ · mobile responsive ✅ · inter-contract call ✅ · custom token ✅ · savings pool ✅)
**Repo**: https://github.com/SuleymanEmirGergin/stellar-split
**Live**: https://stellar-split.vercel.app

---

## 🎯 The Level 5/6 Idea — "Multi-currency settle + yield on idle group funds"

Birik already does the hard part: anyone can drop a group expense on-chain, we compute the minimum-transfer settlement set via a greedy algorithm, and one tap closes every balance in ~5 seconds on Stellar. What's next is **making the money smarter while it's sitting in the group**.

Two features, one coherent story:

### A) Real multi-currency settle (path payments)
**Problem today**: a group is locked to one currency. If Emir paid in XLM but Selin wants her settlement in USDC, someone has to swap manually off-app.

**What we'll build**: settle_group will route through Stellar path payments. Emir pays XLM, the contract quotes the cheapest path (XLM → USDC via Stellar DEX offers), and Selin receives USDC in the same 5-second window. One transaction, two parties, two currencies — all on-chain, all in the settle button's "apply" animation.

**Why it matters**: removes the single biggest friction point we see in user sessions — the "I have to swap this before sending it" aside. For a product about "hepsi tek uygulamada", not supporting FX is the embarrassing gap.

### B) Yield on idle group funds (savings-pool v2)
**Problem today**: when a group has an active savings pool (e.g., "İstanbul trip in 3 months, 40,000 TRY target"), the money sits idle until the goal date. In traditional banking this is also idle, but we're a crypto product — idle money is a bug, not a feature.

**What we'll build**: the savings pool's `contribute_pool` will auto-route contributions through a Blend lending pool (or SoroSwap AMM LP depending on the group's risk setting), earning yield during the wait period. Release at goal/deadline auto-withdraws + distributes principal + pro-rata yield to each contributor.

**Why it matters**: transforms "let's save for the trip together" from a nice social UX into a real financial product. Concretely: a 40K TRY pool over 3 months at a realistic DeFi APY of ~8% earns ~820 TRY free — more than enough to cover one night of the hotel itself. The pitch writes itself.

---

## 🧱 What this actually requires (Level 6 scope)

1. **Inter-contract calls beyond the mint pattern we already have**:
   - Stellar built-in SAC (Stellar Asset Contract) — swap via `path_payment_strict_receive`
   - Blend pool contract — `submit` / `withdraw` / `get_positions`
   - SoroSwap AMM — optional alternative path

2. **Custom contract storage for pool position tracking**:
   - each savings pool tracks its underlying DeFi position, total yield earned, last-synced block
   - lazy yield accrual on release (pulling the current LP value, not storing every accrual event)

3. **Real oracle / price-feed integration**:
   - Reflector price feeds on Soroban for the XLM/USDC quote used in multi-currency settle previews ("Selin will receive ~38.4 USDC at current rate")

4. **Frontend**:
   - per-group currency preference picker (settlement currency defaults to payer's currency, override per group)
   - savings-pool yield widget (progress to goal + live yield ticker)
   - real-time path-payment preview during the settle flow
   - transaction receipt showing all three legs (XLM out → DEX swap → USDC in)

5. **Production-readiness work on top**:
   - contract upgrade pattern (storage migration from v1 SavingsPool → v2 with yield fields)
   - GraphQL subscription or Horizon SSE for live yield updates
   - Sentry + PostHog already wired; add a custom `settle.multicurrency` + `pool.yield_claimed` event taxonomy
   - full E2E Playwright coverage of the new flows
   - Lighthouse ≥95 on mobile (currently good but not verified)

---

## ⏱ Timeline (if approved)

| Week | Deliverable |
|---|---|
| 1 | Stellar DEX path payment prototype on testnet; settle_group accepts destination asset param; manual test |
| 2 | Reflector price feed wired into settle preview UI; path simulation + slippage guard |
| 3 | Blend integration for savings-pool auto-deposit; pool release computes yield + distributes pro-rata |
| 4 | E2E tests, mobile polish, Lighthouse pass, demo video, submission |

---

## 🧭 Why this, not something else

We already built the "boring" part that every crypto dApp skips: end-to-end product UX (13 tabs, mobile, onboarding, QR join, social recovery, audit trail). Level 5/6 is the right moment to push on-chain depth — the product is mature enough to absorb advanced contract patterns without collapsing, and the features above are the ones real users have asked for in testing (n≈12 Turkish crypto-native households, mostly Erasmus + remote team use cases).

Neither feature is "cool AI demo of the month" territory. Both are boring infrastructure that make the product feel like real financial software instead of a hackathon toy. That's the L5/L6 bar.

---

## Submission form fields (copy-paste ready)

**Title**: Birik v2 — Multi-currency settle + auto-yield savings pool

**One-line pitch**: Settle group expenses across any Stellar asset via path payments, and earn real DeFi yield on idle group savings without leaving the app.

**Primary contract patterns used**: inter-contract invoke (SAC path_payment_strict_receive + Blend submit/withdraw), custom storage with lazy yield accrual, oracle integration (Reflector price feed), contract upgrade migration (SavingsPool v1→v2).

**Why it's advanced**: three live production Soroban integrations (DEX, lending, oracle) composed in a single user-facing flow, with real money at stake and non-trivial UX (slippage, yield surfacing, multi-currency previews).

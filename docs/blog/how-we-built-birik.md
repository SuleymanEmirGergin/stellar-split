---
title: "How we built Birik — group expense splitting on Stellar in 30 days"
published: false
description: "1,293 tests, 94 commits, min-flow settlements on-chain, inter-contract SPLT reward minting, SIWS auth — a teardown of what it actually takes to ship a full Soroban dApp in a month."
tags: stellar, rust, react, blockchain
cover_image: https://raw.githubusercontent.com/SuleymanEmirGergin/Birik/master/docs/screenshots/landing-desktop-dark.png
canonical_url:
---

> **TL;DR** — We shipped **Birik** — a Splitwise-style group expense app on Stellar/Soroban — in 30 days: 1,293 tests, 94 commits, min-flow settlements on-chain, inter-contract SPLT reward minting, SIWS auth, full CI/CD. This post is the honest version: what worked, what surprised us, what we'd do differently. Live demo: [stellar-split.vercel.app](https://stellar-split.vercel.app) · Repo: [github.com/SuleymanEmirGergin/Birik](https://github.com/SuleymanEmirGergin/Birik).

---

## The problem we tried to solve

Splitwise and Tricount solved the **tracking** problem a decade ago: who owes what in a group, who's even, who needs to pay up. They're great. Millions of people use them.

But they only ever got you halfway. When the dust settles and the app says "Selin owes you 340 TL" — you still have to _actually move the money_. Bank transfer, PayPal, Revolut, cash. Fees. Delays. Paragraph-long explanations in the memo field. The friction is worse for international groups: Erasmus housemates, remote startup teams, holiday crews.

Crypto solved peer-to-peer transfer a long time ago. So why hasn't anyone merged the two?

Partly because most chains don't make this look good:

- Ethereum gas fees exceed a typical restaurant bill split
- Bitcoin is too slow for "pay you back for dinner"
- Most L2s still make you bridge, reason about fees, explain wrapped tokens

Stellar's fee model (~$0.00005 per tx) and sub-6-second finality make it the obvious answer. Soroban — the smart contract layer — makes the non-obvious part (programmable group logic) actually pleasant.

So that's what we built.

---

## Why Stellar/Soroban specifically

Three reasons, in order of how much they mattered:

1. **Fees small enough to stop thinking about.** A typical settle operation on Birik costs ~125,908 stroops. That's roughly **1.2 cents**. You don't build "split the bar tab" on a chain where settling costs more than the tab.
2. **Rust + good tooling.** Soroban contracts are Rust. The SDK is well-typed. `cargo test` gives you proper unit tests with mocked `Env`. `stellar-cli` is fine. This sounds minor but matters a lot on day 20 when you're debugging an `InvokeContractError`.
3. **Stellar Asset Contract (SAC).** Every asset on Stellar is automatically exposed as a Soroban contract. Our `settle_group` transfers native XLM by calling into the XLM SAC — no wrapping, no bridge, no fake asset.

The thing nobody tells you going in: **Soroban testnet is really fast to iterate on.** We were redeploying the contract 3-5 times a day at peak. `friendbot` for test funds is cozy. The dev loop is maybe the best I've used on any chain.

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (Vercel)                          │
│   React 19 + Vite 6 + TypeScript + Tailwind + Freighter wallet     │
│   i18n (TR/EN/DE/ES) · PWA · SSE subscriber · 880 Vitest tests     │
└──────────────────┬───────────────────────────────┬──────────────────┘
                   │ SIWS / JWT                    │ Soroban RPC
                   ▼                               ▼
┌──────────────────────────────────────┐   ┌─────────────────────────┐
│      Backend (Railway, NestJS)       │   │    Stellar Testnet       │
│   Prisma · Postgres · Redis · BullMQ │   │    stellar_split.wasm    │
│   SSE event bus · 389 Jest tests     │◄──┤    24 cargo tests        │
└──────────────────┬───────────────────┘   │    5 entrypoints         │
                   │ webhook bridge          │    + companion SPLT     │
                   ▼                         │    (inter-contract)    │
        Discord / Slack / Web Push            └─────────────────────────┘
```

Three layers, one shared feature story. CI (GitHub Actions) gates a merge on the full 1,293-test matrix going green.

![Birik dashboard](https://raw.githubusercontent.com/SuleymanEmirGergin/Birik/master/docs/screenshots/dashboard.png)

---

## Three technical details worth reading

### 1. On-chain min-flow settlement

The hardest "easy" part of a group expense app: when you know everyone's net balance, what's the _minimum_ number of transfers to zero everyone out?

The naive answer is O(N²): every debtor pays every creditor they owe. For a group of 6, that's up to 15 pairwise transfers. We can do a lot better with a greedy pairing.

[`contracts/stellar_split/src/settle.rs`](https://github.com/SuleymanEmirGergin/Birik/blob/master/contracts/stellar_split/src/settle.rs):

```rust
pub fn compute_optimal_settlements(env: &Env, balances: &Map<Address, i128>) -> Vec<Settlement> {
    let mut settlements: Vec<Settlement> = Vec::new(env);

    // Split into debtors (negative) and creditors (positive).
    let mut debtors: Vec<(Address, i128)> = Vec::new(env);
    let mut creditors: Vec<(Address, i128)> = Vec::new(env);
    for key in balances.keys() {
        let b = balances.get(key.clone()).unwrap();
        if b < 0 { debtors.push_back((key, -b)); }
        else if b > 0 { creditors.push_back((key, b)); }
    }

    // Greedy pairing: match largest debtor with largest creditor,
    // transfer min(debt, credit), advance whichever is now zero.
    while d_idx < debtors.len() && c_idx < creditors.len() {
        let amt = d_remaining.min(c_remaining);
        settlements.push_back(Settlement { from, to, amount: amt });
        // …update remaining, advance indices
    }

    settlements  // Guarantee: at most N-1 transfers for N people.
}
```

Guarantee: for N non-zero-balance members, at most **N-1** transfers. For our "Settle Demo" group of 4, this turns what could be 6 pairwise transfers into 2. The UI surfaces this visually:

![Settle modal with min-flow rows](https://raw.githubusercontent.com/SuleymanEmirGergin/Birik/master/docs/screenshots/settle-modal-minflow.png)

Running it on-chain isn't just "cool" — it's the _correctness_ argument. The client can't lie about whom you owe.

### 2. Inter-contract call — the SPLT reward

When a user taps _Mark Group as Settled_, two things happen in one transaction:

1. The contract loops `token_client.transfer(from, to, amount)` through the computed settlements.
2. The main contract then **calls into a second contract** — our custom SEP-41 `stellar_split_token` — to mint 100 SPLT to the settler as a reward.

[`contracts/stellar_split/src/lib.rs:395-400`](https://github.com/SuleymanEmirGergin/Birik/blob/master/contracts/stellar_split/src/lib.rs):

```rust
let reward_amount = 100_i128; // 100 SPLT
env.invoke_contract::<()>(
    &reward_token_id,
    &soroban_sdk::Symbol::new(&env, "mint"),
    soroban_sdk::vec![&env, settler.into_val(&env), reward_amount.into_val(&env)],
);
```

The first time we got this working was a genuinely good moment. `env.invoke_contract` composes very cleanly — you pass the target contract's ID, the function symbol, and a `vec!` of arguments. The typing through `into_val` is finicky but pleasant once you learn it.

A toast confirms the reward on the client:

![Settlement complete + reward toast](https://raw.githubusercontent.com/SuleymanEmirGergin/Birik/master/docs/screenshots/splt-reward.png)

On the backend side, we emit a `reward_minted` event so analytics and the SSE bus can pick it up.

### 3. Sign-In With Stellar (SIWS)

You can't trust a wallet-address-only auth model for any backend feature (private groups, persistence, notifications). We implemented SIWS — a Stellar-adapted SIWE:

1. Client asks backend for a challenge (`GET /auth/challenge?address=G...`)
2. Backend returns a short random string + issued-at timestamp
3. Client has Freighter sign the challenge
4. Client POSTs `{address, signature}` to `/auth/verify`
5. Backend verifies the signature against the address's public key
6. On success: returns a short-lived JWT (access) + sets an `HttpOnly` refresh cookie
7. Client silently refreshes on 401

This shipped in ~200 lines of backend code. The only thing that hurt us was cookie `SameSite` when the frontend and backend live on different Vercel/Railway domains. Solved with `SameSite=None; Secure` + matching CORS.

---

## The test strategy, and why we over-invested

1,293 tests is a number we're a little sheepish about. Here's why we didn't feel like we overshot:

- **Contract tests (24, `cargo test`):** every entrypoint, happy path + failure modes (wrong auth, already-settled, removed member). A bug in `compute_optimal_settlements` doesn't just break one feature, it silently robs users. These tests are non-optional.
- **Backend tests (389, `jest`):** NestJS controllers + services + auth guards + queue processors. Wallet-address-based authorization is easy to get wrong in subtle ways; we lean on test coverage rather than careful code review alone.
- **Frontend tests (880 unit + ~60 Playwright e2e, `vitest` + `playwright`):** component rendering, `useX` hooks, i18n translations across 4 languages, form validation, demo-mode flows. The e2e layer catches routing and state-seeding bugs that unit tests can't.

All three suites are gated in [`.github/workflows/ci.yml`](https://github.com/SuleymanEmirGergin/Birik/blob/master/.github/workflows/ci.yml) — nothing merges unless everything is green.

A small concrete example: in the last week of the build, a contributor accidentally removed a translation key. The CI frontend test suite caught it (we compile with TypeScript strict, and the `t('key.foo')` type derived from the translations object went red). Total fix time: ~3 minutes. Without that, we'd have shipped a broken dropdown in 2 languages.

![Activity / insights dashboard](https://raw.githubusercontent.com/SuleymanEmirGergin/Birik/master/docs/screenshots/activity-feed.png)

---

## Stuff that was unexpectedly hard

**Freighter in Playwright.** We can't make Playwright sign a transaction through a browser extension non-interactively. Solution: a hard demo mode (`localStorage.setItem('stellarsplit_demo_mode', 'true')`) that stubs the entire contract surface with deterministic mocks. All our e2e tests run in demo mode. It's honestly better — the tests are faster and free of flake from network calls.

**Horizon rate limits.** Horizon's public testnet endpoint throttles at ~30 req/min/IP. With 4 members rendering an activity feed on dashboard load, we blew through it in testing. Fix: a small backend `/analytics/summary` aggregator + Redis 60s cache on the public route.

**Freighter network switching.** Users land on the app with Freighter in Mainnet mode. Our UI now detects this and gently nudges them to switch — because otherwise "connect wallet" succeeds and _everything else_ silently fails. A wasted hour, then a lesson.

**Windows dev on a mixed team.** `LF → CRLF` warnings from git on every commit, `node_modules` path-length limits, `\r\n` leaks into snapshot tests. We added `.gitattributes`, pinned Node, and moved on.

---

## Mobile, because people pay each other from their phones

It would've been easy to let this be a desktop dApp. But the actual use case is _"I just paid for dinner, now log it from the table"_. We designed mobile-first from day one.

A small detail we're proud of: the **bottom sheet** with tab categories opens from the FAB, so the dashboard works one-handed. Every major action is reachable without scrolling.

![Mobile bottom sheet](https://raw.githubusercontent.com/SuleymanEmirGergin/Birik/master/docs/screenshots/mobile-bottomsheet.png)

---

## What's next

We shipped the core. What we want to do in the next phase:

- **Multi-currency settle.** Payer sent XLM, recipient wants USDC? Route through Stellar path payments. One transaction, two parties, two currencies.
- **Yield on idle savings pools.** Our `create_savings_pool` / `contribute_pool` / `release_pool` entrypoints are live. Hooking the contribution step into a Blend lending pool would turn passive group savings into actual returns.
- **Mainnet.** After a third-party audit and more beta users.

---

## Try it + feedback

- **Live demo (testnet):** [stellar-split.vercel.app](https://stellar-split.vercel.app) — press `D` on the landing page for demo mode, no wallet needed
- **Contract on Stellar Expert:** [`CBQENHYCVSOK3CHZ6NRT6BI34W2ERPSRUNXHI6X5X33DTDCDWX27YN7K`](https://stellar.expert/explorer/testnet/contract/CBQENHYCVSOK3CHZ6NRT6BI34W2ERPSRUNXHI6X5X33DTDCDWX27YN7K)
- **Repo:** [github.com/SuleymanEmirGergin/Birik](https://github.com/SuleymanEmirGergin/Birik)
- **Testnet beta feedback form (2 min):** [forms.gle/oFSNuU6a9NthmfJR7](https://forms.gle/oFSNuU6a9NthmfJR7)

If you try it and find a bug, ship us an issue. If you're building on Soroban and any of this was useful, we'd love to hear what you ran into — tag us [@StellarOrg](https://twitter.com/StellarOrg) on the retweet.

Thanks for reading 🙏

---

## Publishing notes (not part of the post)

- Cover image URL uses the raw GitHub CDN — Dev.to/Medium will re-host on publish
- All inline image URLs are absolute (raw.githubusercontent.com) so they render correctly when imported into Medium/Hashnode
- Set `published: true` in the frontmatter when you actually hit publish on Dev.to
- Canonical URL should be set to wherever this is _first_ published (so SEO doesn't split across mirrors)
- Reposting plan:
  - **Primary:** Dev.to (Stellar community reads this)
  - **Mirror:** Medium (wider reach; set canonical_url back to Dev.to)
  - **Mirror:** Hashnode (optional, 1-week lag)
  - **Tweet:** Thread-ify the 3 technical sections using [`docs/social/twitter-threads.md`](../social/twitter-threads.md) (Session 3)
- Tag the Stellar team on the Twitter thread for retweet visibility

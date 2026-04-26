# Birik — Twitter/X Thread Playbook

Publishing schedule, hashtag strategy, and **3 copy-paste-ready threads**.

Every tweet below is in its own code block — click the copy icon (top-right of the block on GitHub), paste into X, attach the listed image, post. No editing needed.

---

## Publishing schedule — principles + two strategies

The day of the week matters far less than:

1. **Time of day** > day of week
2. **24–48 hour gap between threads**
3. **All three threads live within ~1 week** (momentum compounds)

The schedules below work starting from **any weekday**.

### Strategy A — Awareness-first (default)
Broad hook first, tighten into CTA.

| +Day | Hour (local) | Thread | Why |
|------|------|--------|-----|
| **Day 0** | 20:00 | Thread 1 — *Why Birik?* | Evergreen hook, widest reach |
| **+2 days** | 16:00 | Thread 2 — *Under the hood* | US dev lunch hour — technical audience |
| **+4 days** | 18:00 | Thread 3 — *Testnet beta open* | Weekend personal time → higher setup + form-fill rate |

### Strategy B — Conversion-first (use when you urgently need testnet users)
MVP submission deadline close? Put the CTA first.

| +Day | Hour (local) | Thread | Why |
|------|------|--------|-----|
| **Day 0** | 20:00 | Thread 3 — *Testnet beta open* | Direct CTA, fastest form-fill |
| **+2 days** | 20:00 | Thread 1 — *Why Birik?* | Backfills brand story for Thread 3 impressions |
| **+4 days** | 18:00 | Thread 2 — *Under the hood* | Dev community, repo stars, long-term interest |

### Time-of-day cheat sheet (TR timezone reference)

| Audience | TR hour | Rationale |
|----------|---------|-----------|
| Turkish crypto community | 20:00–22:00 | After-work, phone-in-hand |
| US dev community | 16:00–18:00 TR (9–11 ET) | Morning coffee + Twitter ritual |
| EU crypto builders | 18:00–20:00 TR | Europe end-of-day |
| Low-competition window | 12:30–13:30 TR | Lunch, fewer posts competing |

**Default recommendation:** `20:00 TR` — simultaneously catches all three audiences.

> ⚠️ Don't post threads less than 24 hours apart. Timelines overload → unfollow.

---

## Hashtag + mention cheat sheet

**First-level mentions (use on the last tweet of every thread):**
- [@StellarOrg](https://twitter.com/StellarOrg) — main Stellar account, highest retweet chance
- [@SorobanOfficial](https://twitter.com/SorobanOfficial) — smart contract layer
- [@SDF_Official](https://twitter.com/SDF_Official) — Stellar Development Foundation

**Second-level mentions (only Thread 2 — technical):**
- [@rustlang](https://twitter.com/rustlang) — Rust community
- [@Freighter_](https://twitter.com/Freighter_) — wallet
- [@dev_to](https://twitter.com/dev_to) — blog platform

**Hashtag taxonomy:**
- Required on every thread: `#Stellar #Soroban`
- Thread 1 (product): add `#Web3 #BuildOnStellar`
- Thread 2 (technical): add `#RustLang #OpenSource`
- Thread 3 (beta): add `#Web3Beta #Testnet`

> 💡 X algorithm penalizes more than 2 hashtags per tweet. Put hashtags only on the first and last tweets of a thread.

---

## Visual asset mapping

Drag-drop from `docs/screenshots/` when composing on X.

| File | Used in |
|------|---------|
| `landing-desktop-dark.png` | Thread 1 / Tweet 2 |
| `settle-modal-minflow.png` | Thread 1 / Tweet 4, Thread 2 / Tweet 3 |
| `splt-reward.png` | Thread 1 / Tweet 5, Thread 2 / Tweet 5 |
| `mobile-bottomsheet.png` | Thread 1 / Tweet 6 |
| `activity-feed.png` | Thread 2 / Tweet 8 |
| `landing-mobile-dark.png` | Thread 3 / Tweet 4 |

---

# 🧵 Thread 1 — *Why Birik?*

**Goal:** Problem framing → product intro → try-it CTA
**Audience:** Broad crypto-curious + Stellar ecosystem
**Length:** 8 tweets

---

### Tweet 1/8
`270 chars` · no image

```
Splitwise tells you who owes what. Then you still have to actually move the money — bank transfer, PayPal, Revolut, cash.

Slow. Fees. Paragraph-long memo fields.

Crypto solved peer-to-peer transfer 10 years ago. So why hasn't anyone merged the two?

🧵
```

---

### Tweet 2/8
`237 chars` · 📎 `landing-desktop-dark.png`

```
We built Birik — group expense splitting on Stellar.

Track → split → settle, all in one place. Settlement goes on-chain in ~5 seconds at ~1.2 cents per tx.

No bank transfers. No Revolut. No IOU limbo.
```

---

### Tweet 3/8
`263 chars` · no image

```
Why Stellar specifically? Three reasons:

1. Fees small enough to stop thinking about (~$0.00005)
2. Soroban contracts are in Rust — tooling is genuinely pleasant
3. Every asset on Stellar is also a Soroban contract (SAC) — no bridging, no wrapping
```

---

### Tweet 4/8
`260 chars` · 📎 `settle-modal-minflow.png`

```
The clever bit: when 6 people owe different amounts, the naive approach is up to 15 pairwise transfers.

Birik runs a greedy min-flow algorithm on-chain → at most N-1 transfers.

For a group of 4, that's often 2 transfers instead of 6.
```

---

### Tweet 5/8
`264 chars` · 📎 `splt-reward.png`

```
When you tap "Mark as Settled", the contract:

→ transfers XLM via the native SAC
→ inter-contract-calls our companion SPLT token to mint 100 SPLT to you

All atomic, one transaction. Love how cleanly Soroban composes.
```

---

### Tweet 6/8
`237 chars` · 📎 `mobile-bottomsheet.png`

```
30-day ship stats:

🧪 1,293 tests across contract/backend/frontend
📝 94 commits
🌍 4 languages (TR/EN/DE/ES)
📱 Mobile-first responsive UI
🚀 Full CI/CD, deployed

Not a hackathon toy. Built like real software.
```

---

### Tweet 7/8
`265 chars` · no image

```
Try it (no wallet needed):

🌐 stellar-split.vercel.app
Press D on the landing page for demo mode.

📝 Contract verified on Stellar Expert:
stellar.expert/explorer/testnet/contract/CBQENHYCVSOK3CHZ6NRT6BI34W2ERPSRUNXHI6X5X33DTDCDWX27YN7K
```

---

### Tweet 8/8
`272 chars` · no image

```
Open source. MIT.

Next up: multi-currency settle via path payments + real yield on idle group savings.

Star the repo, break the demo, tell me what sucks.

github.com/SuleymanEmirGergin/Birik

cc @StellarOrg @SorobanOfficial

#Stellar #Soroban #BuildOnStellar #Web3
```

---

# 🧵 Thread 2 — *Under the hood*

**Goal:** Technical deep dive — min-flow algorithm, inter-contract calls, SIWS auth
**Audience:** Soroban devs + Stellar builder community
**Length:** 9 tweets

---

### Tweet 1/9
`217 chars` · no image

```
We open-sourced a full Soroban dApp this month: group expense splitting on Stellar.

3 technical decisions worth reading if you're building anything on-chain 🧵

(I have opinions. You've been warned.)
```

---

### Tweet 2/9
`225 chars` · no image

```
1/ MIN-FLOW SETTLEMENT — on-chain

6-person group? Up to 15 pairwise transfers in the worst case.

We pair largest debtor with largest creditor greedily.
Guarantee: ≤ N-1 transfers for N people.
```

---

### Tweet 3/9
`278 chars` · 📎 `settle-modal-minflow.png`

```
while d_idx < debtors.len() && c_idx < creditors.len() {
    let amt = d_remaining.min(c_remaining);
    settlements.push_back(Settlement { from, to, amount: amt });
    // ...update remainders, advance indices
}

Running it on-chain is the correctness argument. Client can't lie.
```

---

### Tweet 4/9
`264 chars` · no image

```
2/ INTER-CONTRACT CALL

When you tap "Settle", the main contract:
→ loops through settlements, calling SAC.transfer for each
→ calls INTO our companion SPLT token contract's mint() for the settler reward

All atomic. One transaction.
```

---

### Tweet 5/9
`259 chars` · 📎 `splt-reward.png`

```
// lib.rs:395
let reward_amount = 100_i128;
env.invoke_contract::<()>(
  &reward_token_id,
  &Symbol::new(&env, "mint"),
  vec![&env, settler.into_val(&env), reward_amount.into_val(&env)],
);

Composition via invoke_contract is beautifully clean.
```

---

### Tweet 6/9
`274 chars` · no image

```
3/ SIGN-IN WITH STELLAR (SIWS) — our take on SIWE

Wallet-address-only auth doesn't cut it for backend features (private groups, push notifications).

challenge → Freighter signs → backend verifies → JWT + HttpOnly refresh

~200 LOC. Caveat 👇
```

---

### Tweet 7/9
`196 chars` · no image

```
Cookie gotcha:

Frontend on Vercel, backend on Railway = different domains.

You need SameSite=None; Secure + matching CORS.

Lost an hour to this. Saving you that hour.
```

---

### Tweet 8/9
`268 chars` · 📎 `activity-feed.png`

```
Test budget for 30 days:

🦀 24 contract tests (cargo)
🧩 389 backend tests (Jest/NestJS)
⚛️ 880 frontend unit + 60+ Playwright e2e

All gated in CI. Nothing merges red.

Why so many? Contract bugs silently rob users. Worth the budget.
```

---

### Tweet 9/9
`273 chars` · no image

```
Full write-up with architecture diagrams + lessons learned from 30 days:

dev.to/plutazom/how-we-built-birik-group-expense-splitting-on-stellar-in-30-days-1aog

Repo: github.com/SuleymanEmirGergin/Birik

cc @StellarOrg @SorobanOfficial

#Stellar #Soroban #RustLang
```

> 💡 Alternative closing link (shorter): `medium.com/@Plutazom/how-we-built-birik-group-expense-splitting-on-stellar-in-30-days-31c1ab3a0447`
>
> **SEO tip:** set Medium's canonical URL to the Dev.to version (Medium → Story settings → Advanced → Add canonical URL). Prevents duplicate-content penalties in search.

---

# 🧵 Thread 3 — *Testnet beta open*

**Goal:** Recruit 20 real testnet users for feedback + verifiable wallet addresses
**Audience:** Crypto-curious + Stellar beta testers + Turkish/European student + startup networks
**Length:** 8 tweets

---

### Tweet 1/8
`274 chars` · no image

```
We're looking for 20 people to beta test Birik on Stellar Testnet.

3 minutes to set up.
5 minutes to try.
$0 cost (testnet XLM is free).

You get: your wallet address in our testnet users showcase + the smug satisfaction of shaping a product.

🧵
```

---

### Tweet 2/8
`270 chars` · no image

```
You'll enjoy this if you've ever:

⚡ Lived with housemates and argued over the water bill
⚡ Been on a group trip and played "who paid for dinner?"
⚡ Had a Splitwise balance sit unpaid for 6 months

Or if you just want to see a Soroban dApp in action.
```

---

### Tweet 3/8
`250 chars` · no image

```
What Birik does differently:

→ Settle group debts in ~5 seconds
→ ~1.2 cents per settlement (yes really)
→ Min-flow algorithm on-chain (10 transfers → 3)
→ Multi-language (TR/EN/DE/ES)
→ Mobile-first
→ Open source (MIT)
```

---

### Tweet 4/8
`30 chars` · 📎 `landing-mobile-dark.png`

```
Looks like this on mobile:
```

---

### Tweet 5/8
`275 chars` · no image

```
How to test in 5 min:

1. Install Freighter wallet (Chrome extension)
2. Switch to Testnet mode
3. Fund via Friendbot (free test XLM)
4. Open stellar-split.vercel.app
5. Fill the 2-min feedback form

No real money. Your inputs help us ship better.
```

---

### Tweet 6/8
`221 chars` · no image

```
Feedback form (2 min):
forms.gle/oFSNuU6a9NthmfJR7

Every answer gets read. Bug reports get extra thanks.
Your testnet address goes in our public users showcase on the repo.
```

---

### Tweet 7/8
`254 chars` · no image

```
What we're especially looking for:

→ Real UX friction (not "this could be prettier")
→ Bugs you hit in the flow
→ Features you wish existed
→ Confusion points for non-crypto users

Honest negatives > polite positives.
```

---

### Tweet 8/8
`279 chars` · no image

```
If you know 1 person who'd want to try this, tag them below.

We're aiming for 20 real users by month-end.

Next up: multi-currency settle (path payments) — come help shape it.

cc @StellarOrg @SDF_Official

#Stellar #Soroban #Web3Beta #BuildOnStellar
```

---

## ⚡ Pre-written quote-tweet replies

Expected questions after the threads go live. Copy-paste when they come up.

### Q1: "Is it on mainnet?"
```
Not yet — we're on testnet, but the contract, infra, and tests are all mainnet-ready. Waiting on a 3rd-party audit + ~50 beta users threshold before mainnet deploy. Targeting Q2 2026.
```

### Q2: "Only Freighter?"
```
Right now yes — Freighter only. Albedo + WalletConnect are on the roadmap for the next iteration.
```

### Q3: "How is this different from Splitwise? Should I replace Splitwise with this?"
```
Splitwise tracks debts well — the unsolved half is "close the loop and actually move the money". Birik does that on-chain in one tap. Think of it as completing Splitwise, not replacing it.
```

### Q4: "Is it safe for real money?"
```
Currently testnet — no real money moves, break it all you want. Before mainnet: third-party audit + bug bounty. Safety is the gating requirement, not a roadmap item.
```

### Q5: "Where's the code?"
```
MIT, public, full stack:
github.com/SuleymanEmirGergin/Birik

Contract: contracts/stellar_split/src/
Frontend: frontend/src/
Backend: backend/src/

PRs and issues always welcome.
```

### Q6: "Fee bump / sponsored transactions?"
```
Yes — backend exposes POST /sponsor/fee-bump. User signs, our sponsor key covers the fee. Critical for mainnet onboarding UX. Code: backend/src/sponsor/
```

---

## 📊 Engagement tracking

Fill this in 72 hours after each thread goes live. Data helps calibrate the next one.

| Metric | Thread 1 | Thread 2 | Thread 3 |
|--------|---------|---------|---------|
| Impressions (first 24h) | — | — | — |
| Retweets / quotes | — | — | — |
| Replies | — | — | — |
| Profile clicks | — | — | — |
| Bio link clicks | — | — | — |
| New testnet users (form submissions) | — | — | — |

Expected outcome:
- **Thread 3** should produce the highest form-submit count (strongest CTA)
- **Thread 2** should produce the highest profile-click ratio (technical credibility signal)
- **Thread 1** should produce the highest raw impressions

---

## 🔁 Re-post / always-on strategy

After all three threads are out:

- **Thread 1** — remix the opener hook every 2 weeks (same content, fresh hook, re-post as a new thread)
- **Thread 2** — quote-tweet it when Stellar community runs a conference or hackathon call
- **Thread 3** — quote-tweet with "thanks + keep them coming" messaging after every 5th new testnet user

One post is not content — the rhythm is.

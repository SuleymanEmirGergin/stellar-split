# Demo Day Runbook — April 30, 2026

> Hackathon submission deadline: **April 30, 2026**  
> Demo video: Record on April 29 (Day G), submit April 30.

---

## Pre-Demo Smoke Test Checklist

Run through this in order on the live testnet deployment (staging OK for internal, prod for judges).

### Contract (5 min)

```bash
# Verify contract is NOT paused
stellar contract invoke \
  --id $CONTRACT_ID --network testnet \
  -- is_paused_query
# → false

# Verify admin is set
stellar contract invoke \
  --id $CONTRACT_ID --network testnet \
  -- get_admin
# → <your admin address>
```

- [ ] Contract responds on testnet RPC
- [ ] `is_paused_query` → false
- [ ] `get_admin` → correct admin address

### Frontend (10 min)

- [ ] Landing page loads without white flash (FOUC test)
- [ ] Freighter extension detected (wallet connect button active)
- [ ] Connect Freighter → redirects to /dashboard
- [ ] XLM balance pill shows correct amount
- [ ] SPLT balance pill shows (even if 0)
- [ ] Create a group (2 members) → group appears in list
- [ ] Add expense → expense appears in group detail
- [ ] Copy invite link → opens /join/<id> in incognito
- [ ] Settle group → Freighter signs tx, balance zeroed
- [ ] Referral tab (F key) → /referral page loads
- [ ] Feedback widget (bottom-right FAB) visible
- [ ] Submit a test feedback → success state shows
- [ ] Dark/light theme toggle → no layout shift
- [ ] Language switch (TR/EN/DE/ES) → labels change
- [ ] Demo mode toggle → "offline priority" bar appears
- [ ] PWA install prompt appears on mobile (or simulate)

### Backend (5 min)

```bash
# Health check
curl https://api.stellarsplit.app/health/live
# → {"status":"ok"}

# Prometheus metrics endpoint
curl -H "Authorization: Bearer $METRICS_SECRET" \
  https://api.stellarsplit.app/metrics | head -20

# DLQ check (should be 0 pending jobs)
curl -H "Authorization: Bearer $ADMIN_JWT" \
  https://api.stellarsplit.app/api/v1/admin/dlq/stats
```

- [ ] `/health/live` → 200 OK
- [ ] `/metrics` → Prometheus format
- [ ] No alerts firing in Grafana

---

## Demo Video Script (3 min)

> Record with OBS/Loom at 1920×1080 or 1280×720. Keep commentary concise.

### Scene 1 — Problem (20s)
"Splitting bills with friends across borders is painful. Bank transfers, PayPal fees,
currency mismatch, waiting 3-5 business days. Birik solves this with Stellar."

### Scene 2 — Connect (20s)
Show Freighter extension installed. Click "Connect Wallet". Show instant connection.
"One click, no account creation, no KYC. Your Stellar wallet is your identity."

### Scene 3 — Create Group + Add Expense (40s)
Create "Hackathon Dinner" group. Add two friends' addresses. Add expense:
"Dinner €120 — split equally". Show the debt ledger updating in real time.
"Expenses recorded immutably on Soroban — no central database can be hacked or deleted."

### Scene 4 — Multi-currency Settlement (40s)
Switch to demo with one member holding USDC, one XLM.
Trigger `settle_group_flex`. Show Soroswap swap happening atomically.
"Birik's multi-currency settlement: Alice pays in XLM, Bob receives USDC.
No manual swap, no extra steps — one transaction."

### Scene 5 — Referral Rewards (20s)
Open /referral. Show referral code. Copy link.
"Invite friends, earn SPLT tokens on-chain. Every reward is verifiable."

### Scene 6 — Safety (20s)
Show the ROLLBACK_PLAYBOOK.md.
"Emergency pause circuit-breaker: one command stops all transactions if something goes wrong.
No user funds can move while paused. This is production-grade safety for a hackathon."

### Scene 7 — CTA (20s)
"Birik is open source, built on Stellar testnet, and ready for mainnet.
46 contract tests, 942 frontend tests, automated DB backups, Prometheus monitoring.
This isn't a demo — this is a product."

---

## Twitter Thread Template

> Post on April 30 after submission. Tag @StellarOrg and relevant hackathon accounts.

**Tweet 1 (hook):**
Splitting bills with friends across borders shouldn't require 3 bank apps, exchange fees,
and 5 business days.

Introducing Birik — decentralized group expense splitting on @StellarOrg 🪐

🧵 How we built it in 5 days ↓

**Tweet 2 (problem):**
The pain: your friend pays in XLM, you want USDC. Traditional apps just say "sorry,
same currency only."

Birik's flex settlement: one Soroban transaction, Soroswap swap inside,
everyone gets paid in their preferred token.

**Tweet 3 (tech):**
Under the hood:
• Soroban smart contracts (Rust, wasm-opt, 58KB)
• Emergency pause circuit-breaker (0 → secured in < 5min)
• 46 contract tests, 942 frontend tests
• BullMQ dead letter queue + Prometheus alerts
• PostgreSQL daily backups (RPO 24h, RTO 15min)

**Tweet 4 (demo):**
[attach 30s demo GIF or link to video]

One click to connect Freighter, create a group, split an expense, settle in crypto.
No sign-up. No KYC. No central database.

**Tweet 5 (CTA):**
Try it: [link]
Code: github.com/SuleymanEmirGergin/stellar-split

Built for [hackathon name] · April 2026

#Stellar #Soroban #DeFi #Web3 #Hackathon

---

## Hackathon Submission Copy

### Project Name
**Birik** — Decentralized Group Expense Splitting on Stellar

### One-liner
Split bills, settle debts with crypto — any token, any currency, atomic settlement via Soroban.

### Problem
Cross-border expense splitting is broken: slow bank transfers, high fees, currency mismatch.
Existing apps (Splitwise, Venmo) are centralized, custodial, and region-locked.

### Solution
Birik is a decentralized group expense-splitting dApp built on Stellar/Soroban:
- **Immutable expense ledger** on Soroban — no database can be censored or hacked
- **Multi-currency settlement** — settle in any token via Soroswap (Path B)
- **SPLT reward token** — referral rewards and badges minted on-chain
- **Emergency pause circuit-breaker** — admin can freeze all writes in < 5 minutes
- **Production-grade** — 46 contract tests, 942 frontend tests, Prometheus monitoring, daily DB backups

### Technical Architecture
- **Frontend**: React 19 + Vite + Framer Motion + Tailwind (Vercel)
- **Backend**: NestJS + Prisma + BullMQ + Redis (Railway)
- **Contract**: Soroban (Rust, `#![no_std]`, `wasm-opt` optimized, 58KB)
- **Auth**: Sign-In With Stellar (SIWS) — wallet-native, no passwords
- **Settlement**: direct XLM transfer OR Soroswap swap in single Soroban tx

### Stellar Integration
- Soroban smart contract for expense/settlement/referral logic
- Horizon API for balance queries and tx monitoring
- SEP-7 payment request URIs for mobile wallet bridging
- Soroswap AMM for multi-currency flex settlement
- SPLT reward token (SEP-41 roadmap)

### What Makes It Unique
1. **Flex settlement** — first expense-splitting app that settles cross-token in a single atomic tx
2. **Circuit-breaker safety** — emergency pause pattern borrowed from DeFi blue chips
3. **Full-stack production quality** — not a demo, a shippable product in 5 days

### Links
- Demo: [https://stellarsplit.app](https://stellarsplit.app)
- GitHub: [https://github.com/SuleymanEmirGergin/stellar-split](https://github.com/SuleymanEmirGergin/stellar-split)
- Contract (testnet): See `VITE_CONTRACT_ID` in frontend env

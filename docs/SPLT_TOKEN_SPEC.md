# SPLT Token — SEP-41 Specification & Implementation Guide

> **Status:** Hackathon scope — partial implementation. Core mint/balance entrypoints are live.
> SEP-41 full compliance is a post-hackathon deliverable.

---

## Overview

The **SPLT** (Stellar Split Token) is the in-app reward token for Birik. It is issued to users
via referral rewards, milestone badges, and governance participation. All minting is admin-controlled;
users receive SPLT passively and can check balances on-chain.

| Property | Value |
|----------|-------|
| Contract ID (testnet) | Set via `VITE_SPLT_CONTRACT_ID` |
| Network | Stellar Testnet / Mainnet |
| Decimals | 7 (Stellar native precision, 1 SPLT = 10,000,000 stroops) |
| Symbol | SPLT |
| Max Supply | Uncapped (admin-minted only) |
| Transferable | Not yet (post-hackathon) |

---

## Current Implementation (hackathon scope)

```rust
initialize(admin: Address, name: String, symbol: String)  // one-shot
mint(to: Address, amount: i128)                           // admin-only
balance(user: Address) -> i128
```

These three entrypoints support:
- Referral reward distribution (`register_referral` in main contract invokes `mint`)
- Balance display in the header (`SPLT` pill next to XLM balance)
- Badge/milestone rewards (off-chain mint via admin wallet)

---

## SEP-41 Full Interface (post-hackathon roadmap)

[SEP-41](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0041.md) is the
Soroban Token Standard — the equivalent of ERC-20 for Stellar. Full compliance enables SPLT to be
used in any Soroban-compatible DeFi protocol (Soroswap, Blend, etc.).

### Required entrypoints

```rust
// Core token interface
fn initialize(e: Env, admin: Address, decimal: u32, name: String, symbol: String);
fn allowance(e: Env, from: Address, spender: Address) -> i128;
fn approve(e: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32);
fn balance(e: Env, id: Address) -> i128;
fn transfer(e: Env, from: Address, to: Address, amount: i128);
fn transfer_from(e: Env, spender: Address, from: Address, to: Address, amount: i128);
fn burn(e: Env, from: Address, amount: i128);
fn burn_from(e: Env, spender: Address, from: Address, amount: i128);
fn mint(e: Env, to: Address, amount: i128);  // admin-only
fn set_admin(e: Env, new_admin: Address);    // admin-only
fn admin(e: Env) -> Address;
fn clawback(e: Env, from: Address, amount: i128);  // optional

// Metadata interface (SEP-41)
fn decimals(e: Env) -> u32;
fn name(e: Env) -> String;
fn symbol(e: Env) -> String;
```

### Required events

| Event | Payload |
|-------|---------|
| `transfer(from, to)` | `amount: i128` |
| `mint(admin, to)` | `amount: i128` |
| `clawback(admin, from)` | `amount: i128` |
| `approve(from, spender)` | `amount: i128, expiration_ledger: u32` |
| `burn(from)` | `amount: i128` |
| `set_admin(admin)` | `new_admin: Address` |

---

## Migration Plan (post-hackathon, within 30 days)

### Step 1 — Implement full interface

```bash
cd contracts/stellar_split_token
# Implement all SEP-41 entrypoints + events
cargo test  # verify 100% coverage
```

### Step 2 — Deploy new contract

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_split_token.wasm \
  --source $ADMIN_SECRET_KEY \
  --network mainnet

# Set new SPLT contract ID
railway variables set SPLT_CONTRACT_ID=<new-id> --service api
vercel env add VITE_SPLT_CONTRACT_ID production
```

### Step 3 — Migrate balances

Since Soroban contracts are immutable, existing balances on the old contract must be
re-minted on the new contract:

```bash
# Query all minted events from old contract
stellar contract events \
  --id $OLD_SPLT_CONTRACT_ID \
  --network mainnet \
  --event-type contract

# For each mint event, re-mint on new contract
stellar contract invoke \
  --id $NEW_SPLT_CONTRACT_ID \
  --source $ADMIN_SECRET_KEY \
  --network mainnet \
  -- mint --to <address> --amount <amount>
```

### Step 4 — Wire transfer + burn UI

- Add "Send SPLT" flow in the Settings page
- Add "Burn for badge" mechanic (burn 100 SPLT → premium badge NFT)

---

## Usage in Birik Contracts

The main `stellar_split` contract invokes SPLT mint via cross-contract call:

```rust
// In register_referral():
if let Some(reward_token) = storage::get_reward_token(&env) {
    let client = token::Client::new(&env, &reward_token);
    client.mint(&inviter, &REFERRAL_REWARD_AMOUNT);
}
```

`REFERRAL_REWARD_AMOUNT` = 1_000_000 stroops = 0.1 SPLT per successful referral.

---

## SPLT Economics

| Action | SPLT Earned |
|--------|-------------|
| Referral (per newcomer) | +0.1 SPLT |
| Group settled (first time) | +0.05 SPLT |
| 5-group milestone badge | +1.0 SPLT |
| Savings pool contribution | +0.01 SPLT / day |
| Governance vote | +0.2 SPLT |

---

## Security

- `mint` is admin-only (Soroban `require_auth()` on stored admin address)
- No self-mint (inviter ≠ newcomer enforced in main contract's `register_referral`)
- One-shot idempotency: `Referred(newcomer)` key prevents double-rewards
- Post-SEP-41: `clawback` available for regulatory compliance (opt-in flag)

# StellarSplit — Architecture

## Overview

- **Frontend:** React 19, Vite 6, TypeScript, Tailwind. Single-page app with URL routes: `/`, `/dashboard`, `/group/:id`.
- **Contract:** Rust/Soroban in `contracts/stellar_split/`. Groups, expenses, and greedy min-flow settlement live on-chain.
- **Wallet:** Freighter (Stellar) for auth and transaction signing. RPC/Horizon point to Testnet by default (env-configurable).

## Data flow

1. User connects Freighter → frontend stores address in state and syncs route to `/dashboard`.
2. Dashboard loads group list (on-chain via contract or from localStorage in **Demo Mode**).
3. Group detail (`/group/:id`) loads group, expenses, balances, and settlements from the contract (or demo mocks).
4. Settlements are computed on-chain with a greedy algorithm (see `contracts/stellar_split/src/settle.rs`).

## Demo / mock features

Several UI features are implemented with **in-app or localStorage-only** logic (no production backend). See the [Demo / Mock Features](README.md#-demo--mock-features) section in the README for the full table (receipt storage, AI scan, DeFi, recovery, webhooks). When **Demo Mode** is on, all contract calls are bypassed and replaced with local mocks so the app works offline.

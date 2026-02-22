# Contributing to StellarSplit

Thanks for your interest in contributing. This document explains how to get set up and submit changes.

## Prerequisites

- **Node.js** 20+
- **Rust** (for contract work) with `wasm32-unknown-unknown` target
- **Freighter** wallet (optional; for local testing with Testnet)

## Setup

```bash
# Clone the repo
git clone https://github.com/your-org/stellar-split.git
cd stellar-split

# Frontend
cd frontend
npm install
cp .env.example .env   # optional: edit for custom contract/RPC
npm run dev            # http://localhost:5173

# Run unit tests
npm run test:run

# Run E2E (Playwright; starts dev server)
npm run e2e

# Lint
npm run lint
```

## Contract (Rust/Soroban)

```bash
# From repo root
cargo test
cargo build --target wasm32-unknown-unknown --release
```

## Submitting changes

1. **Fork** the repository and create a branch from `main` (e.g. `feature/your-feature`).
2. **Make your changes** and ensure:
   - `npm run lint` passes in `frontend/`
   - `npm run test:run` passes
   - `npm run e2e` passes (or add/update tests as needed)
3. **Commit** with clear messages (e.g. "feat: add X", "fix: Y").
4. **Open a Pull Request** against `main`. Describe what changed and why.

## Code style

- **Frontend:** ESLint + TypeScript. Use existing patterns (e.g. `data-testid` for E2E, `t()` for i18n).
- **Contract:** `cargo fmt` and `cargo clippy`; follow existing Soroban patterns in `contracts/`.

## Questions

Open an issue for bugs or feature ideas. For Stellar/Soroban docs see [stellar.org](https://stellar.org) and [soroban.stellar.org](https://soroban.stellar.org).

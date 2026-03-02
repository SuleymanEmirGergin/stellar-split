# StellarSplit — Submission One-Pager

**Hackathon / jüri özeti — tek sayfa.**

---

## Problem

Grup harcamalarında “kim kime ne kadar borçlu?” hesabı merkezi uygulamalarda kalıyor; banka transferleri yavaş, maliyetli veya tartışmaya açık.

## Çözüm

StellarSplit, **Stellar/Soroban** üzerinde çalışan bir mini-dApp ile borçları **minimum sayıda transfer** ile kapatıyor: greedy algoritma on-chain, anlık finalite, çok düşük ücret.

## Tech Stack

- **Frontend:** React 19, Vite 6, TypeScript, Tailwind, Freighter
- **Contract:** Rust/Soroban (grup, harcama, optimal settle, guardian/recovery)
- **Ağ:** Stellar Testnet (mainnet’e geçiş env ile)

## Demo & Repo

- **Canlı demo:** [stellar-split.vercel.app](https://stellar-split.vercel.app) _(Vercel/Netlify linkini buraya yazın)_
- **Repo:** [GitHub — SuleymanEmirGergin/stellar-split](https://github.com/SuleymanEmirGergin/stellar-split)
- **Demo video (1 dk):** _(YouTube/Loom linki)_

## Testnet Contract

- **Contract ID:** README veya `.env.example` içindeki `VITE_CONTRACT_ID` (Testnet deploy).
- **Explorer:** Stellar Expert → Testnet → Contract.

## Kalite Sinyalleri

- **3+ test geçiyor:** Vitest (format, motion, contract) + kontrat unit testleri (24 test); E2E (Playwright) create → expense → settle akışı.
- **Dokümantasyon:** README, ARCHITECTURE, CONTRACT-API, SECURITY-CHECKLIST, SECURITY-NOTES.
- **CI:** Contract test, frontend build, unit test, E2E, lint.

---

*Stellar/Soroban Hackathon — “Making micro-transactions practically free, one group at a time.”*

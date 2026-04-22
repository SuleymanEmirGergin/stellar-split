# Birik — Stellar'da Grup Ödemesi

**Saniyeler içinde, neredeyse sıfır ücretle, tam şeffaf grup harcaması takibi ve uzlaşması.**
_Group expense splitting on Stellar/Soroban with min-flow settlement, reward tokens, and an on-chain savings pool._

[![CI](https://github.com/SuleymanEmirGergin/stellar-split/actions/workflows/ci.yml/badge.svg)](https://github.com/SuleymanEmirGergin/stellar-split/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-1293_passing-success)](#testing--testler)
[![Commits](https://img.shields.io/github/commit-activity/t/SuleymanEmirGergin/stellar-split)](https://github.com/SuleymanEmirGergin/stellar-split/commits)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-7C3AED)](https://soroban.stellar.org)
[![Vercel](https://img.shields.io/badge/Vercel-deployed-000)](https://stellar-split.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**Hızlı erişim / Quick links:**
[🌐 Live Demo](https://stellar-split.vercel.app) · [📹 Demo Video](https://youtu.be/ZmqJI9Y7UTc) · [📝 Contract on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBQENHYCVSOK3CHZ6NRT6BI34W2ERPSRUNXHI6X5X33DTDCDWX27YN7K) · [📋 Feedback Form](#-user-feedback) · [👥 Testnet Users](#-testnet-users)

---

## 📸 Screenshots / Ekran Görüntüleri

### Landing

![Landing Hero](docs/screenshots/landing.png)

### Dashboard

![Dashboard](docs/screenshots/dashboard.png)

### Test Output — 880 frontend + 24 contract tests passing

![Test Results](docs/screenshots/tests-passing.png)

### CI/CD Pipeline — all green

![GitHub Actions](docs/screenshots/ci-passing.png)

---

## ✨ Features / Özellikler

- ⚡ **Instant on-chain settlement** — Soroban üzerinde ~5 sn kesinleşme, alt-cent işlem ücretleri ($0.00005)
- 🧮 **Min-flow debt optimization** — Gerekirse 10 transfer yerine 3; greedy algoritma on-chain çalışır
- 🪙 **Multi-token settle** — XLM (native) veya USDC ile ödeme; `VITE_USDC_CONTRACT_ID` ile genişletilebilir
- 🎁 **SPLT reward token** — Takas başlatan kullanıcıya inter-contract `mint` çağrısı ile ödül token'ı
- 🏦 **On-chain savings pool** — Grup hedefli birikim havuzu: `create_savings_pool`, `contribute_pool`, `release_pool`
- 📈 **DeFi vault (staking/yield)** — `stake`, `withdraw`, `donate_yield` ile ödül/stake mekanizması
- 🛡️ **Social recovery (guardians)** — 5 entrypoint'lik on-chain kurtarma akışı
- 📡 **Real-time SSE + event streaming** — `subscribeGroupEvents` ile canlı güncellemeler
- 🔐 **SIWS auth** — "Sign-In With Stellar": challenge → Freighter imza → JWT + HttpOnly refresh
- 📱 **Mobile-first, responsive UI** — Tailwind breakpoint'leri ile tüm cihazlarda akıcı deneyim

---

## 🧠 Advanced Contract Patterns / Gelişmiş Kontrat Desenleri

Bu proje Stellar/Soroban'ın ileri seviye özelliklerini kullanır. Level 4 gereksinimlerinin teknik karşılıkları aşağıdadır.

### 1. Inter-Contract Call — `stellar_split` → `stellar_split_token`

`settle_group` sırasında ana kontrat, ayrı bir token kontratının `mint` fonksiyonunu Soroban'ın `invoke_contract` API'si ile çağırır. Uzlaştırmayı başlatan kullanıcı (`settler`) 100 SPLT ödül kazanır.

**[`contracts/stellar_split/src/lib.rs:396-400`](contracts/stellar_split/src/lib.rs):**

```rust
let reward_amount = 100_i128; // 100 SPLT
env.invoke_contract::<()>(
    &reward_token_id,
    &soroban_sdk::Symbol::new(&env, "mint"),
    soroban_sdk::vec![&env, settler.into_val(&env), reward_amount.into_val(&env)],
);
```

### 2. Custom SPLT Token — StellarSplit Token

Companion contract: [`contracts/stellar_split_token/`](contracts/stellar_split_token/).

SEP-41 uyumlu, özel-amaçlı (reward/utility) bir token. Ana kontrattan `mint` ile çağrılır.

- **Symbol:** `SPLT`
- **Name:** StellarSplit Token
- **Deployed address:** _(to be updated post-deployment)_

### 3. Savings Pool / Birikim Havuzu

Grup üyeleri ortak bir hedef (tatil, hediye, vb.) için on-chain havuzda birikim yapar. Hedefe ulaşınca fon serbest bırakılır.

| Entrypoint            | Amaç                                          |
| --------------------- | --------------------------------------------- |
| `create_savings_pool` | Yeni havuz aç: hedef tutar, para birimi, isim |
| `contribute_pool`     | Havuza katkı payı gönder                      |
| `release_pool`        | Hedefe ulaşılınca fonu serbest bırak          |
| `get_savings_pool`    | Havuz durumunu/bakiyesini oku                 |

### 4. DeFi Vault — Staking & Yield

Kullanıcılar SPLT token'larını kilitleyerek pasif getiri modeline katılır. Ödül bağışı (`donate_yield`) başkalarına kazanç aktarmayı sağlar.

| Entrypoint     | Amaç                                |
| -------------- | ----------------------------------- |
| `stake`        | Vault'a SPLT yatır                  |
| `withdraw`     | Vault'tan token çek (ödül dahil)    |
| `donate_yield` | Biriken ödülü bir başka kullanıcıya bağışla |
| `get_vault`    | Vault durumu, toplam stake, APY     |

### 5. Social Recovery — Guardians

Kullanıcı cüzdanını kaybederse, güvendiği guardian'lar imzaladığında erişim yeni bir adrese aktarılır. 5 entrypoint ile on-chain kurtarma akışı:

- `add_guardian` — guardian ekle
- `remove_guardian` — guardian çıkar
- `initiate_recovery` — kurtarma başlat
- `approve_recovery` — guardian onayı
- `finalize_recovery` — eşik dolunca sahipliği devret

---

## 🧪 Testing / Testler

Birik'in test suite'i üç katmandan oluşur ve CI'da her push/PR'da koşar.

### Frontend — 880 tests (Vitest + React Testing Library)

```bash
cd frontend
npm install
npm test              # watch mode
npm run test:run      # CI-style tek seferlik koşum
```

### Smart Contract — 24 tests (cargo)

```bash
cd contracts/stellar_split
cargo test
```

Örnek çıktı:

```
running 24 tests in contracts/stellar_split
test create_group ... ok
test add_expense ... ok
test settle_group ... ok
test create_savings_pool ... ok
test contribute_to_pool ... ok
test guardian_flow ... ok
... 18 more tests
test result: ok. 24 passed; 0 failed
```

### Backend — 389 unit tests (Jest)

```bash
cd backend
npm install
npm test                     # tüm suite
npm run test:cov             # coverage raporu
```

### All-in-one

CI pipeline (`.github/workflows/ci.yml`) üç suite'i de paralel koşar ve toplam **1293 test** yeşil dönmeden merge'e izin vermez.

---

## 🚀 Deployment / Yayına Alma

| Katman         | Platform                          | URL / Adres                                                         |
| -------------- | --------------------------------- | ------------------------------------------------------------------- |
| **Frontend**   | Vercel (auto-deploy from `master`) | [stellar-split.vercel.app](https://stellar-split.vercel.app)        |
| **Backend**    | Railway (CI-driven)               | _(internal endpoint — SSE / SIWS / analytics)_                      |
| **Contracts**  | Stellar Testnet (CI on `master`)  | `CBQENHYCVSOK3CHZ6NRT6BI34W2ERPSRUNXHI6X5X33DTDCDWX27YN7K`          |
| **SPLT Token** | Stellar Testnet                   | _(to be updated post-deployment — see `contracts/stellar_split_token/`)_ |

**CI/CD workflow:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — contract build/test, frontend lint+test+build, backend test, Playwright E2E.

**Contract on Stellar Expert:** [stellar.expert/.../CBQE...YN7K](https://stellar.expert/explorer/testnet/contract/CBQENHYCVSOK3CHZ6NRT6BI34W2ERPSRUNXHI6X5X33DTDCDWX27YN7K)

---

## 🏗️ Tech Stack

| Katman         | Teknoloji                                                                 |
| -------------- | ------------------------------------------------------------------------- |
| **Frontend**   | React 19, Vite 6, TypeScript, Tailwind CSS, Vitest, Playwright            |
| **Backend**    | NestJS, Prisma ORM, PostgreSQL, Redis, BullMQ, SSE, Jest                  |
| **Contracts**  | Rust, Soroban SDK, `soroban-sdk::invoke_contract` (inter-contract calls)  |
| **Auth**       | SIWS (Sign-In With Stellar) + JWT + HttpOnly refresh cookie               |
| **Wallet**     | Freighter (Testnet)                                                       |
| **CI/CD**      | GitHub Actions, Vercel, Railway                                           |
| **Observability** | Swagger (`/api`), transaction hash linking, SSE live feed              |

---

## 🛠️ How to Run Locally / Yerel Kurulum

Sıfırdan başlayan biri için adım adım kurulum:

### 1. Prerequisites

- Node.js **20+**
- Rust (edition 2021) + `wasm32-unknown-unknown` target
- Stellar CLI ([install guide](https://developers.stellar.org/docs/tooling/stellar-cli/install))
- [Freighter Wallet](https://www.freighter.app/) (Testnet enabled)
- PostgreSQL 15+ ve Redis 7+ _(sadece backend için)_

### 2. Clone the repo

```bash
git clone https://github.com/SuleymanEmirGergin/stellar-split
cd stellar-split
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env    # VITE_CONTRACT_ID hazır default ile gelir
npm run dev             # http://localhost:5173
```

### 4. Backend _(opsiyonel — SSE/SIWS/analytics için)_

```bash
cd backend
npm install
cp .env.example .env    # DATABASE_URL, REDIS_URL, JWT_SECRET ayarla
npx prisma migrate dev  # Postgres schema
npm run start:dev       # http://localhost:3000 — Swagger at /api
```

Frontend'in backend'e bağlanması için `frontend/.env` içinde:

```
VITE_API_BASE=http://localhost:3000
```

### 5. Contracts _(opsiyonel — kendi kontratını deploy etmek için)_

```bash
cd contracts/stellar_split
cargo build --target wasm32-unknown-unknown --release
cargo test
# Deploy:
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_split.wasm \
  --network testnet \
  --source-account <your-identity>
# Çıkan contract ID'yi frontend/.env → VITE_CONTRACT_ID olarak ayarla
```

### 6. Demo Mode

`D` tuşuna basarak veya UI'dan demo mod'u açın — Testnet bağımsız, tamamen mock çalışır. Bu sayede Freighter / RPC olmadan da uygulamayı denemek mümkündür.

---

## 📋 Submission Checklists / Seviye Karşılıkları

<details>
<summary><b>Level 1 — Wallet & basic tx</b></summary>

| Gereksinim         | Durum | Açıklama                                                                                  |
| ------------------ | ----- | ----------------------------------------------------------------------------------------- |
| Wallet kurulumu    | ✅    | Freighter, Stellar Testnet varsayılan                                                     |
| Wallet bağlantısı  | ✅    | `connectFreighter()` + `handleDisconnect()` (`frontend/src/lib/stellar.ts`)               |
| Bakiye işleme      | ✅    | Horizon'dan XLM bakiyesi (`useWalletBalance`)                                             |
| İşlem akışı        | ✅    | Grup/harcama/takas işlemleri, toast bildirimleri, tx hash + Stellar Expert linki          |
| Geliştirme std.    | ✅    | React/Vite + Freighter + `contract.ts` + `errors.ts`                                      |

</details>

<details>
<summary><b>Level 2 — Multi-wallet, contract, events</b></summary>

| Gereksinim                        | Durum | Açıklama                                                         |
| --------------------------------- | ----- | ---------------------------------------------------------------- |
| 3 error types                     | ✅    | Rejected / Wallet not found / Insufficient balance (`errors.ts`) |
| Contract on testnet               | ✅    | `CBQENHYCVSOK3CHZ6NRT6BI34W2ERPSRUNXHI6X5X33DTDCDWX27YN7K`       |
| Contract called from frontend     | ✅    | `create_group`, `add_expense`, `settle_group`, `get_balances`    |
| Transaction status visible        | ✅    | TxHistory, ActivityFeed, Stellar Expert linkleri                 |
| Event listening                   | ✅    | `subscribeGroupEvents` (`events.ts`) polling-based SSE           |
| 2+ commits                        | ✅    | 85+ commits on `master`                                          |

**Örnek tx hash:** `c4b13aaf245715d0ca8b1b721fb54043ec12eb097a91da384e7c89d381adc2bc` → [Stellar Expert](https://stellar.expert/explorer/testnet/tx/c4b13aaf245715d0ca8b1b721fb54043ec12eb097a91da384e7c89d381adc2bc)

</details>

<details>
<summary><b>Level 3 — Backend API + Auth + Deep Contract</b></summary>

| Gereksinim        | Durum | Açıklama                                                                                 |
| ----------------- | ----- | ---------------------------------------------------------------------------------------- |
| Backend API       | ✅    | NestJS REST — groups/expenses/settlements/governance/savings; Swagger at `/api`          |
| Database          | ✅    | PostgreSQL + Prisma; 9 migrations                                                        |
| Authentication    | ✅    | SIWS → JWT (access) + HttpOnly refresh cookie; silent refresh                            |
| Job Queue         | ✅    | BullMQ + Redis (recurring expenses, tx monitor, notification dispatch)                   |
| Real-time         | ✅    | SSE `GET /groups/:id/events` + `useGroupEvents`                                          |
| Savings Pool      | ✅    | `create_savings_pool`, `contribute_pool`, `release_pool`, `get_savings_pool`             |
| Test coverage     | ✅    | 880 frontend + 24 contract + 389 backend = **1293 tests**                                |
| Min commits       | ✅    | 85+                                                                                      |

</details>

<details>
<summary><b>Level 4 — Advanced contract patterns + CI/CD + Mobile</b></summary>

| Gereksinim               | Durum | Açıklama                                                                             |
| ------------------------ | ----- | ------------------------------------------------------------------------------------ |
| Inter-contract calls     | ✅    | `invoke_contract` → SPLT `mint` in `lib.rs:396-400`                                  |
| Custom token / Pool      | ✅    | SPLT token (`contracts/stellar_split_token/`) + on-chain savings pool + DeFi vault   |
| Advanced event streaming | ✅    | `reward_minted`, `vault_staked`, `group_settled` events + SSE bridge                 |
| CI/CD pipeline           | ✅    | GitHub Actions: contract test, lint, type-check, unit, E2E (Playwright)              |
| Mobile responsive        | ✅    | Tailwind `sm:`/`md:`/`lg:` + mobile-specific components (Bottom sheet, More tab)     |
| 8+ commits               | ✅    | 85+                                                                                  |
| Production README        | ✅    | This document — badges, live link, contract address, mobile screenshots              |

</details>

---

## 👥 Testnet Users

Birik'i test eden gerçek kullanıcıların Stellar Testnet cüzdan adresleri. Her adres [Stellar Expert](https://stellar.expert/explorer/testnet/) üzerinde doğrulanabilir.

| # | Ad / Rumuz | Stellar Expert linki (Testnet) |
|---|-----------|--------------------------------|
| 1 | _(TBD)_ | [`G...`](https://stellar.expert/explorer/testnet/account/REPLACE_WITH_ADDRESS) |
| 2 | _(TBD)_ | [`G...`](https://stellar.expert/explorer/testnet/account/REPLACE_WITH_ADDRESS) |
| 3 | _(TBD)_ | [`G...`](https://stellar.expert/explorer/testnet/account/REPLACE_WITH_ADDRESS) |
| 4 | _(TBD)_ | [`G...`](https://stellar.expert/explorer/testnet/account/REPLACE_WITH_ADDRESS) |
| 5 | _(TBD)_ | [`G...`](https://stellar.expert/explorer/testnet/account/REPLACE_WITH_ADDRESS) |

> 📝 Genişletilmiş liste, ortalamalar ve NPS skoru için: [`docs/USER_FEEDBACK.md`](docs/USER_FEEDBACK.md)

---

## 💬 User Feedback

MVP'nin gerçek kullanıcı testlerinden alınan geri bildirimler aşağıdaki kaynaklarda toplanır:

| Kaynak | Link |
|--------|------|
| **Google Form (feedback toplama)** | _(TBD — form oluşunca buraya eklenecek)_ |
| **Excel export (tüm yanıtlar)** | [`docs/user-feedback.xlsx`](docs/user-feedback.xlsx) _(dosya eklendiğinde aktif)_ |
| **Özet doküman (temalar + iterations)** | [`docs/USER_FEEDBACK.md`](docs/USER_FEEDBACK.md) |
| **Form spec (soru içeriği)** | [`docs/GOOGLE_FORM_SPEC.md`](docs/GOOGLE_FORM_SPEC.md) |

Yüksek seviye metrikler (snapshot):

| Metrik | Değer |
|--------|-------|
| Toplam respondent | _(TBD)_ |
| Ortalama rating (1–5) | _(TBD)_ |
| NPS (0–10) | _(TBD)_ |

---

## 🔄 Next Phase Improvements

Kullanıcı geri bildirimleri doğrultusunda planlanan ve uygulanan iyileştirmeler. Her tamamlanmış maddenin sonunda ilgili git commit link'i yer alır.

### Applied (feedback → commit)

| # | Feedback'ten gelen madde | Yapılan değişiklik | Commit |
|---|--------------------------|--------------------|--------|
| 1 | _(örn. "Mobilde + butonu bulunmuyordu")_ | _(örn. "Mobile bottom-sheet'e +Group CTA eklendi")_ | [`(TBD)`](https://github.com/SuleymanEmirGergin/stellar-split/commit/REPLACE_WITH_SHA) |

### Planned (bir sonraki iteration için)

- **Multi-currency settle** — XLM ↔ USDC path payment (feedback: "tek para birimi kısıtlı" — Q9)
- **Yield on savings pool** — Blend/SoroSwap entegrasyonu (feedback: "bekleyen para boşa duruyor")
- **Push notification tam entegrasyon** — tx confirm + settle ready (feedback: "uyarı gelmiyor")
- **Onboarding wizard iyileştirmesi** — cüzdan bağlama adımı için daha net yönlendirme (feedback: "ilk girişte kayboldum")
- **Discord/Slack webhook preset'leri** — hazır template butonları (feedback: "test ederken webhook kurmak zor")

> Ayrıntılı feedback kırılımı ve tüm iteration commit'leri için: [`docs/USER_FEEDBACK.md`](docs/USER_FEEDBACK.md#-iteration--feedbacke-göre-yapılan-değişiklikler)

---

## 🛣️ Roadmap

- [x] Multi-token settle (XLM, USDC)
- [x] Stellar URI / QR code pay-links
- [x] Social recovery contract entrypoints
- [x] SPLT reward token + inter-contract mint
- [x] On-chain savings pool
- [ ] Mainnet deployment
- [ ] SPLT token listing on Stellar DEX
- [ ] Mobile PWA install flow

---

## 🤝 Contributing / Katkıda Bulunma

- **Issues:** [github.com/SuleymanEmirGergin/stellar-split/issues](https://github.com/SuleymanEmirGergin/stellar-split/issues)
- **Pull requests:** `master` branch'ine PR açın; CI yeşil dönmeli.
- **Contributors:** [github.com/SuleymanEmirGergin/stellar-split/graphs/contributors](https://github.com/SuleymanEmirGergin/stellar-split/graphs/contributors)

---

## 📄 License

[MIT](LICENSE) — yapacak her şeye izin; sadece attribution yeter.

---

## 👤 Submission Info

Created for the **Stellar/Soroban Hackathon**. Designed with care for the global financial ecosystem.

> "Making micro-transactions practically free, one group at a time."

# Birik — Leaderboard Optimization Session Plan

Her session **tek konu + ayrı file scope**'una sahip. Birisi bitmeden diğerine başlanmaz. Bu sayede hem çakışma hem context karışıklığı olmaz.

Progress işareti:
- [ ] = yapılmamış
- [~] = devam ediyor
- [x] = tamamlandı + commit'lendi

---

## 📋 Session sırası

### Session 1 — Screenshot Gallery Expansion (Task 6) `[x]` — commit `71d6843`
- **Scope:** README screenshot galerisini genişletme — mobile, dark/light, settle modal, savings pool
- **Files:**
  - `frontend/e2e/screenshots.spec.ts` (new) — Playwright otomatik screenshot script
  - `docs/SCREENSHOT_CHECKLIST.md` (new) — manuel screenshot rehberi
  - `docs/screenshots/*.png` (new assets — Playwright/manuel)
  - `README.md` — Screenshots bölümünü genişlet
- **Deliverable:** README'de 9+ ekran görüntüsü (mevcut 5 + yeni 4+)
- **Süre:** ~1 saat
- **Conflict:** yok

### Session 2 — Blog Post Draft (Task 5) `[x]` — commit `e0efbda`
- **Scope:** Dev.to / Medium için tam blog yazısı
- **Files:** `docs/blog/how-we-built-birik.md` (new)
- **Deliverable:** Publish-ready markdown — frontmatter, screenshots, architecture diagram referansı
- **Süre:** ~3 saat
- **Conflict:** yok (content-only)

### Session 3 — Twitter/X Thread Drafts (Task 4) `[x]` — commit TBD
- **Scope:** 3 hazır tweet thread
- **Files:** `docs/social/twitter-threads.md` (new)
- **Deliverable:** Thread 1 (neden Birik), Thread 2 (under the hood), Thread 3 (testnet beta). Her biri 10-15 tweet + görsel + hashtag + mention listesi
- **Süre:** ~2 saat
- **Conflict:** yok (content-only)

### Session 4 — Landing Canlı Metrikler (Task 2) `[ ]`
- **Scope:** Ana landing page'e 4 public KPI card
- **Files:**
  - `frontend/src/hooks/usePublicMetrics.ts` (new)
  - `frontend/src/components/KPICard.tsx` (new)
  - `frontend/src/components/KPICard.test.tsx` (new)
  - `frontend/src/components/LandingPage.tsx` (modify — KPI row eklenecek)
- **Deliverable:** Landing'de 4 KPI (groups / settled / users 24h / tx/sec), loading + error state, 60s cache, Vitest test
- **Süre:** ~2 saat
- **Conflict:** Sadece LandingPage.tsx — Session 6-7 ile çakışmaz

### Session 5 — Lighthouse + PWA Polish (Tasks 7 + 13) `[ ]`
- **Scope:** Performance, a11y, SEO, PWA tamamlanması
- **Files:**
  - `frontend/index.html` (meta tags)
  - `frontend/vite.config.ts` (bundle analiz + WebP)
  - `frontend/public/manifest.json` (complete)
  - `frontend/public/sw.js` veya service worker config
  - `frontend/src/components/LazyImage.tsx` (new)
  - `frontend/src/components/InstallPrompt.tsx` (tamamlama)
  - `docs/LIGHTHOUSE_REPORT.md` (new)
- **Deliverable:** Lighthouse 95+ (mobile) + install prompt çalışır, README'de Lighthouse screenshot
- **Süre:** ~1 gün
- **Conflict:** Session 4 ile çakışabilir (landing touch) → Session 4'ten SONRA

### Session 6 — Use Cases Page (Task 8) `[ ]`
- **Scope:** `/use-cases` route — 3 senaryo
- **Files:**
  - `frontend/src/pages/UseCasesPage.tsx` (new)
  - `frontend/src/pages/UseCasesPage.test.tsx` (new)
  - `frontend/src/App.tsx` (route)
  - `frontend/src/lib/i18n.ts` (use-cases anahtarları — 4 dil)
- **Deliverable:** 3 senaryo kart'ı (Erasmus / Startup team / Tatil) — problem → çözüm → screenshot → tx hash
- **Süre:** ~1 gün
- **Conflict:** App.tsx touch → Session 7 ile sırayla

### Session 7 — Leaderboard Page (Task 9) `[ ]`
- **Scope:** Public `/leaderboard` — top SPLT holders
- **Files:**
  - `backend/src/analytics/leaderboard.service.ts` (new)
  - `backend/src/analytics/leaderboard.service.spec.ts` (new)
  - `backend/src/analytics/analytics.controller.ts` (new endpoint `GET /analytics/leaderboard`)
  - `frontend/src/pages/LeaderboardPage.tsx` (new)
  - `frontend/src/pages/LeaderboardPage.test.tsx` (new)
  - `frontend/src/App.tsx` (route)
- **Deliverable:** Top 10 + user's own rank, Jest + Vitest testleri, 5 min cache
- **Süre:** ~1 gün
- **Conflict:** App.tsx — Session 6'dan SONRA

### Session 8 — On-Chain Referral Program (Task 10) `[ ]`
- **Scope:** Contract'ta `register_referral` entrypoint + frontend wire
- **Files:**
  - `contracts/stellar_split/src/lib.rs` (new entrypoint)
  - `contracts/stellar_split/src/test.rs` (test)
  - `frontend/src/lib/contract.ts` (wire)
  - `frontend/src/components/ReferralDashboard.tsx` (on-chain integration)
  - `frontend/src/components/JoinPage.tsx` (?ref= param handling)
- **Deliverable:** Davet linkine `?ref=` ile gelen kullanıcı katılınca davetçi +5 SPLT alır, contract test + frontend e2e
- **Süre:** ~1 gün
- **Conflict:** lib.rs → Session 9, 10 ile sırayla

### Session 9 — Multi-Currency Settle (Task 11, L5 iddiası) `[ ]`
- **Scope:** `settle_group(destination_asset)` + SAC path_payment_strict_receive invoke
- **Files:**
  - `contracts/stellar_split/src/lib.rs` (settle_group param + invoke_contract)
  - `contracts/stellar_split/src/test.rs`
  - `frontend/src/components/SettleModal.tsx` (per-member currency picker)
  - `frontend/src/lib/priceFeed.ts` (new — Reflector integration veya basic)
  - `docs/MULTI_CURRENCY.md` (new)
- **Deliverable:** Testnet'te en az 1 başarılı XLM→USDC path-payment settle + README'de tx hash örneği
- **Süre:** ~3-5 gün
- **Conflict:** lib.rs → Session 8'den SONRA; Session 10'dan ÖNCE

### Session 10 — Savings Pool Yield / Blend (Task 12) `[ ]`
- **Scope:** `contribute_pool` → Blend deposit, `release_pool` → Blend withdraw + yield dağıtımı
- **Files:**
  - `contracts/stellar_split/src/lib.rs` (savings_pool fonksiyonları)
  - `contracts/stellar_split/src/test.rs`
  - `frontend/src/components/SavingsPool.tsx` (yield widget)
  - `docs/YIELD_INTEGRATION.md` (new)
- **Deliverable:** Testnet'te yield kazandıran savings pool, frontend'de live yield ticker
- **Süre:** ~3-5 gün
- **Conflict:** lib.rs → Session 9'dan SONRA

### Session 11 — Mainnet Prep Docs (Task 14) `[ ]`
- **Scope:** Mainnet readiness + roadmap
- **Files:**
  - `README.md` (Coming to Mainnet bölümü)
  - `docs/MAINNET-CHECKLIST.md` (complete)
  - `ROADMAP.md` (fazlar)
- **Deliverable:** Mainnet deployment plan + audit checklist
- **Süre:** ~3 saat
- **Conflict:** yok (docs-only)

---

## 🧭 Çakışma matrisi (aynı dosyayı değiştiren session'lar → sequential)

| Dosya | Session'lar |
|-------|-------------|
| `README.md` | S1, S5, S11 |
| `frontend/src/App.tsx` | S6, S7 |
| `frontend/src/components/LandingPage.tsx` | S4, S5 |
| `contracts/stellar_split/src/lib.rs` | S8, S9, S10 |

Bu dosyalara dokunan session'lar ardışık sırayla yapılacak. Paralel asla çalıştırılmayacak.

---

## ✅ Her session'ın "definition of done" kriteri

1. Kod değişiklikleri tamamlandı
2. Yeni testler yazıldı (gerekiyorsa) + var olan tests geçiyor
3. `npx tsc --noEmit` — 0 error (frontend)
4. `cargo test` — tüm testler geçiyor (contract değişikliği varsa)
5. Git commit atıldı
6. Git push yapıldı
7. Session plan'de `[x]` olarak işaretlendi
8. Kısa özet + sonraki session için not

---

## 🎯 Şu an aktif: Session 4 (Landing canlı metrikler) — sıra sende

## 📜 Tamamlananlar

- **Session 1** (`71d6843` + `bad0023` + `02190c6`) — Screenshot Gallery Expansion
  - Playwright script `frontend/e2e/screenshots.spec.ts` (10 otomatik screenshot: viewport × tema matrisi)
  - Playwright script `frontend/e2e/screenshots-states.spec.ts` (5 state-dependent: settle, savings, splt-reward, activity-feed, mobile-bottomsheet)
  - README Screenshots bölümü: Dark/Light karşılaştırma, Mobile gallery, Key moments, DevOps output
  - Tüm 15 screenshot tek komutla yeniden üretilebilir. TypeScript: 0 error

- **Session 2** (commit `e0efbda`) — Blog Post Draft
  - `docs/blog/how-we-built-birik.md` (~2000 kelime, publish-ready)
  - Dev.to frontmatter + raw.githubusercontent.com absolute image URLs (Medium/Hashnode mirror'ları için)
  - 3 teknik bölüm (min-flow algo / inter-contract SPLT mint / SIWS auth) + testing stratejisi + mobile
  - Publishing notes (Dev.to primary, Medium/Hashnode mirror, tweet thread prep)
  - **Yayınlandı:** [Dev.to](https://dev.to/plutazom/how-we-built-birik-group-expense-splitting-on-stellar-in-30-days-1aog) · [Medium](https://medium.com/@Plutazom/how-we-built-birik-group-expense-splitting-on-stellar-in-30-days-31c1ab3a0447)

- **Session 3** (commit TBD) — Twitter/X Thread Playbook
  - `docs/social/twitter-threads.md` — 3 publish-ready thread
  - Thread 1 (Why Birik? — 8 tweet, EN + TR mirror 8 tweet)
  - Thread 2 (Under the hood — 9 tweet, 3 kod snippet'li teknik özet, Dev.to linki wired)
  - Thread 3 (Testnet beta open — 8 tweet, 20-user hedefli community call, feedback formu linki)
  - Her tweet char sayımı ≤280 doğrulandı, görsel asset haritası + hashtag/mention cheat sheet + 3-günlük yayın planı + 6 hazır quote-tweet cevabı + engagement tracking tablosu + re-post stratejisi
  - README quick-links'e Dev.to + Medium linkleri eklendi

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

### Session 3 — Twitter/X Thread Drafts (Task 4) `[x]` — commit `3a2d9e8`
- **Scope:** 3 hazır tweet thread
- **Files:** `docs/social/twitter-threads.md` (new)
- **Deliverable:** Thread 1 (neden Birik), Thread 2 (under the hood), Thread 3 (testnet beta). Her biri 10-15 tweet + görsel + hashtag + mention listesi
- **Süre:** ~2 saat
- **Conflict:** yok (content-only)

### Session 4A — Typefully Setup Guide (Task 4, ek) `[x]` — commit `e8d4ba7`
- **Scope:** Bu haftaki 3 thread için Typefully free tier üzerinden "set-and-forget" scheduling rehberi
- **Files:** `docs/social/TYPEFULLY_SETUP.md` (new)
- **Deliverable:** 20 dakikalık setup rehberi — hesap oluşturma, X bağlama, thread import (markdown code-block'tan copy-paste), image attachment, scheduling (Strategy A + B), preview, day-of sanity check, troubleshooting
- **Süre:** ~30 dk (docs-only)
- **Conflict:** yok

### Session 4B — Twitter Auto-Poster (leaderboard signal) `[x]` — commit `f1c1bc4`
- **Scope:** GitHub Actions ile `twitter-threads.md` markdown'dan otomatik thread post + image upload + `in_reply_to_status_id` chain
- **Files:**
  - `scripts/post-thread.mjs` (new) — markdown parse, X API v2 client, thread chaining
  - `scripts/post-thread.test.mjs` (new) — parser + dry-run testleri
  - `.github/workflows/post-thread.yml` (new) — cron + manual trigger + dry-run toggle
  - `docs/TWITTER_AUTOMATION.md` (new) — X Developer Portal kurulumu + GitHub Secrets + workflow kullanımı
- **Deliverable:** GitHub repo'dan scheduled / manual trigger ile X thread post. Dry-run mode test için güvenli. Dedicated `@BirikApp` hesabı gerekli.
- **Süre:** ~2 saat
- **Conflict:** yok (yeni dosyalar, kimse dokunmuyor)

### Session 5 — Landing Canlı Metrikler (Task 2) `[x]` — commit `be0319d`
- **Scope:** Ana landing page'e 4 public KPI card
- **Files:**
  - `frontend/src/hooks/usePublicMetrics.ts` (new)
  - `frontend/src/components/KPICard.tsx` (new)
  - `frontend/src/components/KPICard.test.tsx` (new)
  - `frontend/src/components/LandingPage.tsx` (modify — KPI row eklenecek)
- **Deliverable:** Landing'de 4 KPI (groups / settled / users 24h / tx/sec), loading + error state, 60s cache, Vitest test
- **Süre:** ~2 saat
- **Conflict:** Sadece LandingPage.tsx — Session 6-7 ile çakışmaz

### Session 6 — Lighthouse + PWA Polish (Tasks 7 + 13) `[x]` — commit `c97b922`
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

### Session 7 — Use Cases Page (Task 8) `[x]` — commit TBD
- **Scope:** `/use-cases` route — 3 senaryo
- **Files:**
  - `frontend/src/pages/UseCasesPage.tsx` (new)
  - `frontend/src/pages/UseCasesPage.test.tsx` (new)
  - `frontend/src/App.tsx` (route)
  - `frontend/src/lib/i18n.ts` (use-cases anahtarları — 4 dil)
- **Deliverable:** 3 senaryo kart'ı (Erasmus / Startup team / Tatil) — problem → çözüm → screenshot → tx hash
- **Süre:** ~1 gün
- **Conflict:** App.tsx touch → Session 7 ile sırayla

### Session 8 — Leaderboard Page (Task 9) `[ ]`
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

### Session 9 — On-Chain Referral Program (Task 10) `[ ]`
- **Scope:** Contract'ta `register_referral` entrypoint + frontend wire
- **Files:**
  - `contracts/stellar_split/src/lib.rs` (new entrypoint)
  - `contracts/stellar_split/src/test.rs` (test)
  - `frontend/src/lib/contract.ts` (wire)
  - `frontend/src/components/ReferralDashboard.tsx` (on-chain integration)
  - `frontend/src/components/JoinPage.tsx` (?ref= param handling)
- **Deliverable:** Davet linkine `?ref=` ile gelen kullanıcı katılınca davetçi +5 SPLT alır, contract test + frontend e2e
- **Süre:** ~1 gün
- **Conflict:** lib.rs → Session 10, 11 ile sırayla

### Session 10 — Multi-Currency Settle (Task 11, L5 iddiası) `[ ]`
- **Scope:** `settle_group(destination_asset)` + SAC path_payment_strict_receive invoke
- **Files:**
  - `contracts/stellar_split/src/lib.rs` (settle_group param + invoke_contract)
  - `contracts/stellar_split/src/test.rs`
  - `frontend/src/components/SettleModal.tsx` (per-member currency picker)
  - `frontend/src/lib/priceFeed.ts` (new — Reflector integration veya basic)
  - `docs/MULTI_CURRENCY.md` (new)
- **Deliverable:** Testnet'te en az 1 başarılı XLM→USDC path-payment settle + README'de tx hash örneği
- **Süre:** ~3-5 gün
- **Conflict:** lib.rs → Session 9'dan SONRA; Session 11'den ÖNCE

### Session 11 — Savings Pool Yield / Blend (Task 12) `[ ]`
- **Scope:** `contribute_pool` → Blend deposit, `release_pool` → Blend withdraw + yield dağıtımı
- **Files:**
  - `contracts/stellar_split/src/lib.rs` (savings_pool fonksiyonları)
  - `contracts/stellar_split/src/test.rs`
  - `frontend/src/components/SavingsPool.tsx` (yield widget)
  - `docs/YIELD_INTEGRATION.md` (new)
- **Deliverable:** Testnet'te yield kazandıran savings pool, frontend'de live yield ticker
- **Süre:** ~3-5 gün
- **Conflict:** lib.rs → Session 10'dan SONRA

### Session 12 — Mainnet Prep Docs (Task 14) `[ ]`
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
| `README.md` | S1, S6, S12 |
| `frontend/src/App.tsx` | S7, S8 |
| `frontend/src/components/LandingPage.tsx` | S5, S6 |
| `contracts/stellar_split/src/lib.rs` | S9, S10, S11 |

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

## 🎯 Şu an aktif: Session 8 (Leaderboard page) — sıra sende

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

- **Session 3** (commit `3a2d9e8`) — Twitter/X Thread Playbook
  - `docs/social/twitter-threads.md` — 3 publish-ready thread
  - Thread 1 (Why Birik? — 8 tweet, EN + TR mirror 8 tweet)
  - Thread 2 (Under the hood — 9 tweet, 3 kod snippet'li teknik özet, Dev.to linki wired)
  - Thread 3 (Testnet beta open — 8 tweet, 20-user hedefli community call, feedback formu linki)
  - Her tweet char sayımı ≤280 doğrulandı, görsel asset haritası + hashtag/mention cheat sheet + 3-günlük yayın planı + 6 hazır quote-tweet cevabı + engagement tracking tablosu + re-post stratejisi
  - README quick-links'e Dev.to + Medium linkleri eklendi

- **Session 4A** (commit `e8d4ba7`) — Typefully Setup Guide
  - `docs/social/TYPEFULLY_SETUP.md` — 20 dakikalık step-by-step
  - Hesap oluşturma → X bağlama → thread import → image attach → schedule (Strategy A + B) → preview → day-of sanity check → troubleshooting → green-light checklist
  - Combined strategy'nin "bu hafta için" ayağı — 3 thread için set-and-forget

- **Session 7** (commit TBD) — Use Cases Page
  - `frontend/src/pages/UseCasesPage.tsx` (new) — 3 senaryo (Erasmus / Startup team / Tatil), problem × çözüm × screenshot × Stellar Expert tx link
  - `frontend/src/pages/UseCasesPage.test.tsx` (new) — 7 Vitest testi (title/subtitle, 3 senaryo kartı, tx link shape, CDN image src, navigation)
  - `frontend/src/App.tsx` — `isUseCases` conditional + lazy import, public route (auth-exempt), existing pathname-pattern routing ile uyumlu
  - `frontend/src/lib/i18n.ts` — 11 use_cases.\*+nav.use_cases key × 4 dil = 44 entry (TR primary, EN/DE/ES mirror)
  - `frontend/src/components/Landing.tsx` — CTA butonlarının altına discrete "Kullanım senaryolarını gör →" link (mevcut mimari ile uyumlu, primary CTA'ları kirletmez)
  - Screenshot kaynağı: GitHub raw CDN (duplication yok, build'e yük yok, blog post ile aynı pattern)
  - Her senaryo için gerçek testnet tx hash'i — Stellar Expert linki jüri için doğrulanabilir kanıt
  - TS + ESLint clean; Vitest 900/900 green (+7 use-cases)

- **Session 6** (commit `c97b922`) — Lighthouse + PWA Polish
  - `scripts/generate-pwa-icons.mjs` + `sharp` devdep — favicon.svg'den 6 raster çıktı (icon-192/512, icon-192/512-maskable, apple-touch-icon-180, og-image 1200×630). "Brand asset değişince bir komut, bitti."
  - `frontend/public/manifest.json` rewritten — PNG icons with explicit sizes + `purpose: any` + `purpose: maskable` variants
  - `frontend/vite.config.ts` manifest reconciled — was "StellarSplit" (inherited from template), now "Birik" matching public/manifest.json
  - `frontend/index.html` — `<link rel="manifest">`, 192/512 raster favicon, apple-touch-icon, og:image → og-image.png with width/height/alt, apple-mobile-web-app-* meta tags, viewport-fit=cover
  - `frontend/src/components/InstallPrompt.tsx` — iOS Safari detection (no beforeinstallprompt fires on iOS) + step-by-step modal ("Share → Add to Home Screen → Add")
  - `frontend/src/lib/i18n.ts` — 7 new install.* keys × 4 languages (TR/EN/DE/ES)
  - `frontend/src/components/InstallPrompt.test.tsx` — 3 new tests (iOS banner w/o event, iOS guide modal, desktop path still uses deferred prompt)
  - `docs/LIGHTHOUSE_REPORT.md` — run instructions + score tracking template + "what we deferred and why" section
  - Tests: 893/893 passing (890 + 3 iOS); TS + ESLint clean; `npm run build` emits 24 precached entries + all 6 PWA rasters copied to dist/

- **Session 5** (commit `be0319d`) — Landing Live Metrics
  - `frontend/src/hooks/usePublicMetrics.ts` — React Query hook, shares cache key `['analytics', 'summary']` with StatsPanel so cross-nav is instant
  - `frontend/src/components/KPICard.tsx` — animated counter card with loading/error states
  - `frontend/src/components/KPICard.test.tsx` — 10 tests (Vitest) covering ready/loading/error/icon paths
  - `frontend/src/components/Landing.tsx` — swapped 3 hardcoded stats (10K/₺/★) for `LiveMetricsRow` with 4 live KPIs (groups / volume / settled / dau); removed dead `Stat` function + unused framer-motion imports
  - Bonus: fixed pre-existing `Dashboard.test.tsx` break (missing StatsPanel mock since L6 commit); suite: 890/890 green (was 885/890 before this session)
  - TypeScript: 0 error · ESLint: 0 error

- **Session 4B** (commit `f1c1bc4`) — Twitter Auto-Poster
  - `scripts/post-thread.mjs` — markdown parser (`parseThreadsMarkdown`) + X API v2 thread chain poster + dry-run mode
  - `scripts/post-thread.test.mjs` — 14 test (parser fixtures + real markdown shape + char-limit invariant + image existence + dry-run)
  - `scripts/package.json` + `scripts/package-lock.json` — `twitter-api-v2` tek dependency, Node ≥20, `node --test` runner
  - `.github/workflows/post-thread.yml` — workflow_dispatch ile thread seç + dry-run toggle, tests önce koşulur sonra post step
  - `docs/TWITTER_AUTOMATION.md` — X Developer Portal kurulumu + 4 secret + 6 adımlı operating playbook + 7-madde troubleshooting + security notes
  - Combined strategy'nin "ay sonuna doğru" ayağı — leaderboard teknik signal + Buffer $5/ay'dan kaçış
  - Dry-run local'de test edildi: 3 thread (8+9+8=25 tweet), hepsi parsed, image paths resolved

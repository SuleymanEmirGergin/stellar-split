# StellarSplit — Skill Tabanlı Yol Haritası

Bu belge, projeye bağladığınız skill’ler (blockchain-developer, solidity-security, web3-testing, crypto-bd-agent, concise-planning, lint-and-validate, systematic-debugging) kullanılarak **genel yapının analizi** ve **ne yapılabileceğinin** detaylı yol haritasıdır. Uygulama adımları için [SKILLS-IMPLEMENTATION-PLAN.md](SKILLS-IMPLEMENTATION-PLAN.md) kullanın.

---

## 1. Proje Yapısı Özeti (Genel İnceleme)

### 1.1 Mimari

| Katman | Teknoloji | Konum | Durum |
|--------|-----------|--------|--------|
| **Frontend** | React 19, Vite 6, TypeScript, Tailwind | `frontend/` | SPA, Freighter, Demo Mode |
| **Smart contract** | Rust, Soroban SDK 22 | `contracts/stellar_split/` | Grup, harcama, settle, guardian/recovery |
| **API (opsiyonel)** | Node | `api/` | Analytics, webhook proxy |
| **CI** | GitHub Actions | `.github/workflows/ci.yml` | Contract test, frontend build, unit test, E2E, lint |

### 1.2 Veri Akışı

1. Kullanıcı Freighter ile bağlanır → adres state’e yazılır.
2. Dashboard grup listesini kontrat veya Demo Mode’da localStorage’dan alır.
3. Grup detay: `get_group`, `get_balances`, `compute_settlements` vb. kontrat çağrıları (veya mock).
4. Settle: kontrat `settle_group` → greedy algoritma + XLM SAC transferleri.

### 1.3 Mevcut Güçlü Yönler

- **Kontrat:** Auth (`require_auth`), input validasyonu (boş isim, min üye, duplicate, amount > 0, split_among üyelik), TTL bump, event’ler.
- **Frontend:** Hata çevirisi (`errors.ts`), loading (Stepper, Skeleton), cache (React Query, XLM fiyat), unit + E2E testler.
- **CI:** Lint, tsc, unit test, E2E, contract test, WASM build ayrı job’larda.

### 1.4 Tespit Edilen Zayıf Noktalar / Riskler

| Alan | Tespit | Skill ile ilişki |
|------|--------|------------------|
| **Kontrat** | `settle_group` içinde `invoke_contract` ile `mint` çağrısı — XLM SAC’ta `mint` yok; gerçek XLM ile settle’da panic riski. | solidity-security, systematic-debugging |
| **Frontend** | ESLint: 5 error (unused vars, `any`), 3 warning (exhaustive-deps, only-export-components). | lint-and-validate |
| **Test** | Kontrat: recovery/guardian için unit test yok. Frontend: contract.ts’in gerçek RPC path’i için entegrasyon testi yok. | web3-testing |
| **Güvenlik** | Kontrat için resmi “security checklist” veya audit notu yok; overflow/edge case dokümante değil. | solidity-security (prensipler) |
| **Keşfedilebilirlik** | README/demo tamam; “listing” veya jüri için tek sayfalık özet (one-pager) yok. | crypto-bd-agent (hafif uyarlama) |

---

## 2. Skill → Yapılacaklar Eşlemesi

### 2.1 blockchain-developer

**Odak:** Production-grade Web3 uygulaması, güvenli kontrat etkileşimi, dokümantasyon.

| Yapılacak | Açıklama | Öncelik |
|-----------|----------|---------|
| Kontrat–frontend arayüzünü dokümante et | `contract.ts` fonksiyonları, parametreler, hata dönüşleri; README veya ARCHITECTURE’da “Contract API” bölümü. | Yüksek |
| Mainnet geçiş checklist’ini güncelle | README’deki mainnet adımlarını env, RPC, contract ID, güvenlik notlarıyla netleştir. | Orta |
| Event dinleme stratejisi | `subscribeGroupEvents` polling vs. SSE/WebSocket; sınırlar ve alternatifler kısa not. | Düşük |
| Gas / ledger maliyeti notu | Hangi işlemlerin kaç birim tükettiği (veya “testnet’te ~X ops” şeklinde) kısa doküman. | Düşük |

---

### 2.2 solidity-security (Soroban’a Uyarlı Prensipler)

**Odak:** Access control, input validation, edge case, “audit-ready” notlar. (Solidity yok; prensipler uygulanır.)

| Yapılacak | Açıklama | Öncelik |
|-----------|----------|---------|
| Kontrat güvenlik checklist’i | Yetki (require_auth), girdi (length, range, üyelik), reentrancy (Soroban’da farklı), TTL; `docs/SECURITY-CHECKLIST.md`. | Yüksek |
| `settle_group` mint davranışı | XLM SAC’ta `mint` yok; ya mint’i opsiyonel yap (token tipi kontrolü) ya da sadece reward token’da kullan / dokümante et. | Yüksek |
| Guardian/recovery edge case’leri | Boş guardian, threshold > len, aynı guardian iki kez approve; test veya doküman. | Orta |
| Overflow / sınır kontrolleri | i128/u64 kullanımı; Soroban’da overflow davranışı kısa not. | Orta |

---

### 2.3 web3-testing

**Odak:** Unit, entegrasyon, E2E; fixture, edge case, gas/ledger farkındalığı.

| Yapılacak | Açıklama | Öncelik |
|-----------|----------|---------|
| Lint hatalarını gider | 5 error (unused, any), 3 warning; her PR’da lint + tsc temiz. | Yüksek |
| Kontrat: recovery testleri | `set_guardians`, `initiate_recovery`, `approve_recovery` için en az 2–3 test (happy path + invalid threshold). | Yüksek |
| Frontend: contract.ts edge case | Demo dışı path’te “group not found”, “simulation failed” vb. mock ile unit test. | Orta |
| E2E: settle sonrası doğrulama | Create → expense → settle akışında “settled” state veya tx hash görünür mü; gerekirse bir spec güçlendir. | Orta |
| Test coverage raporu | Vitest coverage (opsiyonel); CI’da yayınlamak veya yerel `npm run test:coverage`. | Düşük |

---

### 2.4 crypto-bd-agent (Uyarlanmış Kullanım)

**Odak:** Bu proje bir “listing agent” değil; skill’den **keşfedilebilirlik ve sunum** fikirleri alınır.

| Yapılacak | Açıklama | Öncelik |
|-----------|----------|---------|
| Tek sayfa özet (one-pager) | Hackathon jüri / submission: Problem, Çözüm, Tech, Demo link, Testnet contract, 3–5 bullet. `docs/ONEPAGER.md` veya README’de “Submission summary”. | Orta |
| README “Quick Links” güncel mi? | Canlı demo, repo, (varsa) demo video linki tek yerde. | Yüksek |
| Görünürlük sinyalleri | Badge’ler (Stellar, Soroban, License) mevcut; isteğe “Testnet deployed”, “Tests passing” badge. | Düşük |

---

### 2.5 concise-planning

**Odak:** Büyük özellik veya refactor’da net kapsam ve atomik adımlar.

| Yapılacak | Açıklama | Öncelik |
|-----------|----------|---------|
| Büyük işlerde plan şablonu kullan | Approach, Scope (In/Out), Action Items (6–10 adım), Validation, Open Questions. | Sürekli |
| Level 3 sonrası hedefler | Örn. “Social recovery UI’ı kontrata bağla”, “USDC mainnet”; her biri için kısa plan. | Orta |

---

### 2.6 lint-and-validate

**Odak:** Her kod değişikliğinden sonra lint + type check; CI ile uyum.

| Yapılacak | Açıklama | Öncelik |
|-----------|----------|---------|
| ESLint hatalarını sıfırla | Scanner (unused `error`), badges (unused `Group`), contract.ts ve sound.ts (`any`), Toast/export uyarısı. | Yüksek |
| React hooks dependency uyarıları | Dashboard (currency), TxHistory (fetchTransactions); ya dependency ekle ya da bilinçli eslint-disable + yorum. | Yüksek |
| CI’da “lint + tsc” zorunlu | PR’da lint ve tsc fail ederse merge engelli (zaten var; lint’in gerçekten fail ettiğinden emin ol). | Yüksek |
| Kontrat: Clippy | `cargo clippy` CI’a ekle (opsiyonel); proje kökünde. | Orta |

---

### 2.7 systematic-debugging

**Odak:** Hata çözmede önce kök neden (repro, log, son değişiklikler), sonra tek odaklı fix.

| Yapılacak | Açıklama | Öncelik |
|-----------|----------|---------|
| Bug raporları için şablon | Repro adımları, beklenen/gerçek, ortam, son değişiklikler; `docs/CONTRIBUTING.md` veya issue template. | Düşük |
| “No fix without root cause” | Özellikle CI veya E2E kırıldığında: önce log/evidence, sonra hipotez, sonra minimal fix. | Sürekli |
| Çok katmanlı hatalarda katman izolasyonu | Örn. “Env Vercel’de yok” → workflow → build → runtime; her katmanda ne göründüğünü not et. | Sürekli |

---

## 3. Öncelik Sıralaması (Uygulama Sırası Önerisi)

1. **Faz 1 – Temizlik ve güvenlik temeli**  
   - Lint + tsc hatalarını gider (lint-and-validate).  
   - Kontrat: `settle_group` mint davranışını güvenli/opsiyonel yap veya dokümante et (solidity-security).  
   - Kontrat güvenlik checklist’i (solidity-security).

2. **Faz 2 – Test ve dokümantasyon**  
   - Kontrat: guardian/recovery unit testleri (web3-testing).  
   - README / Quick Links güncel (crypto-bd-agent uyarlı).  
   - Contract API kısa doküman (blockchain-developer).

3. **Faz 3 – İyileştirmeler**  
   - Frontend: contract edge case testleri, E2E settle doğrulama (web3-testing).  
   - One-pager veya submission summary (crypto-bd-agent).  
   - CI’da `cargo clippy` (lint-and-validate).

4. **Faz 4 – Sürekli**  
   - Büyük işlerde concise-planning şablonu.  
   - Bug çözmede systematic-debugging (köke yönelik).

---

## 4. Bu Skill’lerle Ne Yapabiliriz? (Özet)

- **blockchain-developer:** Kontrat–dApp arayüzü dokümantasyonu, mainnet checklist, event/gas notları.  
- **solidity-security:** Soroban’a uyarlı güvenlik checklist’i, mint davranışı düzeltmesi, guardian edge case’leri.  
- **web3-testing:** Lint düzeltme, kontrat recovery testleri, frontend contract edge testleri, E2E iyileştirme.  
- **crypto-bd-agent:** One-pager, README/Quick Links, submission/jüri odaklı görünürlük.  
- **concise-planning:** Yeni özellik veya refactor için kısa plan (scope, adımlar, doğrulama).  
- **lint-and-validate:** ESLint/tsc temizliği, CI’da lint/tsc zorunluluğu, opsiyonel Clippy.  
- **systematic-debugging:** Bug/CI/E2E hatalarında kök neden sonra fix; çok katmanlı hatalarda katman izolasyonu.

Detaylı adım listesi ve “nereden başlanır” için [SKILLS-IMPLEMENTATION-PLAN.md](SKILLS-IMPLEMENTATION-PLAN.md) dosyasına geçin.

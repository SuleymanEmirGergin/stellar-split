# StellarSplit — Skill Tabanlı Uygulama Planı

Bu belge [SKILLS-ROADMAP.md](SKILLS-ROADMAP.md) ile uyumlu **adım adım uygulama planı**dır. Skill’leri kullanarak yavaştan uygulamaya başlamak için Faz 1’den ilerleyin; her faz tamamlandıkça işaretleyin.

---

## Yaklaşım

- **Önce temizlik ve güvenlik temeli** (lint, kontrat mint davranışı, güvenlik checklist).
- **Sonra test ve dokümantasyon** (recovery testleri, README/Contract API).
- **Ardından iyileştirmeler** (E2E, one-pager, CI Clippy).
- **Sürekli:** Planlama ve hata çözmede skill’lere uygun davranış.

**Kapsam (In):** Lint/tsc, kontrat güvenlik notu, kontrat testleri, README/Contract API dokümanı, opsiyonel E2E/one-pager/CI.  
**Kapsam dışı (Out):** Yeni özellik geliştirme (sadece plan maddesi olarak), harici audit, mainnet deploy.

---

## Faz 1 — Temizlik ve güvenlik temeli

### 1.1 Lint ve TypeScript (lint-and-validate)

- [x] **1.1.1** `frontend/src/components/Scanner.tsx`: Kullanılmayan `error` değişkenini kaldır veya kullan (örn. log/display).
- [x] **1.1.2** `frontend/src/lib/badges.ts`: Kullanılmayan `Group` import’unu kaldır.
- [x] **1.1.3** `frontend/src/lib/contract.ts`: Satır 349 ve 383’teki `any` tiplerini somut tip veya `unknown` + type guard ile değiştir.
- [x] **1.1.4** `frontend/src/lib/sound.ts`: Satır 11’deki `any` için uygun tip (örn. `HTMLAudioElement` veya event tipi) kullan.
- [x] **1.1.5** `frontend/src/components/Toast.tsx`: “only-export-components” uyarısı — sabitleri/fonksiyonları ayrı dosyaya taşı veya eslint-disable + kısa yorum.
- [x] **1.1.6** `frontend/src/components/Dashboard.tsx`: useCallback dependency array’e `currency` ekle veya bilinçli eslint-disable + yorum.
- [x] **1.1.7** `frontend/src/components/TxHistory.tsx`: useEffect dependency’ye `fetchTransactions` ekle veya useCallback ile sarmalayıp bilinçli yorum.
- [x] **1.1.8** Doğrulama: `cd frontend && npm run lint && npx tsc --noEmit` hatasız çalışsın.

### 1.2 Kontrat: settle_group mint davranışı (solidity-security + systematic-debugging)

- [ ] **1.2.1** `contracts/stellar_split/src/lib.rs` içinde `settle_group`’taki `invoke_contract` mint çağrısını incele: XLM SAC’ta `mint` yok; gerçek XLM ile panic riski.
- [ ] **1.2.2** Seçenek A: Mint’i sadece “reward token” (ayrı contract) ile sınırla; `group.token` XLM SAC ise mint atla.  
  Seçenek B: Mint’i tamamen kaldır veya feature flag / config ile aç/kapa.  
  Seçenek C: Değişiklik yapmadan `docs/SECURITY-NOTES.md` içinde riski ve mevcut “demo only” davranışı yaz.
- [ ] **1.2.3** Seçilen değişikliği uygula; `cargo test` ve (varsa) frontend settle akışını manuel test et.
- [ ] **1.2.4** Doğrulama: `cargo test` geçsin; README veya SECURITY-NOTES’ta davranış açıklansın.

### 1.3 Kontrat güvenlik checklist’i (solidity-security)

- [ ] **1.3.1** `docs/SECURITY-CHECKLIST.md` oluştur: require_auth kullanımları, input validasyonları (length, range, üyelik), TTL, guardian/recovery kısaca.
- [ ] **1.3.2** Checklist’te “settle_group mint” davranışını (1.2’deki karar) tek cümleyle not et.
- [ ] **1.3.3** Doğrulama: Dosya README’den veya ARCHITECTURE’dan linklensin (isteğe bağlı).

---

## Faz 2 — Test ve dokümantasyon

### 2.1 Kontrat: Guardian / recovery unit testleri (web3-testing)

- [ ] **2.1.1** `contracts/stellar_split/src/test.rs` içinde `set_guardians` için en az 1 test: geçerli guardian listesi ve threshold ile çağrı başarılı.
- [ ] **2.1.2** `initiate_recovery` için 1 test: guardian çağırır, recovery request oluşur.
- [ ] **2.1.3** `approve_recovery` için 1 test: threshold’a ulaşınca status “completed” (veya mevcut tasarıma göre).
- [ ] **2.1.4** (İsteğe bağlı) Hata case: guardian olmayanın `initiate_recovery` çağırması panic; invalid threshold ile `set_guardians` panic.
- [ ] **2.1.5** Doğrulama: `cargo test` tüm yeni testlerle geçsin.

### 2.2 README ve Quick Links (crypto-bd-agent uyarlı)

- [ ] **2.2.1** README “Quick Links” veya “Canlı Demo” bölümünde: canlı demo URL’si, repo, (varsa) demo video linki güncel olsun.
- [ ] **2.2.2** LEVEL3-ROADMAP veya README’de “Demo video linki” ve “Live demo linki” için placeholder’lar sen doldurana kadar açık kalsın.
- [ ] **2.2.3** Doğrulama: README’yi okuyan biri demo ve repo’ya tek yerden ulaşabilsin.

### 2.3 Contract API dokümantasyonu (blockchain-developer)

- [ ] **2.3.1** `docs/CONTRACT-API.md` (veya ARCHITECTURE.md’ye bölüm) ekle: `create_group`, `add_expense`, `settle_group`, `get_group`, `get_balances`, `compute_settlements`, guardian/recovery fonksiyonları; parametreler ve dönüşler kısaca.
- [ ] **2.3.2** Frontend’in hangi fonksiyonları `contract.ts` üzerinden çağırdığını 1–2 cümleyle yaz.
- [ ] **2.3.3** Doğrulama: Yeni geliştirici bu dokümandan kontrat arayüzünü anlayabilsin.

---

## Faz 3 — İyileştirmeler

### 3.1 Frontend: contract edge case testleri (web3-testing)

- [ ] **3.1.1** `frontend/src/lib/contract.test.ts` veya yeni bir test dosyasında: Demo mode kapalıyken “group not found” veya simulation hatası senaryosu (mock fetch/RPC) ile hata mesajı veya throw doğrulansın.
- [ ] **3.1.2** Doğrulama: `npm run test:run` geçsin.

### 3.2 E2E: Settle sonrası doğrulama (web3-testing)

- [ ] **3.2.1** `frontend/e2e/create-expense-settle.spec.ts` (veya benzeri) içinde: create group → add expense → Settle tab’a geç sonrası “Settled” veya işlem hash / success mesajı görünür mü kontrol et (demo mode’da).
- [ ] **3.2.2** Doğrulama: `npm run e2e` ilgili spec’i geçsin.

### 3.3 One-pager / submission summary (crypto-bd-agent)

- [ ] **3.3.1** `docs/ONEPAGER.md` oluştur: Problem, Çözüm, Tech stack, Demo link, Testnet contract, “3+ tests passing” veya benzeri 3–5 madde.
- [ ] **3.3.2** README’de “Submission summary” veya “One-pager” linki ekle (isteğe bağlı).
- [ ] **3.3.3** Doğrulama: Jüri veya dış biri tek sayfadan projeyi özetleyebilsin.

### 3.4 CI: Clippy (lint-and-validate)

- [ ] **3.4.1** `.github/workflows/ci.yml` içinde contract-test job’ına (veya yeni bir job) `cargo clippy -- -D warnings` ekle.
- [ ] **3.4.2** Clippy uyarı varsa kontrat kodunda düzelt.
- [ ] **3.4.3** Doğrulama: CI’da Clippy geçsin.

---

## Faz 4 — Sürekli uygulama

- **concise-planning:** Yeni özellik veya büyük refactor’da Approach → Scope → Action Items → Validation planı yaz (bu dokümandaki gibi).
- **systematic-debugging:** CI/E2E veya production bug’da önce repro, log, son değişiklikler; sonra tek hipotez, minimal fix; 3+ denemeden sonra mimariyi sorgula.
- **lint-and-validate:** Her PR öncesi `npm run lint && npx tsc --noEmit` (frontend), isteğe `cargo clippy` (contract).

---

## Açık Sorular (Plan güncellenirken)

- Kontrat mint davranışında nihai tercih: tamamen kaldırmak mı, “sadece reward token’da” mı, yoksa sadece dokümante mi?
- Guardian/recovery UI’ı kontrata bağlama ayrı bir “Level 3 sonrası” planında mı olacak?

---

## Hızlı Başlangıç (Bugün yapılabilecekler)

1. **Lint:** 1.1.1–1.1.7 adımlarını uygula → 1.1.8 ile doğrula.  
2. **Kontrat not:** 1.2’de Seçenek C seçilirse sadece `docs/SECURITY-NOTES.md` yaz (1.2.3–1.2.4).  
3. **Checklist:** 1.3.1–1.3.2 ile `docs/SECURITY-CHECKLIST.md` oluştur.  
4. **Test:** 2.1.1–2.1.3 ile en az 3 recovery/guardian testi ekle.

Bu sırayla ilerlediğinde skill’ler (lint-and-validate, solidity-security, web3-testing, blockchain-developer, crypto-bd-agent, concise-planning, systematic-debugging) projede adım adım uygulanmış olur.

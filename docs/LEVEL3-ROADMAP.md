# Level 3 – Yol Haritası ve Durum Özeti

Bu belge, **Level 3** gereksinimlerine göre projenin mevcut durumunu ve yapılacakları listeler.

---

## 📋 Level 3 Gereksinimleri (Hatırlatma)

| # | Gereksinim | Submission checklist’te |
|---|------------|-------------------------|
| 1 | Mini-dApp tam fonksiyonel | Public GitHub repo |
| 2 | En az 3 test geçiyor | README’de test çıktısı ekran görüntüsü |
| 3 | README tam | README’de: live demo linki, test screenshot, demo video linki |
| 4 | Demo video kaydedildi (1 dk) | Demo video linki README’de |
| 5 | En az 3+ anlamlı commit | - |

**Öğrenme hedefleri:** Loading states, progress indicators, basic caching, test yazımı, dokümantasyon, 1 dk demo video.

---

## ✅ Şu An Neler Var?

### 1. Mini-dApp işlevselliği ✅
- Grup oluşturma, harcama ekleme, takas (settle), Demo Mode, cüzdan bağlantısı, bakiye, işlem geçmişi mevcut.
- Soroban contract entegrasyonu ve Testnet deploy’u yapılmış.

### 2. Testler (3+ geçiyor) ✅
- **Unit testler (Vitest):**
  - `frontend/src/lib/format.test.ts` – `formatXLM`, `maskAddress` (7 test)
  - `frontend/src/lib/motion.test.ts` – `motionEnabled`, `MOTION` (4 test)
  - `frontend/src/lib/contract.test.ts` – demo mode contract (4 test)
- **Toplam:** 15 unit test; hepsi geçiyorsa “minimum 3 test” şartı sağlanıyor.
- **E2E:** `frontend/e2e/` altında Playwright spec’ler var (landing, join, dashboard, create-expense-settle).
- **Screenshot:** `docs/screenshots/06-tests-passing.png` – test çıktısı ekran görüntüsü mevcut (4 test geçiyor gösteriliyor).

### 3. Loading states & progress indicators ✅
- **Stepper:** `status: 'pending' | 'loading' | 'complete' | 'error'` (işlem adımları).
- **Skeleton:** `SkeletonShimmer`, `GroupCardSkeleton`, `StatSkeleton`; `GroupDetail`, `TxHistory`, `ActivityFeed`, `JoinPage`, `NetworkStats` loading state kullanıyor.
- **PendingButton:** pending durumunda ring/glow.
- **DeFiTab:** `isLoading`, `isPending` (stake/withdraw/donate).
- **Dashboard:** “Yükleniyor…” (create butonu).

### 4. Basic caching ✅
- **XLM fiyat:** `frontend/src/lib/xlmPrice.ts` – 5 dk cache, 429 backoff.
- **React Query:** `useGroupQuery.ts` – `staleTime` ile grup, expenses, balances, settlements, vault, badges cache (5 dk, 1 dk, 15 sn, 1 saat vb.).
- **main.tsx:** `gcTime: 10 min` (unused cache).

### 5. README ✅ / ⚠️
- Genel dokümantasyon, mimari, kurulum, Level 1–2 checklist’ler mevcut.
- **Eksik (Level 3’e özel):**
  - **Live demo linki** (Vercel / Netlify vb.) README’de yok.
  - **Test çıktısı ekran görüntüsü** README’de açıkça “Level 3 – 3+ test geçiyor” olarak referans verilmiyor (06-tests-passing.png var ama Level 3 bölümü yok).
  - **Demo video linki** README’de yok.

### 6. Demo video ❌
- 1 dakikalık demo video linki veya “nasıl kaydedilir” notu repo’da yok.

### 7. Deploy konfigürasyonu ✅
- `frontend/vercel.json` (SPA rewrites) ve repo kökünde `netlify.toml` (base: frontend, build, SPA redirect) eklendi. Repoyu bağlayıp env’leri girmeniz yeterli.

### 8. Commit sayısı ⚠️
- “Minimum 3+ meaningful commits” – GitHub’da commit geçmişini kontrol etmek gerekir; yerel sandbox’ta `git log` çalıştırılamadı.

---

## 🎯 Yapılacaklar (Yol Haritası)

### Öncelik 1 – README’yi Level 3’e göre tamamla ✅ (yapıldı)
1. **Level 3 bölümü** README’de eklendi (checklist tablosu + Live Demo + Test output + Demo video placeholder’ları).
2. **Live demo linki** — *Sen:* Deploy sonrası README’deki “Live Demo” satırına linki yaz.
3. **Test screenshot** README’de referans verildi (`06-tests-passing.png`).
4. **Demo video linki** — *Sen:* Videoyu yükleyip README’deki “Demo video (1 minute)” satırına linki yaz.

### Öncelik 2 – Deploy (Live demo için) — config hazır ✅
1. **Vercel:** Repoyu bağla → **Root Directory: `frontend`** seç → Environment Variables ekle (aşağıdaki liste) → Deploy.
2. **Netlify:** Repoyu bağla → `netlify.toml` kullanılır (base: `frontend`) → Environment Variables ekle → Deploy.
3. **Env (Vercel/Netlify’da tanımlanacak):**
   - `VITE_CONTRACT_ID` = `GBEOHD44Y2ON4HEODWMAAIP2ZCCWG5E355OFYIMVNBUKPL6T3LII25H7`
   - `VITE_SOROBAN_RPC_URL` = `https://soroban-testnet.stellar.org`
   - `VITE_NETWORK_PASSPHRASE` = `Test SDF Network ; September 2015`
   - `VITE_HORIZON_URL` = `https://horizon-testnet.stellar.org`
   - (Opsiyonel: `VITE_USDC_CONTRACT_ID`, `VITE_ANALYTICS_ENDPOINT` vb. için `frontend/.env.example`’a bakın.)

### Öncelik 3 – Demo video (1 dk)
1. **İçerik:**  
   - Cüzdan bağlama → Grup oluşturma → Harcama ekleme → Settle → (isteğe) Demo Mode / Testnet vurgusu.
2. **Kayıt:**  
   - OBS / Loom / ekran kaydı; süre ~1 dk.
3. **Yükleme:**  
   - YouTube (unlisted) veya Loom; linki README’de belirt.

### Öncelik 4 – Commit sayısı
1. GitHub’da `git log` veya “Commits” sekmesinden anlamlı commit sayısını kontrol et.
2. 3’ten azsa: “Level 3: README and demo link”, “Level 3: Add test screenshot section”, “Level 3: Deploy config” gibi anlamlı commit’lerle sayıyı 3+ yap.

### Öncelik 5 – (İsteğe bağlı) Test sayısını görünür kılmak
- `npm run test:run` çıktısında tüm test dosyalarının (format, motion, contract) geçtiğini gösteren yeni bir screenshot alıp README’de kullanabilirsin (şu an 1 dosya 4 test gösteren 06-tests-passing.png var; 3 dosya 15 test de kabul edilir).

---

## 👤 Senin yapacakların (benim yapamayacaklarım)

1. **Live demo:** Repoyu Vercel veya Netlify’a bağla, yukarıdaki env’leri gir, deploy et. README’deki “Live Demo” satırına çıkan linki yaz.
2. **Demo video:** ~1 dk ekran kaydı (cüzdan → grup → harcama → settle). YouTube/Loom’a yükle; README’deki “Demo video (1 minute)” linkine ekle.
3. **Commit:** GitHub’da 3+ anlamlı commit olduğundan emin ol; gerekirse “Level 3: deploy config”, “Level 3: README and live demo link” gibi commit’ler at.

---

## 📌 Kısa Checklist (Submit öncesi)

- [x] README’de **Level 3** bölümü ve checklist
- [ ] **Live demo** linki (Vercel/Netlify) README’de *(sen ekleyeceksin)*
- [x] **Test output** screenshot (3+ test) README’de
- [ ] **Demo video** linki (1 dk) README’de *(sen ekleyeceksin)*
- [ ] Frontend **deploy** edilmiş ve çalışıyor *(sen deploy edeceksin)*
- [ ] **3+ anlamlı commit** (GitHub’da kontrol)
- [x] `npm run test:run` ile en az 3 test geçiyor (zaten var)
- [x] Deploy config (vercel.json, netlify.toml) repo’da

Bu yol haritasına göre sırayla deploy → linkleri README’ye yaz → video → commit kontrolü yapıldığında Level 3 teslim gereksinimleri karşılanmış olur.

# Birik — Screenshot Checklist

Bu doküman iki kısımdan oluşur:

- **Otomatik screenshot'lar:** Playwright script `frontend/e2e/screenshots.spec.ts` tarafından yakalanır
- **Manuel screenshot'lar:** Belirli bir on-chain/UI state gerektirdiği için elle alınmalı

---

## ⚙️ Otomatik screenshot'ları çalıştırma

```bash
cd frontend
# Dev server'ı ayrı terminalde çalıştır (veya Playwright otomatik başlatacak)
npx playwright test e2e/screenshots.spec.ts --project=chromium --reporter=list
```

Çıktı: `docs/screenshots/` klasörüne yeni `.png` dosyaları (veya mevcut olanların üzerine).

### Otomatik olarak yakalananlar (10 dosya)

| # | Dosya | Viewport | Tema |
|---|-------|----------|------|
| 1 | `landing-desktop-dark.png` | 1440×900 | dark |
| 2 | `landing-desktop-light.png` | 1440×900 | light |
| 3 | `landing-desktop-dark-fullpage.png` | 1440×full | dark |
| 4 | `landing-mobile-dark.png` | 390×844 | dark |
| 5 | `landing-mobile-light.png` | 390×844 | light |
| 6 | `landing-tablet-dark.png` | 768×1024 | dark |
| 7 | `dashboard-desktop-dark.png` | 1440×900 | dark |
| 8 | `dashboard-desktop-light.png` | 1440×900 | light |
| 9 | `dashboard-mobile-dark.png` | 390×844 | dark |
| 10 | `dashboard-mobile-light.png` | 390×844 | light |

---

## 📸 Manuel screenshot'lar — jüri için kritik state'ler

Aşağıdaki 5 screenshot jüri için en değerli olanlar — çünkü Birik'in core value proposition'ını gösteriyorlar. Lütfen sırayla elle yakalayın. İdeal boyut: **1440×900** veya mobile için **390×844**.

### 1. Settle Modal — Min-flow optimizasyonu
**Dosya adı:** `settle-modal-minflow.png`
**Hikâye:** "10 transfer yerine sadece 3 — on-chain greedy algoritma"

**Adımlar:**
1. Live demo: https://stellar-split.vercel.app (veya `localhost:5173`)
2. Demo mode'u aç (`D` tuşu veya landing'deki "Try Demo" butonu)
3. Yeni grup: *"Settle Demo"*, **6 üye** ekle
4. 5-6 harcama ekle, farkı kişiler ödesin — kimin kime ne kadar borçlu olduğu karmaşıklaşsın
5. **Settle** butonuna bas → modal açılır
6. Modal'da şu iki blok yan yana gözükmeli:
   - "Before: 10 transfers between 6 members"
   - "After: 3 transfers (min-flow)"
7. Screenshot al

### 2. Savings Pool — Funded progress bar
**Dosya adı:** `savings-pool-funded.png`
**Hikâye:** "Grup hedefli birikim havuzu — on-chain"

**Adımlar:**
1. Demo mode'da bir grup aç
2. Grup detayı içinde **Savings Pool** tab'ına git
3. "Create Savings Pool" → hedef: 100 USDC, isim: *"İstanbul Trip"*
4. 2-3 contribute yap (farklı kişilerden)
5. Progress bar %60-80 dolmuş olsun
6. Screenshot al

### 3. SPLT Reward Animation
**Dosya adı:** `splt-reward.png`
**Hikâye:** "Inter-contract mint — ilk settle'da 100 SPLT ödül"

**Adımlar:**
1. Demo mode'da bir settle flow'u tamamla
2. Settle başarılı olduktan sonra sağ üstte "+100 SPLT" toast/rozet çıkar
3. Bu toast aktifken screenshot al
4. Ayrıca dashboard'daki **SPLT Balance** widget'ı da gözüksün

### 4. Transaction History — Real settle tx
**Dosya adı:** `tx-history-settle.png`
**Hikâye:** "Tüm işlemler Stellar Expert'te doğrulanabilir"

**Adımlar:**
1. Testnet'te gerçek bir settle yap (demo mode'da DEĞİL)
2. Settings → Transaction History tab'ına git
3. Listede en az 3 gerçek tx gözüksün (create_group, add_expense, settle_group)
4. Her birinin yanında Stellar Expert linki olsun
5. Screenshot al

### 5. Mobile Bottom Sheet — Action menu
**Dosya adı:** `mobile-bottomsheet.png`
**Hikâye:** "Mobile-first responsive UI"

**Adımlar:**
1. Mobile viewport'ta (DevTools → 390×844 iPhone 14 Pro)
2. Dashboard'da alttaki **+ (FAB)** butonuna bas
3. Bottom sheet açılır: "New Group", "Join Group", "New Expense", "Settle"
4. Bu sheet açıkken screenshot al

---

## 📐 Boyut/format kuralları

- **PNG** format (JPEG yok — kalite kaybı)
- **Desktop:** 1440×900 (retina için 2x: 2880×1800 — istersen)
- **Mobile:** 390×844 (iPhone 14 Pro native)
- **Tablet:** 768×1024 (iPad portrait)
- Dosya boyutu 500KB'dan büyükse → [tinypng.com](https://tinypng.com) ile sıkıştır (lossless)

---

## 🎨 İsteğe bağlı bonus screenshot'lar

Eğer ekstra zaman varsa, README'yi daha da güçlendirecek screenshot'lar:

- `qr-join-flow.png` — QR kod ile gruba katılma akışı
- `language-switcher.png` — 4 dil arasında geçiş (TR/EN/DE/ES)
- `audit-log.png` — Grup audit trail sayfası
- `webhook-discord.png` — Discord'a gelen rich embed bildirim
- `onboarding-wizard.png` — İlk kullanıcı wizard'ı (4 step)
- `install-prompt.png` — PWA install prompt'u

---

## ✅ Checklist

### Otomatik
- [ ] `npx playwright test e2e/screenshots.spec.ts` çalıştırıldı
- [ ] 10 dosya `docs/screenshots/` altında var
- [ ] Dosya boyutları makul (her biri <500KB)

### Manuel
- [ ] `settle-modal-minflow.png` alındı
- [ ] `savings-pool-funded.png` alındı
- [ ] `splt-reward.png` alındı
- [ ] `tx-history-settle.png` alındı
- [ ] `mobile-bottomsheet.png` alındı

### Post-capture
- [ ] Screenshot'lar sıkıştırıldı (gerekiyorsa)
- [ ] README.md güncellendi (yeni screenshot referansları)
- [ ] Git'e commit'lendi

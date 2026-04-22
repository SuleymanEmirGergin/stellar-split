# Birik — Screenshot Checklist

Tüm README screenshot'ları **iki Playwright spec** tarafından otomatize edildi:

1. `frontend/e2e/screenshots.spec.ts` — viewport/tema matris'i (landing + dashboard, 3 viewport × 2 tema)
2. `frontend/e2e/screenshots-states.spec.ts` — state-dependent (settle modal, savings roadmap, SPLT reward toast, insights+activity feed, mobile bottom sheet)

---

## ⚙️ Her iki spec'i birden çalıştır

```bash
cd frontend
npx playwright test e2e/screenshots.spec.ts e2e/screenshots-states.spec.ts --project=chromium --reporter=list
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

## 📸 State-dependent screenshot'lar (hepsi otomatize — `screenshots-states.spec.ts`)

| # | Dosya | Spec test adı | Notlar |
|---|-------|---------------|--------|
| A | `settle-modal-minflow.png` | `A — settle-modal-minflow` | Settle tab — min-flow'la kısalmış settlement satırları + "Show payment QR" aksiyonları + fee estimate |
| B | `savings-roadmap.png` | `B — savings-roadmap` | Demo mode'da `hasJwt===false` olduğundan savings "coming soon" teaser gösterilir. Kontrat entrypoint'leri (`create_savings_pool`, `contribute_pool`, `release_pool`) hazır, UI Q2'de live olacak |
| C | `splt-reward.png` | `C — splt-reward` | "Mark Group As Settled" CTA + 2 success toast ("Reputation points earned!" + "Settlement completed successfully") |
| D | `activity-feed.png` | `D — activity-feed` | Insights tab fullPage — 4 stat kartı + pie/bar chart + who-owes-what + member contributions + carbon footprint + Recent Activity feed (Horizon mock) |
| E | `mobile-bottomsheet.png` | `E — mobile-bottomsheet` | 390×844 iPhone 14 Pro viewport, MORE TABS sheet 8 kategori ile açık |

**İpucu — tek testi çalıştırmak:**
```bash
cd frontend
npx playwright test e2e/screenshots-states.spec.ts --project=chromium --grep "settle-modal-minflow"
```

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

### Spec 1 — viewport + tema matrisi
- [x] `screenshots.spec.ts` çalıştırıldı (10 dosya)

### Spec 2 — state-dependent (A-E)
- [x] `A settle-modal-minflow.png`
- [x] `B savings-roadmap.png`
- [x] `C splt-reward.png`
- [x] `D activity-feed.png`
- [x] `E mobile-bottomsheet.png`

### Post-capture
- [ ] Screenshot'lar sıkıştırıldı (gerekiyorsa — opsiyonel, TinyPNG)
- [x] README.md güncellendi (yeni screenshot referansları)
- [ ] Git'e commit'lendi

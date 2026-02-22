# StellarSplit — 17 Maddelik Geliştirme Planı

Sırayla uygulanacak özellik ve iyileştirmeler. Her madde tamamlandıkça işaretlenir.

---

## Faz 1 — Ürün / Kullanıcı Deneyimi

| # | Madde | Açıklama | Durum |
|---|--------|----------|--------|
| 1 | **Join flow** | `/join/:groupId` sayfası; davet linki ile gelen kullanıcıya “Cüzdanı bağla → Gruba git” deneyimi, isteğe bağlı grup adı önizleme | ✅ |
| 2 | **Harcama düzenleme / silme** | Kontrat: son harcamayı iptal veya düzenleme (sadece ekleyen, settle öncesi). UI: Düzenle/Sil butonları | ✅ |
| 3 | **Grup üyesi ekleme / çıkarma** | Settle edilmemiş gruplarda üye ekleme/çıkarma (kontrat + UI) | ✅ |
| 4 | **Export / rapor** | Harcamaları CSV/PDF indir, dönem özeti (mevcut export modülü varsa bağla) | ✅ |
| 5 | **Bildirim tercihleri** | “Sadece benim ödediğim”, “Settlement hazır olunca” gibi seçenekler; webhook filtre | ✅ |

---

## Faz 2 — Teknik / Güvenilirlik

| # | Madde | Açıklama | Durum |
|---|--------|----------|--------|
| 6 | **Hata mesajları + retry** | Kontrat/ağ hatalarını Türkçe (ve İngilizce) kullanıcı mesajına çevir; kritik işlemlerde “Tekrar dene” | ✅ |
| 7 | **Offline / queue** | Ağ yokken veya RPC cevap vermezken “Çevrimdışı” veya “İşlem kuyruğa alındı” mesajı | ✅ |
| 8 | **E2E testler** | Playwright/Cypress ile “grup oluştur → harcama ekle → settle” akışı | ✅ |
| 9 | **PWA** | Manifest + service worker; “Uygulamayı yükle”, temel offline | ✅ |

---

## Faz 3 — Kontrat / Zincir

| # | Madde | Açıklama | Durum |
|---|--------|----------|--------|
| 10 | **USDC seçeneği** | UI’da “Bu grubu USDC ile aç” ve doğru token contract ile create/settle | ✅ |
| 11 | **Harcama kategorisi** | Kontrat: Expense’a category; UI: filtre ve rapor (yemek, ulaşım vb.) | ✅ |
| 12 | **Event dinleme** | group_created, expense_added, group_settled event’lerini dinleyip UI anlık güncelleme | ✅ |
| 13 | **Grup arşivleme** | Settle edilmiş grupları “Arşiv”le; dashboard’da Aktif / Arşiv filtresi | ✅ |

---

## Faz 4 — Büyüme / Entegrasyon

| # | Madde | Açıklama | Durum |
|---|--------|----------|--------|
| 14 | **XLM ≈ USD** | CoinGecko ile listelerde “X XLM ≈ $Y” gösterimi | ✅ |
| 15 | **Open Graph** | Grup veya settle sayfası için og:image + açıklama; link paylaşımında zengin önizleme | ✅ |
| 16 | **Basit analitik** | Anonim event’ler (grup oluşturma, harcama sayısı) — isteğe bağlı backend/3. parti | ✅ |
| 17 | **Çoklu dil** | i18n genişlet; TR/EN dışı dil seçeneği, tüm metinler çeviri dosyasından | ✅ |

---

## İlerleme

- **Tamamlanan:** 17/17 madde (Join flow, harcama iptal, üye ekleme/çıkarma, export, bildirim tercihleri, hata mesajları + retry, offline banner, E2E, PWA, USDC, kategoriler, event dinleme, arşiv filtresi, XLM≈USD, Open Graph, analitik, TR/EN/DE).
- **Sıra:** Her faz içinde yukarıdan aşağıya; Faz 1 → 2 → 3 → 4.

---

## Sonraki adımlar (uygulandı)

- **Test:** `npm run e2e` (Playwright) ile akışı çalıştırma; kontrat unit testleri.
- **Mainnet:** Kontratı mainnet’e deploy, `VITE_*` env’leri mainnet RPC/Horizon/Contract ID ile güncelleme.
- **Analitik backend:** İsteğe bağlı `VITE_ANALYTICS_ENDPOINT` ile event’leri toplayan basit API.
- **OG görsel:** Grup/settle sayfası için dinamik `og:image` (server-side render veya OG-as-a-service).

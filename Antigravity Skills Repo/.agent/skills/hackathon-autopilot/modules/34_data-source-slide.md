# Data Source Slide — Module 34

## Purpose

Every hackathon project that uses AI or external data faces one inevitable jury question:

> **"Bu veriler nereden geliyor?"**
> *"Where does your data come from?"*

In both validated simulations (Emlak Konut + Smile Hair Clinic), Technical Credibility scored 7/10 — the lowest non-zero dimension — and data sourcing was the primary cause. This module closes that gap permanently.

**Output:** A ready-to-present "Data & Model Card" — one structured answer to every data-related jury question, delivered in ≤ 60 seconds.

**When to run:** After architecture is locked (`07_architecture-mvp.md`) and before pitch finalization (`08_pitch-script.md`).

**Rule:** No project proceeds to pitch prep without a completed Data Source Card. Technical Credibility ≥ 8/10 requires this module.

---

## The Four Data Questions Every Jury Asks

Regardless of domain, event type, or jury composition, these four questions appear in every technically serious hackathon:

```
Q1: "Bu veri nereden geliyor?" (Where does this data come from?)
    → Source legitimacy + accessibility

Q2: "Bu AI ne kadar güvenilir?" (How reliable is your AI?)
    → Model behavior + failure modes

Q3: "Verilerimi nerede saklıyorsunuz?" (Where is our data stored?)
    → Privacy / KVKK / GDPR compliance

Q4: "Gerçek hayatta bu veriyi nasıl alırsınız?" (At scale, how do you get this data?)
    → Deployment realism
```

This module generates a pre-built answer to all four — in the form of a slide block, a verbal script, and a Q&A cheat sheet.

---

## Step 1: Data Inventory

Catalog every data source the project uses. Be exhaustive — include sources used in demo mode too.

```
DATA INVENTORY
═══════════════════════════════════════════════════════════════
Project: [Name]

SOURCE 1
  Name:         [e.g., TKGM Parsel Sorgulama API]
  Type:         □ Open API  □ Scraped  □ Licensed  □ Synthetic  □ Team-collected
  Access:       □ Live (during demo)  □ Cached  □ Pre-downloaded  □ Simulated
  Demo mode:    □ Uses live data  □ Uses seed/mock data
  Reliability:  □ Stable (SLA exists)  □ Best-effort  □ Unknown
  KVKK/GDPR:   □ No personal data  □ Anonymized  □ Consent obtained  □ TBD
  URL/ref:      [link or documentation reference]
  Fallback:     [What happens if this source is unavailable?]

SOURCE 2
  Name:         [e.g., fal.ai Flux API]
  Type:         □ Open API  □ Licensed  □ Third-party AI
  Access:       □ Live  □ Cached results  □ Pre-computed
  Demo mode:    □ Live inference  □ Pre-computed seed images
  Processing:   □ On-device  □ Server-side  □ Third-party cloud
  KVKK/GDPR:   □ No personal data sent  □ Data stays on device  □ TBD
  URL/ref:      [fal.ai/models/...]
  Fallback:     [If API fails → seed images]

SOURCE 3 (if applicable)
  Name:         [e.g., Seed/Synthetic Dataset]
  Type:         □ Team-created  □ Public dataset  □ Scrubbed real data
  Size:         [N records / N images / N documents]
  Purpose:      □ Demo only  □ Training  □ Evaluation  □ Fallback
  KVKK/GDPR:   □ Synthetic, no real data  □ Anonymized  □ Public domain
  Validation:   [How was quality verified?]

[Repeat for all sources]
═══════════════════════════════════════════════════════════════
```

---

## Step 2: Model Card

For every AI component, produce a one-paragraph model card. This is what you read aloud when the Technical Judge asks "which model, how does it work?"

```
MODEL CARD
═══════════════════════════════════════════════════════════════
Model / Component: [Name]

What it does:
  [1 sentence: exact function of this model in the project]

Why this model:
  [1 sentence: why this specific model vs. alternatives]
  [e.g., "GPT-4o for structured JSON output reliability vs. speed tradeoff"]
  [e.g., "Flux for hair inpainting — only model with domain-specific tuning"]

Input:
  [What data goes in — type, format, source]

Output:
  [What data comes out — type, format, confidence signal]

Known limitations:
  [1-2 honest limitations — shows domain awareness, not weakness]
  [e.g., "Accuracy drops below 70% for very sparse hair (< grade 2)"]
  [e.g., "Requires structured JSON — fails gracefully on malformed input"]

Fallback if model fails:
  [Deterministic rule / cached response / demo mode]

Privacy:
  [Does input data leave the device/server? To where?]
  [e.g., "Image processed on-device via Core ML — never sent to cloud"]
  [e.g., "Building data sent to OpenAI API — no personal identifiers included"]

Evaluation:
  [How was model output validated? N test cases, accuracy %, human review?]
  [e.g., "30 test buildings, 87% match to certified energy auditor output"]
  [e.g., "3 hair experts rated simulations: 4.1/5 realism average"]
═══════════════════════════════════════════════════════════════
```

---

## Step 3: Privacy & Compliance Statement

One paragraph, said out loud or shown on screen. Required for any project handling user-generated content.

```
PRIVACY STATEMENT (choose matching template)
════════════════════════════════════════════════════════════════

TEMPLATE A — On-Device Processing (strongest credibility)
──────────────────────────────────────────────────────────
"[User input type — e.g., fotoğraflar / bina verileri] cihazınızda işleniyor.
 Sunucumuza veya üçüncü taraf sistemlere herhangi bir kişisel veri gönderilmiyor.
 KVKK ve GDPR uyumlu tasarım — by design, not afterthought."

TEMPLATE B — Server-Side, Anonymized
──────────────────────────────────────
"[Input type] sunucumuza gönderiliyor ancak hiçbir kişisel tanımlayıcı içermiyor.
 [Veri türü] anonim işleniyor. 30 gün sonra otomatik silme.
 KVKK Madde 6 uyumlu — hassas veri kategorisine girmiyor."

TEMPLATE C — Third-Party AI, Contractual
──────────────────────────────────────────
"[Third-party provider, e.g., OpenAI] API'sine gönderilen veriler kişisel tanımlayıcı
 içermiyor. [Provider]'ın veri işleme sözleşmesi (DPA) kapsamında.
 Üretim aşamasında kurumsal endpoint veya on-premise deployment önerilir."

TEMPLATE D — Synthetic/Demo Data Only
──────────────────────────────────────
"Demo'da kullanılan tüm veriler sentetik veya anonimleştirilmiş.
 Gerçek hasta / kullanıcı verisi bu demo'da işlenmemektedir.
 Üretim entegrasyonu için KVKK uyum protokolü hazır."
════════════════════════════════════════════════════════════════

Select one template. Fill the brackets. This becomes a slide element AND a verbal line.
```

---

## Step 4: Data Source Slide Block

Produce the exact slide content. This is Slide 5 (or Slide 6) in the standard deck (`19_slide-deck-generator.md`).

```
DATA & MODEL CARD SLIDE
════════════════════════════════════════════════════════════════

SLIDE TITLE: "Nasıl Çalışıyor?" OR "Veriler & Güvenilirlik"

LEFT COLUMN — VERİ KAYNAKLARI
  [Data Source Icon] [Source Name]
    → [1-line description of what it provides]
    → [Access type: Open API / Licensed / Synthetic]
  [repeat for each source, max 3-4]

CENTER COLUMN — AI MODELİ
  [Model name + provider logo]
  [Input → Output in one line]
  [Accuracy/validation metric]
  [Fallback mechanism — 1 line]

RIGHT COLUMN — GİZLİLİK
  [Privacy template selected above — 2-3 lines]
  [KVKK/GDPR compliance badge or checkmark]

BOTTOM BAR — KEY METRIC
  "X test senaryosu / Y% doğruluk / Z uzman değerlendirmesi"
  OR
  "Demo: %100 seed data — internet bağlantısı gerektirmez"

DESIGN NOTES:
  → Use logos or brand colors for each data source (adds instant legitimacy)
  → "Deterministic core" phrase should appear if applicable
  → Slide should be readable in 10 seconds — no paragraphs
════════════════════════════════════════════════════════════════
```

---

## Step 5: Verbal Defense Script (Q&A Ready)

The exact words to say when a Technical Judge or Domain Expert asks about data.

```
VERBAL DATA DEFENSE
════════════════════════════════════════════════════════════════

SORU: "Bu veriler nereden geliyor?"
CEVAP (30 saniye):
"[Source 1]'den [what it provides]. Bu [açık API / lisanslı veri / sentetik set].
 [Source 2] ile [what it contributes]. Demo'da [seed/live] veri kullanıyoruz.
 Canlı veri için [how to access at scale — e.g., 'TKGM API anahtarı yeterli']."

SORU: "AI ne kadar doğru?"
CEVAP (20 saniye):
"[N] test senaryosunda [X]% doğruluk. [Domain expert / certified standard]
 ile karşılaştırma yaptık. Güven skoru [threshold]'nin altına düştüğünde
 sistem [deterministic fallback] devreye giriyor."

SORU: "Kişisel veri nasıl korunuyor?"
CEVAP (15 saniye):
"[Privacy template A/B/C/D'den seçilen] — [1 sentence from template]."

SORU: "Gerçek hayatta bu veriyi nasıl temin edersiniz?"
CEVAP (30 saniye):
"Üretim ortamında [specific API / data partnership / manual upload] üzerinden.
 [Company / organization]'dan [data type] almak için [specific process].
 [Concrete timeline: e.g., 'TKGM API başvurusu 1 hafta, onay 2 hafta.']"

SORU: "Bu model halüsinasyon yapabilir mi?"
CEVAP (20 saniye):
"Evet — bu yüzden [deterministic core / validation layer / human-in-loop] var.
 LLM çıktısı doğrudan kullanıcıya gitmiyor — önce [rule-based check] ile doğrulanıyor.
 [Confidence < threshold] olduğunda sistem 'insufficient data' döndürüyor."
════════════════════════════════════════════════════════════════
```

---

## Step 6: Technical Credibility Score Estimator

After completing this module, estimate the expected Technical Credibility gain:

```
TECHNICAL CREDIBILITY ESTIMATOR
════════════════════════════════════════════════════════════════
                                         Before    After Module 34
                                         ──────    ──────────────
Data sources documented:                 No        Yes           → +0.5
Specific accuracy metric stated:         No        Yes           → +0.5
Privacy/KVKK stance clear:               No        Yes           → +0.5
Fallback mechanism named:                Partial   Explicit      → +0.3
Verbal defense ≤ 30s per Q:             No        Yes           → +0.2
────────────────────────────────────────────────────────────────
Expected Technical Credibility delta:    +2.0 points (on 0-10 scale)
From simulation baseline (7.0) →        ~9.0      = top percentile
════════════════════════════════════════════════════════════════
```

---

## Domain-Specific Data Source Library

Common, pre-validated data sources by domain. Use as starting point:

### PropTech / Gayrimenkul
| Source | What it provides | Access | KVKK |
|--------|-----------------|--------|------|
| TKGM Parsel Sorgulama | Tapu, arazi bilgisi, yapı yaşı | Open API (kayıt gerekli) | Kişisel değil |
| Belediye İmar Verileri | Ruhsat, kat, kullanım tipi | Belediyeye göre değişir | Kişisel değil |
| EPDK Enerji Tarifeleri | Güncel elektrik/gaz fiyatları | Açık veri, PDF/API | Kişisel değil |
| TSE/ISO Standartları | Enerji hesap metodolojisi | Lisanslı (muaf kullanım) | Kişisel değil |
| Endeks Konut Fiyatları | İlçe bazlı m² değerleri | Açık (scraping) | Kişisel değil |

### HealthTech / Sağlık
| Source | What it provides | Access | KVKK |
|--------|-----------------|--------|------|
| fal.ai / Replicate | AI image generation API | API key (ücretli) | On-device tercih et |
| OpenAI GPT-4o Vision | Görüntü analizi + metin | API key | Client-side mümkün |
| WHO / Sağlık Bakanlığı | Sağlık istatistikleri | Açık veri | Kişisel değil |
| Hasta sentetik dataset | Demo verileri | Team-created | Sentetik = KVKK muaf |
| PubMed API | Araştırma makaleleri | Açık API | Kişisel değil |

### Fintech / Finans
| Source | What it provides | Access | KVKK |
|--------|-----------------|--------|------|
| Türkiye Cumhuriyet MB | Döviz, faiz verileri | Açık API | Kişisel değil |
| SPK Verileri | Hisse, fon bilgisi | Açık scraping | Kişisel değil |
| BKM / BDDK | Ödeme istatistikleri | Açık rapor | Kişisel değil |

### AgriTech / Tarım
| Source | What it provides | Access | KVKK |
|--------|-----------------|--------|------|
| Copernicus (ESA) | Uydu görüntüleri | Open API | Kişisel değil |
| MGM (Meteoroloji) | Hava durumu, tahmin | Açık API | Kişisel değil |
| TÜİK Tarım | Ürün istatistikleri | Açık veri | Kişisel değil |
| Sentinel Hub | Bitki NDVI indeksi | Freemium API | Kişisel değil |

---

## Integration

- **Runs after:** `07_architecture-mvp.md` (stack + AI spec confirmed)
- **Runs before:** `08_pitch-script.md` and `19_slide-deck-generator.md`
- **Triggered by:** `/data-card` slash command OR automatically when Technical Credibility < 8.0 in `21_scoring-simulator.md`
- **Outputs feed:**
  - `19_slide-deck-generator.md` → Slide 5/6 content (Data & Model Card)
  - `27_negotiation-qa-simulator.md` → Pre-loaded Q&A answers
  - `08_pitch-script.md` → 1-line data credibility hook
  - `21_scoring-simulator.md` → Technical Credibility re-score (+2.0 expected)

### Slash Command
```
/data-card  → Run Module 34 for current project
              Required: Project name + AI components from /architecture (07)
              Returns: Data Inventory + Model Card + Privacy Statement +
                       Slide Block + Verbal Defense Script
```

### Simulation Evidence
```
Both validated simulations scored Technical Credibility at 7.0/10.
Primary cause: no explicit data sourcing answer prepared.
Expected score after Module 34: 8.5–9.0/10.
This module is now MANDATORY in the pipeline between Steps 10 and 11.
```

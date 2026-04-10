# Business Model Primer — Module 35

## Purpose

In both validated simulations, Business Model (Dimension 6 in `21_scoring-simulator.md`) scored the lowest non-critical score:

- **EnergiScore (Emlak Konut):** 7/10 — "fiyatlandırma belirsiz"
- **HairVision (Smile Hair):** 5–6/10 — "nasıl para kazanacaksınız?"

This module closes that gap in **30 minutes**. It does not require you to build a real business. It requires you to have a *credible* answer to a predictable question.

**Rule:** Every project that mentions a "deployment path" must complete this module. No exceptions.
**When to run:** After `33_idea-validator.md` (validated persona) and before `08_pitch-script.md`.
**Time limit:** 30 minutes. If it takes longer, you're overthinking it.

---

## The Only Three Business Model Questions That Matter in a Hackathon

Judges don't expect a full financial model. They're checking whether you've thought past the demo. Three questions cover 95% of all jury scrutiny:

```
Q1: "Bu kim için ve ne kadar?"
    → Customer segment + pricing signal

Q2: "Nasıl ilk müşteriyi bulursunuz?"
    → Go-to-market first move (not full strategy)

Q3: "Bu sürdürülebilir mi?"
    → Why won't this disappear in 6 months
```

This module generates a ready answer to all three — plus a one-slide block and a verbal script.

---

## Step 1: Customer Segment Definition

Pick ONE specific segment. Resist the urge to say "everyone who has [problem]."

```
CUSTOMER SEGMENT
════════════════════════════════════════════════════════════════
Primary segment (beachhead):
  Who:       [Specific job title / type of organization / user archetype]
             NOT: "companies" or "people who need X"
             YES:  "Türkiye'deki 50+ birimli gayrimenkul portföy yöneticileri"
             YES:  "Yılda 500+ hasta kabul eden saç ekimi klinikleri"

  Size:      [Rough number of potential customers in Turkey first]
             [e.g., "Türkiye'de ~800 aktif gayrimenkul portföy yönetim şirketi"]
             [e.g., "Türkiye + MENA'da ~2.000 lisanslı saç ekimi kliniği"]

  Pain:      [The specific pain from Module 33 validation — use their exact words]
             [e.g., "Excel'de 3 ayda yapılan enerji analizi → biz 30 saniyede"]
             [e.g., "WhatsApp'ta 3 günde gelen simülasyon → biz 10 saniyede"]

  Budget:    [Do they currently pay for this? How much? To whom?]
             [e.g., "Danışmanlık firmasına yılda ₺85.000 ödüyorlar"]
             [e.g., "Klinik başına aylık 0₺ — bu bizim açtığımız yeni kategori"]

  Decision maker: [Who signs the contract — not who uses it]
             [e.g., "Portföy direktörü — ortalama 2 haftalık karar süreci"]
             [e.g., "Klinik sahibi veya operasyon direktörü"]
════════════════════════════════════════════════════════════════
```

---

## Step 2: Revenue Model Selection

Choose ONE primary model. Hackathon jürileri basit modeli tercih eder — çok katmanlı fiyatlandırma şüphe yaratır.

```
REVENUE MODEL OPTIONS
════════════════════════════════════════════════════════════════

□ SaaS (Subscription)
  When to use: B2B, consistent usage, predictable value
  Pricing signal: "Müşteri başına [₺X/ay veya ₺Y/yıl]"
  Example: "Klinik başına ₺3.000/ay — 50 klinik = ₺150.000 ARR"
  Jury appeal: HIGH — predictable, scalable, understandable

□ Usage-Based (Pay per use)
  When to use: Irregular usage, easy to start, low commitment
  Pricing signal: "[Birim başına ₺X]"
  Example: "Simülasyon başına ₺25 — hasta başına maliyet"
  Jury appeal: MEDIUM — clear unit economics, harder to model scale

□ Platform / Marketplace Commission
  When to use: Two-sided market, network effects
  Pricing signal: "İşlem değerinin %X'i"
  Jury appeal: MEDIUM — complex to explain in 30 seconds

□ Freemium → Premium
  When to use: Consumer product, viral growth potential
  Pricing signal: "Ücretsiz temel → ₺X/ay premium özellikler"
  Jury appeal: MEDIUM — growth potential clear, revenue timeline unclear

□ Pilot → Enterprise License
  When to use: Corporate / institutional buyer, long sales cycle
  Pricing signal: "Ücretsiz 3 aylık pilot → kurumsal lisans müzakeresi"
  Jury appeal: HIGH for Corporate hackathons — realistic sales motion

□ One-time + Maintenance
  When to use: Tool / SDK / integration product
  Pricing signal: "₺X kurulum + ₺Y/yıl bakım"
  Jury appeal: LOW — outdated model; use SaaS instead

SELECTED MODEL: [Choose one + fill pricing signal]
PRIMARY REASON: [Why this model fits this customer segment]
════════════════════════════════════════════════════════════════
```

---

## Step 3: Pricing Signal (The Number Judges Remember)

You need exactly ONE number. Not a range. Not "it depends." One anchor number.

```
PRICING SIGNAL DERIVATION
════════════════════════════════════════════════════════════════

METHOD A — Cost Displacement (strongest anchor)
  "They currently pay [₺X] to [competitor / consultant / manual process].
   We charge [₺Y], which is [Z%] less / [N times] faster."

  Example:
  "Enerji danışmanlığı ₺85.000 ve 6 hafta. Biz ₺3.000/ay.
   12 ayda ₺36.000 — ilk yıl bile %58 tasarruf."

METHOD B — Value Fraction (revenue-linked)
  "Our product generates/saves [₺X value] per unit.
   We charge [Y% of that value]."

  Example:
  "Simülatör müşteri dönüşüm oranını %20 artırıyor.
   Klinik başına yıllık +₺120.000 ek gelir.
   Biz ₺3.000/ay → klinik 40 kat ROI görüyor."

METHOD C — Comparable Pricing (familiar anchor)
  "Similar tools in adjacent markets charge [₺X/month].
   We're in the same range but [specific differentiation]."

  Example:
  "Salesforce Health Cloud aylık $300. Biz sağlık kliniğine özel,
   Türkçe, ve saç ekimine optimize — aylık ₺2.500."

METHOD D — Pilot Economics (for institutional buyers)
  "3 aylık ücretsiz pilot → sonuçlara göre yıllık lisans müzakeresi.
   Benzer kurumsal müşterilerde ₺[X] ile ₺[Y] arasında anlaşma bekliyoruz."

SELECTED: Method [A/B/C/D]
THE NUMBER: [₺X / $X — one anchor, said in one breath]
THE SENTENCE: "[Full pricing sentence from template above]"
════════════════════════════════════════════════════════════════
```

---

## Step 4: First Customer Story

The most credible business model signal is a specific, named first-customer hypothesis — not "we'll find customers."

```
FIRST CUSTOMER STORY
════════════════════════════════════════════════════════════════
"İlk müşterimiz [specific type of organization / named if known].
 [Why they specifically: why this segment, why now, why us].
 [How we reach them: specific channel — not 'social media' or 'marketing'].
 [What pilot looks like: timeframe + what constitutes success]."

TEMPLATE:
"İlk müşterimiz [organizasyon tipi] — çünkü [specific reason: onlar bu sorunu
 şu an yaşıyor ve [specific signal]]. [Channel]'dan ulaşacağız.
 [Timeframe] pilot: [success metric] görürsek, tam ödeme anlaşmasına geçiyoruz."

EXAMPLE A (EnergiScore):
"İlk müşterimiz Emlak Konut — bu etkinliğin organizatörü ve pilot fırsatı
 açık. 500 birimlik pilot: 3 aylık veri, raporlar mevcut analizle karşılaştırılıyor.
 Baseline tutan bütçe kalemini %60 düşürebilirsek, tam portföy lisansına geçiyoruz."

EXAMPLE B (HairVision):
"İlk müşterimiz Smile Hair Clinic — bu etkinliğin sponsoru ve demo'yu canlı gördüler.
 47 ülkedeki klinikten 5'iyle 3 aylık pilot. Başarı metriği: hasta karar süresi
 ortalama 4 günden 1 güne düşüyor mu? Düşüyorsa, global rollout konuşuyoruz."

KEY INSIGHT: "Bu etkinliğin sponsoru ilk müşterinizdir" — her zaman söyleyin.
             Jury = potential first customer. Bu güçlü sinyali kullanın.
════════════════════════════════════════════════════════════════
```

---

## Step 5: Sustainability Signal

One sentence answering "why won't this disappear in 6 months?"

```
SUSTAINABILITY SIGNAL TEMPLATES
════════════════════════════════════════════════════════════════

□ REGULATORY MOAT
  "[Regulation/deadline] zorunlu kılıyor. Bu pazar 2030'a kadar büyüyecek."
  Example: "AB enerji direktifi 2027 zorunlu — bu pazar büyüyecek, biz hazırız."

□ NETWORK EFFECT
  "Her yeni [kullanıcı/hasta/bina] sistemi daha zeki yapıyor.
   [N] kullanıcıdan sonra model rakipten daha iyi çalışıyor."

□ DATA LOCK-IN
  "Müşteri [X ay] kullandıktan sonra [X] adet tarihsel veri oluşturuyor.
   Bu veri başka sisteme taşınamaz — churn maliyeti yüksek."

□ DOMAIN SPECIFICITY
  "Genel AI araçları bu domain'de çalışmıyor çünkü [specific reason].
   Bizim [domain-specific training/rules/data] rakipler 18 ayda üretemez."

□ SWITCHING COST
  "Klinik/şirket sistemi entegre ettikten sonra değiştirme maliyeti [₺X / N ay iş].
   Mevcut müşteri churn oranı benzer SaaS'larda <%5."

SELECTED: [Template letter]
THE SENTENCE: "[Fill in from template]"
════════════════════════════════════════════════════════════════
```

---

## Step 6: Business Model Slide Block

The exact content for the business model slide (`19_slide-deck-generator.md` Slide 6/7).

```
BUSINESS MODEL SLIDE
════════════════════════════════════════════════════════════════

SLIDE TITLE: "İş Modeli" OR "Nasıl Büyürüz?"

ROW 1 — MÜŞTERİ
  [Customer segment icon] [Segment name — 5 words max]
  "[Segment size number] potansiyel müşteri — Türkiye ilk pazar"

ROW 2 — GELİR MODELİ
  [Revenue model name]
  "[THE NUMBER — pricing sentence]"

ROW 3 — İLK ADIM
  "[First customer story — 1 sentence]"

ROW 4 — SÜRDÜRÜLEBİLİRLİK
  "[Sustainability signal — 1 sentence]"

BOTTOM BAR — ROADMAP (optional, 3 bullets)
  → Ay 1-3: Pilot ([N] müşteri, ücretsiz)
  → Ay 4-6: İlk ödeme anlaşması
  → Yıl 2: [Expansion move — new geography / new segment]

DESIGN NOTES:
  → Use simple icons (money bag, building, calendar, lock)
  → THE NUMBER must be the largest text on the slide
  → No table, no complex matrix — 4 rows max
  → If jury is a corporate sponsor: "İlk müşteri burada" = largest font
════════════════════════════════════════════════════════════════
```

---

## Step 7: Verbal Business Model Script (60 seconds)

```
BUSINESS MODEL VERBAL SCRIPT
════════════════════════════════════════════════════════════════
[0:00–0:15] CUSTOMER + PROBLEM
"[Segment name], [segment size]. Şu an [current pain — cost / time / manual].
 Biz bunu [your value prop]."

[0:15–0:30] REVENUE MODEL
"[Revenue model name]: [Customer type] başına ₺[THE NUMBER]/[period].
 [Cost displacement OR value fraction sentence]."

[0:30–0:45] FIRST MOVE
"İlk müşterimiz [first customer hypothesis — ideally the event sponsor].
 [Pilot structure in 1 sentence]."

[0:45–0:60] SUSTAINABILITY
"[Sustainability signal sentence]."

TOTAL: 60 seconds. Practice until you can do it in 50.
════════════════════════════════════════════════════════════════
```

---

## Step 8: D6 Score Estimator

After completing this module, estimate the expected Business Model score gain in `21_scoring-simulator.md`:

```
D6 BUSINESS MODEL SCORE ESTIMATOR
════════════════════════════════════════════════════════════════
                              Before Mod 35    After Mod 35
                              ─────────────    ────────────
Customer clearly defined:     No               Yes          → +1.0
Specific pricing number:      No               Yes          → +1.5
First customer named:         No               Yes          → +1.0
Sustainability signal:        Missing          1 sentence   → +0.5
Verbal script ≤ 60s:          No               Yes          → +0.5
────────────────────────────────────────────────────────────────
Expected D6 delta:            +4.5 points (from 5.5 → ~8.5–9.0)

From simulation baselines:
  EnergiScore:   7/10 → ~8.5/10 after this module
  HairVision:    5.5/10 → ~8.5/10 after this module
════════════════════════════════════════════════════════════════
```

---

## Anti-Patterns (What Kills Business Model Credibility)

```
❌ "Kullanıcı sayısı arttıkça gelir artar"
   → Bu bir strateji değil, truizm. Sayı ver.

❌ "Freemium model kullanacağız"
   → Nasıl freemium? Nerede duvar? Hangi özellik premium?
   → Freemium'u seç ama sınırı tanımla.

❌ "Reklam geliri" (consumer apps için)
   → Hackathon jürisi bu cevabı hiçbir zaman iyi bulmaz.
   → Başka bir model bul veya "reklam + premium" kombinasyonu aç.

❌ "Farklı segmentler için farklı fiyatlar"
   → İki farklı fiyat = belirsizlik sinyali. Tek anchor ver.
   → Segment farklılığını sonraya bırak; şimdi tek sayı.

❌ "Piyasayı araştırdık, X milyar dolar"
   → TAM/SAM/SOM tablosu hackathon'da kötü izlenim bırakır.
   → "Türkiye'de N potansiyel müşteri" her zaman daha güçlü.

❌ "Önce prototip, sonra iş modeli düşünürüz"
   → Bunu söylemeyin. Sessizce bu modülü tamamlayın.

✅ ALTIN KURAL: Jüri "Bu nasıl para kazanır?" diye sormadan siz söyleyin.
   Proaktif cevap = olgunluk sinyali.
```

---

## Event-Type Calibration

Different event types require different Business Model emphasis levels:

```
EVENT TYPE         D6 IMPORTANCE    EMPHASIS
──────────────────────────────────────────────────────────────
VC / Accelerator   CRITICAL         Full model: TAM, unit economics,
                                    payback period, path to profitability

Corporate/Talent   HIGH             Pilot → enterprise narrative.
                                    "İlk müşteri burada" = max leverage.
                                    ROI for the organizing company.

Social Impact      MEDIUM           Sustainability > monetization.
                                    Grant / NGO / government funding paths.
                                    Impact metric > revenue metric.

Student/Academic   LOW              1 sentence enough. Show awareness.
                                    "Gelecekte SaaS model düşünüyoruz."
                                    Don't over-invest here.
──────────────────────────────────────────────────────────────
Source: 32_hackathon-type-detector.md event type → D6 weight calibration
```

---

## Integration

- **Runs after:** `33_idea-validator.md` (validated persona → first customer basis)
- **Runs before:** `08_pitch-script.md` (pitch needs THE NUMBER baked in)
- **Triggered by:** `/biz-model` slash command OR when D6 < 7.0 in `21_scoring-simulator.md`
- **Outputs feed:**
  - `08_pitch-script.md` → Business model segment (last 15s of 60s pitch)
  - `19_slide-deck-generator.md` → Slide 6/7 content
  - `27_negotiation-qa-simulator.md` → Q&A: "Nasıl para kazanacaksınız?"
  - `04_vc-mode.md` → If VC hackathon, this module feeds into deeper market sizing
  - `21_scoring-simulator.md` → D6 re-score (expected +4.5 points from baseline 5.5)

### Slash Command
```
/biz-model  → Run Module 35 for current project
              Required: Validated persona from /validate (33) +
                        Event type from /event-type (32)
              Returns: Customer Segment + Revenue Model + Pricing Signal +
                       First Customer Story + Sustainability Signal +
                       Slide Block + 60s Verbal Script
```

### Simulation Evidence
```
EnergiScore (Emlak Konut):  D6 = 7/10  → after module: est. 8.5/10
HairVision (Smile Hair):    D6 = 5.5/10 → after module: est. 8.5/10

Combined D6 improvement:    +3.5 to +4.5 points
Composite jury score delta: +0.7 to +0.9 (based on D6 weights in 21)

This module + Module 34 together raise estimated jury verdict from:
  🥈 STRONG (8.3/10) → 🥇 FINALIST (≥ 8.8/10)
```

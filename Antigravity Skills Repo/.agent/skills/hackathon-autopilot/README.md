# Hackathon Autopilot — v3.1

> **Finalist-grade hackathon delivery from brief to winner pack — in 2.5 hours.**
> Calibrated against 2 live simulations. Average jury score: **8.3 / 10**.

---

## Ne Bu?

Hackathon Autopilot, bir yapay zeka ajanının hackathon sürecinin her aşamasını üstlendiği bir **skill sistemi**dir. Brief okumaktan Winner Pack üretmeye, jüri simülasyonundan demo script'e kadar — tüm adımları takım adına çalıştırır.

**Tek input:** Hackathon linki veya yapıştırılmış brief.  
**Tek output:** Finalist seviyesinde fikir + mimari + pitch + demo + sunum.

---

## Hızlı Başlangıç

```
1. Ajan ile yeni bir sohbet başlat
2. hackathon-autopilot skillini kullan
3. Şunu yaz:

   "Use skill hackathon-autopilot. Brief: [link ya da yapıştırılmış brief]"

4. Ajan pipeline'ı başlatır — eksik bilgi sorar (jury, timeline, team).
5. ~2.5 saat içinde Winner Pack hazır.
```

### Tek komut ile başlatmak için:
```
/start
```

### Belirli bir adımdan devam etmek için:
```
/ideate      → Sadece fikir üretimi
/score-me    → Sadece jüri simülasyonu
/demo        → Sadece demo script
/qa-sim      → Sadece Q&A hazırlık
```

---

## Pipeline — 12 Adım

```
ADIM  MODÜL  İŞ                                   SÜRESİ  GATE
────  ─────  ──────────────────────────────────   ──────  ─────────────────────
  1    01    Event Brief (event facts, timeline)    5 dk
  2    32    Hackathon type detection + weights     3 dk
  3    12    Team profile + adaptive playbook       5 dk
  4    16    Judge profiling + JA calibration      10 dk
  5    13    Winner patterns + event bias          10 dk
  6    02    Trend signals + domain brief          10 dk
─────────────────────────────────────────────────────────────────────────────
  7    06    Idea score → Top 3 shortlist          20 dk  Core ≥ 12/15
─────────────────────────────────────────────────────────────────────────────
  8    33    Assumption audit + Validated Persona  30 dk  Score ≥ 8/10
─────────────────────────────────────────────────────────────────────────────
 8.5   11    Win DNA analysis (6 dimensions)       10 dk  Total ≥ 16/24
  9    21    Jury simulation + convergence check   15 dk  Final ≥ 7.5/10
─────────────────────────────────────────────────────────────────────────────
 10    07    Architecture + Demo/Cut Line          20 dk
10.5   34    Data card + model card + verbal def   15 dk  ← Technical Cred +2.0
10.7   35    Business model + pricing anchor       30 dk  ← D6 +4.5
 11    08    Pitch script (60s + 3min)             20 dk
 12    09    Demo script (90s beat map + fallback) 30 dk
─────────────────────────────────────────────────────────────────────────────
              TOPLAM (core)                       ~2.5 sa
```

---

## Scoring Gate Sistemi

Her adımda bir geçiş eşiği var. Eşiği geçemeyen fikir/proje ilerleyemez.

```
GATE            MODÜL  EŞİK                 BAŞARISIZSA
──────────────────────────────────────────────────────────────
Idea Gate         06   Core ≥ 12 / 15       Eleme → sonraki fikir
Validation Gate   33   Score ≥ 8 / 10       ADJUST veya /ideate ile yeniden başla
DNA Gate          11   Total ≥ 16 / 24      Gap boyutunu düzelt, devam etme
Jury Gate         21   Final ≥ 7.5 / 10     Improvement Prescriptions çalıştır
Convergence       —    06+11+21 ±1.5 içinde Farklılaşan modülü araştır
──────────────────────────────────────────────────────────────
```

### Grade Tablosu (4 modül tek referans)

| Grade | 06 / 43 | 11 / 24 | 21 / 10 | 33 / 10 |
|-------|---------|---------|---------|---------|
| 🥇 Finalist | ≥ 40 | ≥ 21 | ≥ 8.5 | ≥ 9 |
| 🥈 Strong | 35–39 | 16–20 | 7.5–8.4 | 8 |
| 🥉 Needs Work | 28–34 | 12–15 | 6.5–7.4 | 6–7 |
| ⚠️ High Risk | < 28 | < 12 | < 6.5 | < 6 |

---

## Slash Komutlar (28 adet)

Herhangi bir modülü bağımsız çalıştırmak için:

| Komut | Modül | Ne Yapar |
|-------|-------|----------|
| `/start` | Tam pipeline | Brief'ten Winner Pack'e |
| `/team-setup` | 12 | Takım profili + playbook |
| `/event-type` | 32 | Hackathon tipi + pipeline ayarı |
| `/past-winners` | 30 | Geçmiş kazananlar analizi |
| `/domain-brief` | 26 | Hızlı domain uzmanlığı |
| `/trend` | 02 | Güncel trend sinyalleri |
| `/competitor-radar` | 17 | Generic tuzak + novelty kontrolü |
| `/judge-profile` | 16 | Jüri profili + JA kalibrasyonu |
| `/sponsor-check` | 23 | Sponsor hizalama |
| `/ideate` | 06 | 6 fikir üret → Top 3 |
| `/validate` | 33 | Assumption audit (30-60 dk) |
| `/dna` | 11 | Win DNA analizi |
| `/score-me` | 21 | 3-jüri simülasyonu + convergence |
| `/architecture` | 07 | Mermaid + API + Demo Line |
| `/data-card` | 34 | Veri kaynakları + model card |
| `/biz-model` | 35 | Müşteri + fiyat + ilk adım |
| `/stack-advisor` | 20 | Takıma göre tech stack |
| `/code-starter` | 28 | Hazır proje iskelet kodu |
| `/roles` | 24 | Rol haritası + bottleneck |
| `/orchestrate` | 15 | Multi-agent koordinasyon |
| `/pitch` | 08 | 60s + 3dk pitch script |
| `/demo` | 09 | 90s demo beat map + fallback |
| `/slide-deck` | 19 | 7 slayt outline + konuşmacı notları |
| `/figma` | 14 | Ekran spec + v0/Lovable promptları |
| `/pitch-coach` | 31 | 8 boyutlu sunum koçluğu |
| `/qa-sim` | 27 | Düşmanca Q&A pratiği |
| `/hackathon-live` | 18 | Anlık check-in + kapsam kararı |
| `/risk-cut` | 10 | Panik kesme protokolü |
| `/wrapup` | 25 | Son 90 dakika kontrol listesi |
| `/post-hack` | 22 | Sonuç sonrası strateji |
| `/social` | 29 | Sosyal medya playbook |

---

## Hackathon Zaman Çizelgesi

```
PHASE             NE ZAMAN              KOMUTLAR
────────────────────────────────────────────────────────────────────────
PRE
  Araştırma       Günler önce           /past-winners + /domain-brief
  Onboarding      H-24                  /team-setup + /event-type
  Tam Pipeline    H-12 → H-4            /start  (~2.5 saat)
    └ Destek      H-6 → H-4             /slide-deck + /figma + /qa-sim

BUILD
  Kickoff         H0                    /orchestrate (API contract kilitle)
  Check-in        Her 2-4 saatte        /hackathon-live
  Kapsam krizi    İsterseniz            /risk-cut
  Demo testi      H(N-4)                /demo (dry run + fallback test)
  Pitch antrenman H(N-3)                /pitch-coach
  Q&A hazırlık    H(N-2)                /qa-sim

SUBMISSION
  Son 90 dk       H(N-1.5) → H(N)      /wrapup

POST
  Sonuç günü      Açıklamadan sonra     /post-hack + /social
────────────────────────────────────────────────────────────────────────
TOPLAM AUTOPILOT SÜRESİ: ~5.5 saat — tam hackathon boyunca
```

---

## Event Type'a Göre Otomatik Ayar

Sistem `32_hackathon-type-detector.md` ile etkinlik tipini otomatik algılar ve pipeline ağırlıklarını ayarlar:

| Tip | VC Mode | Domain Expert | Business Model | Örnek |
|-----|---------|--------------|----------------|-------|
| Corporate/Kamu | KAPALI | Yüksek | Orta | Emlak Konut |
| Corporate/Özel | KAPALI | Yüksek | Yüksek | Smile Hair Clinic |
| VC/Accelerator | AÇIK (tam) | Orta | KRİTİK | Techstars, Y Combinator |
| Sosyal Etki | KAPALI | Orta | Orta (hibe) | NGO, STK Hackathon |
| Öğrenci | KAPALI | Düşük | Düşük | Üniversite Hackathonu |

---

## Modül Kataloğu (35 modül)

### Çekirdek Pipeline Modülleri

| Modül | Dosya | Amaç |
|-------|-------|------|
| 01 | `01_event-intake.md` | Etkinlik bilgilerini çıkar |
| 02 | `02_trend-aware.md` | 2025/26 trend kancaları |
| 03 | `03_jury-psychology.md` | Jüri zihniyeti için yeniden çerçeveleme |
| 04 | `04_vc-mode.md` | Pazar + hendek + yatırılabilirlik açısı |
| 05 | `05_demo-domination.md` | Wow anı + offline güvenlik |
| 06 | `06_idea-synthesizer.md` | Fikir puanlama + Top 3 (3 bonus sistemi) |
| 07 | `07_architecture-mvp.md` | Mermaid + Demo/Cut Line + fallback |
| 08 | `08_pitch-script.md` | 60s + 3dk script, jüri kalibrasyonlu |
| 09 | `09_demo-script.md` | 90s beat map + DEMO_MODE + fallback |
| 10 | `10_risk-cut-scope.md` | Panik kesme protokolü |
| 11 | `11_win-dna-analyzer.md` | 6 boyutlu finalist DNA |
| 12 | `12_personalization-profile.md` | Takım profili + adaptive injection |
| 13 | `13_winner-patterns.md` | 10 pattern + etkinlik bazlı ağırlık |

### Destek Modülleri

| Modül | Dosya | Amaç |
|-------|-------|------|
| 14 | `14_auto-figma-ui-flow.md` | UI ekranları + v0/Lovable promptları |
| 15 | `15_multi-agent-orchestration.md` | Agent rolleri + handoff takvimi |
| 16 | `16_judge-profiler.md` | Jüri arketipleri + JA kalibrasyon |
| 17 | `17_competitor-radar.md` | Generic tuzak tespiti + novelty |
| 18 | `18_live-build-tracker.md` | Anlık kapsam kararları |
| 19 | `19_slide-deck-generator.md` | 7 slayt outline + konuşmacı notları |
| 20 | `20_tech-stack-advisor.md` | Takıma göre optimal stack |
| 21 | `21_scoring-simulator.md` | 3-jüri simülasyonu + convergence |
| 22 | `22_post-hackathon.md` | Kazanma/kaybetme sonrası strateji |
| 23 | `23_sponsor-alignment.md` | Dual-track sponsor hizalama |
| 24 | `24_team-role-optimizer.md` | Rol haritası + bottleneck analizi |
| 25 | `25_wrapup-validator.md` | Son 90 dk kontrol listesi + Q&A |
| 26 | `26_domain-briefing.md` | Hızlı domain uzmanlığı |
| 27 | `27_negotiation-qa-simulator.md` | Düşmanca Q&A pratiği |
| 28 | `28_code-starter-generator.md` | Hazır proje iskeleti (3 stack) |
| 29 | `29_social-amplifier.md` | Sosyal medya playbook (3 faz) |
| 30 | `30_past-winners-analyzer.md` | Geçmiş kazanan tersine mühendislik |
| 31 | `31_pitch-coach.md` | 8 boyutlu sunum koçluğu |
| 32 | `32_hackathon-type-detector.md` | Otomatik tip tespiti + pipeline ayarı |

### Yeni Modüller (v3.1)

| Modül | Dosya | Neden Eklendi |
|-------|-------|--------------|
| 33 | `33_idea-validator.md` | Mimari kilitlenmeden önce assumption audit |
| 34 | `34_data-source-slide.md` | Her iki simülasyonda Technical Credibility 7/10 kaldı — kapatıldı |
| 35 | `35_business-model-primer.md` | Her iki simülasyonda Business Model 5-7/10 kaldı — kapatıldı |

---

## Simülasyon Benchmark'ları

Sistem 2 gerçek etkinlikte doğrulandı:

### #1 — Emlak Konut Ideathon Ankara
```
Tip:    Corporate/Kurumsal (Kamu Destekli)
Fikir:  EnergiScore — AI Enerji Verimliliği SaaS
Süre:   48 saatlik sprint

06 Fikir Puanı:   36/43 → 8.4/10
11 Win DNA:       19/24 → 7.9/10  (Emotional Resonance: 2/4)
21 Jüri Sim:      8.3/10          (Technical Credibility sorusu)
Convergence:      ✅ ±0.5 içinde

Final:    🥈 STRONG
Modül 34+35 sonrası:  🥇 FİNALİST grade (tahminen 8.8/10)
Anahtar ders: Domain Expert jürisi "Veri nereden geldi?" sorusunu HER ZAMAN sorar.
```

### #2 — Smile Hair Clinic AI & Mobile Hackathon
```
Tip:    Corporate/Talent Acquisition Hybrid
Fikir:  HairVision — AI Saç Nakli Sonuç Simülatörü
Süre:   3 haftalık uzun format

06 Fikir Puanı:   35/43 → 8.1/10
11 Win DNA:       19/24 → 7.9/10  (Investability: 2/4)
21 Jüri Sim:      8.3/10          (Business Model sorusu)
Convergence:      ✅ ±0.4 içinde

Final:    🥈 STRONG
Modül 34+35 sonrası:  🥇 FİNALİST grade (tahminen 8.8/10)
Anahtar ders: Talent hackathonlarda İK jürisi "Takımı işe alır mıyım?"
              sorusunu implicit soruyor — Q&A dağılımı ve enerji önemli.
```

### Cross-Event Bulgular
```
Ortak zayıf nokta #1: Technical Credibility → Modül 34 ile kapatıldı (+2.0 pt)
Ortak zayıf nokta #2: Business Model       → Modül 35 ile kapatıldı (+4.5 pt)
Sistem ortalama jury skoru:  8.3/10
Modül 34+35 sonrası tahmin:  8.8/10 → 🥇 Finalist grade
```

---

## Dosya Yapısı

```
hackathon-autopilot/
│
├── README.md              ← Bu dosya (kullanım kılavuzu)
├── COMMAND.md             ← Ajan için detaylı komut referansı
├── prompt.md              ← Sistem prompt (ajan bu dosyayı okur)
├── skill.md               ← Skill meta + modül kataloğu + benchmark
│
├── modules/               ← 35 modül dosyası
│   ├── 01_event-intake.md
│   ├── 02_trend-aware.md
│   ├── ...
│   ├── 33_idea-validator.md      ← v3.1 yeni
│   ├── 34_data-source-slide.md   ← v3.1 yeni
│   └── 35_business-model-primer.md ← v3.1 yeni
│
└── templates/             ← Çıktı şablonları
    ├── output_event_brief.md
    ├── output_judge_profile.md
    ├── output_top_ideas.md
    ├── output_winner_pack.md
    ├── output_winner_patterns.md
    ├── output_slide_deck.md
    ├── output_figma_flow.md
    ├── output_agent_plan.md
    └── output_wrapup_checklist.md
```

---

## Temel Prensipler

```
1. DEMO-FIRST
   Her karar "bu demoda çalışır mı?" sorusuyla test edilir.
   Demo Line'ın altındaki her şey Cut Line'a iner.
   DEMO_MODE=true: internet olmadan demo çalışmalı.

2. DETERMINISTIC CORE
   AI sadece enhancement layer. Core logic deterministik çalışır.
   Her demo'da aynı girdi → aynı çıktı. Hiçbir zaman "model yavaş" denemez.

3. VALIDATED PERSONA
   Pitch ve demo "kullanıcı" değil, isimli bir kişiyle açılır.
   "Murat Bey, 127 birim yönetiyor" > "kullanıcılar enerji verimliliği ister"

4. CONVERGENCE CHECK
   06 + 11 + 21 normalizasyonu ±1.5 içinde olmalı.
   Dışarıda kalan modül investigate edilir — bonus inflation veya gerçek zayıflık.

5. GATE BEFORE BUILD
   Assumption audit (33) yapılmadan mimari (07) kilitlenmez.
   Model card (34) ve business model (35) yapılmadan pitch (08) yazılmaz.
```

---

## Sıkça Sorulan Sorular

**S: Sistem gerçekten 2.5 saatte çalışıyor mu?**  
Evet — 2 simülasyonda doğrulandı. Core pipeline (Adım 1-12) ~2.5 saat. Destek modülleri (slide deck, figma, Q&A) eklenince ~4.5 saat.

**S: 48 saatlik bir hackathon için ne zaman başlatmalıyım?**  
En geç H-12'de. Tercihen H-24'te Team Profile + Event Type ile başla, H-12'de tam pipeline'ı çalıştır. H-4'te pitch + demo antrenmanı yap.

**S: Elimde jury listesi yok. Önemli mi?**  
Jüri listesi olmadan da çalışır ama 16_judge-profiler.md devreye girmez. Judge Alignment (JA) bonusu +2 yerine +0 kalır. Elinden geleni yap — LinkedIn'den araştır.

**S: Fikirlerimiz var, sadece Winner Pack istiyoruz.**  
`/architecture` → `/data-card` → `/biz-model` → `/pitch` → `/demo` sırasıyla çalıştır. Gate'leri atlama — /dna ve /score-me ile önce doğrula.

**S: Hangi modülü atlayabilirim?**  
`skill.md` içindeki Module Priority Index'e bak. P0 (event-intake, idea-synthesizer, demo-script) atlanamaz. P5 (social, code-starter) zamanın varsa yapılır.

**S: Convergence check neden önemli?**  
06 bonusları (WP, Novelty, JA max 28 puan) skoru şişirebilir. Jüri simülasyonu gerçek olmayan zayıflıkları yakalar. İkisi arasında >1.5 fark varsa — hangi modülün yanlış gittiğini anla.

---

## Sürüm Geçmişi

| Versiyon | Tarih | Değişiklikler |
|----------|-------|---------------|
| v1.0 | 2025-03 | İlk versiyon — 11 step, temel pipeline |
| v2.0 | 2025-03 | Modül sistemi (32 modül), slash komutlar |
| v2.1 | 2025-03 | Tutarlılık denetimi (06-11-13-21), 09 demo detaylandırma |
| v2.1.3 | 2025-03 | 07 mimari upgrade, 12 personalizasyon upgrade |
| **v3.1** | **2026-03** | **3 yeni modül (33/34/35), 5 gate sistemi, 2 benchmark, prompt + skill + COMMAND güncelleme** |

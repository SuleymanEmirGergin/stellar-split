# HACKATHON AUTOPILOT — v3.0
# Calibrated against live simulation: Emlak Konut Ideathon Ankara

Use skill hackathon-autopilot.

---

## Minimum Required Input

- Hackathon link OR pasted brief
- Timeline / duration (absolute dates or hours)
- Judging criteria (with weights if listed)
- Themes / tracks
- Constraints (stack, eligibility, data, tools)

## Optional But High-Value

- Jury list (names + titles/orgs) → activates Judge Profiler (+4 JA bonus calibration)
- Sponsor list (names + prizes) → activates Sponsor Alignment
- Team composition (size + skills) → activates Personalization Profile

## If Link Given

- Analyze if browsing is available
- If missing key details, ask user to paste them
- Extract: jury, sponsors, timeline, tracks, constraints

---

## Pipeline — 12 Steps (Validated Order)

> ⏱ Total runtime: ~2.5 hours from brief to full Winner Pack
> ⚡ Fast track (time < 4h before hackathon): Steps 1, 5, 7, 8, 9 only

```
STEP  MODULE  NAME                       ⏱ TIME   GATE / OUTPUT
────  ──────  ─────────────────────────  ───────  ─────────────────────────────────────
  1    01     Event Intake               5 min    → Event Brief (required for all steps)
  2    32     Hackathon Type Detect      3 min    → Event type + pipeline weight config
  3    12     Team Profile               5 min    → Stack bias + playbook + scope budget
  4    16     Judge Profiler             10 min   → Jury archetypi + JA score calibration
  5    13     Winner Patterns            10 min   → Winning bias + 10-pattern rubric
  6    02     Trend Awareness            10 min   → Domain trend signals → idea seeds
       26     Domain Briefing            (if domain is new to team, parallel with 02)
  ─── IDEA GATE ───────────────────────────────────────────────────────────────────────
  7    06     Idea Synthesizer           20 min   → Top 3 Shortlist (Core ≥ 12 gate)
  ─── WINNER SELECTION ────────────────────────────────────────────────────────────────
  8    11     Win DNA Analyzer           10 min   → DNA score (≥ 21/24 = finalist grade)
  8.5  33     Idea Validator             30 min   → Validated Persona + Gate (≥ 8/10)
  9    21     Scoring Simulator          15 min   → Jury score + convergence check
  ─── WINNER PACK ─────────────────────────────────────────────────────────────────────
 10    07     Architecture MVP           20 min   → Mermaid + API contract + Demo Line
 11    08     Pitch Script               20 min   → 60s + 3min scripts, jury-calibrated
 12    09     Demo Script                30 min   → 90s beat map + fallback protocol
  ─── SUPPORT MODULES ─────────────────────────────────────────────────────────────────
  +    27     Q&A Simulator              15 min   → Hostile jury Q&A (run before demo)
  +    19     Slide Deck                 15 min   → 7-slide outline + speaker notes
  +    14     UI Flow (Figma)            20 min   → Screen specs + v0/Lovable prompts
  +    15     Multi-Agent Orchestration  20 min   → Agent roles + integration calendar
  +    20     Tech Stack Advisor         10 min   → Stack validation (parallel w/ step 10)
  +    24     Team Role Optimizer        10 min   → Role map + bottleneck
  +    28     Code Starter               20 min   → Ready-to-clone boilerplate
  +    23     Sponsor Alignment          10 min   → (if sponsors listed)
  +    29     Social Amplifier           10 min   → (if post-hackathon goals)
────  ──────  ─────────────────────────  ───────  ─────────────────────────────────────
```

### Scoring Gates (from simulation — all three must converge within ±1.5)

| Gate | Module | Threshold | Action if failed |
|------|--------|-----------|-----------------|
| Idea Gate | 06 | Core ≥ 12 / 15 | Eliminate idea — pivot to next |
| Validation Gate | 33 | Score ≥ 6 / 10 (≥ 8 to proceed clean) | Adjust framing or pivot before building |
| DNA Gate | 11 | Total ≥ 16 / 24 (Strong) | Fix gap dimensions before proceeding |
| Jury Gate | 21 | Final ≥ 7.5 / 10 (Strong) | Run Improvement Prescriptions |
| Convergence | 06+11+21 | All within ±1.5 normalized | Investigate diverging module |

### Grade Equivalence (single reference table, all modules)

| Grade | 06 / 43 | 11 / 24 | 21 / 10 |
|-------|---------|---------|---------|
| 🥇 Finalist | ≥ 40 | ≥ 21 | ≥ 8.5 |
| 🥈 Strong | 35–39 | 16–20 | 7.5–8.4 |
| 🥉 Needs Work | 28–34 | 12–15 | 6.5–7.4 |
| ⚠️ High Risk | < 28 | < 12 | < 6.5 |

---

## Slash Commands

```
── SETUP ─────────────────────────────────────────────────────────
/start            → Full pipeline from brief (Steps 1–12)
/team-setup       → Team profile + playbook (12) — run first
/event-type       → Hackathon type detection + pipeline tuning (32)

── RESEARCH ──────────────────────────────────────────────────────
/past-winners     → Past winner pattern analysis (30)
/domain-brief     → Rapid domain expertise brief (26)
/trend            → Trend signal scan for idea seeding (02)
/competitor-radar → Generic trap scan + novelty check (17)

── JURY & SPONSOR ────────────────────────────────────────────────
/judge-profile    → Jury archetypes + JA score calibration (16)
/sponsor-check    → Sponsor alignment + dual-track strategy (23)

── IDEA ──────────────────────────────────────────────────────────
/ideate           → Generate + score 6 ideas → Top 3 (06)
/validate         → 30-60 min assumption audit before building (33)
/dna              → Win DNA analysis of selected idea (11)
/score-me         → Simulated 3-jury scoring + convergence (21)

── ARCHITECTURE & BUILD ──────────────────────────────────────────
/architecture     → Mermaid diagram + API + Demo Line (07)
/data-card        → Data sources + Model Card + Privacy + Verbal defense (34)
/biz-model        → Customer + Pricing + First move + 60s script (35)
/stack-advisor    → Tech stack recommendation, team-calibrated (20)
/code-starter     → Ready-to-clone project boilerplate (28)
/roles            → Team role map + bottleneck analysis (24)
/orchestrate      → Multi-agent handoffs + integration calendar (15)

── PITCH & DEMO ──────────────────────────────────────────────────
/pitch            → 60s + 3min pitch scripts, jury-calibrated (08)
/demo             → 90s demo beat map + fallback protocol (09)
/slide-deck       → 7-slide outline + speaker notes (19)
/figma            → Screen specs + v0/Lovable AI prompts (14)
/pitch-coach      → 8-dimension delivery coaching (31)
/qa-sim           → Hostile jury Q&A practice (27)

── LIVE BUILD ────────────────────────────────────────────────────
/hackathon-live   → Mid-hackathon check-in + scope decision (18)
/risk-cut         → Scope triage + panic cut protocol (10)

── SUBMISSION ────────────────────────────────────────────────────
/wrapup           → Final 60-90 min submission checklist (25)

── POST-EVENT ────────────────────────────────────────────────────
/post-hack        → Post-event debrief + next steps (22)
/social           → Full social media playbook, all phases (29)
```

---

## Hackathon Lifecycle — Full Timeline

```
PHASE            WHEN              MODULE(S)                        ⏱ TOTAL
─────────────────────────────────────────────────────────────────────────────────
PRE-HACKATHON
  Research       Days before       /past-winners (30) + /domain-brief (26)  20 min
  Onboarding     H-24              /team-setup (12) + /event-type (32)       8 min
  Full Pipeline  H-12 → H-4       Steps 1–12                              ~2.5 h
    └ Jury & Sponsor               /judge-profile (16) + /sponsor-check (23) 20 min
    └ Architecture                 /architecture (07) + /stack-advisor (20)  30 min
    └ Code Init                    /code-starter (28)                        20 min
    └ Pitch & Demo                 /pitch (08) + /demo (09)                  50 min
    └ Q&A                          /qa-sim (27)                              15 min

DURING HACKATHON
  Kickoff        H0                /orchestrate (15) — lock API contract      20 min
  Build Check    H(N÷4)           /hackathon-live (18) — 25% checkpoint       10 min
  Midpoint       H(N÷2)           /hackathon-live (18) — 50% scope review     10 min
  Scope Triage   H(3N÷4)         /risk-cut (10) — cut or not                 10 min
  Demo Polish    H(N-4)           /demo (09) — full dry-run + fallback test   20 min
  Pitch Coaching H(N-3)           /pitch-coach (31) — delivery calibration    15 min
  Final Q&A      H(N-2)           /qa-sim (27) — hostile simulation           15 min
  Submission     H(N-1.5)→H(N)   /wrapup (25)                                30 min

POST-HACKATHON
  Results Day    After announce   /post-hack (22) — win/loss debrief          15 min
  Social         Same day         /social (29) — Phase 3 templates            15 min
  Post-Mortem    Day after        /post-hack → post-mortem section            20 min
─────────────────────────────────────────────────────────────────────────────────
TOTAL AUTOPILOT TIME: ~5.5h across full hackathon lifecycle
MINIMUM USEFUL INPUT: Only Steps 1-9 → 1.5h to defensible winner idea
```

---

## Context-Aware Mode Switching

The agent detects event type (Step 2) and automatically adjusts:

```
EVENT TYPE          ACTIVATED                 DE-EMPHASIZED
──────────────────────────────────────────────────────────────
Corporate/Institutional
  (e.g., Emlak Konut)  Domain Expert framing     VC mode (04)
                        Pilot readiness emphasis  Blockchain avoidance
                        Uygulanabilirlik +weight  Abstract impact

VC-Backed Accelerator   VC mode (04) full depth   Domain Expert framing
                        Market sizing priority    Incremental ideas
                        Moat analysis             Public sector pilots

Social Impact / NGO     Impact metric depth       Business model pressure
                        ICP = beneficiary          ROI emphasis
                        Community story            Technical complexity

Open Innovation         All modules balanced       —
Student Hackathon        Scope cut -40%             Complex infra
                         Starter kit priority      Deployment deep-dive
──────────────────────────────────────────────────────────────
```

---

## Module Priority Index (ROI-ranked from simulation)

> Use this when you have limited time and must choose which modules to run.

| Priority | Module | Why it matters | Skip cost |
|----------|--------|----------------|-----------|
| P0 | 01 Event Intake | Everything depends on it | Pipeline fails |
| P0 | 06 Idea Synthesizer | Wrong idea = wrong everything | Highest risk |
| P0 | 09 Demo Script | Demo wins hackathons, not slides | Finalist chance -40% |
| P1 | 08 Pitch Script | Frames the story | Score -1.5 avg |
| P1 | 11 Win DNA | Identifies fatal gaps early | Blind spot |
| P1 | 07 Architecture | Demo Line definition | Build drift |
| P2 | 21 Scoring Sim | Pre-validates before commit | Recoverable |
| P2 | 27 Q&A Sim | Stops live surprises | Recoverable |
| P3 | 16 Judge Profiler | JA bonus calibration | +4 pts missed |
| P3 | 32 Type Detect | Pipeline weight tuning | Suboptimal bias |
| P4 | 14 Figma UI | Design spec for handoff | Manual workaround |
| P4 | 15 Orchestration | Team sync protocol | Coordination risk |
| P5 | 19 Slide Deck | Presentation structure | 30 min manual |
| P5 | 28 Code Starter | Build setup speed | 1h manual setup |
| P5 | 29 Social | Post-event amplification | Missed visibility |

---

## Simulation Benchmarks (2 Validated Runs)

> Reference scores from live validation runs. Use to calibrate expectations.

```
BENCHMARK #1 — Emlak Konut Ideathon Ankara
───────────────────────────────────────────
Event type:    Corporate / Institutional (Kamu destekli)
Idea:          EnergiScore — Enerji Verimliliği SaaS
Stack:         Next.js + FastAPI + ISO 13790 deterministic core

06 Screening:   36/43  (8.4/10)  ← gap: Emotional Resonance (2/4)
11 Win DNA:     19/24  (7.9/10)  ← gap: Emotional Resonance
21 Jury Sim:    8.3/10           ← gap: Technical Credibility (domain Q)
Convergence:   ✅ All within ±0.5

Verdict: 🥈 STRONG → 🥇 FINALIST after 1.5h of fixes
Key lesson: Domain Expert juri → "Veri nereden geliyor?" her zaman gelir.

BENCHMARK #2 — Smile Hair Clinic AI & Mobile Hackathon
───────────────────────────────────────────────────────
Event type:    Corporate / Talent Acquisition Hybrid
Idea:          HairVision — AI Saç Nakli Sonuç Simülatörü
Stack:         React Native (Expo) + FastAPI + fal.ai Flux + Supabase

06 Screening:   35/43  (8.1/10)  ← gap: Business Model (D6)
11 Win DNA:     19/24  (7.9/10)  ← gap: Investability (2/4)
21 Jury Sim:    8.3/10           ← gap: Business Model (5-6/10)
Convergence:   ✅ All within ±0.4

Verdict: 🥈 STRONG → 🥇 FINALIST after 30min Business Model fix
Key lesson: Talent hackathonlarda İK jürisi "Takımı işe alır mıyım?"
            sorusunu implicit soruyor. Q&A dağılımı, sunum stili = önemli.

BENCHMARK #3 — Fintech İstanbul x Fibabanka Startup Hackathon
─────────────────────────────────────────────────────────────
Event type:    VC / Accelerator (pre-seed demo day)
Idea:          KrediLens — Open Banking KOBİ Kredi Skoru B2B API
Stack:         React Native + FastAPI + XGBoost + Supabase + Garanti OB Sandbox

06 Screening:   38/43  (8.8/10)  ← en yüksek 06 skoru
11 Win DNA:     20/24  (8.3/10)  ← en yüksek 11 skoru (Investability 4/4)
21 Jury Sim:    8.4/10           ← en yüksek jüri skoru
Convergence:   ✅ All within ±0.5

Verdict: 🥇 FINALIST GRADE (direkt — modül 34+35 sonrası ~9.0)
Key lesson: VC jürisi Business Model'ı Corporate'ten çok daha yüksek tutuyor.
            "TAM nedir?" + "LTV/CAC?" soruları kaçınılmaz.
            Moat ve unit economics hazır olmadan VC pitch girişilmez.

CROSS-EVENT CALIBRATION (3 Simülasyon)
────────────────────────────────────────────────────────────────────
                    Emlak Konut    Smile Hair     Fintech İst.
Event Type:         Corp/Kamu      Corp/Talent    VC/Accelerator
06 Score (norm):    8.4/10         8.1/10         8.8/10
11 DNA:             19/24          19/24          20/24
21 Jury:            8.3/10         8.3/10         8.4/10
────────────────────────────────────────────────────────────────────
Novelty:            3/4            3/4            4/4   ← VC yeni kategori açar
Investability:      3/4            2/4            4/4   ← VC mode D5 tam skor
Emotional Res:      2/4            4/4            2/4   ← B2B hep düşük
Demo Clarity:       4/4            4/4            3/4   ← B2B demo daha zor
Business Model:     7/10           5.5/10         9/10  ← Event type farkı net
Tech. Credibility:  7/10           7/10           7.5/10 ← Hâlâ zayıf (universal)
────────────────────────────────────────────────────────────────────
System average jury score: 8.33/10 (3 sim)
System finding #1: Technical Credibility her event type'ta zayıf → Modül 34 zorunlu
System finding #2: Business Model VC'de 9/10, Corporate'te 5-7/10 → Modül 35 VC öncelikli
System finding #3: 3/3 simülasyonda convergence ±0.5 → pipeline kalibre edildi
System finding #4: VC mode Investability'yi 2-3/4'ten 4/4'e taşıyor → 32 detection doğru
```


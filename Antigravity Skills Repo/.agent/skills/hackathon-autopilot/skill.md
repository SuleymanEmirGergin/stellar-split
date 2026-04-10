# Skill: hackathon-autopilot v3.1

## Purpose

Generate finalist-grade hackathon delivery at every phase — from idea to win to post-event launch.
Calibrated against 2 live simulations (Emlak Konut Ideathon Ankara + Smile Hair Clinic AI Hackathon).

Core capabilities:
- Novel, validated ideas filtered through competitor radar + user assumption audit
- Real-user validation (surrogate testing) before architecture is committed
- Architecture (Mermaid diagrams) + Demo Line protocol + deterministic fallback
- Jury-calibrated pitch with data credibility + business model baked in
- Applause-first demo (90s beat map + DEMO_MODE) + slide deck + Figma UI flow
- Risk cuts, fallbacks, and offline-safe strategies
- Real-time build tracking and scope decision engine
- Submission validation and Q&A preparation
- Post-hackathon strategy (LinkedIn, README, startup pivot analysis)
- Cross-module scoring convergence (06 + 11 + 21 within ±1.5)

## System Benchmark

| Metric | Value |
|--------|-------|
| Validated simulations | **3** (Emlak Konut + Smile Hair Clinic + Fintech İstanbul) |
| Average jury verdict | **8.33 / 10** |
| Highest jury score | 8.4 / 10 (KrediLens — VC/Accelerator) |
| Technical Credibility gap | Closed by Module 34 (+2.0 pts — universal) |
| Business Model gap | Closed by Module 35 (+4.5 pts — event-aware) |
| Combined verdict after fixes | 🥇 Finalist grade (≥ 8.8 — VC: ~9.0) |
| Total modules | 35 |
| Total system size | ~415 KB |
| Convergence held | 3 / 3 simulations (±0.5) |

## Always-On Modes

✓ Trend-Aware Mode (02)
✓ Jury Psychology Mode (03)
✓ VC Mode (04) — disabled for Corporate/Institutional events by 32
✓ Demo Domination Mode (05)
✓ Winner Patterns Mode (13)
✓ Competitor Radar Mode (17)
✓ Auto Figma UI Flow Mode (14)
✓ Multi-Agent Orchestration Mode (15)

## Extended Modes (trigger-based)

⚡ Hackathon Type Detector Mode (32) — runs automatically on intake
⚡ Personalization Profile Mode (12) — team skills provided
⚡ Judge Profiler Mode (16) — jury list provided
⚡ Sponsor Alignment Mode (23) — sponsor list provided
⚡ Live Build Tracker Mode (18) — hackathon in progress
⚡ Scoring Simulator Mode (21) — pre-winner validation
⚡ Slide Deck Generator Mode (19) — pitch materialization
⚡ Tech Stack Advisor Mode (20) — team skills provided
⚡ Team Role Optimizer Mode (24) — team composition provided
⚡ Wrapup Validator Mode (25) — final 60-90 minutes
⚡ Post-Hackathon Mode (22) — after results announced
⚡ Idea Validator Mode (33) — assumption audit before architecture
⚡ Data Source Slide Mode (34) — Technical Credibility fix, always after 07
⚡ Business Model Primer Mode (35) — D6 fix, always before 08

## Slash Commands (standalone invocation)

```
── SETUP ──────────────────────────────────────────────────────
/start            → Full pipeline from brief (Steps 1–12)
/team-setup       → Team profile + playbook (12)
/event-type       → Hackathon type detection + pipeline tuning (32)

── RESEARCH ───────────────────────────────────────────────────
/past-winners     → Past winner pattern analysis (30)
/domain-brief     → Rapid domain expertise brief (26)
/trend            → Trend signal scan for idea seeding (02)
/competitor-radar → Generic trap scan + novelty check (17)

── JURY & SPONSOR ─────────────────────────────────────────────
/judge-profile    → Jury archetypes + JA score calibration (16)
/sponsor-check    → Sponsor alignment + dual-track strategy (23)

── IDEA ───────────────────────────────────────────────────────
/ideate           → Generate + score 6 ideas → Top 3 (06)
/validate         → 30-60 min assumption audit before building (33)
/dna              → Win DNA analysis of selected idea (11)
/score-me         → Simulated 3-jury scoring + convergence (21)

── ARCHITECTURE & BUILD ───────────────────────────────────────
/architecture     → Mermaid diagram + API + Demo Line (07)
/data-card        → Data sources + Model Card + Privacy + Verbal defense (34)
/biz-model        → Customer + Pricing + First move + 60s script (35)
/stack-advisor    → Tech stack recommendation, team-calibrated (20)
/code-starter     → Ready-to-clone project boilerplate (28)
/roles            → Team role map + bottleneck analysis (24)
/orchestrate      → Multi-agent handoffs + integration calendar (15)

── PITCH & DEMO ───────────────────────────────────────────────
/pitch            → 60s + 3min pitch scripts, jury-calibrated (08)
/demo             → 90s demo beat map + fallback protocol (09)
/slide-deck       → 7-slide outline + speaker notes (19)
/figma            → Screen specs + v0/Lovable AI prompts (14)
/pitch-coach      → 8-dimension delivery coaching (31)
/qa-sim           → Hostile jury Q&A practice (27)

── LIVE BUILD ─────────────────────────────────────────────────
/hackathon-live   → Mid-hackathon check-in + scope decision (18)
/risk-cut         → Scope triage + panic cut protocol (10)

── SUBMISSION ──────────────────────────────────────────────────
/wrapup           → Final 60-90 min submission checklist (25)

── POST-EVENT ──────────────────────────────────────────────────
/post-hack        → Post-event debrief + next steps (22)
/social           → Full social media playbook, all phases (29)
```

## 5 Mandatory Impact Criteria (C1–C5 in Module 06)

1. **C1** Human behavior insight — solves a real, observed behavior, not a theoretical one
2. **C2** Real-time decision support — output enables a decision within seconds
3. **C3** Invisible → visible — makes something hidden immediately perceptible
4. **C4** Emotional connection — creates a felt response, not just an understood one
5. **C5** Instant demo clarity — explainable in ≤ 10 seconds on screen

## Guardrails

- Do NOT invent event facts, jury names, or competitive intelligence.
- Ask user to paste missing timeline / criteria / jury / sponsor info.
- Prefer demo-first feasibility and offline-safe fallback (DEMO_MODE=true).
- Always produce Mermaid diagrams over text architecture.
- Always ask team skills before generating stack recommendations.
- Always check for generic traps before shortlisting ideas.
- Do NOT proceed to architecture without completing Module 33 (idea validation).
- Do NOT proceed to pitch script without completing Module 34 (data card) + Module 35 (biz model).
- Always run convergence check: 06 + 11 + 21 scores must be within ±1.5 normalized.

## Execution Pipeline (12 Steps + Support Modules)

```
STEP  MODULE  PURPOSE                            ⏱
────  ──────  ─────────────────────────────────  ───────
  1    01     Event intake + type flags           5 min
  2    32     Hackathon type detect + weights     3 min
  3    12     Team profile + playbook             5 min
  4    16     Judge profiler + JA calibration    10 min
  5    13     Winner patterns + bias             10 min
  6    02+26  Trend scan + domain brief          10 min
 ─── IDEA GATE (Core ≥ 12/15) ────────────────────────
  7    06     Idea score → Top 3 shortlist       20 min
 ─── VALIDATION GATE (Score ≥ 8/10) ──────────────────
  8    33     Assumption audit + persona         30 min   ← NEW
 ─── WINNER SELECTION ────────────────────────────────
  8.5  11     Win DNA analysis                  10 min
  9    21     Jury simulation + convergence      15 min
 ─── WINNER PACK ─────────────────────────────────────
 10    07     Architecture + Demo Line           20 min
 10.5  34     Data card + model card             15 min   ← NEW
 10.7  35     Business model primer              30 min   ← NEW
 11    08     Pitch script (60s + 3min)          20 min
 12    09     Demo script (90s beat map)         30 min
 ─── SUPPORT ──────────────────────────────────────────
  +    27     Q&A simulator                     15 min
  +    19     Slide deck                        15 min
  +    14     Figma UI flow                     20 min
  +    15     Multi-agent orchestration         20 min
  +    20     Tech stack advisor                10 min
  +    24     Team role optimizer               10 min
  +    28     Code starter generator            20 min
────  ──────  ─────────────────────────────────  ───────
              TOTAL (core only):               ~2.5 h
              TOTAL (full incl. support):      ~4.5 h
```

## Scoring Gate System

| Gate | Module | Pass Threshold | Fail Action |
|------|--------|---------------|-------------|
| Idea Gate | 06 | Core ≥ 12/15 | Eliminate — pivot to next idea |
| Validation Gate | 33 | Score ≥ 8/10 | ADJUST framing or STOP and re-ideate |
| DNA Gate | 11 | Total ≥ 16/24 | Fix gap dimensions, do not proceed |
| Jury Gate | 21 | Final ≥ 7.5/10 | Run Improvement Prescriptions |
| Convergence | 06+11+21 | Within ±1.5 normalized | Investigate diverging module |

## Grade Equivalence (all scoring modules unified)

| Grade | 06 / 43 | 11 / 24 | 21 / 10 | 33 / 10 |
|-------|---------|---------|---------|---------|
| 🥇 Finalist | ≥ 40 | ≥ 21 | ≥ 8.5 | ≥ 9 |
| 🥈 Strong | 35–39 | 16–20 | 7.5–8.4 | 8 |
| 🥉 Needs Work | 28–34 | 12–15 | 6.5–7.4 | 6–7 |
| ⚠️ High Risk | < 28 | < 12 | < 6.5 | < 6 |

## Module Map (35 modules)

| # | Module | Purpose | Pipeline Position |
|---|--------|---------|------------------|
| 01 | event-intake | Extract event facts, timeline, constraints | Step 1 |
| 02 | trend-aware | Attach current trend hooks to idea seeds | Step 6 |
| 03 | jury-psychology | Reframe ideas for judge mindset | Always-on |
| 04 | vc-mode | Market / moat / investable angle | Extended (VC events) |
| 05 | demo-domination | Define the wow moment + offline protocol | Always-on |
| 06 | idea-synthesizer | Score + rank ideas with 3-bonus rubric | Step 7 |
| 07 | architecture-mvp | Mermaid + data model + Demo/Cut Line | Step 10 |
| 08 | pitch-script | 60s + 3min scripts, jury-calibrated | Step 11 |
| 09 | demo-script | 90s beat map + fallback + DEMO_MODE | Step 12 |
| 10 | risk-cut-scope | Scope triage + panic cut protocol | /risk-cut |
| 11 | win-dna-analyzer | Finalist DNA, 6 dimensions, gap actions | Step 8.5 |
| 12 | personalization-profile | Team skill profiling + adaptive injection | Step 3 |
| 13 | winner-patterns | 10-pattern winner heuristic, event-biased | Step 5 |
| 14 | auto-figma-ui-flow | UI screens + Figma/v0/Lovable prompt | /figma |
| 15 | multi-agent-orchestration | Agent roles + handoffs + calendar | /orchestrate |
| 16 | judge-profiler | Jury composition + JA score calibration | Step 4 |
| 17 | competitor-radar | Generic trap detection + novelty scoring | Always-on |
| 18 | live-build-tracker | In-hackathon real-time scope decisions | /hackathon-live |
| 19 | slide-deck-generator | 7-slide outline + speaker notes | /slide-deck |
| 20 | tech-stack-advisor | Optimal stack for team + time budget | /stack-advisor |
| 21 | scoring-simulator | Simulated 3-jury validation + convergence | Step 9 |
| 22 | post-hackathon | Post-event strategy + startup pivot | /post-hack |
| 23 | sponsor-alignment | Dual-track sponsor prize strategy | /sponsor-check |
| 24 | team-role-optimizer | Role assignments + bottleneck analysis | /roles |
| 25 | wrapup-validator | Final submission checklist + Q&A prep | /wrapup |
| 26 | domain-briefing | Rapid domain expertise for unfamiliar fields | Step 6 |
| 27 | negotiation-qa-simulator | Hostile jury Q&A practice + scripts | /qa-sim |
| 28 | code-starter-generator | Ready-to-clone boilerplate (3 stacks) | /code-starter |
| 29 | social-amplifier | Full social media playbook, all phases | /social |
| 30 | past-winners-analyzer | Reverse-engineer winners + archetypes | /past-winners |
| 31 | pitch-coach | 8-dimension pitch delivery coaching | /pitch-coach |
| 32 | hackathon-type-detector | Auto-detect event type + pipeline weights | Step 2 |
| 33 | idea-validator | 30-60 min assumption audit + binary gate | Step 8 ← NEW |
| 34 | data-source-slide | Data inventory + model card + verbal defense | Step 10.5 ← NEW |
| 35 | business-model-primer | Customer + pricing + first move + 60s script | Step 10.7 ← NEW |

## Module Dependencies (critical paths)

```
01 → 32 → 12 → 16  (context setup chain — always run in this order)
          ↓
06 → 33 → 11 → 21  (idea validation chain — gate system)
               ↓
         07 → 34 → 35 → 08 → 09  (winner pack chain)
                              ↓
                    27 + 19 + 14  (post-pack support)
```

## Context-Aware Event Type Modes

| Event Type | 04 VC Mode | Domain Expert | Business Model D6 | Emotional Resonance |
|------------|-----------|--------------|-------------------|---------------------|
| Corporate/Public | OFF | HIGH weight | Medium | Low |
| Corporate/Private | OFF | HIGH weight | HIGH | Medium |
| Corporate/Talent | OFF | HIGH weight | HIGH | HIGH |
| VC/Accelerator | ON (full) | Medium | CRITICAL | Medium |
| Social Impact | OFF | Medium | Medium (grants) | CRITICAL |
| Student/Academic | OFF | Low | Low | Medium |

*Source: 32_hackathon-type-detector.md*

## Simulation Benchmarks (v3.1 — 3 validated runs)

```
#1 Emlak Konut Ideathon Ankara — EnergiScore
  Event:  Corporate/Institutional | Build: 48h sprint
  Domain: PropTech — AI enerji verimliliği SaaS
  Stack:  Next.js + FastAPI + ISO 13790 deterministic core
  06: 36/43 (8.4) | 11: 19/24 (7.9) | 21: 8.3/10 | Convergence: ±0.5 ✅
  Gap:    Emotional Resonance (2/4) + Technical Credibility (7/10)
  Verdict: 🥈 STRONG → after 34+35: ~8.8/10 → 🥇 FINALIST
  Lesson: Domain Expert jüri → "Veri nereden?" kaçınılmaz. Modül 34 zorunlu.

#2 Smile Hair Clinic AI & Mobile Hackathon — HairVision
  Event:  Corporate/Talent Acquisition | Build: 3 weeks
  Domain: HealthTech — AI saç nakli sonuç simülatörü
  Stack:  React Native (Expo) + FastAPI + fal.ai Flux + Supabase
  06: 35/43 (8.1) | 11: 19/24 (7.9) | 21: 8.3/10 | Convergence: ±0.4 ✅
  Gap:    Business Model (5.5/10) + Technical Credibility (7/10)
  Verdict: 🥈 STRONG → after 34+35: ~8.8/10 → 🥇 FINALIST
  Lesson: İK jürisi implicit "takımı işe alır mıyım?" soruyor. Q&A enerjisi = önemli.

#3 Fintech İstanbul x Fibabanka Startup Hackathon — KrediLens
  Event:  VC / Accelerator (pre-seed demo day) | Build: 36h sprint
  Domain: FinTech — Open Banking KOBİ Kredi Skoru B2B API
  Stack:  React Native + FastAPI + XGBoost + Supabase + Garanti OB Sandbox
  06: 38/43 (8.8) | 11: 20/24 (8.3) | 21: 8.4/10 | Convergence: ±0.5 ✅
  Gap:    Demo Clarity B2B (3/4) + Technical Credibility (7.5/10)
  Verdict: 🥇 FINALIST (direkt) → after 34+35: ~9.0/10
  Lesson: VC jürisi «TAM?» + «LTV/CAC?» soruyor. Moat + unit economics zorunlu.
          VC Mode (04) Investability'yi 2-3/4'ten 4/4'e çıkardı — 32 detection doğru.

CROSS-EVENT FINDINGS (3 simülasyon)
────────────────────────────────────────────────────────────────────
                     Emlak Konut    Smile Hair     Fintech İst.
Event Type:          Corp/Kamu      Corp/Talent    VC/Accelerator
06 norm score:       8.4/10         8.1/10         8.8/10
11 DNA:              19/24          19/24          20/24
21 Jury:             8.3/10         8.3/10         8.4/10
────────────────────────────────────────────────────────────────────
Novelty:             3/4            3/4            4/4  ← VC yeni kategori açar
Investability:       3/4            2/4            4/4  ← VC mode D5'i tam yapıyor
Emotional Res:       2/4            4/4            2/4  ← B2B hep düşük (normal)
Demo Clarity:        4/4            4/4            3/4  ← B2B demo daha zor
Business Model:      7/10           5.5/10         9/10 ← Event type farkı net
Tech. Credibility:   7/10           7/10           7.5/10 ← Universal zayıf nokta
────────────────────────────────────────────────────────────────────
System avg jury:     8.33/10 (3 simülasyon)
Convergence:         3/3 ±0.5 içinde → pipeline kalibre edildi

SYSTEM FINDINGS
  #1 Technical Credibility: Her 3 simülasyonda 7-7.5/10 → Modül 34 EVRENSEL zorunlu
  #2 Business Model:        VC'de 9/10, Corporate'te 5-7/10 → Modül 35 event-aware
  #3 Convergence:           3/3'te ±0.5 → pipeline güvenilir, sistemik hata yok
  #4 Event type detection:  32 Investability'yi doğru ayrıştırıyor (2-3 → 4)
  #5 B2B Demo gap:          3/4 (B2C'de 4/4) → yeni modül gerekebilir (36_demo-b2b)
```

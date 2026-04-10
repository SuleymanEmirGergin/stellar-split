# Idea Synthesizer — Module 06

## Purpose

Score, filter, and rank the 6 generated ideas using a multi-dimensional rubric. Produce a justified Top 3 shortlist with clear reasoning. Eliminate generic ideas before they waste planning time.

---

## Step 1: Pre-Filter (Disqualifiers)

Before scoring, apply hard disqualifiers. Any idea failing ANY of these is eliminated immediately:

```
DISQUALIFIER CHECK
───────────────────
☐ Is it a generic chatbot with no differentiation mechanism? → ELIMINATE
☐ Is it a CRUD dashboard with no autonomous behavior? → ELIMINATE
☐ Does it trigger a Generic Trap from 17_competitor-radar.md? AND score < 3 on novelty? → ELIMINATE
☐ Is it impossible to demo in 90 seconds? → ELIMINATE (or force redesign)
☐ Does it require infrastructure that can't be set up in the available hackathon time? → ELIMINATE
☐ Is it dependent on data the team definitely cannot access? → ELIMINATE
```

Surviving ideas proceed to scoring.

---

## Step 2: Core 5-Criteria Scoring (0–3 each, max 15)

### Criterion 1: Human Behavior Insight (0–3)
**Question:** Does this idea reveal something true about how people actually behave, decide, or feel?

| Score | Description |
|-------|-------------|
| 3 | Grounded in a specific, non-obvious human behavior — "people do X when Y, even though they think they do Z" |
| 2 | Problem is real and human, but the behavioral insight isn't surprising |
| 1 | Generic "users need this" framing — no specific behavioral understanding |
| 0 | Product-centric thinking — built for the technology, not for a person |

---

### Criterion 2: Real-Time Decision Support (0–3)
**Question:** Does this idea actively help someone make a better decision, faster, with information they didn't have before?

| Score | Description |
|-------|-------------|
| 3 | Delivers a specific decision with context, ranked options, or confidence score — in real time |
| 2 | Provides useful information that informs a decision, but doesn't make the decision actionable |
| 1 | Provides historical or aggregate data — interesting, but not immediately actionable |
| 0 | Passive data display — no decision support whatsoever |

---

### Criterion 3: Invisible → Visible (0–3)
**Question:** Does this idea surface something that was previously hidden, scattered, or impossible to see?

| Score | Description |
|-------|-------------|
| 3 | Reveals a genuinely invisible pattern, risk, or signal — judge will say "I didn't know this was possible" |
| 2 | Aggregates scattered information into one view — useful, but data existed elsewhere |
| 1 | Displays known data more conveniently — marginal improvement |
| 0 | Shows what's already on a spreadsheet or existing tool |

---

### Criterion 4: Emotional Connection (0–3)
**Question:** Will a judge feel something when they see this demo — not just understand it?

| Score | Description |
|-------|-------------|
| 3 | Demo moment triggers a clear emotional response: surprise, relief, satisfaction, urgency |
| 2 | Intellectually engaging — judge is interested, but not moved |
| 1 | Functionally understandable — judge nods but doesn't feel anything |
| 0 | Abstract — judge struggles to connect it to any human experience |

*Tip: Name a real person in the demo. "Maria, a rural nurse who…" creates emotion instantly.*

---

### Criterion 5: Instant Demo Clarity (0–3)
**Question:** Can a judge who knows nothing about this domain understand the value in 10 seconds of watching?

| Score | Description |
|-------|-------------|
| 3 | Zero context needed — the demo is a complete story in itself |
| 2 | 1 sentence of context from the presenter makes it clear |
| 1 | Requires 30+ seconds of explanation before the value is visible |
| 0 | Even after explanation, value is unclear |

---

## Step 3: Bonus Points

### Winner Pattern Bonus (from 13_winner-patterns.md)
Score each idea against ALL 10 winner patterns. Each: 0, 1, or 2.
**Max bonus: +20 points.**

> ⚠️ Consistency note: This rubric is the same 10-pattern table defined in `13_winner-patterns.md`. Do not use a different set of patterns here.

| Pattern | 0 | 1 | 2 |
|---------|---|---|---|
| Instant Clarity | Value is unclear | Needs 1 context sentence | 10-second understanding |
| Narrative Arc | No clear story | Story present but loose | Tight arc: problem → stakes → solution → impact |
| Demo Reliability | Live-only, no fallback | Partial fallback | Full offline-safe demo mode |
| Depth-Control | All LLM, no determinism | Some rule-based logic | Deterministic core + AI layer |
| Killer Metric | No metric or vague | Estimated metric | Specific + measured + scaled |
| Differentiation | Generic / commodity | Familiar with a twist | Genuinely novel mechanism or insight |
| UX Polish | Broken / placeholder UI | Functional | Demo-critical screens polished |
| Deployment Story | Abstract / "anyone" | Plausible path | Named segment + named channel |
| Why Now | Missing or generic | Real but not specific | Specific shift, dateable, causally linked |
| Team Execution | Slides only | Partial demo | Full working demo with Q&A coverage |

**Finalist threshold (13_winner-patterns.md): ≥ 14 / 20**

### Novelty Bonus (from 11_win-dna-analyzer.md)
Use the DNA Dimension 1 (Novelty Type) score from `11_win-dna-analyzer.md` directly.
Scale: **0–4** (category creation / genuine reframe / familiar twist / incremental / commodity).
**Max bonus: +4 points.**

> ⚠️ Consistency note: Do NOT use the deprecated "Seen Once Score (0–5)" here.
> Use `11_win-dna-analyzer.md` Dimension 1 output. If module 11 hasn't run yet, estimate using the same 0–4 scale.

| Novelty Score | Novelty Type |
|--------------|-------------|
| 4 | Category creation — no mental bucket exists |
| 3 | Genuine reframe — familiar domain, new angle |
| 2 | Familiar twist — existing playbook, new domain/user |
| 1 | Incremental — marginally better than existing |
| 0 | Commodity — direct replica |

### Judge Alignment Bonus (from 11_win-dna-analyzer.md + 16_judge-profiler.md)
Use the DNA Dimension 4 (Judge Alignment) score from `11_win-dna-analyzer.md`, calibrated by `16_judge-profiler.md` if available.
Scale: **0–4** (same scale as the DNA dimension).
**Max bonus: +4 points.**

> ⚠️ Consistency note: The old +2/+1/0/−1 bonus has been replaced with the 0–4 scale from `11_win-dna-analyzer.md` Dimension 4.
> If module 11 hasn't run yet, use this shorthand:
> - +4: Perfect match to primary judge archetype
> - +3: Strong match to 2+ archetypes
> - +2: Moderate relevance
> - +1: Misaligned framing
> - 0: Triggers judge skepticism

---

## Step 4: Scoring Summary Table

Produce this table for all surviving ideas:

```
IDEA SCORING SUMMARY
────────────────────────────────────────────────────────────────────────────────────
                    │        CORE (max 15)        │      BONUS (max 28)      │
Idea                │ C1 │ C2 │ C3 │ C4 │ C5 │ Core │ WP+(0-20) │ N+(0-4) │ JA+(0-4) │ TOTAL
────────────────────┼────┼────┼────┼────┼────┼──────┼───────────┼─────────┼──────────┼──────
[Idea A]            │  X │  X │  X │  X │  X │  XX  │    XX     │    X    │    X     │  XX
[Idea B]            │  X │  X │  X │  X │  X │  XX  │    XX     │    X    │    X     │  XX
[Idea C]            │  X │  X │  X │  X │  X │  XX  │    XX     │    X    │    X     │  XX
[Idea D]            │  X │  X │  X │  X │  X │  XX  │    XX     │    X    │    X     │  XX
[Idea E (filtered)] │ ELIMINATED — [reason]
[Idea F]            │  X │  X │  X │  X │  X │  XX  │    XX     │    X    │    X     │  XX
────────────────────────────────────────────────────────────────────────────────────

Grade:
  Core ≥ 12 required to proceed (screening gate — same as 11_win-dna-analyzer.md ≥ 16/24 threshold)
  TOTAL ≥ 35 → competitive finalist candidate
  TOTAL ≥ 40 → strong winner-grade idea
  Core < 12  → idea eliminated regardless of bonus

Consistency check:
  WP+ column maps 1:1 to 13_winner-patterns.md Pattern Bonus Rubric (10 patterns × 2 = max 20)
  N+  column maps 1:1 to 11_win-dna-analyzer.md Dimension 1 (Novelty, 0–4)
  JA+ column maps 1:1 to 11_win-dna-analyzer.md Dimension 4 (Judge Alignment, 0–4)
```

---

## Step 5: Shortlist Top 3

Rank surviving ideas by TOTAL score. For ties, prefer the idea with:
1. Higher Instant Demo Clarity (Criterion 5)
2. Higher Differentiation score (Winner Pattern)
3. Higher Judge Alignment bonus

For each Top 3 idea, produce a one-paragraph justification:

```
TOP 3 SHORTLIST
────────────────

🥇 [Idea Name] — Score: [XX]
Why: [One paragraph explaining why this scored highest and why it will win]
Competitive summary: [Prior art level + differentiation in 1 sentence]
Primary risk: [The single biggest thing that could kill this]
Recommended if: [What type of team / time should pick this]

🥈 [Idea Name] — Score: [XX]
Why: [Paragraph]
Competitive summary: [1 sentence]
Primary risk: [1 sentence]
Recommended if: [1 sentence]

🥉 [Idea Name] — Score: [XX]
Why: [Paragraph]
Competitive summary: [1 sentence]
Primary risk: [1 sentence]
Recommended if: [1 sentence]
```

---

## Step 6: Winner Pre-Selection

After presenting Top 3, declare the presumptive winner:

```
PRESUMPTIVE WINNER: [Idea Name]

Rationale (3 sentences):
[Why this specific idea should proceed to the Winner Pack]

Override conditions:
[Under what circumstances should the team choose #2 or #3 instead — e.g., team has no design skill and #1 requires polished UI]
```

The presumptive winner then proceeds to `21_scoring-simulator.md` for simulated jury pre-validation before the full Winner Pack is built.

---

## Integration

- Runs in STEP 5 (Screening Gate)
- Inputs from:
  - `13_winner-patterns.md` → WP+ bonus (10 patterns × 2, max 20)
  - `11_win-dna-analyzer.md` → Novelty bonus D1 (0–4) + Judge Alignment bonus D4 (0–4)
  - `16_judge-profiler.md` → calibrates Judge Alignment dimension
  - `17_competitor-radar.md` → informs D1 Novelty estimate if module 11 hasn't run
- Outputs feed into: `21_scoring-simulator.md` (deep jury simulation), then Winner Pack
- **Role in pipeline:** Screening gate (fast, comparative). `21` is deep validation (per-dimension jury perspective).

### Cross-Module Score Alignment

| Concept | 06 column | 11 dimension | 13 rubric | 21 dimension |
|---------|-----------|-------------|-----------|-------------|
| Novelty | N+ (0–4) | D1 Novelty (0–4) | Pattern 6: Differentiation | Solution Novelty (0–10) |
| Demo clarity | C5 (0–3) | D3 Demo Clarity (0–4) | Pattern 1: Instant Clarity | Demo Impact (0–10) |
| Judge fit | JA+ (0–4) | D4 Judge Alignment (0–4) | — | Implicit in jury weights |
| Emotional pull | C4 (0–3) | D6 Emotional Resonance (0–4) | Pattern 2: Narrative Arc | Problem Clarity (0–10) |
| Deployability | WP col 6 (0–2) | D5 Investability (0–4) | Pattern 8: Deployment Story | Impact & Scale + Business Model |
| Tech safety | WP col 3+4 (0–2 each) | D2 Tech Depth (0–4) | Patterns 3+4 | Technical Credibility (0–10) |

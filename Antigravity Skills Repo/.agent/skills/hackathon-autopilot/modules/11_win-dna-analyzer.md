# Win DNA Analyzer — Module 11

## Purpose

Extract the "finalist-grade DNA" from the winning idea — the specific combination of properties that distinguishes a top-3 project from everything else in the room. This module produces a **Win DNA Summary** that guides all subsequent decisions: pitch framing, demo design, and build priorities.

---

## The 6 DNA Dimensions

Every project that places in the top 3 at a hackathon has a specific profile across these dimensions. Analyze the winning idea across all 6.

---

### DNA Dimension 1: Novelty Type (0–4 scale)

Not all novelty is equal. Classify:

| Score | Novelty Type | Description |
|-------|-------------|-------------|
| 4 | Category creation | No mental bucket exists for this — judge has to create a new one |
| 3 | Genuine reframe | Familiar domain, genuinely new angle — "I've never thought of it this way" |
| 2 | Familiar twist | Existing playbook applied to new domain or user segment |
| 1 | Incremental | Marginally better version of something that exists |
| 0 | Commodity | Direct replica of known product in same market |

**Finalists need score ≥ 2. Top 1 almost always scores 3 or 4.**

---

### DNA Dimension 2: Technical Depth vs. Technical Risk Balance (0–4)

The best hackathon projects have technical depth without technical gamble. The deterministic core guarantees the demo works; the optional AI layer adds power.

| Score | Profile |
|-------|---------|
| 4 | Strong deterministic core + AI as precision layer + offline-safe demo |
| 3 | Solid deterministic logic + AI with structured output + demo mode ready |
| 2 | Primarily AI-driven but with guardrails + some seed data fallback |
| 1 | Pure LLM API call + no validation + live-only demo |
| 0 | No technical depth — purely UI/UX prototype |

---

### DNA Dimension 3: Demo Clarity Score (0–4)

How long does it take for the "aha moment" to land?

| Score | Profile |
|-------|---------|
| 4 | Judge understands AND feels the value in < 5 seconds of watching |
| 3 | Clear in 10 seconds — needs 1 context sentence from presenter |
| 2 | Clear in 30 seconds — needs brief explanation |
| 1 | Requires > 60 seconds of explanation before value is visible |
| 0 | Value is never clear — judge leaves confused |

---

### DNA Dimension 4: Judge Alignment (0–4)

How well does the project match what the actual judges optimize for?

| Score | Profile |
|-------|---------|
| 4 | Perfect match to primary judge archetype + event type |
| 3 | Strong match to 2+ judge archetypes |
| 2 | Moderate match — relevant but not perfectly framed |
| 1 | Misaligned — good product, wrong framing for this jury |
| 0 | Actively triggers judge skepticism |

Requires input from `16_judge-profiler.md` and `32_hackathon-type-detector.md`.

---

### DNA Dimension 5: Investability / Deployability (0–4)

Is there a believable next step after the hackathon?

| Score | Profile |
|-------|---------|
| 4 | Named beachhead customer + specific launch path + fundable narrative |
| 3 | Clear deployment path + plausible revenue model |
| 2 | Believable use case post-hackathon but no specific path |
| 1 | Abstract — "we'd build this for enterprises" with no specifics |
| 0 | Demo-only concept — no path to real-world deployment |

---

### DNA Dimension 6: Emotional Resonance (0–4)

Does the problem and solution create an emotional response in the judge?

| Score | Profile |
|-------|---------|
| 4 | Story makes judge feel something visceral — relief, urgency, or surprise |
| 3 | Human connection clear — judge can picture the person who needs this |
| 2 | Intellectually compelling — judge is interested but not moved |
| 1 | Functional understanding only — judge nods but doesn't care |
| 0 | Abstract — no human element visible |

---

## DNA Profile Scoring

```
WIN DNA PROFILE: [Project Name]
─────────────────────────────────────────────────────────
Dimension               │ Score │ Profile Type
────────────────────────┼───────┼──────────────────────────────────
Novelty                 │ X/4   │ [Category / Reframe / Twist / ...]
Technical Depth/Safety  │ X/4   │ [Deterministic core / AI-first / Pure LLM]
Demo Clarity            │ X/4   │ [< 5s / 10s / 30s / > 60s]
Judge Alignment         │ X/4   │ [Perfect / Strong / Moderate / Misaligned]
Investability           │ X/4   │ [Named path / Plausible / Abstract]
Emotional Resonance     │ X/4   │ [Visceral / Human / Intellectual / None]
────────────────────────┼───────┼──────────────────────────────────
TOTAL                   │ XX/24 │
─────────────────────────────────────────────────────────

Grade:
  21-24 → 🟢 FINALIST GRADE — strong chance of placing
  16-20 → 🟡 COMPETITIVE — genuinely in contention
  12-15 → 🟠 NEEDS WORK — specific dimensions must improve
  < 12  → 🔴 REBUILD — rethink core proposition

```

---

## DNA Gap Analysis

For any dimension scoring < 3, produce a gap action:

```
DNA GAP ACTIONS
────────────────
[Dimension] scored [X/4]:
  Root cause: [Why this dimension is weak]
  Fix: [Specific action to raise score by 1+ points — e.g., "add a named industry persona", "build offline fallback today"]
  Owner: [Who on the team is responsible]
  Deadline: [When this must be done by]
```

---

## The Win DNA Summary (headline output)

After scoring, produce a 3-line "Win DNA Summary" — the most condensed, memorable version of why this project should win:

```
WIN DNA SUMMARY
────────────────
This project wins because:
  [Line 1: The novelty — what's genuinely new about the problem framing or solution mechanism]
  [Line 2: The depth — what makes the technical execution trustworthy, not just impressive]
  [Line 3: The resonance — who cares, why they care now, and what changes for them]

This project risks losing because:
  [The single biggest DNA gap and what mitigates it]

Finalists in this category typically win with:
  [Pattern from 30_past-winners-analyzer.md or general heuristic from 13_winner-patterns.md]
```

---

## Fingerprint Comparison

After producing the DNA profile, compare against two fingerprints:

### Fingerprint A: Generic Competitor (what usually loses)
```
Typical losing project at this type of event:
  Novelty: 1 (incremental)
  Tech depth: 1-2 (pure API call)
  Demo clarity: 2 (needs explanation)
  Judge alignment: 2 (generic pitch)
  Investability: 1 (no path)
  Resonance: 1 (no human story)
  TOTAL: 8-10 / 24

Our project vs. this fingerprint:
  [Where we beat this profile — specific dimensions]
  [Where we're still too close to this profile — dimensions to raise]
```

### Fingerprint B: Ideal Finalist
```
Ideal finalist at this event type:
  [Produced from 32_hackathon-type-detector.md + 30_past-winners-analyzer.md]

Our project vs. ideal fingerprint:
  Gap dimensions: [List]
  Priority gap to close: [The one dimension that matters most for this event type]
```

---

## Integration

- Runs in STEP 8 (Winner Pack), after architecture and idea selection
- Scores calibrated by `16_judge-profiler.md` (judge alignment) and `32_hackathon-type-detector.md` (event type weights)
- Gap Actions feed directly into `10_risk-cut-scope.md` (scope decisions)
- Win DNA Summary becomes the opening of the Winner Pack and the closing of the pitch
- Investability score feeds into `04_vc-mode.md` (determines if full VC mode is necessary)

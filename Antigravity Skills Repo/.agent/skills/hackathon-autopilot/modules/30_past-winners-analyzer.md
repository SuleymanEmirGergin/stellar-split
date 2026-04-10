# Past Winners Analyzer — Module 30

## Purpose

Study the hackathon's past winners (or winners from similar events) to **reverse-engineer what actually wins** — beyond the official judging criteria.

This module:
- Identifies patterns in winning projects that aren't obvious from the rubric
- Detects what the organizers secretly value based on what they've selected before
- Surfaces differentiation opportunities (what's already been done ≠ do again)
- Calibrates the idea generation process with real signal, not guesses

---

## Activation

Activate when:
- User pastes past winner names / descriptions / links
- User says "look at previous winners"
- User says "what won last year?"
- `/past-winners`

Fallback: If no past winners provided, use heuristic analysis based on event type.

---

## Input Collection

Ask the user to provide any combination of:

```
Option A: Paste past winner names + brief descriptions
Option B: Paste the event's winner announcement page URL
Option C: Paste winner names only (no descriptions)
Option D: Describe the event type ("corporate innovation hackathon focused on fintech")
```

For Option C or D (minimal info): Apply heuristic patterns (see Heuristic Base section below).

---

## Analysis Framework

### Layer 1: Surface Patterns

For each past winner provided, extract:
- **Domain**: What sector/field did it address?
- **User type**: Who was the primary user?
- **Core mechanism**: What did the product actually *do*? (not just "it uses AI")
- **Wow factor**: What was the memorable moment / "aha"?
- **Tech stack signal**: Any mentioned tech that judges responded to?

### Layer 2: Meta-Patterns (across all winners)

After analyzing individual winners, identify cross-winner patterns:

**Pattern A: Domain preferences**
Did the same domains win repeatedly? Or did they rotate?
- Same domain winning 2+ times → organizers have a passion/agenda in that space
- Rotating domains → judges value breadth; any domain is viable

**Pattern B: Tech sophistication level**
Were winners technically complex or technically simple + polished?
- Complex projects won → judges have technical backgrounds; impress with depth
- Simple + polished won → judges are mixed; UX and narrative > complexity

**Pattern C: Team profile**
Solo projects, student teams, professional teams?
- Correlation between team type and winning → tells you if "underdogs" score points

**Pattern D: AI usage**
Projects with AI at core vs. AI as feature vs. no AI?
- All winners used AI → it's expected (not differentiating)
- Winners mixed AI and non-AI → AI is a tool, not a signal; focus on the problem

**Pattern E: Narrative type**
Emotional/human story vs. technical/data-driven vs. business-case?
- Tells you the jury's "love language"

### Layer 3: What's Already Been Done

Produce a "done list" — ideas that have already won and should NOT be replicated:

```
ALREADY WON (avoid direct replication):
- [Winner 1 concept] → done in [year]
- [Winner 2 concept] → done in [year]
- [Pattern] → [N] of [M] past winners used this; saturated

UNDEREXPLORED SPACES (opportunity):
- [Domain] — never won at this event despite being relevant
- [User segment] — never targeted despite being in scope
- [Mechanism] — no winner has used this approach yet
```

### Layer 4: Jury Calibration Update

Update the judge profiling from `16_judge-profiler.md` based on actual past selections:
- If domain experts have always won on domain accuracy → domain accuracy is a hidden heavyweight criterion
- If the "most polished" project consistently won → UX is a de facto criterion even if not in rubric
- If underdogs beat established teams → jury rewards surprise and sincerity

---

## Winning Project Archetypes

Based on broad hackathon pattern analysis, these archetypes win most frequently:

### Archetype 1: "The Invisible Problem" ⭐ (Most Common Winner)
- Problem that exists but nobody has quantified or made visible
- Solution: real-time visualization or detection of something previously opaque
- Example type: "X is happening, you just couldn't see it until now"
- Why it wins: delivers the "wow" moment instantly in the demo

### Archetype 2: "The Human at Risk" ❤️ (Emotional Win)
- A vulnerable person is in a bad situation; this product gives them power/protection
- Healthcare, safety, education, economic inclusion
- Why it wins: emotional resonance; hard to vote against

### Archetype 3: "The Efficiency Multiplier" 💼 (Corporate Hackathon Win)
- Takes something professionals do manually and 10x's their throughput
- The ROI calculation is obvious
- Why it wins: procurement-ready narrative; immediate deploy story

### Archetype 4: "The Platform Play" 🚀 (Startup/VC Hackathon Win)
- Builds a thin layer that enables an ecosystem of use cases
- Defensible through network effects or data moat
- Why it wins: investor-brained judges see the compounding potential

### Archetype 5: "The Regulator's Dream" 🏛️ (Government/Public Sector Win)
- Solves a compliance, transparency, or accountability problem
- Audit trail, explainability, open-source code
- Why it wins: signals trustworthiness to risk-averse public sector judges

### Archetype 6: "The Tech Demo That Shouldn't Exist Yet" 🤯 (Technical Win)
- Does something technically that 3 months ago wasn't possible (new model, new API)
- The "why now" is built into the technology itself
- Why it wins: technical judges experience genuine surprise

---

## Heuristic Patterns (No Past Winners Provided)

If no past winner data is available, apply by event type:

### Corporate / Enterprise Hackathon
```
Pattern: ROI-framed solutions with existing system integration stories win.
Bias: Ideas that say "plugs into Salesforce/SAP/existing workflow within 2 weeks"
What never works: B2C consumer apps, open-source idealism, market disruption narratives
```

### University / Student Hackathon
```
Pattern: Ambition + execution evidence beats polish.
Bias: "These students built something that shouldn't be possible in a weekend"
What never works: Safe/obvious ideas that don't take any risk
```

### Domain-Specific (Health, Climate, Edu, etc.)
```
Pattern: Domain accuracy + technical credibility + impact metric
Bias: Projects led by or built for actual domain users (not imagined users)
What never works: Generic AI features applied to the domain without domain insight
```

### Open Innovation / Startup Hackathon
```
Pattern: Market size + differentiation + fundable team narrative
Bias: Ideas that sound like they could raise a seed round
What never works: Projects solving niche personal problems without market validation
```

### Tech Company Hackathon (Google, Microsoft, AWS)
```
Pattern: Ecosystem integration + API showcase + developer experience
Bias: Projects that use the host company's products creatively and justify why
What never works: Projects that don't use the host's stack at all
```

---

## Output Format

```
PAST WINNERS ANALYSIS REPORT
──────────────────────────────

WINNERS ANALYZED: [N]
EVENT TYPE: [Classification]

SURFACE PATTERNS:
[Winner 1]: [Domain] | [User] | [Mechanism] | [Wow factor]
[Winner 2]: [Domain] | [User] | [Mechanism] | [Wow factor]
...

META-PATTERNS DETECTED:
Domain preference: [Finding]
Tech sophistication: [Finding]
Narrative type: [Finding]
AI pattern: [Finding]

WHAT'S ALREADY BEEN DONE:
- [Concept 1] (saturated)
- [Concept 2] (done [Year])

UNDEREXPLORED OPPORTUNITIES:
- [Domain/approach 1]
- [Domain/approach 2]

WINNING ARCHETYPE MATCH:
Best fit for this event: [Archetype Name + why]
Second best: [Archetype Name]

JURY CALIBRATION UPDATE:
Based on past selections, adjust scoring weights:
  Impact: [Increase / Same / Decrease]
  Technical depth: [Increase / Same / Decrease]
  UX polish: [Increase / Same / Decrease]
  Business model: [Increase / Same / Decrease]
  Novelty: [Increase / Same / Decrease]

RECOMMENDATION FOR IDEA GENERATION:
[2-3 sentence strategic guidance for the idea generation step]
```

---

## Integration

- Run in STEP 1 or STEP 2 (before idea generation) if past winner data is available
- Outputs feed into:
  - `06_idea-synthesizer.md`: adjusted scoring weights
  - `13_winner-patterns.md`: event-specific pattern overlay
  - `16_judge-profiler.md`: jury calibration update
  - `17_competitor-radar.md`: "already done" list → add to Generic Trap detector
- Invoked standalone via `/past-winners`

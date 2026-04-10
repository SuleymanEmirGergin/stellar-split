# Judge Profiler — Module 16

## Purpose

Analyze the jury composition and build a **psychological + professional profile map** to:
- Tune the pitch tone to match the jury's mental model
- Identify which demo moments will resonate most per judge
- Surface hidden bias patterns (what they secretly reward)
- Produce a per-judge "attention hook" strategy

---

## Input

Accept any combination of:
- Jury member names + titles + organizations
- LinkedIn URLs or bios (if user pastes them)
- Generic description: "mostly VCs", "technical panel", "corporate innovation leads"
- No info → fall back to "balanced jury" assumptions

---

## Profiling Framework

For each jury member (or jury archetype if no names given):

### 1. Background Archetype Classification
Classify each judge into one or more of:

| Archetype | Description | What They Secretly Reward |
|-----------|-------------|---------------------------|
| **VC / Investor** | Fund managers, angels, accelerator partners | Market size > feature set; exits > impact claims; traction signal even if fake-ish |
| **Corporate Innovation** | CDO / CTO / Innovation Lab leads from big companies | Pilot readiness; enterprise-safe tech; integrates with existing stack |
| **Technical Expert** | Senior engineers, CTOs, Dev Advocates | Code quality signals; architecture clarity; non-trivial problem |
| **Product / Design** | CPOs, UX leads, design thinkers | UX clarity; "did they talk to users?"; problem-solution fit |
| **Academic / Research** | Professors, think tank leads | Novel method; citations-friendly; long-term potential |
| **Domain Specialist** | Sector experts (health, fin, edu, gov) | Domain accuracy; regulation-awareness; real-world fit |
| **Media / PR** | Journalists, community leads | Storytelling; viral-ability; human interest angle |
| **Founder / Operator** | Serial entrepreneurs | Execution evidence; team credibility; realistic scope |

### 2. Jury Composition Score
After classifying all judges, produce:
- **Jury Flavor**: Technical-heavy / Investor-heavy / Mixed / Domain-specific
- **Primary Optimization Target**: What the majority will score highest
- **Secondary Target**: Second most influential jury segment

### 3. Pitch Tone Calibration
Based on jury flavor, prescribe:

**If Investor-heavy:**
- Lead with market size and urgency ("$4.2B market, 47% underserved")
- Business model must be in first 90 seconds
- Use startup language: TAM/SAM/SOM, unit economics, retention
- Avoid overengineering the demo — 1 clear "aha moment" beats complexity

**If Technical-heavy:**
- Show architecture diagram in the demo
- Name your data structures and algorithm choices
- Highlight edge cases you handled
- Say what you deliberately cut and why

**If Corporate Innovation-heavy:**
- Emphasize integration story: "plugs into Salesforce / SAP / existing workflow"
- Mention compliance, security, audit-readiness
- Use ROI framing: "saves X hours / reduces Y% error rate"

**If Domain Specialist-heavy:**
- Use their industry vocabulary precisely
- Cite a real pain point from their sector
- Show you understand regulation or constraints
- Avoid overpromising with AI

**If Mixed:**
- Hook is emotional/narrative (works across all)
- Architecture in appendix (satisfies technical)
- 1 business slide (satisfies investor)
- Domain grounding moment in demo (satisfies specialist)

### 4. Demo Moment Mapping
For each judge archetype present, identify:
- **Most impactful screen** to show them
- **One sentence to say** to each archetype during the demo
- **Question they'll likely ask** → pre-prepared answer

### 5. Hidden Bias Warnings
Surface known biases per archetype:

- VC: may dismiss "social good" without a monetization story
- Technical: may penalize if they spot a non-deterministic AI claim without eval
- Corporate: will ask "who's the security owner?" — have an answer
- Domain Specialist: will catch any factual domain error → double-check all claims
- Academic: will push back on "AI does X" without methodology explanation
- Media: doesn't care about tech depth — cares about the human story

---

## Output

Produce a **Judge Profile Report** containing:

```
JURY COMPOSITION
───────────────
[Name/Archetype] → [Classification] → [Top Priority]
...

JURY FLAVOR: [e.g., Mixed — Investor 40% / Technical 35% / Domain 25%]
PRIMARY OPTIMIZATION: [e.g., Demonstrate market urgency + 1 business model slide]
SECONDARY OPTIMIZATION: [e.g., Architecture diagram available on request]

PITCH TONE PRESCRIPTION
───────────────────────
Opening hook: [tailored opening sentence or approach]
Avoid: [specific language/claims to avoid]
Emphasize: [specific angles to emphasize]

PER-JUDGE DEMO MOMENTS
──────────────────────
[Judge/Archetype] → Show [Screen X] → Say: "[Line]" → Prep answer for: "[Q]"

HIDDEN BIAS WARNINGS
────────────────────
⚠ [Warning 1]
⚠ [Warning 2]
...

Q&A PREP (Top 5 Expected Questions)
────────────────────────────────────
Q: [Question]
A: [Concise answer — 2 sentences max]
```

---

## Fallback (No Jury Info Given)

If jury info is completely unavailable, use this default profile:

- Assume mixed jury: 30% investor, 30% technical, 40% domain
- Pitch tone: narrative-first, business model in minute 2, architecture visible in demo
- Q&A prep: monetization, scalability, data privacy, team background, next steps

---

## Integration

- Called after STEP 1 (Event Brief) if jury info is present
- Output feeds into `08_pitch-script.md` (tone), `09_demo-script.md` (moment order), `11_win-dna-analyzer.md` (judge alignment check)
- Add "Judge Alignment" column to the scoring rubric in `06_idea-synthesizer.md`

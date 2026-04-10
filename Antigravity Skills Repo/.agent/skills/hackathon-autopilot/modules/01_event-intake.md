# Event Intake — Module 01

## Purpose

Extract all critical information from the hackathon brief, registration page, or user description. Produce a structured **Event Brief** that all subsequent modules draw from. This is the **single source of truth** for the entire planning session.

Run this first. Everything else depends on it.

---

## Extraction Protocol

When the user provides a hackathon brief (URL, paste, or description), extract the following in order. For each field, note whether it was **explicitly stated**, **inferred**, or **missing**.

---

### Block 1: Event Identity

```
EVENT IDENTITY
───────────────
Event name: [Full official name]
Organizer: [Company / institution / community]
Event type: [Will be confirmed by 32_hackathon-type-detector.md]
URL: [Registration or info page if provided]
Edition: [Year / edition number — signals maturity and available past data]
```

---

### Block 2: Timeline

```
TIMELINE
─────────
Registration deadline: [Date + time + timezone]
Kickoff / start: [Date + time + timezone]
Build period: [From → To, total hours calculated]
Submission deadline: [Date + time + timezone — HARD deadline]
Demo / judging: [Date + time + format: live pitch / async video / booth]
Results announcement: [Date if known]

Build hours available: [Calculated from kickoff → submission]
Demo duration per team: [Minutes, if specified]
Presentation format: [Slides + live demo / video only / booth / written]
```

**If timezone not specified:** Ask. A submission deadline error is a complete loss.

---

### Block 3: Themes & Tracks

```
THEMES & TRACKS
────────────────
Primary theme(s): [List — these define the playing field]
Sub-tracks (if any): [Named categories teams compete within]
Mandatory theme alignment: [YES / NO — must the project address the theme?]
Theme interpretation flexibility: [Strict / Moderate / Open — inferred from language]

Theme analysis:
  Most specific track: [The narrowest, least crowded track]
  Most competitive track: [The broadest — most teams will go here]
  Strategic recommendation: [Which track to target — will be refined after idea generation]
```

---

### Block 4: Judging Criteria

```
JUDGING CRITERIA
─────────────────
[If weights are provided — use exact numbers]
[If no weights — use "equal" or infer from language emphasis]

Criterion 1: [Name] — Weight: [X%] — Definition: [What it means in practice]
Criterion 2: [Name] — Weight: [X%] — Definition: [...]
Criterion 3: [Name] — Weight: [X%] — Definition: [...]
[...]

Total: 100%

Implicit criteria (not stated but always present):
  - Demo reliability (always matters)
  - Presentation quality (always implicit)
  - Team execution evidence (always assessed)

Primary optimization target:
  [The single criterion that will most differentiate finalists from the rest]
```

**If no judging criteria are provided:** State this explicitly. Use the inferred archetype from `32_hackathon-type-detector.md` to estimate likely criteria.

---

### Block 5: Constraints

```
CONSTRAINTS
────────────
Stack constraints:
  Required: [Must-use technologies, APIs, or platforms — e.g., "must use Azure AI"]
  Prohibited: [Technologies not allowed]
  Preferred (not required): [Sponsor tech that scores bonus points]

Data constraints:
  Provided datasets: [Names, types, access method]
  Open data allowed: [YES / NO / with restrictions]
  Real user data allowed: [YES / NO — affects demo]

Team constraints:
  Team size: [Min–Max members]
  Eligibility: [Geographic, professional, age restrictions]
  New ideas only: [Can existing projects be submitted?]

IP / IP Rights:
  Who owns the IP: [Team / Organizer / Shared — check the rules]
  Open source required: [YES / NO]

Content rules:
  Any topic restrictions: [Sensitive domains, competitive products, etc.]
```

---

### Block 6: Prize & Stakes

```
PRIZES & STAKES
────────────────
1st place: [Prize — cash / investment / product credits / opportunity]
2nd place: [Prize]
3rd place: [Prize]
Special prizes: [Sponsor-specific, track-specific, audience vote, etc.]

Non-cash value:
  Investment / accelerator: [YES / NO + amount / name]
  Media / PR exposure: [YES / NO + estimated reach]
  Hiring opportunity: [YES / NO]
  Pilot customer introduction: [YES / NO]

Stakes assessment: [HIGH / MEDIUM / LOW]
  [1-sentence rationale: why this hackathon is or isn't worth max effort]
```

---

### Block 7: Sponsors & Partners

```
SPONSORS & PARTNERS
────────────────────
Title sponsor: [Name + industry]
Tech sponsors: [Names + specific tech/API they're promoting]
Data partners: [Names + datasets they're providing]
Judging partners: [Names + what they optimize for]

Sponsor integration opportunities:
  [For each sponsor: API / tool / dataset they want teams to use]
  [Bonus points or special prizes for using sponsor tech]

→ Full analysis in 23_sponsor-alignment.md
```

---

### Block 8: Jury (if known)

```
JURY
─────
[List known judges: Name, Title, Organization]
[If no names: "TBD — will revisit when announced"]

→ Full profiling in 16_judge-profiler.md
```

---

## Gap Detection

After extraction, identify missing critical fields and classify them:

```
INFORMATION GAPS
─────────────────
BLOCKING (cannot proceed without):
  ☐ [Field] — Why blocking: [Impact on planning]
  → ACTION: Ask user now before continuing

NON-BLOCKING (can proceed, will note assumption):
  ☐ [Field] — Assumption used: [What we assume and why]
  → Will flag in relevant modules

NOT APPLICABLE:
  ☐ [Field] — Reason: [Why this field doesn't apply to this event]
```

**Blocking gap protocol:**
If a BLOCKING gap exists, stop and ask:
> "Before I continue, I need [specific info]. Can you paste [where to find it]?
> Without this, I'd be planning based on a wrong assumption."

---

## Smart Inference Rules

Apply these when information is implied but not stated:

| Implicit Signal | Inferred Value |
|----------------|----------------|
| "Corporate hackathon" + no VC sponsor | Event type = Corporate, de-emphasize VC mode |
| "48-hour hackathon" | Build hours ≈ 40h (rest + meals deducted) |
| "Demo day" mentioned | Live pitch format, assume 3-5 min presentation |
| "Must use [Sponsor API]" | Mandatory constraint — not optional for scoring |
| Judging criteria not listed | Equal weight across Innovation / Impact / Execution / Demo |
| Prize includes "accelerator access" | Investor archetype judges likely — activate VC mode |
| "Open data" or "your own data" | Team must gather or synthesize datasets |
| Government/institution organizer | Impact + feasibility weighted over novelty |

---

## Output: The Event Brief

After extraction, produce a single compact summary for reference throughout the session:

```
EVENT BRIEF
════════════════════════════════════════════════════════════════
Event:        [Name] — [Organizer]
Build window: [From] → [To] ([N] hours)
Submit by:    [Hard deadline with timezone]
Demo format:  [Format + duration]
════════════════════════════════════════════════════════════════

THEME:        [Primary theme + recommended track]
CRITERIA:     [Top 3 criteria with weights or equal]
PRIMARY OPT:  [Criterion to optimize for most]
════════════════════════════════════════════════════════════════

HARD CONSTRAINTS:
  Stack:  [Required / prohibited tech]
  Data:   [Provided datasets / open data rules]
  Team:   [Size + eligibility]
  IP:     [Who owns what]
════════════════════════════════════════════════════════════════

PRIZES:       [1st / 2nd / 3rd + special prizes]
SPONSORS:     [Names + their tech to consider]
JURY:         [Known judges or TBD]
════════════════════════════════════════════════════════════════

GAPS:         [Any missing critical information — flagged]
EVENT TYPE:   [→ Confirmed by 32_hackathon-type-detector.md]
NEXT:         [First module to run after intake]
════════════════════════════════════════════════════════════════
```

---

## Integration

- **Always runs first** — STEP 1 of the pipeline
- Immediately triggers `32_hackathon-type-detector.md` (event type determines pipeline weights)
- Event Brief is referenced by every subsequent module
- Judging criteria feed into `16_judge-profiler.md` and `06_idea-synthesizer.md`
- Constraints feed into `20_tech-stack-advisor.md` and `10_risk-cut-scope.md`
- Sponsors feed into `23_sponsor-alignment.md`
- Timeline feeds into `18_live-build-tracker.md` (build schedule generation)

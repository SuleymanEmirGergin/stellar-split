# Demo Domination — Module 05

## Purpose

Engineer the "wow moment" — the single demo beat that makes a judge put their pen down and lean forward. This module is run BEFORE writing the demo script (`09_demo-script.md`) to ensure the aha moment is designed, not stumbled into.

---

## The Wow Moment Equation

```
WOW = Surprise × Clarity × Relevance
```

- **Surprise:** The judge didn't expect the output to be THAT good / fast / accurate
- **Clarity:** The judge immediately understands what they're seeing without explanation
- **Relevance:** The judge can imagine a real person in their world caring about this

Optimize all three. A wow with low clarity = confusion. A wow with low relevance = "cool tech."

---

## Step 1: Identify the Wow Candidate

From the winning idea's architecture, identify the single output that best satisfies all three conditions.

Ask:
```
1. What is the most surprising thing our product can show in under 5 seconds?
2. What output would make someone in the audience say "wait, how did it do that?"
3. What result changes a real decision for a real person?
```

Candidates typically fall into these categories:

| Category | Wow Trigger | Example |
|----------|-------------|---------|
| Speed | Output appears in < 3 seconds that would take a human hours | "48 contracts reviewed in 4 seconds" |
| Accuracy | Finds something specific in a sea of noise | "Identified the fraud signal buried on page 47" |
| Prediction | Shows the future with a confidence score | "This patient has 73% likelihood of readmission in 7 days" |
| Synthesis | Connects data from multiple sources that weren't meant to connect | "Your supplier's delays correlate with their social media complaints" |
| Revelation | Makes visible what was completely invisible | "These 3 employees are about to leave — here's the behavioral signal" |
| Automation | Reduces a multi-step manual process to one click | "Just uploaded the invoice — routing, categorization, and approval queued" |

---

## Step 2: Design the Wow Sequence

The wow moment must be **crafted in advance**, not improvised.

```
WOW MOMENT SPECIFICATION
──────────────────────────
Category: [Speed / Accuracy / Prediction / Synthesis / Revelation / Automation]

Input (what the user does):
  Action: [What they click, type, upload, or say]
  Why it's relatable: [Judge can imagine doing this themselves]

The Moment:
  What appears on screen: [Exact description — color, number, graph, text]
  Time from input to output: [X seconds]
  Key element the presenter points to: [Specific UI element]

Why it's surprising:
  Current alternative (manual): [Time + error rate + who does it]
  Our result: [What we show + how it's better]
  The gap: [Express as ratio: "10x faster" / "0 errors vs. avg N%" / "first time possible"]

The Presenter's Line:
  "[Exact words to say at this moment — the wow is amplified by the right sentence]"
```

---

## Step 3: The 15-Second Wow Test

The wow moment must land in ≤ 15 seconds of screen time.

**Test protocol:**
1. Start a timer
2. Open the app — start from the input action
3. Time how long until the judge would see the key output
4. If > 15 seconds: redesign the demo flow, not the product

**Redesign options if > 15 seconds:**
- Pre-load the input data (so the user only hits "Analyze")
- Use demo mode (pre-computed output appears instantly)
- Start from the result and work backward ("here's what it found — let me show you how")
- Move the aha moment earlier in the flow

---

## Step 4: Persona Engineering

The wow moment is amplified 3× by a strong persona setup.

**Persona requirements:**
```
DEMO PERSONA
─────────────
Name: [First name only — makes it human, not statistic]
Role: [Specific job title]
Situation: [What they were just told / just received / just discovered]
Emotional state: [Stressed / frustrated / overwhelmed / responsible for outcome]
What's at stake if they get it wrong: [Real consequence in their terms]
```

**Why this works:**
The judge stops seeing "product feature" and starts seeing "person in trouble being helped." Emotional investment follows immediately.

---

## Step 5: Live vs. Pre-Computed Decision

**Rule: Every wow moment must have a pre-computed fallback version.**

Decide before the hackathon:

| Demo Mode | When to Use | How to Implement |
|-----------|------------|-----------------|
| Live AI | Internet is confirmed reliable + < 3s latency guaranteed | Normal API call with demo-safe inputs |
| Demo Mode | Any doubt about connectivity or latency | `DEMO_MODE=true` flag → hardcoded response |
| Pre-recorded clip | Product crashed or unreliable | 15s screen recording → play on click |
| Offline screenshots | Everything else fails | 4 annotated screenshots as slide deck |

**The "demo-safe input" rule:**
Pre-select your demo input values so the AI response is always the impressive one. Never type fresh text live unless you've tested that exact input 10+ times.

---

## Step 6: Environmental Optimization

```
DEMO ENVIRONMENT CHECKLIST
───────────────────────────
Display:
☐ Font size: set to 110-125% zoom (readability on projector)
☐ No notifications visible (do not disturb ON)
☐ Bookmarks bar hidden (cleaner look)
☐ URL bar hidden or minimal (removes "localhost" / "127.0.0.1" embarrassment)

Content:
☐ 3+ demo scenarios pre-loaded (not just one)
☐ Seed data is realistic-looking (real names, real numbers, real context)
☐ Empty states are handled (no "no data found" on first load)
☐ Error states are handled (no red error on screen)

Backup:
☐ Screen recording saved locally (not cloud only)
☐ Screenshots on USB drive
☐ Fallback works without internet (tested offline)
```

**Seed data principle:** Real-looking fake data > generic/placeholder data. "James Chen, Emergency Room Nurse, UCSF Medical Center" outperforms "User 1, Hospital."

---

## The Anti-Wow: 8 Demo Killers

```
☠️ KILLER 1: Spinner of death
   API call fails silently → loading spinner → silence → awkward recovery
   FIX: Demo mode before every presentation

☠️ KILLER 2: Uncentered, tiny output
   Results show in a corner, judge can't read from their seat
   FIX: Zoom to 125%, result fills center of screen, bold + large font

☠️ KILLER 3: Dense tabular output
   Raw data table appears → judge sees cells, not insight
   FIX: Highlight 1-3 key cells, use color, add a "what this means" summary

☠️ KILLER 4: Cluttered input form
   Judge watches typing and form-filling for 30 seconds → bored
   FIX: Pre-fill everything. One click, one enter, result appears.

☠️ KILLER 5: Generic seed data
   "Lorem ipsum" / "Test user" / "Example Company" → feels like a prototype
   FIX: Specific fake data with real-looking names, numbers, and context

☠️ KILLER 6: No visual hierarchy
   Output is a wall of text → judge doesn't know where to look
   FIX: One big number / one headline insight at top, details below

☠️ KILLER 7: Missing loading state
   Click → frozen screen → panic about whether it's working
   FIX: Instant skeleton loading state, then result (or demo mode)

☠️ KILLER 8: Presenter looking at screen, not judges
   Presenter turns their back to read the output
   FIX: Memorize where the key element appears. Face the audience. Point behind.
```

---

## Output: Wow Moment Summary Box

Produce this for the Winner Pack:

```
WOW MOMENT SUMMARY
───────────────────
Type: [Speed / Accuracy / Prediction / Synthesis / Revelation / Automation]
Persona: [Name, role, situation]
Input action: [Exactly what user does]
The moment: [Exactly what appears on screen]
Key element: [What presenter points to]
Presenter's line: "[Exact words]"
Time to wow: [X seconds from input]
Demo mode: [Live / Pre-computed / Hybrid]
Fallback: [Level 1 / 2 / 3 — which is prepared]
```

---

## Integration

- Runs before `09_demo-script.md` — provides the wow moment specification
- Persona from this module feeds into `14_auto-figma-ui-flow.md` (UI screens designed for this persona)
- Environmental checklist aligns with `25_wrapup-validator.md` (pre-submission demo check)
- Demo killer audit is re-checked during `/wrapup`

# Pitch Coach — Module 31

## Purpose

An interactive **pitch delivery coach** that evaluates the team's pitch in real time and prescribes specific, actionable improvements before they go on stage.

Unlike `27_negotiation-qa-simulator.md` (which handles Q&A), this module focuses entirely on the **pitch performance itself**: structure, timing, language, energy, and opening hook quality.

---

## Activation

Activate when:
- User says "coach me on my pitch"
- User says "let's practice the pitch"
- User says "review my pitch"
- User pastes their pitch text for evaluation
- `/pitch-coach`

---

## Input Options

Accept any of:
1. **Written pitch text** (user pastes their 60s or 3min script)
2. **Bullet outline** (user describes the structure, not full sentences)
3. **"I'll tell you out loud"** → AI prompts the user section by section

---

## Evaluation Framework

### Dimension 1: The Opening Hook (0-10)

The first 10 seconds determine if judges lean in or zone out.

**What to look for:**
- Does it start with a story, stat, or question — NOT an introduction?
- Is the hook specific (names a person, place, or number) or generic?
- Does it create tension or curiosity?
- Is "Hello, my name is X and today I'll present Y" used? (automatic -3 points)

**Hook quality rubric:**

| Score | Description |
|-------|-------------|
| 9-10 | Specific, surprising, creates immediate tension — judge leans forward |
| 7-8 | Good hook but slightly generic or slow warmup |
| 5-6 | Gets to the point but no emotional pull |
| 3-4 | Opens with introduction or boilerplate |
| 0-2 | "Hello everyone, today we'll be presenting..." |

**Better hook generator:**
If hook scores < 7, produce 3 alternative opening lines:
```
HOOK ALTERNATIVES
──────────────────
Option A (Stat): "[Specific number] [domain users / events / dollars] [suffer / waste / miss] every [time period]. [Product name] is changing that."

Option B (Story): "Last [timeframe], [real or archetypal person] faced [specific problem]. There was no good answer. Until now."

Option C (Confrontation): "Right now, somewhere in [domain], [bad thing] is happening. And most people in this room have the power to change it. We built the tool that does it."
```

---

### Dimension 2: Problem Statement (0-10)

**What to look for:**
- Is one specific person named/described (not "many users")?
- Is the scale of the problem quantified?
- Is there an urgency signal ("right now", "every day", "by 2030")?
- Is the problem felt emotionally, not just stated intellectually?

**Common mistakes:**
- "Many people face this challenge" → Who? How many? Be specific.
- "It's a complex problem" → Name the complexity. State the stakes.
- Spending > 60 seconds on problem in a 5-minute pitch → Too long.

**Problem statement template (if weak):**
```
"[Specific user segment] — [N million/billion of them] — [face specific problem].
The current solution is [inadequate because specific reason].
The cost: [specific consequence in money / time / lives / missed opportunity].
There's a better way."
```

---

### Dimension 3: Solution Delivery (0-10)

**What to look for:**
- Is the solution explained in one sentence before expanding?
- Does the explanation avoid jargon that non-technical judges won't understand?
- Is there a clear before/after contrast?
- Do they say "let me show you" or similar demo bridge?

**Common mistakes:**
- Over-explaining the technology before establishing the value
- Using acronyms without defining them
- No transition to the demo ("and now let's look at our slides" vs "let me show you")

**One-sentence solution template:**
```
"[Product name] is a [product type] that [action verb] [outcome] for [user segment] by [key mechanism]."

Example: "PulseID is a real-time dashboard that detects supply chain disruptions for logistics managers by scanning invoice anomalies and supplier news simultaneously."
```

---

### Dimension 4: Demo Bridge (0-10)

The moment where the presenter transitions from pitch to demo IS the highest-stakes moment.

**What to look for:**
- Is there an explicit bridge line that sets up what the judge is about to see?
- Does the presenter tell the judge what to LOOK FOR during the demo?
- Is there a demo persona ("meet Sarah, a logistics manager who...")?

**Bridge template:**
```
"Let me show you exactly how this works.

Meet [persona name], a [job title] who [describes the problem at a personal level].

Watch what happens when [persona] uses [product name] to [action] — 
specifically, keep an eye on [the key output/metric] in the top right."
```

**Why this works:** You're priming the judge to focus on the most impressive moment instead of wandering around the screen.

---

### Dimension 5: Impact Statement (0-10)

**What to look for:**
- Is there exactly ONE primary metric (not a list of five)?
- Is the metric visually presented (large, bold, centered) or buried in text?
- Is the methodology hinted at ("in our 48-hour prototype, we tested with...") or is it purely speculative?
- Is the claim defensible — can they explain how they calculated it?

**Impact statement template:**
```
"In [context — our prototype / 48-hour test / survey of N users], [product name] [verb]:
[PRIMARY METRIC] — large, specific, bold

[Supporting metric 1] and [supporting metric 2]."
```

**Credibility add-ons (even for hackathon):**
- "We interviewed [N] [domain users] before building"
- "We tested with [N] real records / scenarios"
- "Our simulation used [data source]"

---

### Dimension 6: Business Model Clarity (0-10)

**What to look for:**
- Is a revenue model present? (Even 1 sentence is enough)
- Is the pricing model realistic for the user segment?
- Is there a deployment path ("we'd launch to [specific segment] via [channel]")?

**Minimum viable business model (for hackathon):**
```
"[Product name] charges [user type] [pricing model] — [price] per [unit].
Our beachhead: [specific, small, attainable first customer segment].
Initial distribution via [specific channel]."
```

---

### Dimension 7: Closing & Ask (0-10)

**What to look for:**
- Does the pitch end on a high, not trail off?
- Is there a specific "ask" — not just "thank you" or "questions?"
- Is the ask calibrated to this audience (introduction, pilot customer, feedback, etc.)?

**Strong closing formula:**
```
"[Product name] gives [user] [capability] for the first time.
We're [specific next step — launching beta / open sourcing / seeking pilot customers].
If you know [type of person/company], we'd love an introduction.
[ONE sentence memorable summary].
Thank you."
```

**Weak closings to fix:**
- "And that's our presentation, thank you!" → No ask, no summary
- "Any questions?" as the closing line → Passive, no energy
- Running out of time mid-sentence → Time your pitch (every time)

---

### Dimension 8: Timing (Critical)

**Check:**
- Is the pitch under the time limit?
- Is there appropriate pacing (not machine-gun delivery)?
- Is the demo well-timed (doesn't exceed its allocated slot within the pitch)?

**Time budget for a 5-minute pitch:**
```
Hook + Problem:     45-60 seconds
Solution:           30-45 seconds
Demo bridge + Demo: 90-120 seconds
Impact:             30-45 seconds
Business model:     20-30 seconds
Team + Ask:         20-30 seconds
Buffer:             15-20 seconds
──────────────────────────────────
Total:              5:00-5:30 (have a cut line at 4:45)
```

---

## Full Pitch Evaluation Output

```
PITCH EVALUATION
─────────────────

Total Score: [XX/80]
Grade: 

  72-80 → 🟢 STAGE READY — go get 'em
  60-71 → 🟡 ALMOST THERE — 2-3 fixes needed
  45-59 → 🟠 NEEDS REWORK — significant structural edits
  < 45  → 🔴 REBUILD — start from structure, not sentences

DIMENSION SCORES:
  Opening Hook:      [X/10]
  Problem Statement: [X/10]
  Solution Delivery: [X/10]
  Demo Bridge:       [X/10]
  Impact Statement:  [X/10]
  Business Model:    [X/10]
  Closing & Ask:     [X/10]
  Timing:           [X/10]

TOP 3 THINGS THAT WORK:
  1. [Specific compliment — be precise]
  2. [Specific compliment]
  3. [Specific compliment]

TOP 3 THINGS TO FIX (prioritized by impact):
  1. [Specific fix — include rewritten line if possible]
  2. [Specific fix]
  3. [Specific fix]

REWRITTEN SECTIONS:
  [If hook < 7]: [3 alternative opening lines]
  [If closing < 7]: [Rewritten closing paragraph]
  [If impact < 7]: [Rewritten impact statement]
```

---

## Iterative Coaching Mode

After the first evaluation, offer:

```
"Would you like to:
A) Resubmit the full pitch with changes (full re-evaluation)
B) Work on one section at a time (section coaching)
C) Run a timed practice (I'll simulate the clock and give real-time feedback)
D) Jump straight to Q&A practice (/qa-sim)"
```

---

## The 2-Minute Drill

A fast coaching exercise when time is short:

1. User delivers just the **opening + problem + one-sentence solution** (should be < 90 seconds)
2. AI evaluates those 3 elements only
3. One rewrite suggestion per element
4. "Run it again"

This is the highest-ROI coaching loop when < 30 minutes to demo.

---

## Integration

- Standalone module — invoked via `/pitch-coach`
- Uses: pitch content from `08_pitch-script.md`, jury profile from `16_judge-profiler.md`
- Feeds into: `09_demo-script.md` (refine demo bridge), `19_slide-deck-generator.md` (align slide content with revised pitch)
- Best used 2-4 hours before presenting, then once more 30 minutes before

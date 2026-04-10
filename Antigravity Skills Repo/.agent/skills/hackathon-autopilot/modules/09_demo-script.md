# Demo Script — Module 09

## Purpose

The demo is the **highest-leverage 90 seconds** of the entire hackathon. A perfect product with a bad demo loses. A mediocre product with a perfect demo finals. This module engineers the demo from first principles.

---

## Core Principle: The Demo is a Controlled Story, Not a Product Tour

Most teams open their app and start clicking. That is wrong.

The demo must be:
1. **Pre-scripted** — every word, every click, pre-decided
2. **Persona-driven** — one specific person with one high-stakes problem
3. **Outcome-first** — judge sees the result before they understand the mechanism
4. **Fallback-ready** — the demo works whether or not the internet does

---

## The 90-Second Demo Structure

### Beat 1: The Setup (0–10 seconds)
**Goal:** Instantly ground the judge in a specific reality.

> "Meet [Persona Name], a [job title/role].
> Right now, [Persona] is facing [specific high-stakes situation].
> Watch what happens when [Persona] uses [Product Name]."

**Rules:**
- The persona must be specific (not "a user" — give them a name)
- The situation must be urgent ("right now", "this morning", "in the next 10 minutes")
- Never say "so first let me show you our dashboard"

---

### Beat 2: The Input (10–25 seconds)
**Goal:** Show the user doing something simple and natural.

> "[Persona Name] opens [product name] and [types / uploads / speaks / scans]: [exact input]."

**Rules:**
- The input should be something the judge relates to
- Keep it simple — filling in one field, uploading one file, pressing one button
- Narrate what's happening: don't assume the judge can read the screen
- If the input takes time: "In production this processes in under 2 seconds."

---

### Beat 3: The "Aha Moment" (25–55 seconds) ← THIS IS EVERYTHING
**Goal:** The single moment where the product's value becomes undeniable.

This is the moment that either wins or loses the demo. It must be:
- **Visually striking** (a number that changes, a map that populates, a risk that turns red)
- **Instantly understandable** without explanation
- **Emotionally resonant** (the judge should feel something — relief, surprise, interest)

> "[Product name] instantly shows [what the output is].
> Look at [specific element] — [what it means for the persona].
> [One sentence explaining why this is impossible to do manually / with existing tools]."

**Aha Moment Types by Product Category:**

| Product Type | Ideal Aha Moment |
|-------------|-----------------|
| Detection / alert | A problem found instantly that was hidden before |
| Prediction / forecast | A future outcome revealed with a confidence score |
| Automation | A 3-hour task completing in 8 seconds |
| Matching / recommendation | The perfect match appearing, ranked with reason |
| Visualization | An invisible pattern made visible on a map or chart |
| Decision support | A complex decision reduced to 3 options with tradeoffs |

---

### Beat 4: The Drill-Down (55–75 seconds)
**Goal:** Show depth — the aha moment wasn't a magic trick.

> "And it's not just the result — here's why [Product Name] got there.
> [Click into a detail view / explanation panel / underlying data]
> You can see [specific transparent element] — this is what makes the output trustworthy, not just fast."

**Rules:**
- Show one level of depth — not more
- This is where explainability / audit trail / confidence score appears
- Keep it to 1 click maximum
- Say "transparent", "explainable", "auditable" — these words resonate with judges

---

### Beat 5: The Impact Frame (75–90 seconds)
**Goal:** Land the metric. Make it stick.

> "For [Persona Name], this means [outcome in their terms — saved hours, avoided mistake, unlocked revenue].
> Scaled across [N users / org / city / country], that's [impact metric].
> [Product Name] — [one-line tagline]."

**Rules:**
- The metric must be specific ("47% reduction" not "significant improvement")
- The tagline is the last thing they hear — it must be memorable
- Silence for 1 second after the tagline. Then stop.

---

## The Full Script Template

```
DEMO SCRIPT: [Product Name]
─────────────────────────────
Total time: 90 seconds
Presenter: [Name]
Device: [Laptop / Tablet / Phone]
Internet required: YES / NO (fallback: yes)

BEAT 1 — SETUP (0:00–0:10)
[Presenter says]:
"Meet [Persona], a [role]. Right now, [situation].
Watch what happens when [persona] uses [product]."

[Screen shows]: [Landing screen / login state / persona's dashboard]
[Action]: [None — just presenting]

─────────────────────────────
BEAT 2 — INPUT (0:10–0:25)
[Presenter says]:
"[Persona] [action verb] [exact input text/data]."

[Screen shows]: [Input form / upload dialog / voice prompt]
[Action]: [Type 'DEMO_INPUT_VALUE' / Upload prepared file / Click record]
[Timing note]: [If processing: "This runs in under 2 seconds in production."]

─────────────────────────────
BEAT 3 — AHA MOMENT (0:25–0:55) ⭐
[Presenter says]:
"[Product] immediately shows [output description].
Look at [specific UI element] — [what it means].
[Why this is impossible to do otherwise — 1 sentence]."

[Screen shows]: [Result screen — pre-validated to look correct]
[Action]: [Zero clicks — result is already visible / point to key element]
[Key visual]: [The element that must be on screen for this to land]

─────────────────────────────
BEAT 4 — DRILL-DOWN (0:55–1:15)
[Presenter says]:
"It's not just the result — here's why [product] got there.
You can see [explainability element] — this is what makes it trustworthy."

[Screen shows]: [Detail panel / audit view / confidence breakdown]
[Action]: [1 click into detail view]
[Key element to show]: [Confidence score / reasoning steps / data source]

─────────────────────────────
BEAT 5 — IMPACT FRAME (1:15–1:30)
[Presenter says]:
"For [persona], this means [outcome in their terms].
Scaled to [scope], that's [impact metric].
[Product name] — [tagline]."

[Screen shows]: [Impact visualization / metric / tagline screen]
[Action]: [Zero — let the metric speak]
[End]: [Silence 1 second. Stop speaking. Look at the judges.]

─────────────────────────────
TOTAL: 1:30
```

---

## Pre-Demo Preparation Checklist

```
DEMO PREP CHECKLIST
────────────────────
☐ Demo account / test data is seeded and verified
☐ Fallback screenshots are prepared (full-screen, readable)
☐ Browser is in full-screen / presentation mode
☐ Browser zoom is set to 110-125% (more readable on projected screen)
☐ Notifications are OFF (do not disturb mode)
☐ No other tabs open (distractions / confidential content)
☐ Dark mode matches the slide deck aesthetic (or intentionally different)
☐ Demo input values are pre-typed / pre-loaded (don't type live if you can avoid it)
☐ Internet tested at the venue (or offline fallback activated)
☐ Rehearsed minimum 3 times, timed each time
☐ Presenter knows every word. No improvising in the demo.
```

---

## Fallback Protocol (Critical)

**Rule: Never demo anything live that you haven't pre-computed.**

### Fallback Level 1 — Demo Mode Toggle (preferred)
Build a "Demo Mode" flag in the product:
- When `DEMO_MODE=true`, responses come from hardcoded seed data
- Flag is invisible to the user but makes the demo 100% reliable
- All AI responses pre-computed and validated to look impressive

### Fallback Level 2 — Recorded GIF / Video
If the product crashes during the demo:
- Have a 30-second screen recording of the perfect flow
- Open it immediately without apologizing
- Say: "Let me walk you through the recorded flow while the live environment stabilizes."
- Keep narrating as if it's live

### Fallback Level 3 — Annotated Screenshots
Last resort:
- A slide deck with 4-6 screenshots annotated with arrows
- Each screenshot has a caption explaining what's happening
- Presenter narrates as if walking through the app

### Fallback Line (memorize this)
If something breaks live:
> "Technology has opinions. Let me show you the pre-validated flow — 
> the result is identical to what you'd see live."

**Never say:**
- "Sorry, it's not working" (apologetic)
- "This usually works" (undermines trust)
- "Let me try again" (wastes time)

---

## Demo Anti-Patterns

```
❌ NEVER: Start with "So first, let me show you our home page..."
   WHY: Judges don't care about home pages. They care about the moment of value.
   DO: Start with the persona and the situation.

❌ NEVER: Explain the tech stack during the demo
   WHY: This is for the Q&A. The demo is for emotion, not architecture.
   DO: Save all tech explanations for after judges ask.

❌ NEVER: Type live in a text field if you can avoid it
   WHY: Typos, slow typing, uncomfortable silence. Pre-fill whenever possible.
   DO: Pre-type the input. Just hit enter.

❌ NEVER: Show the admin panel / database / code
   WHY: Judges see this and think "not a product." 
   DO: Show only the end-user facing product.

❌ NEVER: Run the demo in a browser tab with 15 other tabs open
   WHY: One wrong click ends your demo.
   DO: Clean browser, one tab, full screen.

❌ NEVER: Demo without a fallback
   WHY: APIs go down. Wi-Fi fails. Demos crash. 
   DO: Pre-compute everything. Always.

❌ NEVER: End with "So yeah, that's our product"
   WHY: Weak ending = weak impression = weak score.
   DO: End with your impact line + tagline + silence.
```

---

## Multi-Demo Variants

### 60-Second Demo (tight time slots)
Cut Beat 4 (drill-down) entirely. Run: Setup → Input → Aha → Impact.
Keep only the single most impressive screen.

### 3-Minute Demo (investor/judging panel)
Expand Beat 3 (aha moment) into two sub-moments:
- Sub-beat 3a: First result (the hook)
- Sub-beat 3b: A second, deeper insight from the same data (the depth signal)
Add a "what else it can do" beat before the final impact frame.

### Video Demo (async submission)
- Record in one take if possible (more authentic)
- If editing: max 3 cuts. More = over-produced for a hackathon.
- Use a clean, minimal screen recording tool (Loom, OBS, QuickTime)
- Add captions — 80% of video is watched without sound initially
- Upload to YouTube (unlisted) or Loom — never send a file attachment

---

## Integration

- Produced in STEP 8 (Winner Pack), after `08_pitch-script.md`
- Uses persona from `14_auto-figma-ui-flow.md`
- Impact metric from `11_win-dna-analyzer.md`
- Offline fallback strategy connects to `10_risk-cut-scope.md`
- Review via `/pitch-coach` (module 31) and demo quality checked in `/wrapup` (module 25)

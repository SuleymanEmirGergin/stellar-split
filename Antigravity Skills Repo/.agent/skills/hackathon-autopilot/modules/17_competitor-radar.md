# Competitor Radar — Module 17

## Purpose

Before committing to an idea, scan for:
- **Prior art** — has this been built before (at hackathons or as products)?
- **Generic traps** — patterns that make judges say "seen this before"
- **Differentiation opportunities** — specific angles that make our version novel
- **"Copy that won" detection** — ideas similar to past winners (good for inspiration, bad for direct replication)

This module acts as a **pre-commit filter** — run before scoring or winner selection.

---

## The Generic Trap Taxonomy

These are idea patterns that auto-fail the novelty gate. Flag any idea that matches:

### Trap 1: "Chatbot for X"
- A conversational interface bolted onto a domain (healthcare chatbot, legal chatbot, HR chatbot)
- **Why it fails:** No differentiation. Demo is boring. No "invisible → visible" moment.
- **Fix:** What decisions does it make, not just answer? What data does it surface that was hidden?

### Trap 2: "Dashboard for X"
- A CRUD dashboard that aggregates data and shows charts
- **Why it fails:** No autonomous behavior. Judges see 20 of these per hackathon.
- **Fix:** What action does the dashboard trigger automatically? What prediction does it make?

### Trap 3: "We Put AI on X"
- Takes an existing process and adds an LLM on top without architectural change
- **Why it fails:** No technical depth. "AI wrapper" criticism is brutal from technical judges.
- **Fix:** What structured reasoning layer exists under the LLM? What happens if the LLM fails?

### Trap 4: "Marketplace for X"
- Two-sided marketplace with no network effect mechanism
- **Why it fails:** Network effects take years; hackathon demo shows empty state.
- **Fix:** How does the first 10 users create value for themselves (not just for future users)?

### Trap 5: "Social Network for X"
- Community platform without a clear reason to exist alongside existing options
- **Why it fails:** "Just use Reddit/Discord/Slack" is the obvious counter.
- **Fix:** What behavior does this uniquely enable that existing platforms structurally cannot?

### Trap 6: "Personalized Recommendations"
- Generic content/product recommendation engine
- **Why it fails:** Netflix, Spotify, Amazon have solved this. Incremental improvement isn't interesting.
- **Fix:** What novel data source or context makes the recommendations fundamentally different?

### Trap 7: "Automation of Manual X"
- RPA-style automation of an existing workflow without insight generation
- **Why it fails:** No "wow" — automating boring work is just software, not innovation.
- **Fix:** What decision intelligence is added? What pattern was invisible before?

### Trap 8: "Token / NFT for X"
- Web3 incentive layer added to a domain without solving the core problem first
- **Why it fails:** In 2025-2026, this reads as outdated unless the context is explicitly Web3.
- **Fix:** Is the core value proposition valid WITHOUT the token? If not, reconsider.

---

## Differentiation Analysis Framework

For each idea that passes the trap filter, run:

### Step 1: Prior Art Estimation
Using domain knowledge, estimate:
- Is there a known startup doing exactly this? (Name if obvious)
- Was there a viral hackathon project in this domain? (e.g., "GPT-Doctor was big in 2023")
- Is this a well-saturated problem space (many solutions exist)?

Output:
```
Prior Art Level: LOW / MEDIUM / HIGH
Known Competitors: [Names or "none obvious"]
Hackathon Saturation: LOW / MEDIUM / HIGH
```

### Step 2: Angle Differentiation Tests
Ask 4 questions. A strong idea answers YES to 2+:

1. **Data angle** — Are we using a data source competitors don't use or can't access easily?
2. **Speed angle** — Are we solving the same problem in real-time instead of batch?
3. **User angle** — Are we targeting a user segment competitors ignore (underserved, non-technical, edge case)?
4. **Trust angle** — Are we making the AI's reasoning transparent / auditable while competitors are black-box?

### Step 3: "Seen Once Score"
Rate the idea's novelty from a judge's perspective:

| Score | Description |
|-------|-------------|
| 0 | Judge has seen this exact idea multiple times |
| 1 | Judge has seen the template, our execution is slightly different |
| 2 | Familiar problem, novel mechanism — will pause to listen |
| 3 | Problem is familiar, approach has a genuinely unexpected twist |
| 4 | Neither the problem framing nor the approach is common |
| 5 | Judge has never seen this angle — true novelty |

**Minimum required for shortlist: 3**

### Step 4: Differentiation Strategy
If score is < 3, produce one of:

**Option A — Narrow the user (niche down)**
"Instead of for all hospitals → for rural primary care clinics with no specialist access"

**Option B — Flip the direction (inverse the flow)**
"Instead of patients searching doctors → doctors proactively messaging at-risk patients"

**Option C — Add a constraint layer (make it harder but better)**
"Works offline-first, no cloud dependency, runs on commodore hardware"

**Option D — Combine two unrelated domains**
"Supply chain risk management × behavioral economics nudges"

**Option E — Surface a hidden data layer**
"We use satellite imagery / acoustic sensors / social graph signals nobody else is reading"

---

## Competitive Landscape Summary

For the chosen idea, produce a **1-paragraph competitive summary**:

```
COMPETITIVE LANDSCAPE: [Idea Title]
────────────────────────────────────
Prior art level: [LOW/MEDIUM/HIGH]
Closest known alternatives: [Name or "no direct competitor identified"]
Our differentiation: [1-2 sentence explanation of what makes this fundamentally different]
"Seen Once Score": [X/5]
Generic trap risk: [NONE / MINOR / FLAGS: trap name]
Differentiation strategy applied: [Option A/B/C/D/E — description]
```

---

## Red Flag Output Format

If an idea triggers a generic trap:

```
⚠️ GENERIC TRAP DETECTED: [Trap Name]
Why this is risky: [1 sentence]
Suggested fix: [1 sentence pivot]
Proceed? YES (with fix applied) / NO (reject idea)
```

---

## Integration

- Run after STEP 3 (idea generation), before STEP 4 (scoring)
- Filter out ideas with "Seen Once Score" < 3 AND a triggered trap (both conditions)
- If score = 2 but trap is fixable → apply fix → re-score
- Output feeds into `06_idea-synthesizer.md` (add "Novelty" as 6th scoring dimension)
- Winner selection: ensure chosen idea has competitive summary completed

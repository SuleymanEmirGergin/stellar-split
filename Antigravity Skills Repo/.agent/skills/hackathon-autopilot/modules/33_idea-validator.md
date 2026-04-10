# Idea Validator — Module 33

## Purpose

Validate the winning idea against reality **before architecture is committed**.
This module runs in 30–60 minutes and answers one question:

> **"Are we solving a problem that a real person actually has — and would pay for (or use)?**"

This is not academic user research. It is a **hackathon-speed assumption audit** designed to catch the single most common hackathon failure mode: building an impressive technical solution to a problem that doesn't actually exist in the form you imagined.

**Rule:** Run this module AFTER winner selection (Step 7) and BEFORE locking architecture (Step 10).
If validation fails the binary gate, invoke `/ideate` again with the learnings. Do not proceed to build on an unvalidated idea.

---

## Why This Module Exists

The three most common reasons technically strong hackathon projects don't win:

1. **The insight was wrong.** "People want AI to do X" — but they actually do X manually because they trust themselves more.
2. **The user isn't who you thought.** The real decision-maker is two levels above who you designed for.
3. **The demo solves the wrong moment.** You showed the analysis; judges wanted the decision. Or vice versa.

All three are **detectable in 30 minutes** if you ask the right questions to the right person.

---

## Step 1: Assumption Mapping

Before any user contact, write down what the project assumes to be true.
**Do this alone — do not discuss with teammates first.** You need raw assumptions, not consensus assumptions.

### Assumption Template

```
ASSUMPTION MAP
═══════════════════════════════════════════════════════════════
Idea: [Name of the winning idea]
═══════════════════════════════════════════════════════════════

CATEGORY A — Problem Assumptions (the riskiest)
─────────────────────────────────────────────────
A1: We assume [target user] experiences [specific problem] frequently.
    Evidence we have: [None / Anecdotal / 1-2 examples / Data]
    Kill score: [1-5 — how dead is the idea if this is wrong?]

A2: We assume [specific trigger event] causes the problem (not something else).
    Evidence: [...]
    Kill score: [1-5]

A3: We assume the problem is currently unsolved (or inadequately solved).
    Evidence: [...]
    Kill score: [1-5]

CATEGORY B — Solution Assumptions (high risk)
───────────────────────────────────────────────
B1: We assume our solution is the right form factor for this user.
    (e.g., "a dashboard" vs. "a mobile alert" vs. "an email digest")
    Evidence: [...]
    Kill score: [1-5]

B2: We assume the user will trust the AI output enough to act on it.
    Evidence: [...]
    Kill score: [1-5]

B3: We assume the user can/will provide the input data we need.
    Evidence: [...]
    Kill score: [1-5]

CATEGORY C — Access Assumptions (medium risk)
──────────────────────────────────────────────
C1: We assume we can access [specific data source / API / dataset].
    Evidence: [Checked / Assumed / Unknown]
    Kill score: [1-5]

C2: We assume the user has [permission / authority / tool] to act on our output.
    Evidence: [...]
    Kill score: [1-5]

CATEGORY D — Jury Assumptions (often overlooked)
──────────────────────────────────────────────────
D1: We assume the jury believes this problem is real (not theoretical).
    Evidence: [...]
    Kill score: [1-5]

D2: We assume the jury believes our team can deliver this.
    Evidence: [...]
    Kill score: [1-5]
═══════════════════════════════════════════════════════════════

PRIORITY KILL RISKS:
  Rank-order all A and B assumptions by Kill score.
  The top 2 MUST be tested in Step 2. No exceptions.

Kill score key:
  5 = If wrong, idea completely collapses. Non-negotiable test.
  4 = If wrong, major pivot needed. Should test.
  3 = If wrong, scope adjustment. Test if time allows.
  2 = If wrong, messaging change only. Low priority.
  1 = Negligible impact. Skip.
```

---

## Step 2: Surrogate User Selection

In a hackathon you don't have time for real user research. Instead, find a **surrogate** — someone who is either:

- **The target user themselves** (ideal — if any are at the event)
- **Someone who works closely with the target user** (their manager, their peer, their customer)
- **A domain expert who knows the user's pain** (consultant, journalist, researcher)
- **A fellow hackathon participant from the right background** (architect judging a PropTech idea, doctor judging a HealthTech idea)

### Surrogate Finder Protocol

```
SURROGATE PRIORITY LIST
────────────────────────
Tier 1 (10 min to find): Organizers, mentors, sponsors at the event
  → Ask: "Is there anyone here who works in [domain]?"
  → Most hackathons have domain mentors available — use them

Tier 2 (5 min to find): LinkedIn quick scan
  → Search: "[domain] [job title]" in your network → send: "30-sec question?"
  → Most respond within the hour if the question is focused

Tier 3 (2 min): A person in the room who has experienced the problem
  → "Have you ever dealt with [problem]?" → If yes, they qualify
  → Even one conversation changes assumptions

Tier 4 (0 min — last resort): Role-play with a teammate
  → Pick one person to be the skeptical user
  → They must argue against the idea for 10 minutes
  → Not ideal, but better than no validation

Rule: Do NOT validate with people who will agree with you regardless.
      Do not validate with your teammates.
      Do not validate with the event organizers (they want you to feel good).
```

---

## Step 3: The 5-Question Validation Script

**Time limit: 15 minutes per conversation.**
Do not pitch. Do not explain your solution upfront. Ask, listen, adapt.

```
VALIDATION SCRIPT
══════════════════════════════════════════════════════════════
[Before starting]
"I'm going to ask you 5 questions about [their domain]. I'm not pitching anything.
I just want to understand how [specific problem area] actually works in practice.
Is that okay? It'll take 10-15 minutes."

─────────────────────────────────────────────────────────────
Q1 — PROBLEM EXISTENCE TEST
"Can you tell me about the last time [specific problem context] caused you
or your organization a real difficulty?"

Listen for: Specific recent instance / frequency / emotional weight
Red flag: "It's not really a problem, it just takes time" = NOT a burning pain
Green flag: "Oh, last week..." with unprompted frustration

─────────────────────────────────────────────────────────────
Q2 — CURRENT SOLUTION TEST
"How do you handle that today? Walk me through what actually happens."

Listen for: Workarounds / manual processes / external tools they use
Red flag: "We use [mature SaaS tool that already solves this]"
Green flag: "Excel spreadsheet" / "We email someone and wait 3 days"

─────────────────────────────────────────────────────────────
Q3 — PAIN INTENSITY TEST (DO NOT ASK "IS THIS A BIG PROBLEM?")
"If someone told you this problem was fully solved tomorrow,
what would you do differently?"

Listen for: Specific downstream decisions they'd make / how much time freed
Red flag: "Not much, honestly" = Pain is tolerable, not burning
Green flag: Describes a cascade of things they'd do differently

─────────────────────────────────────────────────────────────
Q4 — FORM FACTOR TEST (reveal your solution category — not implementation)
"If there were a tool that [describe benefit, not feature],
what would make you trust it enough to use it in a real situation?"

Listen for: Trust requirements / data sources they'd need / approval chains
Red flag: "We'd need 6 months of validation before using this anywhere"
Green flag: "Honestly, if it showed me [specific output], I'd try it"

─────────────────────────────────────────────────────────────
Q5 — DECISION MAKER TEST
"Who in your organization would be most interested in a solution like this?"

Listen for: Job title / level / are they the person in the room?
Red flag: "It would need to go through Legal / IT / a 6-month procurement"
Green flag: "Actually, I could try this myself right now"

══════════════════════════════════════════════════════════════
After each conversation, fill in the Surrogate Debrief (below)
before talking to anyone else. Memory degrades fast.
```

---

## Step 4: Surrogate Debrief Sheet

Fill immediately after each conversation:

```
SURROGATE DEBRIEF
──────────────────────────────────────────────────
Surrogate:   [Name / Role / How you found them]
Duration:    [X minutes]
Date/time:   [timestamp]

Q1 Problem:    ✅ Real  /  ⚠️ Mild  /  ❌ Doesn't exist
  What they said: "[Quote their exact words, not your interpretation]"
  Assumption tested: [A1 / A2 / ...] → Confirmed / Partially confirmed / WRONG

Q2 Solution:   ✅ Gap  /  ⚠️ Partial  /  ❌ Already solved
  What they said: "[exact words]"
  Assumption tested: [A3 / B1 / ...] → Confirmed / Partially confirmed / WRONG

Q3 Pain:       ✅ Burning  /  ⚠️ Tolerable  /  ❌ Nice-to-have
  What they said: "[exact words]"
  Assumption tested: [A1 / A2] → Confirmed / Partially confirmed / WRONG

Q4 Form:       ✅ Would use  /  ⚠️ Maybe  /  ❌ Wrong form
  Trust requirement they named: "[exact]"
  Assumption tested: [B1 / B2] → Confirmed / Partially confirmed / WRONG

Q5 Decision:   ✅ Self  /  ⚠️ Peer  /  ❌ Long procurement
  Decision maker identified: [Role / Level]
  Assumption tested: [C2] → Confirmed / Partially confirmed / WRONG

SURPRISES:
  "[One thing they said that you did not expect]"

ASSUMPTION UPDATES:
  [A1] was: [your original assumption]
  Now:      [what you now believe, based on this conversation]
──────────────────────────────────────────────────

Run 1–3 conversations. Stop when you're hearing the same things.
If you hear opposite things: run one more, then use majority evidence.
```

---

## Step 5: Anti-Patterns to Avoid

```
VALIDATION ANTI-PATTERNS
──────────────────────────────────────────────────────────────
❌ Pitching before listening
   → "We built a system that does X — what do you think?"
   → Triggers politeness, not truth
   ✅ Do: Ask about the problem before revealing the solution

❌ Asking hypothetical usage questions
   → "Would you use a tool that did X?"
   → Answer is always yes. Means nothing.
   ✅ Do: "What would you do differently if this was solved tomorrow?"

❌ Validating with friends or teammates
   → They will agree with you
   ✅ Do: Find strangers or domain experts

❌ Treating a single yes as confirmation
   → 1 enthusiastic yes ≠ validated demand
   ✅ Do: Run 3 conversations min; require pattern, not outlier

❌ Updating the solution during validation
   → "Oh, but we could also do Y!"
   → You're pitching, not learning
   ✅ Do: Note suggestions silently. Don't add features during interview.

❌ Stopping when it feels good
   → First conversation is often the easiest — early adopter energy
   → "This person loved it" is not validation
   ✅ Do: Find the skeptic. The skeptic's objection is your real data.

❌ Skipping this step because "we know the domain"
   → Even domain experts have blind spots about their own behavior
   ✅ Do: Even 1 conversation surfaces 1 assumption failure. Worth 15 min.
```

---

## Step 6: Validation Binary Gate

After running 1–3 conversations, score each assumption category:

```
VALIDATION GATE SCORECARD
══════════════════════════════════════════════════════════════
Category A — Problem (max 3 points)
  A1 Problem existence:   Confirmed +1 / Partial +0.5 / Wrong +0
  A2 Problem trigger:     Confirmed +1 / Partial +0.5 / Wrong +0
  A3 Gap in solutions:    Confirmed +1 / Partial +0.5 / Wrong +0
  SCORE: [X / 3]

Category B — Solution fit (max 3 points)
  B1 Form factor:         Confirmed +1 / Partial +0.5 / Wrong +0
  B2 Trust threshold:     Confirmed +1 / Partial +0.5 / Wrong +0
  B3 Data accessibility:  Confirmed +1 / Partial +0.5 / Wrong +0
  SCORE: [X / 3]

Category C — Access (max 2 points)
  C1 Data access:         Confirmed +1 / Partial +0.5 / Wrong +0
  C2 Decision authority:  Confirmed +1 / Partial +0.5 / Wrong +0
  SCORE: [X / 2]

Category D — Jury (max 2 points)
  D1 Problem believable:  Confirmed +1 / Partial +0.5 / Wrong +0
  D2 Team credibility:    Confirmed +1 / Partial +0.5 / Wrong +0
  SCORE: [X / 2]

══════════════════════════════════════════════════════════════
TOTAL: [X / 10]

VERDICT:
  8–10 → ✅ PROCEED   — Core assumptions validated. Build as planned.
  6–7  → ⚠️ ADJUST   — Pivot framing, scope, or demo persona before building.
  4–5  → 🔶 RISKY    — A kill-score-5 assumption failed. Consider major pivot.
         → Run /ideate with new learnings, then re-validate.
  0–3  → ❌ STOP      — Fundamental assumption wrong. Do not build.
         → Take learnings back to /ideate. Start from validated base.
══════════════════════════════════════════════════════════════
```

---

## Step 7: Insight → Action Map

After running the gate, translate findings into concrete changes:

```
INSIGHT → ACTION MAP
══════════════════════════════════════════════════════════════
For each WRONG or Partial assumption with Kill score ≥ 4:

  Assumption:    [Ax: what you assumed]
  Reality:       [What you learned]
  Action:        Choose one:
    □ REFRAME    — Keep the idea, change the angle
                   (e.g., wrong user → right user was one level up)
    □ RESCOPE    — Keep the core, cut the wrong feature
                   (e.g., they want the decision, not the analysis)
    □ REWORD     — Keep everything, change how you name it
                   (e.g., "compliance tool" not "AI assistant")
    □ PIVOT      — Core assumption failed, need new idea angle
                   (e.g., problem doesn't exist → adjacent problem does)
    □ ENHANCE    — Assumption confirmed but deeper pain uncovered
                   (e.g., add the specific statistic they mentioned)
  Owner:         [Who makes this change and by when]
══════════════════════════════════════════════════════════════
```

---

## Step 8: Validated Persona Statement

Before proceeding to architecture, lock the target user with evidence:

```
VALIDATED PERSONA STATEMENT
══════════════════════════════════════════════════════════════
Name:          [Give them a name for the demo — "Murat", "Elif", "Selin"]
Role:          [Job title / specific context]
Daily reality: "[Exact quote or paraphrase from surrogate conversation]"
Core pain:     "[What they said in Q3 — their words, not yours]"
Decision threshold: "[What they need to see before trusting AI output]"
Why now:       "[What's happening in their world that makes this urgent]"
Evidence:      [Surrogate name/role + date + conversation length]

This persona is your demo anchor:
  → Demo script (09) opens with this person's story
  → Pitch script (08) quotes their core pain statement
  → Judge introduction uses "Murat Bey, who manages 50.000 bina..."
══════════════════════════════════════════════════════════════
```

---

## Fast-Track Protocol (< 30 minutes available)

If time is critically short, run the minimum viable validation:

```
FAST-TRACK VALIDATION (20 min)
────────────────────────────────
1. Map only Kill score 5 assumptions (5 min)
2. Find 1 surrogate from the event mentors (5 min)
3. Ask only Q1, Q2, Q3 (10 min conversation)
4. Fill debrief for those 3 questions only (3 min)
5. Simple binary verdict:
   - Did Q1 confirm a real, recent problem? YES / NO
   - Did Q2 reveal a real gap (not already solved)? YES / NO
   - Did Q3 show meaningful downstream impact? YES / NO

   3 YES → proceed (note untested assumptions as Q&A prep for 27)
   2 YES → adjust demo framing, investigate the No
   ≤1 YES → pivot or run /ideate with learnings

DO NOT skip this even if it feels like you know the domain.
20 minutes of listening is worth 4 hours of wrong building.
```

---

## Integration

### In the Pipeline
- **Runs after:** `06_idea-synthesizer.md` (winner declaration) + `11_win-dna-analyzer.md` (DNA gap check)
- **Runs before:** `07_architecture-mvp.md` (architecture commitment) + `08_pitch-script.md` (story lock)
- **Triggered by:** `/validate` slash command or automatically after Step 8 in the full pipeline

### Outputs that feed other modules

| Output | Fed to | How it's used |
|--------|--------|---------------|
| Validated Persona Statement | `09_demo-script.md` | Demo opener — persona name + exact pain quote |
| Validated Persona Statement | `08_pitch-script.md` | Hook sentence — "Maria, who manages X, told us..." |
| Validated Persona Statement | `03_jury-psychology.md` | Grounds abstract idea in human reality |
| Assumption insights (WRONG) | `10_risk-cut-scope.md` | Risk register — known assumption failure = scope risk |
| Form factor findings | `07_architecture-mvp.md` | Adjusts what goes above the Demo Line |
| Decision maker profile | `04_vc-mode.md` | Informs ICP section of business model |
| Trust threshold | `07_architecture-mvp.md` | Defines confidence score display in UI |
| Q5 procurement complexity | `10_risk-cut-scope.md` | If procurement is long, de-prioritize launch roadmap |

### Score Impact
- Validated Persona → `11_win-dna-analyzer.md` D6 Emotional Resonance: +1 point (specific quote > generic claim)
- Trust threshold uncovered → `21_scoring-simulator.md` Technical Credibility: +0.5–1.0 point (shows domain awareness)
- Wrong assumption caught → saves ~4h of wrong build direction

### Slash command
```
/validate  → Run Module 33 on the current winning idea
             Required: Winning idea from /ideate output
             Returns: Validated Persona + Gate Verdict + Insight→Action Map
```

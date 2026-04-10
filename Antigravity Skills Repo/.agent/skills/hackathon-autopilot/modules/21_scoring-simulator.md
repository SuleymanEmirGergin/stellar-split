# Scoring Simulator — Module 21

## Purpose

Act as a **simulated jury panel** to score the winning idea objectively before real judging occurs.

This module:
- Scores the project from multiple judge archetypes' perspectives
- Reveals scoring vulnerabilities before the demo
- Provides actionable improvement suggestions for each weak dimension
- Estimates how the project compares to hypothetical competitors

---

## Simulation Principle

The scoring simulator runs the project through **3 parallel jury perspectives**:
1. **The Investor Judge** — thinks in exits, markets, moats
2. **The Technical Judge** — thinks in code quality, architecture, feasibility
3. **The Domain Expert Judge** — thinks in real-world applicability, domain accuracy

Each judge scores independently. Final score is a weighted average based on jury composition (from `16_judge-profiler.md` if available, or default weights otherwise).

---

## Scoring Rubric

### Dimension 1: Problem Clarity (0–10)
**What judges score:**
- Is the problem real and well-defined?
- Is the target user identifiable?
- Is the scale/urgency communicated?

| Score | Description |
|-------|-------------|
| 9-10 | Crystal clear, specific user, compelling data point, emotional hook |
| 7-8 | Clear problem, but target user is broad or urgency lacks data |
| 5-6 | Problem exists but feels generic or over-stated |
| 3-4 | Problem is unclear, speculative, or too niche to excite |
| 0-2 | No discernible real-world problem |

**Investor weight:** 15% | **Technical weight:** 5% | **Domain weight:** 25%

---

### Dimension 2: Solution Novelty (0–10)
**What judges score:**
- Is the solution meaningfully different from existing options?
- Does it avoid generic trap patterns?
- Is there a non-obvious insight at its core?

| Score | Description |
|-------|-------------|
| 9-10 | Genuinely novel mechanism or angle; "I haven't seen this before" reaction |
| 7-8 | Familiar problem, creative approach, clear differentiation |
| 5-6 | Reasonable solution but incremental; "improved version of X" |
| 3-4 | Replication of existing product with minor variation |
| 0-2 | Generic chatbot, dashboard, or CRUD app |

**Investor weight:** 20% | **Technical weight:** 15% | **Domain weight:** 15%

---

### Dimension 3: Technical Credibility (0–10)
**What judges score:**
- Is the architecture coherent and feasible?
- Is the AI usage meaningful (not just a wrapper)?
- Are there obvious risks or single points of failure?

| Score | Description |
|-------|-------------|
| 9-10 | Elegant architecture, deterministic core with AI augmentation, eval-ready |
| 7-8 | Solid stack choices, AI used purposefully, minor risks acknowledged |
| 5-6 | Functional but fragile; over-reliance on LLM without fallback |
| 3-4 | Unclear data flow, missing critical components, weak AI justification |
| 0-2 | "Trust us it works"; no architecture visible |

**Investor weight:** 10% | **Technical weight:** 40% | **Domain weight:** 10%

---

### Dimension 4: Demo Impact (0–10)
**What judges score:**
- Does the demo tell a clear story?
- Is there a clear "aha moment"?
- Is the output visible and understandable without explanation?

| Score | Description |
|-------|-------------|
| 9-10 | Demo shows the full value in under 60 seconds; output is visually striking |
| 7-8 | Demo is clear but requires some presenter explanation |
| 5-6 | Demo shows the product exists but the value isn't immediately obvious |
| 3-4 | Demo is incomplete, buggy, or requires imagination to understand |
| 0-2 | No live demo; slides only; or demo failed |

**Investor weight:** 25% | **Technical weight:** 20% | **Domain weight:** 20%

---

### Dimension 5: Impact & Scale (0–10)
**What judges score:**
- How many people does this affect?
- Is there a real-world deployment story?
- Is there a measurable outcome?

| Score | Description |
|-------|-------------|
| 9-10 | Clear impact metric, realistic deployment path, significant addressable user base |
| 7-8 | Impact is real but measurement is estimated; deployment is plausible |
| 5-6 | Impact exists but scale is unclear or overstated without support |
| 3-4 | Impact is theoretical; "this could help people" without specifics |
| 0-2 | No impact articulation |

**Investor weight:** 20% | **Technical weight:** 5% | **Domain weight:** 20%

---

### Dimension 6: Business Model Plausibility (0–10)
**What judges score:**
- Is there a viable revenue or sustainability path?
- Does it rely on one risky assumption?
- Is the team thinking beyond the hackathon?

| Score | Description |
|-------|-------------|
| 9-10 | Clear monetization strategy, realistic customer acquisition, unit economics mentioned |
| 7-8 | Revenue model exists, some assumptions are reasonable |
| 5-6 | "We'll figure it out" energy but awareness is there |
| 3-4 | No business model; "it's an open source tool" without a plan |
| 0-2 | Explicitly ignores business viability |

**Investor weight:** 10% | **Technical weight:** 5% | **Domain weight:** 10%

---

### Dimension 7: Team Execution Confidence (0–10)
**What judges score:**
- Can this team actually deliver on what they're promising?
- Are the roles clear and the scope realistic?
- Do they handle Q&A confidently?

| Score | Description |
|-------|-------------|
| 9-10 | Team has directly relevant experience, clear ownership, realistic scope |
| 7-8 | Competent team, reasonable scope, minor gaps |
| 5-6 | Team is capable but scope mismatch or unclear ownership |
| 3-4 | Solo founder with an impossible scope, or unclear who built what |
| 0-2 | Team appears unprepared or unable to defend technical claims |

**Investor weight:** 0% | **Technical weight:** 10% | **Domain weight:** 0%

*(Note: Team score is implicit — judges observe, not explicitly ask. Weight is low but non-zero.)*

---

## Jury Perspective Outputs

### Investor Judge Score Card
```
INVESTOR PERSPECTIVE
─────────────────────
Problem Clarity:    [X/10] — "[comment]"
Solution Novelty:   [X/10] — "[comment]"
Technical Cred:     [X/10] — "[comment]"
Demo Impact:        [X/10] — "[comment]"
Impact & Scale:     [X/10] — "[comment]"
Business Model:     [X/10] — "[comment]"
Team Execution:     [X/10] — "[comment]"

Weighted Score: [XX.X/10]
Overall reaction: "[One sentence investor reaction]"
Would I fund this? [YES / MAYBE / NO] — [reason in 1 sentence]
```

### Technical Judge Score Card
```
TECHNICAL PERSPECTIVE
──────────────────────
Problem Clarity:    [X/10] — "[comment]"
Solution Novelty:   [X/10] — "[comment]"
Technical Cred:     [X/10] — "[comment]"
Demo Impact:        [X/10] — "[comment]"
Impact & Scale:     [X/10] — "[comment]"
Business Model:     [X/10] — "[comment]"
Team Execution:     [X/10] — "[comment]"

Weighted Score: [XX.X/10]
Overall reaction: "[One sentence technical reaction]"
Toughest question I'd ask: "[Q]"
```

### Domain Expert Score Card
```
DOMAIN EXPERT PERSPECTIVE
──────────────────────────
Problem Clarity:    [X/10] — "[comment]"
Solution Novelty:   [X/10] — "[comment]"
Technical Cred:     [X/10] — "[comment]"
Demo Impact:        [X/10] — "[comment]"
Impact & Scale:     [X/10] — "[comment]"
Business Model:     [X/10] — "[comment]"
Team Execution:     [X/10] — "[comment]"

Weighted Score: [XX.X/10]
Overall reaction: "[One sentence domain reaction]"
Domain accuracy issue (if any): "[Flag or 'None found']"
```

---

## Composite Score & Verdict

```
COMPOSITE JURY SCORE
─────────────────────
Investor Judge (weight: [X]%):     [XX.X] → [XX.X weighted]
Technical Judge (weight: [X]%):    [XX.X] → [XX.X weighted]
Domain Expert (weight: [X]%):      [XX.X] → [XX.X weighted]

FINAL SCORE: [XX.X / 10]

VERDICT:
  ≥ 8.5 → 🥇 FINALIST GRADE — competitive
  7.5–8.4 → 🥈 STRONG — competitive with targeted improvements
  6.5–7.4 → 🥉 NEEDS WORK — fixable before demo
  < 6.5  → ⚠️  HIGH RISK — significant pivot or scope cut needed
```

### Score Convergence Check

> ⚠️ Consistency note: Cross-validate this score against the other two scoring modules:

```
CROSS-MODULE CONVERGENCE
──────────────────────────
06_idea-synthesizer TOTAL:   [XX / 43]  → Normalized: [XX/10]
11_win-dna-analyzer TOTAL:   [XX / 24]  → Normalized: [XX/10]
21_scoring-simulator FINAL:  [XX.X / 10]

Convergence:
  All three within ±1.5 → ✅ Consistent signal — proceed
  Gap > 1.5 between any two → ⚠️ Investigate: which module is more generous and why?

Common divergence causes:
  06 high but 21 low → bonuses inflated the 06 score; 21 is catching a real weakness
  11 high but 21 low → DNA is strong but jury framing is weak; fix pitch, not product
  21 high but 06 low → Idea has jury appeal but needs execution tightening
```

---

## Improvement Prescriptions

For any dimension scoring below 7.0, output a specific fix. Prioritize in this order:
1. **Demo Impact** — highest ROI, always fixable before the event
2. **Problem Clarity** — often fixed by adding a named persona + one statistic
3. **Solution Novelty** — if low, check `11_win-dna-analyzer.md` D1; consider repositioning the angle
4. **Technical Credibility** — add deterministic core, define fallback
5. **Impact & Scale** — add one specific, measured metric
6. **Business Model** — add beachhead customer + one acquisition channel
7. **Team Execution** — add working code snippets to the demo; answer "what did you build?"

```
IMPROVEMENT PRESCRIPTIONS
──────────────────────────
[Dimension — Score X/10]
  Problem: [What's weak]
  Fix: [1-2 sentence specific action to take]
  Time to fix: [estimate]
  Impact if fixed: [+X points estimate]
  Related module: [Which module produces the fix — e.g., 09_demo-script.md for Demo Impact]
```

---

## Competitive Simulation

Estimate how this project compares to a hypothetical "average hackathon submission" in the same domain:

```
VS. HYPOTHETICAL COMPETITOR
────────────────────────────
Your project:               [XX.X/10]
Average submission in [domain]: ~[6.0-7.0/10]
Strong submission baseline:     ~[7.5/10]
Finalist grade:                 ~[8.5+/10]

COMPETITIVE POSITION: [AHEAD / AT PAR / BEHIND]
Gap to close: [Points needed to reach finalist grade]
Fastest path: [Which dimension has highest ROI for improvement]
```

---

## Integration

- Called after STEP 6 (Winner Selection), before Winner Pack is finalized
- Uses outputs from: `16_judge-profiler.md` (jury weights), `11_win-dna-analyzer.md` (DNA), `17_competitor-radar.md` (novelty)
- Output feeds back into `08_pitch-script.md` (fix weak dimensions before scripting)
- Can be invoked standalone via `/score-me` slash command

### Dimension → Module Cross-Reference

| 21 Dimension | Maps to 06 criterion | Maps to 11 DNA dimension | Maps to 13 pattern |
|-------------|---------------------|------------------------|-------------------|
| Problem Clarity (D1) | C1 Human Behavior Insight | D6 Emotional Resonance | Pattern 2: Narrative Arc |
| Solution Novelty (D2) | C3 Invisible→Visible | D1 Novelty Type | Pattern 6: Differentiation |
| Technical Credibility (D3) | C2 Real-Time Decision | D2 Tech Depth/Safety | Patterns 3+4 |
| Demo Impact (D4) | C5 Instant Demo Clarity | D3 Demo Clarity | Pattern 1: Instant Clarity |
| Impact & Scale (D5) | C2 Real-Time Decision | D5 Investability | Patterns 5+8 |
| Business Model (D6) | JA+ bonus | D5 Investability | Pattern 8: Deployment Story |
| Team Execution (D7) | WP+ Team Execution col | — | Pattern 10: Team Execution |

### Grade Equivalence Table

| Grade level | 06 TOTAL (max 43) | 11 TOTAL (max 24) | 21 FINAL (max 10) |
|-------------|------------------|------------------|------------------|
| 🥇 Finalist | ≥ 40 | ≥ 21 | ≥ 8.5 |
| 🥈 Strong | 35–39 | 16–20 | 7.5–8.4 |
| 🥉 Needs Work | 28–34 | 12–15 | 6.5–7.4 |
| ⚠️ High Risk | < 28 | < 12 | < 6.5 |

# Jury Psychology — Module 03

## Purpose

Understand how judges actually make decisions — not how they claim to. Apply that understanding to every idea, pitch, and demo decision.

This module is the **general jury framework**. For event-specific jury profiling from actual names/roles, use `16_judge-profiler.md`.

---

## The Fundamental Truth About Hackathon Judges

Judges do not score on a spreadsheet and sum totals. They make an emotional decision first, then use the scoring rubric to justify it.

**What this means:**
- The first 10 seconds of the demo form a gut feeling that's hard to reverse
- A technically superior product can lose to a less technically impressive one that tells a better story
- Judges remember 1-2 projects clearly; the others blur into "the AI chatbot ones"
- Questions in Q&A are often not requests for information — they're tests of character and confidence

---

## The 6 Universal Judge Archetypes

Every hackathon judge falls primarily into one of these archetypes. Structure your pitch to speak to their "optimization target."

### Archetype 1: The Investor 💼
**Optimization target:** Scalable, fundable, defensible business
**What they love:** Market size framing, moat, differentiated insight, "why now" 
**What makes them skeptical:** "Cool tech" without a customer, no revenue model, "just like X but better"
**Power phrase:** "The underlying insight is that [non-obvious market truth]..."
**Pitch adjustment:** Lead with market friction, end with growth path

### Archetype 2: The Domain Expert 🏥📊
**Optimization target:** Accuracy, feasibility, real-world fit
**What they love:** Domain vocabulary used correctly, evidence of user research, practical integration path
**What makes them skeptical:** Domain terminology errors, "AI will solve it" without specifics, ignoring regulations
**Power phrase:** "We spoke with [N] [domain professionals] and the pattern we found was..."
**Pitch adjustment:** Name domain-specific pain points precisely, show compliance awareness

### Archetype 3: The Technical Judge 🖥️
**Optimization target:** Engineering quality, architectural soundness, non-trivial implementation
**What they love:** Novel use of technology, deterministic + AI hybrid, evaluation methodology, scalable architecture
**What makes them skeptical:** "It's powered by ChatGPT" with no added value, no offline fallback, no error handling
**Power phrase:** "Our deterministic core handles [X], and the LLM layer adds [Y] — here's why that boundary matters..."
**Pitch adjustment:** Show architecture diagram, explain one non-obvious technical decision

### Archetype 4: The Impact Optimist 🌱
**Optimization target:** Social good, measurable positive change, underserved population reach
**What they love:** Lives improved, cost savings for struggling systems, equity lens, environmental effect
**What makes them skeptical:** Impact metrics that are vague, privileged user base ("for busy executives"), vanity metrics
**Power phrase:** "The people who benefit most are [specific population] who currently have no alternative because..."
**Pitch adjustment:** Lead with the human cost of the problem, make the impact metric feel tangible not abstract

### Archetype 5: The Pragmatist 🔧
**Optimization target:** Implementation readiness, real-world adoption barriers, practical deployment
**What they love:** "Plugs into existing system X", "launches in 2 weeks", "user has 0 learning curve"
**What makes them skeptical:** Academic solutions, no go-to-market path, "change management will be easy"
**Power phrase:** "The reason this is deployable tomorrow is that it integrates with [existing system] without requiring [common blocker]..."
**Pitch adjustment:** End with a credible "next step" — a real pilot customer, a partner, a data source you already have

### Archetype 6: The Surprise Seeker 🤯
**Optimization target:** Novelty, creative thinking, "I've never seen this before"
**What they love:** Unexpected use cases, creative constraint handling, counter-intuitive insights
**What makes them skeptical:** Safe, obvious, "we built X for Y" without a creative twist
**Power phrase:** "What most people don't realize is that [counter-intuitive insight]..."
**Pitch adjustment:** Start with the counter-intuitive observation, build backward to the solution

---

## Feature → Criteria Mapping

After choosing an idea, map each product feature to the judging criterion it serves:

```
FEATURE → CRITERIA MAP
────────────────────────
Feature: [Feature name]
  Serves criterion: [Which judging dimension]
  Archetype appeal: [Which judge type cares most]
  Demo moment: [How to show it in the demo]
  Pitch mention: [When in pitch to mention it — problem / solution / impact]
```

Build this map for the top 3-5 features. If a feature doesn't serve any criterion and doesn't generate demo impact → cut it.

---

## The 10-Second Mental Model Test

Before finalizing the idea, answer:

> "What is the one sentence a judge writes in their notes about your project?"

If you can't answer this in 1 sentence, the idea is not ready.

**Bad (unclear):** "An AI platform for healthcare workflow optimization"
**Bad (too broad):** "A tool that helps doctors and nurses with data"
**Good (specific):** "Real-time drug interaction checker for ER nurses — detects the conflicts EHR systems miss"
**Good (outcome-first):** "Detects supply chain fraud before the invoice is paid, not after"

The judge's mental model IS the product's first impression. Design for it explicitly.

---

## Urgency & Stakes Calibration

A judge who doesn't feel urgency won't vote urgency.

Build urgency through:

1. **Scale signal** — "1 in [N] [users] experiences this every [period]"
2. **Cost signal** — "The average [incident] costs $[X] — and there are [N] per year"
3. **Time signal** — "Without intervention, [outcome] happens in [timeframe]"
4. **Proximity signal** — "This is happening right now in [recognizable place/organization]"
5. **Personal signal** — "If [persona the judge can relate to] were in this situation..."

Use exactly ONE of these in the problem setup. More than one = overwhelming. Zero = no urgency.

---

## Credible Feasibility Language

Judges want ambition AND believability. Sentences that signal both:

**DO use:**
- "In our 48-hour prototype, we validated that..."
- "The core mechanism is already working — what we'd add next is..."
- "We deliberately scoped this to [minimal version] to prove the concept"
- "The integration path to [enterprise system] exists because [specific reason]"

**DON'T use:**
- "This will change the entire industry" (unprovable)
- "We plan to add [10 features] after the hackathon" (scope creep signal)
- "The AI model is 95% accurate" (without stating how you measured it)
- "We'd need to solve [regulatory/data/scale issue] later" (kicking the can)

---

## Differentiation Test

Before finalizing the pitch, run this test:

> "A judge who saw 3 other AI projects today — what makes ours the one they remember?"

Answers that don't count:
- "Better UX" (every team says this)
- "More accurate AI" (nobody can verify this in 90 seconds)
- "More features" (features are cut lines)

Answers that count:
- "We're the only team using [specific data source] that others can't easily access"
- "Our deterministic core means [specific reliability guarantee] others can't claim"
- "We built for [specific underserved user] that no one else addressed"
- "Our insight is that [counter-intuitive pattern in the domain] — and we prove it"

---

## Red Flags That Kill Scores

```
JUDGE KILL SWITCHES
────────────────────
❌ "Our target market is everyone" → Signals no customer understanding
❌ "The AI does the magic" → Signals no technical depth
❌ "We just need the data" → Signals not ready to build
❌ "Like [big company] but better" → Signals no differentiation
❌ "We'll figure out monetization later" → Signals no business thinking
❌ "Users will love it" → Without evidence, this means nothing
❌ "It's very complex" → Never say this. Show the complexity.
❌ Going over time → Signals poor preparation, kills impression
```

---

## Integration

- Runs in STEP 4 (idea reframing), after ideas are scored in `06_idea-synthesizer.md`
- Feeds into: `08_pitch-script.md` (archetype-aware language), `16_judge-profiler.md` (event-specific overlay)
- The differentiation test output is used in `17_competitor-radar.md`
- The mental model sentence becomes the elevator pitch hook in `08_pitch-script.md`

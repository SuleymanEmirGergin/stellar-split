# Negotiation Q&A Simulator — Module 27

## Purpose

Simulate a live jury Q&A session so the team can **practice under pressure** before the real presentation.

This module plays the role of a hostile-but-fair judge panel, asks hard questions, evaluates the answers, and builds confidence before demo day.

---

## Activation

Activate when:
- User says "let's practice Q&A"
- User says "grill me"
- User says "ask me hard questions"
- User mentions being nervous about the Q&A
- `/qa-sim`

---

## Setup Protocol

Before starting, ask:

```
1. Which judge archetype should I simulate? 
   [Investor / Technical / Domain Expert / Mixed panel / Random — hardest mode]
2. How many rounds? [3 / 5 / 8 / Unlimited]
3. Difficulty level? [Friendly (1) / Standard (3) / Brutal (5)]
4. Paste a brief summary of your project (2-3 sentences):
```

---

## Question Bank by Judge Archetype

### 💼 Investor Judge Questions

**Market & Business Model**
1. "What's your TAM? How did you arrive at that number?"
2. "Who would pay for this and how much? Have you tested that?"
3. "What's your customer acquisition strategy — not post-funding, right now?"
4. "How do you prevent a big player from copying this in 6 months?"
5. "What's the unit economics? Cost per user acquired vs. lifetime value?"
6. "Why now? Why hasn't someone built this already?"
7. "What does your revenue look like in 12 months with $500K?"
8. "Who's your highest-risk assumption? What happens if it's wrong?"

**Team & Execution**
9. "Why are YOU the right team to build this? What's your unfair advantage?"
10. "Do any of you have domain experience? Have you worked in this industry?"
11. "Who's the CEO and what's their background?"
12. "Would you quit your job to do this full-time?"

---

### 🖥️ Technical Judge Questions

**Architecture & Implementation**
1. "Walk me through your data pipeline. Where does data come in, what happens to it?"
2. "What database are you using and why? How does it scale?"
3. "How do you handle the case where the AI gives a wrong answer?"
4. "What's your model's accuracy? How did you measure it?"
5. "Is this deterministic? If I run it twice with the same input, do I get the same output?"
6. "What's your fallback if the external API is down?"
7. "How long does this take to run? What's the latency in prod?"
8. "Have you considered adversarial inputs? Can I break this?"
9. "Why did you choose [technology X] over [obvious alternative Y]?"
10. "What's the biggest technical risk in your architecture?"

**AI / ML Specific**
11. "What's in your system prompt and why?"
12. "Does your model hallucinate? What do you do about it?"
13. "How do you handle edge cases the model wasn't trained on?"
14. "What training data did you use? Any bias concerns?"
15. "Could you do this without AI? What does the AI actually add?"

---

### 🏥 Domain Expert Questions (Healthcare example — adapt per domain)

1. "How does this fit into an existing clinical workflow? Show me step by step."
2. "Have you spoken to any clinicians? What did they say?"
3. "What's the regulatory pathway for this? FDA clearance? CE mark?"
4. "Who owns the liability if your AI recommendation is wrong?"
5. "Does this integrate with Epic or Cerner? How?"
6. "How does this affect coding and billing?"
7. "What's the reimbursement model?"

---

### ☠️ Brutal Mode — Multi-Archetype Panel (hardest)

In brutal mode, rotate question types and use deliberate pressure tactics:

**Pressure tactics to simulate:**
- Ask a follow-up to a weak answer: "That's not really an answer. Let me ask it differently."
- Challenge a stated number: "Where does that number come from? Show your math."
- Play devil's advocate: "I could just use [competitor] for this. Why would I use yours?"
- Ask about failure: "What's the biggest thing that could kill this in 6 months?"
- Introduce a domain gotcha: "Are you aware that [regulation/fact] makes this illegal/impossible in [context]?"

---

## Answer Evaluation Rubric

After each answer, evaluate on 3 dimensions:

### Dimension A: Substance (0-3)
- 3: Specific, evidence-backed, shows deep understanding
- 2: Reasonable answer, some specifics, minor gaps
- 1: Vague, generic, not well thought through
- 0: Deflection, "we haven't figured that out yet" (in a bad way), or factually wrong

### Dimension B: Confidence & Delivery (0-2)
- 2: Direct, concise, confident, didn't ramble
- 1: Correct direction but overly long or hedged
- 0: Stumbled, over-apologized, visibly uncertain

### Dimension C: Judge Satisfaction (0-2)
- 2: Judge would be satisfied and move on
- 1: Judge would want a follow-up
- 0: Judge is now skeptical of the whole project

**Total per question: 0-7**

---

## Feedback Format

After each answer:

```
ANSWER EVALUATION
──────────────────
Substance:   [X/3] — [1 sentence specific comment]
Delivery:    [X/2] — [1 sentence comment]
Satisfaction:[X/2] — [Did this answer satisfy the judge?]
Total:       [X/7]

What worked: [Specific strength in the answer]
What to improve: [Specific weakness]
Better answer: "[A model answer — 2-3 sentences — that would score 7/7]"

Next question: [Next question from the bank, escalate if doing well]
```

---

## Session Summary

After all rounds:

```
Q&A SESSION SUMMARY
────────────────────
Questions asked: [N]
Average score: [X.X/7]
Session grade: 

  6.5-7.0 avg → 🟢 DEMO READY — you can handle the jury
  5.5-6.4 avg → 🟡 SOLID — 1-2 weak areas to rehearse
  4.0-5.4 avg → 🟠 NEEDS WORK — run another round on weak topics
  < 4.0   avg → 🔴 HIGH RISK — practice with full team before demo

Weakest area: [Topic that had lowest scores]
Strongest area: [Topic that had highest scores]

Priority prep:
  1. [Most important thing to rehearse]
  2. [Second most important]
  3. [Third]

Recommended: Run another round focused on [weakest topic]
```

---

## Special Modes

### "One More" Mode
After a satisfactory answer, sometimes say: "Okay, but let me push on that — [follow-up]"
(Simulates the judge who keeps probing.)

### "Kill Shot" Mode (brutal difficulty only)
Occasionally ask a question designed to expose the project's fundamental weakness:
- "Your core assumption is that [X] — but what if [X is false]? Does your solution still work?"
- Designed to force the team to defend their thesis, not just their features.

### "Random Domain Wildcard" Mode
Insert 1-2 questions from a domain the team didn't prepare for — simulates unexpected jury backgrounds.

---

## Integration

- Standalone module — invoke via `/qa-sim`
- Uses outputs from: `16_judge-profiler.md` (judge archetypes), `11_win-dna-analyzer.md` (project DNA to generate specific questions)
- Feeds into: `17_competitor-radar.md` (if a question surfaces a competitive threat the team hadn't considered)
- Best run 1-2 hours before the actual demo

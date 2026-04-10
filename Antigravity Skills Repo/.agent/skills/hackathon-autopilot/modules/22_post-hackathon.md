# Post-Hackathon — Module 22

## Purpose

The hackathon ends — but the value doesn't have to. This module activates **after results are announced** and produces a complete post-event strategy for:
- Maximizing professional visibility
- Deciding whether to continue building
- Documenting the project for portfolio/credibility

---

## Activation

Activate when the user says:
- "Hackathon is over"
- "We won / we didn't win"
- "What do we do next?"
- "/post-hack"

Ask first: **"Did you win, place, or not place?"** — the strategy branches accordingly.

---

## Branch A: You WON (or placed)

### Immediate (first 24 hours)
Act fast — winner momentum decays quickly.

**1. LinkedIn Announcement Post**

Generate a ready-to-post LinkedIn update:

```
LINKEDIN WIN POST TEMPLATE
────────────────────────────
🏆 We [won / placed X] at [Hackathon Name]!

[1 sentence: what the project does]
[1 sentence: the core insight — why it matters]
[1 sentence: what surprised you about building it]

The team: [Tag teammates]
Event: [Tag hackathon organizer if on LinkedIn]

What's next: [1 sentence honest next step — "we're exploring launch" or "open sourcing it next week"]

[Optional: 1-2 screenshots or demo video attached]

#hackathon #[domain]tech #buildinpublic [event hashtag]
```

**2. Twitter/X Thread Announcement** (optional)

Generate a 4-tweet thread:
- Tweet 1: The big result + hook (most shareable)
- Tweet 2: What the project does (with GIF/screenshot)
- Tweet 3: The key technical insight or surprising moment
- Tweet 4: Team shoutout + what's next + CTA (DM to collaborate / star GitHub)

**3. GitHub Repository Setup**

Generate a README template:

```markdown
# [Project Name]

> [1 sentence description]

🏆 **[Award Name] — [Hackathon Name] [Year]**

## What it does

[2 paragraph explanation: problem it solves + how the solution works]

## Demo

[Link to demo video / live URL]
[Screenshot 1]
[Screenshot 2]

## How we built it

**Tech stack:** [Stack list]
**AI/ML:** [Describe the AI layer]
**Architecture:** [Brief description or diagram link]

## Key technical challenges

1. [Challenge 1 + how you solved it]
2. [Challenge 2 + how you solved it]

## What we learned

- [Learning 1]
- [Learning 2]
- [Learning 3]

## What's next

[Honest description: are you continuing? open sourcing? pivoting?]

## Team

| Name | Role | GitHub | LinkedIn |
|------|------|--------|----------|
| [Name] | [Role] | [@handle] | [/in/handle] |
```

---

## Branch B: You Didn't Win

This is actually more common — and equally valuable if handled correctly.

### Reframe: What You Still Got

Output a "value extracted" summary:
```
WHAT YOU BUILT IN [X] HOURS
────────────────────────────
✓ A working prototype
✓ [N] lines of code
✓ End-to-end system architecture
✓ A pitch you rehearsed
✓ Domain knowledge in [area]
✓ Team experience under pressure
✓ A GitHub project to show
```

### LinkedIn Non-Win Post (equally powerful when done right)
```
LINKEDIN POST — DIDN'T WIN
────────────────────────────
"We didn't win [Hackathon Name]. Here's what I learned anyway.

[Honest reflection — what went well, what failed, what you'd do differently]

[1 insight about the domain/problem you didn't have before]

[The team: tag teammates]

Still proud of: [thing you built]
Next: [what you're doing with this insight]

#hackathon #lessons #shipping"
```

**Pro tip:** Non-win humble posts often get MORE engagement than win posts. Authenticity > achievement.

### Post-Mortem Document
Generate a structured retrospective:
```
HACKATHON POST-MORTEM: [Project Name]
──────────────────────────────────────
Date: [Date]
Team: [Names]
Duration: [Xh]
Result: [Placed X / Didn't place]

TIMELINE RECONSTRUCTION
What we planned: [...]
What we actually did: [...]
Where we lost time: [Key time sink]

WHAT WORKED
- [Item 1]
- [Item 2]

WHAT FAILED
- [Item 1] → Root cause: [cause]
- [Item 2] → Root cause: [cause]

DECISION THAT HURT US MOST
[Description of the key wrong decision + when it was made]

WHAT WE'D DO DIFFERENTLY
1. [Change 1]
2. [Change 2]
3. [Change 3]

SCORE: [Self-assessment out of 10]
```

---

## Should You Keep Building? — Impact/Effort Matrix

Ask the user 4 questions:
1. Is the problem you solved real and persistent? (1-5)
2. Does your solution have a realistic path to users? (1-5)
3. How motivated is the team to continue? (1-5)
4. Is there evidence of demand (interest from judges, signups, DMs)? (1-5)

Output:
```
CONTINUE BUILDING? ANALYSIS
────────────────────────────
Problem persistence:    [X/5]
Path to users:          [X/5]
Team motivation:        [X/5]
Early demand signal:    [X/5]

Total: [XX/20]

VERDICT:
  17-20: 🚀 BUILD IT — clear signal, high motivation, do this
  13-16: 🔬 EXPLORE — validate further before committing
  9-12:  ⚠️  PIVOT OR PAUSE — rethink scope or user
  <9:    🗂️  ARCHIVE — great experience, not a business. Move on.
```

---

## Startup Conversion Roadmap (if continuing)

If "CONTINUE" verdict:

**Week 1-2 — Validation Sprint**
- Talk to 10 potential users (not friends, not family)
- Ask: "Do you have this problem? How do you solve it today? What would you pay?"
- Goal: 3 people willing to pay or give contact info for waitlist

**Week 3-4 — Landing Page + Waitlist**
- 1-page site: headline, problem, solution, email signup
- Goal: 100 email signups
- Tools: Framer, Webflow, or Next.js + Resend

**Month 2 — Alpha Users**
- Invite top 10 waitlist signups
- Weekly feedback sessions
- Ship 1 improvement per week

**Month 3 — Revenue or Pivot**
- Charge first user (even $1 proves intent)
- If no one pays for 3 months → pivot or archive

---

## Portfolio Asset Summary

Regardless of outcome, produce a portfolio entry:

```
PORTFOLIO ENTRY: [Project Name]
────────────────────────────────
Title: [Project Name] — [Hackathon Name] [Year]
Tagline: [1 sentence description]
Result: [Won / Finalist / Participant + award if any]
Skills demonstrated: [List: React, FastAPI, LLM integration, etc.]
Demo link: [URL]
GitHub: [URL]
Key achievement: [Most impressive thing about the build]
Story: [2-3 sentence narrative for interviews/LinkedIn]
```

---

## Integration

- Standalone module — invoked after hackathon ends
- Can be invoked via `/post-hack` slash command
- Uses Winner Pack context if available from earlier in the session
- Output template: `templates/output_post_hackathon.md` (to be created inline)

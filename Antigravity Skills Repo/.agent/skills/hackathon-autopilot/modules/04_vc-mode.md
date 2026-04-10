# VC Mode — Module 04

## Purpose

Apply an investor lens to hackathon ideas. Used when:
- The event is organized by a VC, accelerator, or startup-oriented org
- Prize includes investment or accelerator access
- The team wants to signal startup potential beyond the hackathon

**Not every hackathon needs VC Mode.** For corporate or government hackathons, skip this or flag as "secondary priority." See `32_hackathon-type-detector.md`.

---

## The Investor's 5 Questions

Every VC-flavored judge is asking these 5 questions — whether they say so or not:

1. **Is the problem real and large?** (Market sizing)
2. **Is your solution genuinely different?** (Differentiation / insight)
3. **Why you, why now?** (Founder-market fit + timing)
4. **Can this become a business?** (Revenue model + unit economics)
5. **Can this compound?** (Moat / defensibility / network effects)

Address all 5 in the pitch. Missing even one creates doubt.

---

## ICP (Ideal Customer Profile)

Produce a *specific* ICP — not a demographic. An ICP is a single person with a name, a job, a specific frustration, and a specific behavior.

```
ICP DEFINITION
───────────────
Name/title: [e.g., "Maria, Head of Procurement at a mid-market logistics company"]
Company profile: [size, type, region — specific enough to find on LinkedIn]
Specific frustration: [The thing they complain about in team meetings]
Current workaround: [What they actually do today — usually manual / hacky]
Why current workaround fails: [The specific cost or risk it creates]
When they'd pay for a solution: [The trigger that converts them]
Annual budget they control: [Range — signals deal size]
```

**Rules:**
- "SMEs" or "enterprises" are NOT ICPs. Specific job title + company type + named pain = ICP.
- The ICP must be reachable (you could find 100 of them on LinkedIn today)
- The ICP must have budget authority (or clear influence on the buyer)

---

## Market Sizing (Disciplined)

**Never fabricate TAM numbers.** Judges spot fake market sizing instantly, and it destroys credibility.

Use the **Bottom-Up method only:**

```
MARKET SIZING (Bottom-Up)
──────────────────────────
Unit: [One customer / one transaction / one use]
Unit value: $[price per unit — be honest, even if small]
Addressable units: [# of ICPs × frequency × conversion assumption]
Calculation: [X ICPs] × [Y uses/year] × [$Z/use] = $[total]
Beachhead market: [The specific sub-segment you'd attack first]
Beachhead size: $[X] — [how you'll capture it]
```

**Language when uncertain:**
- "We estimate [N] [ICPs] exist based on [LinkedIn search / industry report / census data]"
- "Our pricing assumption is based on [comparable tool] charging $[X] for [similar value]"
- "We'd start with [specific sub-segment] where we have [reason for traction]"

**Never say:**
- "If we capture just 1% of a $50B market…" (top-down = gets you zero points)
- "The global [market] is worth $[large number]" without explaining how you get from there to your revenue

---

## Wedge Entry

The wedge is the smallest possible subset of the market that the team can **dominate** before expanding.

```
WEDGE DEFINITION
─────────────────
Wedge segment: [Ultra-specific — named city, named industry, named company size]
Why this wedge is winnable: [Structural reason — not just "it's smaller"]
Expansion path from wedge:
  Step 1: [Adjacent segment + trigger for moving there]
  Step 2: [Broader market + what enables this]
  Step 3: [Full market vision + what needed to be true]
```

**Good wedge:** "Self-storage operators in Texas with 5-20 locations" (specific, reachable, has a structural pain we solve)
**Bad wedge:** "Startups in the US" (huge, no structural reason you win, no defined pain)

---

## Revenue Model

Produce 1-2 revenue models. Not 5. Choosing signals decisiveness.

**Common hackathon-appropriate models:**

| Model | When it Works | Deal Size Signal |
|-------|--------------|-----------------|
| SaaS subscription (per seat) | Clear recurring workflow | $[X]/seat/month |
| Usage-based | Variable intensity users | $[X]/API call or output |
| Transaction fee | Each instance has clear value | [X]% of [transaction value] |
| Platform + marketplace | Two-sided value creation | Take rate on GMV |
| One-time + support | Enterprise, high integration | $[X] + [Y]% ARR |

```
REVENUE MODEL
──────────────
Primary model: [Model type]
Price point: $[X] per [unit] per [period]
Rationale: [Why this user pays this amount — comparable or willingness-to-pay evidence]
Gross margin estimate: ~[X]% (SaaS = 80%+; marketplace varies)
Payback period for customer: [How long until they recoup the cost]
```

---

## Moat / Defensibility

What prevents a well-funded competitor from copying this in 6 months?

```
MOAT ANALYSIS
──────────────
Primary moat type: [Pick one — see options below]
Evidence it's real: [Why this moat actually exists vs. just being claimed]
Time to build moat: [How long before a copycat can overcome it]
```

**Moat types ranked by strength:**

| Strength | Moat Type | Description |
|----------|-----------|-------------|
| ⭐⭐⭐⭐⭐ | Data moat | Proprietary data that gets more valuable with use |
| ⭐⭐⭐⭐⭐ | Network effects | Product gets better as more users join |
| ⭐⭐⭐⭐ | Switching costs | Users are locked in by integrations or data |
| ⭐⭐⭐⭐ | Regulatory arbitrage | Licensed, certified, or compliant before competitors |
| ⭐⭐⭐ | Workflow integration | Embedded in daily workflow — too painful to remove |
| ⭐⭐ | Brand + trust | Domain expertise trust takes years to build |
| ⭐ | Technical complexity | Can be replicated given time + funding |
| 0 | First mover | "We got there first" is not a moat |

---

## Why Now (The Timing Argument)

**The strongest "why now" is a specific technological or regulatory shift that just happened.**

```
WHY NOW ARGUMENT
─────────────────
The shift: [Specific thing that changed in the last 12-24 months]
How it enables us: [Direct link between that shift and our product being possible]
Why this wasn't viable 24 months ago: [Specific blocker that no longer exists]
Why waiting 12 more months loses: [What window closes or who else will move]
```

**Examples of strong "why now":**
- "GPT-4 Vision just made [X] possible without building custom computer vision"
- "[Regulation name] took effect this year, forcing [industry] to [change]"
- "[Data source] became publicly available in [year], removing the key blocker"
- "The cost of [sensor/compute/API] dropped below [threshold] that makes our unit economics viable"

---

## Anti-Hype Rules

VC judges hate hype more than they hate modesty. Apply these rules:

```
❌ STRIP from pitch:
   "Revolutionize" / "disrupt" / "transform" / "game-changing" / "world-class"
   These words cost you credibility with every investor-type judge.

✅ REPLACE with:
   Specific metrics: "47% faster" / "3x cheaper" / "zero manual steps"
   Specific claims: "We replace a 3-hour weekly process with a 4-minute pipeline"
   Hedged comparisons: "Similar to how [analogy] changed [industry], [product] does [X] for [Y]"
```

---

## VC Mode Output Block

Produce this block for the winning idea:

```
VC MODE ANALYSIS: [Idea Name]
──────────────────────────────
ICP: [One specific person with title + company type + pain]

Market sizing:
  Beachhead: $[X]M — [Calculation]
  3-year TAM: $[X]M — [If execution goes as planned]

Wedge entry: [Specific segment] → [Expansion path in 1 line]

Revenue model: [Type] at $[X]/[unit] → [Gross margin est.]

Moat: [Type] — [Why real] — [Builds in: X months]

Why now: [1 sentence — specific recent shift]

Fundable signal: [YES / MAYBE / NO]
  If YES → [What makes this investable]
  If MAYBE → [What question must be answered]
  If NO → [What would need to change]
```

---

## Integration

- Applied in STEP 5 (Idea Scoring) — VC Mode bonus columns added when event type = Type 3 (VC Hackathon)
- Feeds into: `08_pitch-script.md` (investor pitch structure), `11_win-dna-analyzer.md` (investability dimension)
- Skip or downweight when `32_hackathon-type-detector.md` returns Type 1 (Corporate) or Type 4 (Government)

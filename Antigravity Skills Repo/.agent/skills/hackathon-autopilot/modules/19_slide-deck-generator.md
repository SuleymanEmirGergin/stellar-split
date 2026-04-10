# Slide Deck Generator — Module 19

## Purpose

Transform the Winner Pack pitch content into a **fully structured, presentation-ready slide deck outline** that:
- Follows proven hackathon presentation formats
- Includes speaker notes for every slide
- Provides a visual/layout direction for each slide
- Outputs copy-paste prompts for Canva, Google Slides, or Figma

---

## Core Principle

**A hackathon slide deck is NOT a document. It is a performance prop.**

Rules enforced:
- Max 8 slides for ≤5 min pitch; max 12 slides for ≤10 min pitch
- Max 3 bullets per slide (usually fewer)
- Every slide must pass the "10-second test": a judge glancing for 10 seconds understands it
- No wall of text. If a slide has more than 30 words total, it fails.
- Every slide has exactly ONE visual anchor (chart, icon, screenshot, or number)

---

## Slide Structure Templates

### Template A: 5-Minute Pitch (7 slides)

**Slide 1 — The Hook**
- Goal: Grab attention in 10 seconds
- Content: 1 powerful statement, 1 striking statistic, or 1 confrontational question
- Visual: Full-bleed image or bold number
- Speaker note: Open with the emotional gut-punch. Don't say your name yet.

**Slide 2 — The Problem**
- Goal: Make the problem feel real and urgent
- Content: 3 words that name the villain + 1 stat that proves scale
- Visual: Timeline of the problem, or a "person experiencing this" illustration
- Speaker note: Use "right now, somewhere in [domain], X is happening and nobody is fixing it"

**Slide 3 — The Solution**
- Goal: Relief from the problem tension
- Content: Product name + 1 sentence description + 3 core capabilities (icons, not bullets)
- Visual: Product screenshot or clean mockup frame
- Speaker note: Don't over-explain. Plant curiosity. "Let me show you."

**Slide 4 — The Demo Moment (or Demo Teaser)**
- Goal: "I believe it works"
- Content: 1 key screenshot or demo video still, with annotation arrows
- Visual: Actual product UI, annotated with outcome labels
- Speaker note: Point to the screen, walk through ONE user journey, highlight the key result

**Slide 5 — The Impact Metric**
- Goal: Quantify the value created
- Content: 1 primary metric (large, centered) + 2 supporting metrics
- Visual: Large bold number centered on slide (e.g., "47% → 12%" or "$1.2M saved")
- Speaker note: Say how you measured/estimated it. Credibility matters more than the number.

**Slide 6 — The Business / Go-Forward**
- Goal: "How does this persist beyond today?"
- Content: Revenue model (1 line) + target user + scale path (1 line)
- Visual: Simple 2x2 or roadmap with 3 phases
- Speaker note: Don't pitch for funding. Say: "We plan to launch to [user segment] via [channel]."

**Slide 7 — The Team + Ask**
- Goal: "These people can execute this"
- Content: Team member names + 1 relevant superpower each + 1 clear ask
- Visual: Photos or avatar icons arranged horizontally
- Speaker note: End with the ask: a question that invites judges to engage ("We'd love your intro to X")

---

### Template B: 3-Minute Pitch (5 slides)

**Slide 1 — Problem + Hook** (combine)
**Slide 2 — Solution + Demo Teaser**
**Slide 3 — Impact Metric**
**Slide 4 — Business Model**
**Slide 5 — Team + Ask**

---

### Template C: 10-Minute Full Presentation (10-12 slides)

Add to Template A:
- **Slide 8 — Technical Architecture** (for technical judges)
- **Slide 9 — Competitive Landscape** (simple 2x2: us vs alternatives)
- **Slide 10 — Traction / Validation** (user interviews, prototype feedback, signups)
- **Slide 11 — Roadmap** (3 phases, 12-month horizon)
- **Slide 12 — Appendix** (hidden: detailed data, API contracts, full team bios)

---

## Full Slide-by-Slide Output Format

For each slide, produce:

```
─────────────────────────────────────────────
SLIDE [N]: [Slide Title]
─────────────────────────────────────────────
HEADLINE:     [Max 8 words — the one thing to read]
BODY:         [Max 3 bullets or 1 visual description]
VISUAL:       [Describe the exact visual: chart type, screenshot, icon, number]
SPEAKER NOTE: [What to say while this slide is showing — 3-4 sentences]
TRANSITION:   [Bridge sentence to the next slide]
─────────────────────────────────────────────
```

---

## Design Prescription

For each slide deck, specify:

### Color Palette
Based on hackathon theme or product domain:
- **Tech/AI:** Dark mode — #0A0A0F background, #7C3AED accent, white text
- **Health:** Clean white, #10B981 accent, gentle typography
- **Finance:** Navy #1E3A5F, gold #D4AF37, trust-building serif
- **Education:** Warm cream #FDF6E3, coral #E97451, playful sans-serif
- **Climate/Sustainability:** Forest green #1A3C34, yellow #F5D547, earthy tones
- **Default/Mixed:** Slate #1E293B, electric blue #3B82F6, Inter font

### Typography
- Headline: Inter Bold or Outfit Bold, 40-56pt
- Body: Inter Regular, 20-24pt
- Caption: Inter Light, 14-16pt

### Layout Principles
- Left-aligned text, right-side visual (or full bleed)
- 80-120px padding on all sides
- One visual hierarchy per slide (don't compete)
- "Breathing room" rule: if it looks crowded, remove one element

---

## Canva / Google Slides / Figma Prompts

### Canva Prompt
```
Create a hackathon pitch deck presentation with [N] slides. 
Style: [dark/light/corporate/startup]. 
Color palette: [primary] + [accent] + white. 
Font: Inter or Outfit (Google Fonts). 
Include: title slide, problem, solution, product screenshot placeholder, 
impact metric (large number, centered), business model, team slide.
Each slide: minimal text, one bold visual, clean margin breathing room.
Use a consistent card-style layout with subtle shadow and rounded corners.
Make it feel like a Y Combinator pitch crossed with a premium SaaS landing page.
```

### Google Slides Prompt (Gemini or ChatGPT plugin)
```
Create a 7-slide Google Slides presentation for a hackathon pitch about: [PRODUCT NAME].
Problem: [1 sentence]. Solution: [1 sentence]. Impact: [key metric].
Style: modern startup, [color palette], Inter font.
Each slide should have max 3 lines of text and one visual element.
Include speaker notes for each slide.
Make the impact slide have a large centered number: [METRIC].
```

### Figma Prompt
```
Design a pitch deck in Figma with [N] frames at 1920x1080px.
Theme: [dark/light]. Primary color: [hex]. Accent: [hex]. Font: Inter.
Frame names: Hook, Problem, Solution, Demo, Impact, Business, Team.
Each frame: one headline (56pt bold), optional body (20pt), one visual zone (right 50% or full bleed).
Apply auto-layout with 120px padding. No clutter. Premium hackathon demo aesthetic.
```

---

## Anti-Patterns to Flag

Automatically warn if the generated deck would have:

```
⚠ More than 3 bullets on any slide → consolidate
⚠ Text below 18pt → remove or enlarge
⚠ No visual on any slide → add a number, chart, or screenshot placeholder
⚠ "About us" slide before problem slide → reorder
⚠ Revenue model missing → add at minimum 1 line
⚠ No call to action on final slide → add specific ask
⚠ Business model says "freemium then premium" without detail → expand
```

---

## Integration

- Called in STEP 7 (Winner Pack), after `08_pitch-script.md` generates the script
- Uses pitch content from `08_pitch-script.md` and impact metrics from `11_win-dna-analyzer.md`
- Output template: `templates/output_slide_deck.md`
- Can be invoked standalone: user pastes a Winner Pack and gets a slide deck

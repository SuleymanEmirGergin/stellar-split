# Sponsor Alignment — Module 23

## Purpose

Most hackathon participants only compete for the **main prize**. This module unlocks **parallel prize strategies**:
- Identifying sponsor-specific prizes and how to win them
- Integrating sponsor APIs/products naturally without feeling forced
- Understanding sponsor motivations for being at the event
- Crafting a "sponsor hook" that makes judges feel the product was built for them

**Key insight:** Sponsor prizes are often less competitive (fewer focused submissions) and signal strong judgment for the win.

---

## Sponsor Intelligence Gathering

### Input
Accept from user:
- Event page sponsor list (logos, names, tiers)
- Sponsor prize descriptions if listed
- Any API credits or tools offered by sponsors

### Classification Framework

For each sponsor, classify their **participation motivation**:

| Motivation | Evidence | What They Want |
|------------|----------|----------------|
| **Developer Advocacy** | Big Tech (Google, AWS, OpenAI, Microsoft) | API usage volume; developers discovering their platform; GitHub stars on integrations |
| **Talent Pipeline** | Consulting firms, large corps (McKinsey, Accenture, Deloitte) | See strong juniors; identify potential hires; brand visibility with students |
| **Partnership / BD** | Domain-specific SaaS (Twilio, Stripe, Segment, Mapbox) | Real use cases for their product; testimonials; potential B2B deals |
| **PR / Visibility** | NGOs, foundations, government bodies | Projects that generate media coverage; solving their stated mission |
| **Market Research** | Startups, vertical SaaS | Understanding how builders use their category; competitive intelligence |
| **Community Building** | Dev communities, accelerators | Ecosystem participation; community growth; projects that keep developers engaged |

### Sponsor Prize Tier Analysis

```
SPONSOR PRIZE ANALYSIS
────────────────────────
[Sponsor Name]
  Motivation: [Classification above]
  Prize offered: [Description or "best use of [their product]"]
  Estimated competition: [LOW / MEDIUM / HIGH]
    Low: sponsor-specific track, few teams focus on it
    High: main prize track, all teams eligible
  Integration effort: [1h / 3h / 6h]
  Compatibility with our idea: [HIGH / MEDIUM / LOW]
  Recommended? [YES / STRETCH / NO]
```

---

## Natural Integration Strategy

**Rule:** Never integrate a sponsor tool JUST for the prize. It must enhance the product.

For each recommended sponsor:

### Step 1: Find the natural fit
Ask: "Does our product genuinely benefit from this service?"

| Sponsor Category | Natural Integration Points |
|-----------------|---------------------------|
| **OpenAI / Anthropic / Google AI** | Core AI reasoning, structured output, embeddings |
| **AWS / GCP / Azure** | Deployment, storage, managed databases, vision/speech APIs |
| **Twilio / Vonage** | SMS alerts, WhatsApp notifications, voice calls |
| **Stripe / Paddle** | Payment flows, subscription management (even simulated) |
| **Mapbox / Google Maps** | Location features, geospatial visualization |
| **Twilio Segment** | User event tracking, analytics pipeline |
| **Supabase / PlanetScale / MongoDB Atlas** | Database layer |
| **Cloudflare** | Edge deployment, Workers, D1 database |
| **HuggingFace** | Open source models, inference API, Spaces deployment |
| **Replicate** | Image/video generation, ML model inference |

### Step 2: Write the integration narrative
For each integrated sponsor, create a one-liner that frames the integration as product-driven:

**Template:** "We use [Sponsor] because [product need], which [outcome for user]."

**Example:** "We use Twilio because real-time alerting is core to our crisis detection flow — when a threshold is breached, responders receive an SMS within 2 seconds."

**Anti-pattern:** "We added Twilio to qualify for their prize." ← Never say this.

### Step 3: Demo the integration visibly
Identify the moment in the demo where the sponsor integration is visually shown:
- Live API call in the UI
- Log/activity showing the service in action
- A specific demo screen that shows the sponsor's output

---

## Sponsor-Specific Pitch Hooks

When pitching, tailor one sentence for each major sponsor in the audience:

**For Developer Advocacy sponsors (e.g., OpenAI, Google):**
> "We process [N] API calls per [unit] through [Sponsor] — and we've already seen the cost efficiency that makes this production-viable."

**For Talent Pipeline sponsors (e.g., Big consulting firms):**
> "This is a problem that affects [their sector] every day — we'd love to explore how it might integrate into [their domain] workflows."

**For Partnership/BD sponsors (e.g., Stripe, Twilio):**
> "We specifically chose [Sponsor] because your [feature] solved a critical edge case in our flow that no alternative handles as elegantly."

**For PR/Mission sponsors (e.g., NGOs, government):**
> "Every [metric] improvement our system produces directly serves [their stated mission] — and we used [their data/resource] to validate this."

---

## Dual-Track Strategy

If our idea is compatible with 2+ sponsor prizes:

```
DUAL-TRACK STRATEGY
────────────────────
Primary track: [Main prize — what we're optimizing for]
Secondary track: [Sponsor prize — parallel target]

Time allocation:
- Integration effort for sponsor: [X hours]
- Presentation adjustment needed: [Y minutes of work]

Risk: Does secondary track integration compromise primary track demo? [YES/NO + explanation]
Recommendation: [GO PARALLEL / TOO RISKY — STAY PRIMARY]
```

---

## Sponsor Alignment Checklist

Before demo day, verify:

```
SPONSOR CHECKLIST
──────────────────
☐ API key obtained and tested (not just signed up)
☐ Integration is visible in the demo (not just backend)
☐ Integration narrative prepared (the one-liner)
☐ Sponsor prize submission channel identified (separate form? tag?)
☐ Demo includes a specific sponsor "moment" (30 seconds dedicated to it)
☐ Sponsor name is credited in README and slides
☐ Team knows the sponsor's product name correctly (not "your service")
```

---

## Output Format

```
SPONSOR ALIGNMENT REPORT
─────────────────────────

SPONSORS ANALYZED: [N]

PRIORITY TARGETS (by ROI):
1. [Sponsor] — [Prize] — Competition: LOW — Effort: 3h — Recommend: ✅
2. [Sponsor] — [Prize] — Competition: MEDIUM — Effort: 2h — Recommend: ✅
3. [Sponsor] — [Prize] — Competition: HIGH — Effort: 5h — Recommend: ⚠️

DUAL-TRACK PLAN:
[Description or "Single track recommended"]

INTEGRATION NARRATIVES:
[Sponsor]: "[One-liner narrative]"

SPONSOR MOMENTS IN DEMO:
[Sponsor]: Show [screen/moment] at [timestamp in demo script]

SPONSOR PITCH HOOKS:
[Sponsor]: "[Tailored sentence for their motivation]"

TOTAL ADDITIONAL EFFORT: [X hours]
EXPECTED ADDITIONAL PRIZES: [N prizes targeted]
```

---

## Integration

- Called in STEP 1 (Event Brief), if sponsor list is provided
- Feeds into `08_pitch-script.md` (add sponsor hooks to pitch)
- Feeds into `09_demo-script.md` (add sponsor moments)
- Feeds into `07_architecture-mvp.md` (add sponsor services to tech stack)
- Independent of other modules — can be run standalone when sponsor list is given

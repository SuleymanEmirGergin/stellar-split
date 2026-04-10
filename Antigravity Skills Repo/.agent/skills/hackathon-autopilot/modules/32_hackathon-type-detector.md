# Hackathon Type Detector — Module 32

## Purpose

Not all hackathons are the same. A **corporate innovation sprint** and a **student startup weekend** require completely different strategies. This module detects the hackathon type from the event brief and **automatically adjusts the pipeline weights** accordingly.

The pipeline is the same — but what earns 10/10 in one context earns 5/10 in another.

---

## Activation

Runs automatically in STEP 1 (Event Brief Extraction) — no manual invocation needed.
Also available standalone via `/event-type`.

---

## Detection Signals

From the event brief, scan for the following signals:

### Signal Set A: Who is organizing?
| Organizer Type | Detected When |
|----------------|--------------|
| **Corporate / Enterprise** | Organizer is a large company (bank, telecom, retailer, healthcare corp) |
| **Government / Public Sector** | Organizer is a ministry, municipality, city, NGO, UN agency |
| **University / Academic** | Organized by a university, student association, research lab |
| **VC / Accelerator** | Organized by a VC firm, startup incubator, accelerator program |
| **Tech Giant** | Organized by Google, Microsoft, AWS, Meta, Apple, or similar |
| **Open Community** | MLH, Devpost, open community hackathon, no single main organizer |
| **Domain Association** | Healthcare association, fintech council, climate org, edu foundation |

### Signal Set B: What is the prize structure?
| Prize Pattern | Implication |
|---------------|-------------|
| Cash prize only | Win orientation — maximize score on all criteria |
| Job/internship offer | Talent hunting — team execution and presentation matter more |
| Investment / accelerator spot | VC mode — market size and business model critical |
| Partnership with organizer | Enterprise sales readiness — integration story matters |
| "Best use of [Sponsor API]" prizes | Tech stack alignment with sponsors critical |
| Non-monetary (trophy, prestige) | PR/reputation driven — show ambition over execution |

### Signal Set C: Who is the target participant?
| Target | Implication |
|--------|-------------|
| "Students" mentioned | University/student hackathon — ambition > maturity |
| "Professionals" or specific job titles | Domain depth expected |
| "Developers" / "engineers" | Technical judges; show architecture |
| "Entrepreneurs" / "founders" | Business model critical |
| "Open to all" with no spec | Default mixed mode |

### Signal Set D: Theme and constraints
| Constraint | Implication |
|-----------|-------------|
| Must use sponsor technology | Integration is judged; pure novelty is secondary |
| Specific domain required | Domain expertise expected |
| Team size limits (solo, pairs only) | Adjust role optimizer |
| Data provided by organizer | Data product expected; bring insights, not features |
| "No code" allowed | UX and pitch > technical implementation |

---

## Hackathon Type Classification

Based on detected signals, classify into one of 7 types:

### Type 1: Corporate Innovation Sprint

**Detection signals:**
- Large company organizer
- Prize = partnership / pilot opportunity / job offer
- Target: internal employees or external problem-solvers

**What wins here:**
- Business case clarity (ROI in 6 months, measurable KPI)
- Integration with existing enterprise systems
- Implementation roadmap (not just an idea)
- Legal/compliance awareness
- Presenter credibility with business stakeholders

**Pipeline weight adjustments:**
```
Business Model: ×1.5 (elevated)
Technical Depth: ×0.7 (reduced)
Novelty: ×0.8 (reduced — don't be TOO weird)
Impact Metric: ×1.3 (elevated — show ROI)
Demo Clarity: ×1.2 (elevated — executive audience)
```

**Pitch tone:** Corporate, measured, data-driven. Avoid startup slang.
**Idea bias:** Efficiency multiplier, cost reduction, compliance automation, workflow integration.

---

### Type 2: Student / University Hackathon

**Detection signals:**
- University or student association organizer
- "Students only" eligibility
- Short timeline (24-36h typical)
- Prize = scholarship, recognition, networking

**What wins here:**
- Ambition over polish (scale of thinking)
- Learning evidence ("we learned X and pivoted to Y")
- Team chemistry and energy
- Genuinely novel problem framing
- Technical confidence even without production quality

**Pipeline weight adjustments:**
```
Novelty: ×1.5 (elevated)
Business Model: ×0.7 (reduced — not expected to be production-ready)
Technical Depth: ×1.0 (normal — effort is rewarded)
Demo Clarity: ×1.3 (elevated — judges want to be excited)
Impact: ×1.2 (elevated — show you care about the outcome)
```

**Pitch tone:** Energetic, authentic, passionate. Show learning journey.
**Idea bias:** Ambitious "invisible problem" ideas; human at risk archetypes.

---

### Type 3: VC / Startup Hackathon

**Detection signals:**
- Organized by VC, accelerator, or YCombinator-style program
- Prize = investment, accelerator spot, mentorship
- "Startup potential" in judging criteria
- Participants = founders/entrepreneurs

**What wins here:**
- Clear market opportunity with data (TAM/SAM/SOM)
- Differentiated insight (what do you know that others don't?)
- Demo that feels like a product, not a prototype
- Founder-market fit (why are YOU the right person?)
- Path to revenue is specific

**Pipeline weight adjustments:**
```
Business Model: ×1.8 (highly elevated)
Market Size: ×1.5 (elevated — new dimension added)
Novelty: ×1.3 (elevated — investors want moats)
Technical Depth: ×0.8 (reduced — product-market fit > engineering)
Demo Clarity: ×1.2 (elevated — pitch is the product)
```

**Pitch tone:** Investor pitch mode. Use TAM/SAM/SOM, unit economics language.
**Idea bias:** Platform play, data moat, network effects, scalable infrastructure.

---

### Type 4: Government / Public Sector Hackathon

**Detection signals:**
- Ministry, city, NGO, or government agency organizer
- Focus: citizen services, public policy, transparency, inclusion
- Prize: pilot project with government, grant funding

**What wins here:**
- Trustworthy, explainable AI (not black box)
- Open-source or open-data orientation
- Accessibility and inclusion considerations
- Privacy and security by design
- Feasible within public procurement realities
- Real partnership with civil society

**Pipeline weight adjustments:**
```
Trust/Transparency: ×1.8 (new elevated dimension)
Impact (social): ×1.5 (elevated)
Business Model: ×0.5 (reduced — public sector doesn't need profit narrative)
Novelty: ×0.8 (reduced — proven technologies preferred over cutting-edge risk)
Accessibility: ×1.4 (new elevated dimension)
```

**Pitch tone:** Measured, responsible, evidence-based. "We've considered the risks."
**Idea bias:** Regulator's dream, efficiency for civil servants, transparent AI, citizen empowerment.

---

### Type 5: Tech Giant / Platform Hackathon

**Detection signals:**
- Organized BY or in partnership WITH Google, Microsoft, AWS, Meta, OpenAI, etc.
- "Best use of [Platform API]" is a primary prize category
- Developer ecosystem emphasis

**What wins here:**
- Creative and technically impressive use of the sponsor's platform
- Shows capabilities of the platform that aren't obvious
- Developer experience is excellent (others could replicate it)
- Could become a case study / success story for the platform

**Pipeline weight adjustments:**
```
Sponsor Integration: ×2.0 (critical — core to winning)
Technical Depth: ×1.4 (elevated)
Developer UX: ×1.3 (elevated — platform wants devs to adopt their tools)
Business Model: ×0.7 (reduced)
Novelty: ×1.2 (elevated — creative API use is valued)
```

**Pitch tone:** Developer-focused. Show the code, explain the architecture.
**Idea bias:** Tech demo that shouldn't exist yet, platform play, developer tool.

---

### Type 6: Domain-Specific Hackathon

**Detection signals:**
- Single domain track (health, climate, education, fintech, etc.)
- Domain expertise in judging panel
- Use of specific domain datasets

**What wins here:**
- Domain accuracy (no mistakes that experts would catch)
- Real-world feasibility (could this survive in actual [domain] context?)
- Evidence of user research (spoke to real [domain] users)
- Measurable domain impact metric

**Pipeline weight adjustments:**
```
Domain Accuracy: ×1.8 (critical)
User Research Evidence: ×1.5 (elevated)
Impact Metric: ×1.4 (elevated — domain-specific KPI required)
Novelty: ×1.0 (normal — familiar domains are fine if executed well)
Business Model: ×1.1 (slight elevation — sustainability matters in domain)
```

**Pitch tone:** Domain vocabulary fluency. Show you understand the world they live in.
**Idea bias:** Human at risk, efficiency multiplier, invisible problem revealed with domain data.

---

### Type 7: Open Innovation / Community Hackathon

**Detection signals:**
- MLH, Devpost, or community-driven
- No single corporate or government organizer
- "Best overall," "most creative," "most impactful" as categories
- No domain restriction

**What wins here:**
- Whatever the judges find most exciting (highly variable)
- Polish + ambition combination
- Strong demo energy
- Surprise factor

**Pipeline weight adjustments:**
```
No major adjustments — standard weights apply.
Novelty: ×1.2 (slight elevation — creative judges)
Demo Clarity: ×1.2 (elevated — WOW factor matters)
```

**Pitch tone:** Energetic, clear, show personality.
**Idea bias:** Invisible problem, human at risk, tech demo.

---

## Type Detection Output Format

```
HACKATHON TYPE DETECTION
─────────────────────────
Event: [Name]
Organizer: [Type]
Prize structure: [Description]
Target participants: [Description]

CLASSIFICATION: Type [N] — [Name]
Confidence: [HIGH / MEDIUM / LOW]
Evidence: [Key signals that led to this classification]

If MEDIUM/LOW confidence:
  Could also be: Type [X] — [reason]
  Recommendation: Run /event-type with more info for higher accuracy

PIPELINE ADJUSTMENTS APPLIED:
  [Dimension]: [×multiplier] — [reason]
  ...

STRATEGIC IMPLICATIONS:
  → [Key strategic shift 1]
  → [Key strategic shift 2]
  → [Key thing to avoid in this event type]

IDEA BIAS:
  Favor: [Archetype from module 30]
  Avoid: [What doesn't work in this type]
```

---

## Integration

- **Runs automatically in STEP 1** — outputs feed into all subsequent steps
- Adjusts scoring weights in `06_idea-synthesizer.md`
- Adjusts pitch tone in `08_pitch-script.md`
- Adjusts jury profiling defaults in `16_judge-profiler.md`
- Adjusts business model weighting in `21_scoring-simulator.md`
- Standalone via `/event-type` — user can re-run if initial classification was wrong

# Personalization Profile â€” Module 12

## Purpose

Dynamically profile the team's technical strengths, working style, stress patterns, and prior experience to personalize every output: idea generation, stack selection, role assignment, scope decisions, and communication tone.

**Rule:** Do NOT use hardcoded assumptions. Profile first, then generate.
**When to run:** At session start, before idea generation. Revisit mid-hackathon if team dynamics shift.

---

## Phase 1: Technical Profile

Ask the user (or infer from context). Accept partial answers â€” profile partial data, note gaps:

```
TECHNICAL PROFILE QUESTIONS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
1.  Team size: [1 / 2 / 3 / 4 / 5+]
2.  Primary language(s): [Python / TypeScript / JavaScript / Go / other]
3.  Secondary language comfort: [Confidently use / Can read / None]
4.  Frontend: [None / CSS basics / Component libs / Expert React/Vue/Angular]
    â†’ Preferred framework: [Next.js / React / Vue / SvelteKit / plain HTML]
5.  Backend: [None / CRUD-level / REST expert / Distributed systems]
    â†’ Preferred framework: [FastAPI / Express / Django / Hono / other]
6.  AI/ML comfort: [API calls only / Prompt engineering / RAG / Agents / Fine-tuning]
    â†’ Preferred provider: [OpenAI / Anthropic / Gemini / local models / no preference]
7.  Data / DB: [None / SQL basics / ORM expert / Supabase user / Vector DBs]
8.  Design/UI: [None / Basic CSS / Tailwind / Component libs / Full Figma]
9.  DevOps: [None / Vercel deploy / Docker basics / CI/CD / Kubernetes]
10. Available build hours: [< 12 / 12-24 / 24-36 / 36-48 / 48+]
11. Hackathon experience: [None / 1-2 events / 3-5 events / 5+ events]
12. Biggest personal strength: [Free text â€” what makes you dangerous in a hackathon?]
```

---

## Phase 2: Working Style Profile

These questions reveal how the team performs under pressure:

```
WORKING STYLE QUESTIONS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
13. Decision style: [Lone wolf (1 person decides) / Consensus / Rotating lead]
14. When stuck on a bug: [Ask immediately / Debug solo for max 30 min / Go around the blocker]
15. Scope discipline: [We cut ruthlessly / We try to add more / We've been burned before]
16. Sleep plan (24h+ event): [Sleep 4-6h / Power naps / No sleep plan yet]
17. Communication: [Async messages / Constant sync / Scheduled check-ins]
18. Strongest combo: [I build, partner pitches / Everyone codes / Designer + developers]
```

---

## Phase 3: Motivation & Risk Profile

```
MOTIVATION & RISK QUESTIONS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
19. Primary goal: [Win / Learn / Ship something / Network / Get hired / Startup validation]
20. Risk tolerance: [Conservative (sure it ships) / Balanced / Ambitious (might not finish)]
21. Post-hackathon interest: [Continue building / One-and-done / Depends on result]
22. Domain familiarity: [Expert in this theme / Know the basics / Complete newcomer]
23. Presentation comfort: [Hate pitching / Okay / Confident presenter / Practiced speaker]
```

---

## Profile Interpretation Rules

### Language â†’ Stack Bias

| Profile | Stack Recommendation |
|---------|---------------------|
| Python-primary | FastAPI backend + Streamlit OR Next.js frontend; LangChain/instructor for AI |
| TypeScript-primary | Next.js fullstack + Vercel AI SDK; Supabase; shadcn/ui |
| Both | TypeScript frontend + Python backend (clean separation) |
| Unknown/other | Adapt to stated language; avoid introducing unfamiliar frameworks |
| Solo coder | Prefer fullstack TypeScript (one language throughout) |

### AI Comfort â†’ Approach

| Comfort Level | Recommended Approach |
|--------------|---------------------|
| API calls only | Direct OpenAI/Anthropic API + structured JSON output; `instructor` library; warn against agents |
| Prompt engineering | Multi-turn chains, system prompt sophistication, tool use pattern |
| RAG | pgvector or Chroma; chunking strategy; retrieval tuning |
| Agent patterns | LangGraph or CrewAI; warn about agent unreliability in demos; pre-compute all outputs |
| Fine-tuning | Discourage for < 48h unless it's the core differentiator |

### Design Comfort â†’ UI Strategy

| Design Comfort | UI Strategy |
|---------------|-------------|
| None | Streamlit (no design decisions) OR shadcn/ui (pre-built, professional) |
| Basic CSS | Tailwind + DaisyUI or Flowbite; avoid custom component building |
| Component libs | shadcn/ui + Radix + Tailwind design system |
| Full Figma | Design-first: 2h in Figma â†’ 4h building from spec; allocate design in build plan |

### Time â†’ Scope Calibration

| Available Hours | Scope Budget |
|----------------|-------------|
| < 12h | Minimum Demo Floor only: 1 feature, 1 AI call, Streamlit or pre-built UI |
| 12-24h | Core product + 1 AI feature + basic UI + pitch script |
| 24-36h | Full stack + polished demo-critical UI + demo mode + slide deck |
| 36-48h | All of above + Q&A sim + social content + stretch feature attempt |
| 48h+ | Can attempt secondary features; still maintain demo-first discipline |

### Experience â†’ Complexity Permission

| Experience | Recommendation |
|-----------|---------------|
| None (first hackathon) | Simplify stack. One language. Streamlit + one API call. Warn about time traps. Add "beginner gotcha" notes throughout. |
| 1-2 events | Standard recommendations. Add scope discipline reminders. |
| 3-5 events | Full stack patterns. Can suggest more advanced patterns. Less scaffolding needed. |
| 5+ veterans | Can suggest advanced patterns (agents, RAG, async queues). Trust their judgment on scope. |

### Risk Tolerance â†’ Strategy Mode

| Risk Tolerance | Strategy |
|---------------|---------|
| Conservative | Demo Line = simplest possible demo. Cut everything non-critical early. Pre-compute everything. |
| Balanced | Standard Winner Pack approach. Build, then polish. |
| Ambitious | Encourage stretch; warn when 75% time mark is reached with < 50% done. Hard cut rule applies. |

### Motivation â†’ Pitch/Demo Emphasis

| Primary Goal | Emphasis |
|-------------|---------|
| Win | All modules at full depth. Maximum investment in Q&A sim and pitch coaching. |
| Learn | Explain decisions more. Suggest stretch tech they'll learn from. |
| Ship | Prioritize working demo over perfect pitch. |
| Network | Add `/social` module explicitly. Post-hackathon LinkedIn content prioritized. |
| Startup validation | Activate VC mode. ICP depth, market sizing. Post-hackathon strategy emphasized. |
| Get hired | Polish GitHub README and commit quality. Code quality > speed. |

---

## Team Size â†’ Playbook Selection

### Solo (1 person)
```
SOLO PLAYBOOK
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Scope: Cut by 60% vs. team project. Fewer screens, fewer endpoints, fewer features.
Stack: Single language throughout (no language switching). TypeScript fullstack preferred.
Role: By necessity â€” you are PM, backend, frontend, pitcher, demo operator.
Risk: Demo mode is MANDATORY. You cannot fix a bug during the demo.
Time split: 70% build, 15% pitch prep, 15% demo polish.
Gotchas:
  - Don't spend first 2h on setup. Use a starter kit from module 28.
  - Allocate 1h at the end for pitch practice. You will skip this. Don't.
  - Sleep is non-negotiable. A rested solo is better than an exhausted one.
```

### Duo (2 people)
```
DUO PLAYBOOK
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Natural split: [Person A: backend + AI] + [Person B: frontend + pitch]
Alternatively: [Person A: full-stack] + [Person B: story + demo]
Integration risk: MEDIUM â€” you need to agree on API contract at hour 1.
Communication: Sync every 2h. One source of truth (shared doc or GitHub issue).
Gotchas:
  - Integration hell is real for duos. Define the API contract before any code.
  - "I'll just quickly add this feature" from either person = scope creep. Invoke cut rule.
  - Both must know the pitch. If one person gets sick, the other presents.
```

### Team (3-4 people)
```
TEAM PLAYBOOK
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Roles: PM/Product + Backend + Frontend + Pitch/Demo (+ optional DevOps)
Integration risk: HIGH â€” use integration windows from module 15.
Communication: Async between check-ins. Shared team doc. PM has cut authority.
Gotchas:
  - Someone will go off-script and build a feature not on the cut list. PM must stop this.
  - The person with the most energy at hour 36 is the presenter. Decide this early.
  - 4-person teams often underdeliver because of coordination overhead. Assign owners.
```

### Large Team (5+ people)
```
LARGE TEAM PLAYBOOK
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Risk: Too many cooks. Coordination cost exceeds build benefit past ~5 people.
Strategy: Split into 2 squads: [Core Squad: 3 builders] + [Narrative Squad: 2 people]
Core Squad: Build the product. Autonomous. Check in at integration windows.
Narrative Squad: Pitch, slides, social media, domain research, Q&A prep.
Gotchas:
  - The biggest risk is the narrative squad wanting to change the product concept.
    Define the Demo Line at kickoff and lock it.
  - More team = more features (trap). Enforce scope cut.
```

---

## Adaptive Injection Map

After collecting the profile, inject these personalizations into each module:

```
PERSONALIZATION INJECTION
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â†’ 06_idea-synthesizer.md
  Bias ideas toward team's stack strength.
  Filter out ideas requiring tech the team doesn't know.
  Flag: ideas requiring [unknown technology] â€” add difficulty penalty.

â†’ 07_architecture-mvp.md
  Select architecture style matching team size + experience.
  Recommend Mermaid variant matching the pattern selected.
  Stack summary uses team's preferred framework.

â†’ 10_risk-cut-scope.md
  Cut more aggressively for solo / less experienced teams.
  Risk calibration uses availability hours for build targets.

â†’ 20_tech-stack-advisor.md
  Primary recommendation matches language + framework profile.
  Warn against unfamiliar stacks even if theoretically optimal.

â†’ 24_team-role-optimizer.md
  Role assignment considers working style (decision style, communication).
  PM assignment considers experience level.
  Pitch assignment considers presentation comfort score.

â†’ 28_code-starter-generator.md
  Generate starter for the team's preferred stack.
  Include only the language/framework the team actually knows.

â†’ 08_pitch-script.md
  Pitch complexity calibrated to presentation comfort level.
  If comfort = low â†’ simpler script structure, shorter sentences, more pauses.

â†’ 09_demo-script.md
  If design comfort = none â†’ demo script assumes Streamlit or component UI.
  If DevOps = none â†’ demo assumes localhost only.
```

---

## Profile Summary Output

After collecting answers, produce:

```
TEAM PROFILE SUMMARY
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
Identity
  Team size:          [N] ([Solo / Duo / Team / Large])
  Time available:     [N] hours
  Experience level:   [None / Beginner / Intermediate / Veteran]

Technical Stack
  Language profile:   [Primary / Secondary]
  Frontend:           [Comfort level + preferred framework]
  Backend:            [Comfort level + preferred framework]
  AI approach:        [API wrapper / Prompt engineering / RAG / Agents]
  Database:           [Comfort level + preferred service]
  Design:             [None / Basic / Component libs / Figma]
  DevOps:             [None / Vercel / Docker / Full CI/CD]

Working Style
  Decision pattern:   [Lone wolf / Consensus / Rotating]
  Scope discipline:   [Conservative / Balanced / Ambitious]
  Communication:      [Async / Sync / Scheduled]
  Playbook:           [Solo / Duo / Team / Large team]

Motivation
  Primary goal:       [Win / Learn / Ship / Network / Startup / Hire]
  Risk mode:          [Conservative / Balanced / Ambitious]
  Domain familiarity: [Expert / Basics / Newcomer]
  Presentation:       [Low comfort / OK / Confident]

Personalization Flags
  âš¡ Strength to exploit:   [Free text from user]
  âš ï¸  Weakness to mitigate: [Inferred from profile gaps]
  ğŸ¯ Recommended idea type: [Decision intelligence / Visualization / Automation / Multimodal / Agent workflow]
  ğŸ“¦ Recommended starter:   [Module 28 variant: Next.js / FastAPI / Streamlit]
  â±ï¸  Scope budget:          [N features / M screens / K endpoints]

Modules activated at full depth:   [List based on goal]
Modules de-emphasized or skipped:  [e.g., VC mode if goal = Learn]
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
```

---

## Default Profile (No Input Given)

If the user provides no profile info, apply:

```
DEFAULT PROFILE
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Stack:      Next.js + Supabase + Tailwind + OpenAI structured output
Team:       2-3 person, standard team playbook
Time:       24-36 hours available
Experience: 1-2 prior hackathons (intermediate)
Goal:       Win
Risk:       Balanced
Idea bias:  Decision intelligence over chat interfaces
Design:     shadcn/ui (component lib level)
AI:         Prompt engineering level

Note in all outputs:
"âš ï¸ Based on default profile â€” run /team-setup for personalized recommendations"
```

---

## Integration

- Runs at session start (before STEP 2) or triggered by `/team-setup`
- Feeds into ALL subsequent modules via the Personalization Injection Map
- Profile summary is attached to the Event Brief output from `01_event-intake.md`
- Role assignments in `24_team-role-optimizer.md` reference working style + skills
- Pitch complexity in `08_pitch-script.md` calibrated to presentation comfort
- Code starter selected in `28_code-starter-generator.md` based on language profile

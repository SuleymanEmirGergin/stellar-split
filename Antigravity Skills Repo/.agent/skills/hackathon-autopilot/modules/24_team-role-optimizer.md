# Team Role Optimizer — Module 24

## Purpose

Given team size, skills, and chosen project, produce a **clear, executable team structure** that:
- Assigns roles to avoid bottlenecks
- Creates a parallel work plan (everyone busy, nobody waiting)
- Identifies the single highest-risk dependency in the build
- Provides fallback plans for missing skills (solo, pairs without a designer, etc.)

---

## Input Collection

Ask the user (or infer from context):

```
1. Team size: [solo / 2 / 3 / 4 / 5+]
2. For each member (or just self if solo):
   Name: [or alias — PM, Dev1, Dev2, Designer]
   Strongest skill: [Frontend / Backend / AI/ML / Design / Data / DevOps / PM]
   Secondary skill: [optional]
   Weakest / won't touch: [optional]
3. Do you have a PM (non-technical leader)? [YES / NO]
4. Do you have a dedicated Designer? [YES / NO]
```

---

## Role Architecture

### The 5 Core Hackathon Roles

**Role 1: Orchestrator (PM/Lead)**
- Owns the vision and keeps everyone aligned
- Makes scope cut decisions
- Writes the pitch and manages time
- **Does NOT code** (unless solo)
- Keeps the demo script updated throughout

**Role 2: Backend/AI**
- Builds the data layer, APIs, and AI integration
- Produces the JSON API contract (source of truth)
- Responsible for demo data seeding
- Owns the offline fallback

**Role 3: Frontend/UI**
- Builds the user-facing interface
- Consumes the API contract from Backend/AI
- Responsible for the demo "wow factor" visuals
- Owns the demo mode toggle / hardcoded fallback screens

**Role 4: AI/Logic Specialist** (can be merged with Backend)
- Designs the prompt engineering / model selection
- Builds the deterministic core
- Owns the eval / confidence score display
- Responsible for making AI outputs demo-safe

**Role 5: Pitch/Demo Producer** (often taken by Orchestrator)
- Builds the slide deck
- Scripts the 90-second demo
- Rehearses with the team
- Prepares Q&A answers
- Records the demo video backup

---

## Team Configuration Templates

### Solo Hacker (1 person)
```
SOLO CONFIGURATION
───────────────────
Role distribution: You do everything. Here's how to not die:

Priority order (in strict sequence, do not parallelize):
1. [H0-H2] Tech setup + 1 working API endpoint
2. [H2-H4] Core AI logic (deterministic, JSON in/out)
3. [H4-H6] Minimal frontend (1 screen that shows the output)
4. [H6-H8] Demo seeding + happy path works end-to-end
5. [H8-H9] Pitch + README
★ Demo Line: After step 4 is done, you have a submission.
★ Everything after step 4 is polish.

Survival tips:
- Use shadcn/ui or Streamlit — don't write CSS
- Use Supabase — don't manage a DB
- Pre-compute all AI responses by hour 8
- Ship the pitch deck first (clear your head)
```

### 2-Person Team
```
2-PERSON CONFIGURATION
───────────────────────
Option A (Full-Stack Split):
  Person 1: Backend + AI logic + API contracts
  Person 2: Frontend + Demo script + Pitch

Option B (Layer Split):
  Person 1: All technical (Backend + Frontend basics)
  Person 2: AI/ML + Pitch + Demo + README

Handoff moment: Hour [X] — API contract must be ready for Frontend to connect
Integration window: Every 2-3 hours, sync on contract changes

Bottleneck risk: ⚠️ Frontend depends on Backend's API — define contract in hour 1
```

### 3-Person Team (Optimal Hackathon Size)
```
3-PERSON CONFIGURATION
───────────────────────
Person 1: Backend + AI Lead → owns stack, API, AI layer
Person 2: Frontend Lead → owns UI, demo mode, visual quality
Person 3: Orchestrator/Pitch → owns scope, pitch, README, demo script

Hour 1 milestone: All 3 agree on API contract (JSON in/out)
Hour 2 milestone: Person 1 has mock API returning correct JSON shape
Hour 3 milestone: Person 2 renders first API response in the UI
Integration windows: Hour 2, Hour N/2, Hour N-3

Bottleneck risk: ⚠️ If Person 1 is blocked, Person 2 has no data → Person 2 should have hardcoded JSON ready to use
```

### 4-Person Team
```
4-PERSON CONFIGURATION
───────────────────────
Person 1: PM/Orchestrator → scope, pitch, demo script, timeline
Person 2: Backend Lead → APIs, DB, auth, deployment
Person 3: AI/Data Lead → model integration, prompt engineering, eval
Person 4: Frontend Lead → UI, UX, demo screens, mock data

Integration windows: Hour 2, Hour N/3, Hour 2N/3

Bottleneck risk: ⚠️ Too many people, coordination overhead increases
Mitigation: PM must own a shared task tracker (even just a shared doc with 10 bullets)
```

### 5+ Person Team
```
5+ PERSON CONFIGURATION
────────────────────────
⚠️ Warning: 5+ people at a hackathon is often counterproductive.
Coordination overhead grows faster than output.

Recommended structure:
- Core build team: 3 people (see 3-person config above)
- Support roles: 1 Pitch Lead, 1 Research/QA/Demo
- Clear rule: Non-build people don't touch the codebase

"CEO Problem": Resist the urge to have everyone pair-code on the same file.
Assign independent tracks and merge via API contract.
```

---

## Bottleneck Risk Analysis

Identify the single highest-risk dependency in this build:

```
CRITICAL PATH ANALYSIS
───────────────────────
The critical path for demo-readiness: [A → B → C → Demo]

Highest bottleneck: [Component or person]
Risk: [What happens if this is delayed]
Mitigation: [Specific action to pre-empt this — e.g., mock data, hardcoded fallback]

Second highest bottleneck: [Component or person]
Risk: [Description]
Mitigation: [Action]

Independence check:
Can Frontend work if Backend is delayed? [YES (with mock data) / NO (blocked)]
Can AI layer work if data is unavailable? [YES (with seed data) / NO (blocked)]
```

---

## Missing Skill Mitigation Guide

### No Designer on the Team
```
SOLUTION: Component-first design
- Use shadcn/ui (copy-paste, pre-designed, consistent)
- Use Tailwind CSS (utility-first, no blank canvas)
- Use Vercel v0.dev to generate component starters
- Use a Google Font (Inter + Geist = modern and safe)
- Color palette: pick 1 from coolors.co, stick to it
- Icons: Lucide React (consistent, tree-shakable)
- Spacing rule: everything is a multiple of 4px or 8px
- Don't build from scratch. Copy, adapt, ship.
```

### No Backend Developer on the Team
```
SOLUTION: BaaS-first architecture
- Use Supabase (Postgres + Auth + Storage + Edge Functions, zero server setup)
- Use Supabase Edge Functions for custom logic (TypeScript, deploys in 1 command)
- Use Next.js API routes for simple endpoints
- Use Prisma + PlanetScale if you need ORM comfort
- Avoid: writing your own auth, managing your own Postgres
```

### No AI/ML Specialist on the Team
```
SOLUTION: Wrapper-first AI
- Use OpenAI API with system prompts (no fine-tuning needed)
- ALWAYS use structured JSON output (response_format: { type: "json_object" })
- Use Vercel AI SDK for easy streaming in Next.js
- Use LangChain only if you need tool use / agents
- Pre-compute and cache all AI responses before the demo
- Fallback: hardcode 5 high-quality AI responses to use during demo
```

### No DevOps on the Team
```
SOLUTION: Managed everything
- Frontend: Vercel (git push = deploy)
- Backend: Railway or Render (git push = deploy, free tier)
- Database: Supabase (managed, free tier)
- AI: API calls (no GPU management)
- Domain: Optional — use the provided vercel.app URL for demo
```

### Solo with Limited Time (<24h)
```
SOLUTION: Streamlit + Python
- Streamlit builds a full demo UI in pure Python
- No HTML, no CSS, no JavaScript required
- Deploy to Streamlit Cloud in 15 minutes
- Native support for charts, data tables, file upload, sliders
- AI integration: directly call OpenAI/Anthropic Python SDK
- Limitation: looks like a data science tool, not a startup — compensate with strong pitch
```

---

## Hour-by-Hour Responsibility Map

Produce a role-specific task map for the first N hours:

```
HOUR-BY-HOUR MAP (First [N]h)

HOUR 0-1: Foundation
  [Person 1]: [Exact task]
  [Person 2]: [Exact task]
  [Person 3]: [Exact task]
  Milestone: [What must be true at end of Hour 1]

HOUR 1-2: [Phase name]
  [Person 1]: [Task]
  [Person 2]: [Task]
  Milestone: [Deliverable]

...continues through to Demo Lock

CRITICAL SYNC MOMENTS:
  Hour [X]: API contract review (all hands, 10 minutes)
  Hour [Y]: End-to-end smoke test (all hands, 15 minutes)
  Hour [Z]: Demo rehearsal (all hands, 20 minutes)
```

---

## Integration

- Called in STEP 7 (Winner Pack), alongside `20_tech-stack-advisor.md`
- Receives: team profile from `12_personalization-profile.md`, tech stack from `20_tech-stack-advisor.md`
- Outputs: role assignments, bottleneck analysis, hour-by-hour map
- Connected to `18_live-build-tracker.md` (uses role map for check-in interpretation)

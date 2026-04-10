# Multi-Agent Orchestration — Module 15

## Purpose

Split the hackathon build into role-based agents (team members or AI-assisted workflows) with explicit handoff protocols, integration windows, and conflict resolution rules. This module prevents the two most common hackathon failure modes:

1. **Integration hell** — frontend and backend don't connect at hour 20
2. **Undefined ownership** — everyone works on everything, nothing gets finished

**Output:** An orchestration plan ready to activate at kickoff.

---

## Core Principle: API Contract is the Constitution

Before any code is written, define the API contract. Every agent works independently against this contract. Integration at the checkpoint should be mechanical, not creative.

```
HACKATHON CONSTITUTION
───────────────────────
The API contract defined at Hour 2 is the source of truth.
If there is a conflict between what an agent built and the contract:
  → ADAPT THE AGENT'S WORK to match the contract.
  → DO NOT change the contract unless ALL agents agree.
  
This rule prevents: "I built it this way, you should change your part."
```

---

## The 6 Agents

### Agent 1: Product/PM Agent (🎯 Scope Guardian)

**Activated:** Hour 0 → Hour 2 (intensive), then periodic reviews
**Team profile:** Best communicator / most domain knowledge

**Responsibilities:**
- Writes the Event Brief from `01_event-intake.md`
- Defines the Demo Line: the exact scenario the demo must deliver
- Writes the API contract (what Backend and Frontend agree on)
- Maintains the Cut List from `10_risk-cut-scope.md`
- Runs the scope cut veto: any new feature must pass PM approval
- Coordinates the `/hackathon-live` check-ins using `18_live-build-tracker.md`

**Inputs needed:**
- Event Brief (from module 01)
- Winning idea summary (from Winner Pack)
- Team skills assessment (from `24_team-role-optimizer.md`)

**Outputs produced:**
```
Hour 2 deliverables:
  ├── demo_line.md         # The exact demo scenario in 3 sentences
  ├── api_contract.json    # All endpoints, request/response schemas
  ├── cut_list.md          # Features that WILL NOT be built
  └── build_schedule.md    # Who does what, by when, with check-in times
```

**Constraints:**
- Does NOT write code (unless the team is 1-2 people)
- If scope creep is proposed → respond with: "Does it appear in the 90-second demo? No? Then no."
- Must be available during integration windows

---

### Agent 2: Backend Agent (⚙️ Core Builder)

**Activated:** Hour 2 → Submission
**Team profile:** Strongest backend engineer

**Responsibilities:**
- Implements all API endpoints per the contract
- Sets up the database (SQLite for demo, or Supabase/Postgres)
- Implements the deterministic core (business logic, not AI)
- Implements the AI integration layer (with validation + fallback)
- Creates the `DEMO_MODE=true` data seeder
- Ensures all endpoints return demo-safe data when `demo_mode` header is set

**Inputs needed:**
- `api_contract.json` from PM Agent
- `demo_line.md` — to understand what data the demo needs
- Stack decision from `20_tech-stack-advisor.md`

**Boilerplate:** Use the relevant starter from `28_code-starter-generator.md`

**Outputs produced:**
```
Hour 8 checkpoint:
  ├── /api/[primary_endpoint]     # First demo-critical endpoint working
  ├── demo_seed.sql / seed.py     # Demo data pre-loaded
  └── test_curl.sh                # One-line verification for each endpoint

Hour 16 checkpoint:
  ├── All endpoints in contract → working
  ├── DEMO_MODE=true → returns pre-validated impressive responses
  └── Offline-safe: no external dependency can break the demo

Final (T-4h):
  └── Full integration test with Frontend Agent passed
```

**Quality gates:**
```
☐ Every endpoint returns demo-safe data with DEMO_MODE=true
☐ No endpoint requires live AI call for the demo to function
☐ Database is seeded with realistic data (not "test123")
☐ Error states return graceful JSON, not 500 stack traces
☐ All endpoints documented in api_contract.json (updated if changed)
```

---

### Agent 3: AI/Logic Agent (🧠 Intelligence Layer)

**Activated:** Hour 2 → Hour 16 (then support mode)
**Team profile:** ML engineer, data scientist, or strongest problem-solver

**Responsibilities:**
- Designs and implements the deterministic core (rule-based logic that always works)
- Implements the AI/LLM integration (the intelligence layer on top of determinism)
- Evaluates and validates AI outputs before they reach the user
- Pre-computes the demo outputs and saves them to the seed file
- Defines the confidence score methodology and implements it

**Deterministic-first rule:**
```
ALWAYS implement the deterministic core FIRST.
The app must work (with reasonable outputs) WITHOUT AI.
Add AI as a precision/enhancement layer second.

Result: demo never fails because of AI. AI makes it better, not possible.
```

**Inputs needed:**
- Winning idea spec + architecture from `07_architecture-mvp.md`
- API contract (specifically: what AI-generated fields look like)
- Domain briefing from `26_domain-briefing.md` (if applicable)

**Outputs produced:**
```
Hour 6 checkpoint:
  ├── deterministic_core.py/.ts    # Works without AI — rule-based outputs
  └── eval_sample.json             # 10 test inputs + expected outputs

Hour 12 checkpoint:
  ├── ai_layer.py/.ts              # LLM integration with validation
  ├── precomputed_responses.json   # Demo outputs, pre-validated and saved
  └── confidence_scorer.py/.ts     # How confidence scores are computed

Final (T-6h):
  └── All demo outputs pre-computed and stored in Backend seed
```

**Quality gates:**
```
☐ Deterministic core works without any API key
☐ AI layer has structured output (JSON schema, not raw text)
☐ AI outputs are validated before display (out-of-range values rejected)
☐ Pre-computed demo outputs reviewed — they look impressive, not average
☐ Confidence score methodology can be explained in 1 sentence under Q&A
```

---

### Agent 4: Frontend/UI Agent (🎨 Demo Experience)

**Activated:** Hour 2 → Submission (design: hour 2-6, build: hour 6-20, polish: hour 20+)
**Team profile:** Strongest frontend engineer + design sense

**Responsibilities:**
- Implements the UI based on spec from `14_auto-figma-ui-flow.md`
- Builds against mock data first (using api_contract.json shapes)
- Connects to Backend API at integration windows
- Implements the demo flow as a pre-scripted path (not exploration mode)
- Adds the `DEMO_MODE` indicator (subtle, for presenter only)
- Polishes ONLY the demo-critical screens (3-5 max)

**Demo-first UI rules:**
```
Priority order:
  1. Beat 3 screen (Aha moment) — must look perfect
  2. Beat 2 screen (Input) — must be clean and fast
  3. Beat 1 screen (Setup/context) — must be professional
  4. Beat 4 screen (Drill-down) — must feel trustworthy
  5. Everything else — minimal or non-existent

If running out of time:
  → Remove screens 4+ from the demo path entirely
  → Add a "More details: in our roadmap" slide instead
```

**Inputs needed:**
- Design spec from `14_auto-figma-ui-flow.md`
- API contract (mock the shapes before backend is ready)
- Demo script from `09_demo-script.md` (understand the exact flow)

**Boilerplate:** Use the relevant starter from `28_code-starter-generator.md`

**Outputs produced:**
```
Hour 8 checkpoint (mock mode):
  ├── All demo-critical screens rendered with mock data
  └── Demo flow walkable end-to-end (mocked)

Hour 16 checkpoint (connected):
  ├── All screens connected to Backend API
  ├── DEMO_MODE=true shows pre-validated responses
  └── Demo flow tested 3 times, timed, under 95 seconds

Final (T-2h):
  ├── Demo flow tested at venue (or on target device)
  ├── Browser zoom set to 115-125%
  └── All demo inputs pre-loaded / pre-filled
```

**Quality gates:**
```
☐ Beat 3 screen: the aha element is large, colored, center-prominent
☐ No placeholder text ("Lorem ipsum", "Test User", "undefined")
☐ Loading states are handled (skeleton, not frozen screen)
☐ Error states are caught (no red console errors visible)
☐ Demo flow rehearsed 3 times, each under 90 seconds
☐ Notifications OFF, bookmarks hidden, full-screen mode ready
```

---

### Agent 5: Pitch/Demo Agent (🎤 Story Keeper)

**Activated:** Hour 0-4 (story), Hour 12+ (practice), Final 4h (polish)
**Team profile:** Best presenter + strongest writer

**Responsibilities:**
- Writes the 60s and 3-min pitch scripts using `08_pitch-script.md`
- Produces the demo script using `09_demo-script.md`
- Generates the slide deck using `19_slide-deck-generator.md`
- Runs Q&A simulation using `27_negotiation-qa-simulator.md` (T-4h)
- Runs pitch coaching session using `31_pitch-coach.md` (T-3h)
- Manages the final submission checklist from `25_wrapup-validator.md`

**This agent does NOT code.** Their job is the story and the performance.

**Inputs needed:**
- Winning idea summary + Win DNA from `11_win-dna-analyzer.md`
- Impact metric (from AI/Logic Agent)
- Demo flow (from Frontend Agent — must know what's on screen)
- Judge profiles (from `16_judge-profiler.md` if available)

**Outputs produced:**
```
Hour 4:
  ├── pitch_60s.md          # Word-for-word 60-second pitch
  ├── pitch_3min.md         # Word-for-word 3-minute pitch
  └── demo_script.md        # 5-beat demo script with exact lines

Hour 16:
  └── slide_deck.md         # Full slide deck with speaker notes

T-4h:
  ├── qa_sim_results.md     # Q&A simulation + weak answer list
  └── pitch_coach_notes.md  # Delivery notes from coaching session

T-2h:
  └── submission_checklist  # Verified complete, all boxes checked
```

---

### Agent 6: DevOps Agent (🚀 Ship Captain) — Optional

**When to include:** Only if the hackathon requires a live deployed URL, or if the team has > 3 members with a spare person.

**Responsibilities:**
- Sets up the development environment at kickoff (everyone running in < 30 min)
- Manages environment variables and secrets (`.env` files)
- Deploys to Vercel / Render / Railway at T-6h (before final polish)
- Ensures deployed URL works with demo data
- Maintains the second laptop (backup device for the demo)

**Outputs produced:**
```
Hour 1:
  └── dev_setup.sh          # One-command environment setup for all agents

T-6h:
  └── deployed_url.txt      # Live URL + verified working with demo data

T-2h:
  └── backup_device_ready   # Second laptop confirmed with repo running
```

---

## API Contract Template

Define at Hour 2. Do not change without PM approval.

```json
{
  "api_version": "1.0",
  "base_url": "http://localhost:8000",
  "demo_mode_header": "X-Demo-Mode: true",
  "endpoints": [
    {
      "name": "[Primary endpoint name]",
      "method": "POST",
      "path": "/api/[path]",
      "request": {
        "[field_name]": "[type] — [description]"
      },
      "response": {
        "result": "[type] — [what this contains]",
        "confidence": "number — [0-1, how it's calculated]",
        "explanation": "string — [human-readable reasoning]",
        "sources": "array — [data sources used]",
        "metadata": {
          "processing_time_ms": "number",
          "demo_mode": "boolean"
        }
      },
      "demo_response": {
        "result": "[THE PRE-VALIDATED IMPRESSIVE DEMO OUTPUT — exact value]",
        "confidence": 0.87,
        "explanation": "[The explanation that will appear in the drill-down view]",
        "sources": ["[Source 1]", "[Source 2]"],
        "metadata": {
          "processing_time_ms": 1240,
          "demo_mode": true
        }
      }
    }
  ]
}
```

---

## Integration Windows

Fixed points where agents sync and connect:

```
INTEGRATION CALENDAR
─────────────────────
Hour 0:  🚀 KICKOFF
         All agents: Event Brief + Winner Pack review (30 min)
         PM Agent: API contract + Cut List drafted
         Target: Everyone knows what they're building

Hour 2:  🔗 CONTRACT SIGN-OFF
         All agents review and agree on api_contract.json
         Backend + Frontend: Begin building against contract in parallel
         AI/Logic: Begin deterministic core
         Pitch/Demo: Begin pitch scripts
         Target: Zero ambiguity about what each agent delivers

Hour [N/4]:  📡 CHECK-IN 1 (25% mark)
         Backend: First endpoint returning data (mock ok)
         Frontend: First demo screen rendered (mock ok)
         PM: Scope check — cut anything not tracking to completion
         Pitch: Pitch script drafted, persona confirmed

Hour [N/2]:  🔌 INTEGRATION 1 (50% mark — CRITICAL)
         Backend + Frontend: Connect all demo-critical endpoints
         Run demo flow end-to-end once (even if rough)
         PM: Risk assessment — activate fallbacks for anything shaky
         AI/Logic: Pre-computed demo outputs ready and saved

Hour [3N/4]:  🎬 INTEGRATION 2 (75% mark)
         Demo flow: Run 3 times. Time it. Must be under 95 seconds.
         Pitch: 60s pitch rehearsed by all team members
         Frontend: Polish sprint begins — Beat 3 screen only
         DevOps (if applicable): Deploy to production URL

Hour [N-4]:  🎯 FEATURE FREEZE
         NO NEW FEATURES from this point
         Backend: Demo Mode fully functional
         Frontend: All demo screens polished
         Pitch: Full 3-min pitch rehearsed with slide deck

Hour [N-3]:  🧠 Q&A SIMULATION
         Pitch/Demo Agent runs qa_sim (module 27)
         All agents practice answering technical questions about their area

Hour [N-2]:  🔒 SUBMISSION PREP
         PM: Final wrapup checklist (module 25)
         DevOps: Demo URL verified, backup device ready
         Pitch: Final rehearsal — timed, on site if possible

Hour [N-1]:  📤 SUBMIT
         All materials submitted with buffer time
         No changes after submission except emergency fixes
```

---

## Conflict Resolution Protocol

```
CONFLICT RESOLUTION RULES
──────────────────────────
Level 1 — Technical disagreement (< 10 min to resolve):
  Rule: API contract is source of truth. Adapt your code, not the contract.
  If contract must change: PM makes the call in < 5 min. Document the change.

Level 2 — Scope disagreement (feature to add or cut):
  Rule: PM Agent has final say.  
  Test: "Does it appear in the 90-second demo?" → If No → Cut.
  
Level 3 — Design disagreement (how something should look):
  Rule: Beat 3 screen design is sacred. Everything else: defer to visual judgment.
  Tiebreaker: "What would a sleep-deprived judge notice in 5 seconds?"

Level 4 — Team conflict (interpersonal):
  Rule: Timer. 5 minutes to resolve. If not resolved: PM decides, move on.
  No conflict should cost > 10 minutes of build time.
```

---

## Quality Gates Summary

```
ORCHESTRATION QUALITY GATES
─────────────────────────────
Hour 2 gate (proceed to build):
  ☐ API contract signed off by all agents
  ☐ Cut List agreed upon
  ☐ Each agent has their deliverable list

50% mark gate (proceed to polish):
  ☐ Demo flow works end-to-end (with mock data at minimum)
  ☐ AI pre-computed outputs saved to seed
  ☐ No agent is blocked by another

75% mark gate (proceed to rehearsal):
  ☐ Demo flow works end-to-end with live backend
  ☐ Demo time ≤ 95 seconds (3 confirmed runs)
  ☐ DEMO_MODE=true verified working

T-4h gate (feature freeze):
  ☐ All demo-critical screens polished
  ☐ 60s pitch known by all team members
  ☐ Q&A simulation completed
  ☐ Submission form reviewed (don't discover missing fields at T-1h)

T-1h gate (submit):
  ☐ All submission materials ready
  ☐ Demo runs without touching backend or restarting servers
  ☐ Backup device verified
  ☐ Presenter has practiced fallback line
```

---

## Integration

- Runs in STEP 10 (Orchestration), after Winner Pack + UI spec
- Build schedule times calibrated from `01_event-intake.md` (actual hackathon hours)
- Agent profiles matched against team from `24_team-role-optimizer.md`
- Build tracker check-in format used in `18_live-build-tracker.md`
- Quality gates re-verified in `25_wrapup-validator.md`

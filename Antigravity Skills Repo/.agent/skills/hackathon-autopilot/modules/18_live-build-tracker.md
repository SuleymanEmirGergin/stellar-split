# Live Build Tracker — Module 18

## Purpose

An **in-hackathon real-time decision engine** that activates AFTER planning is done and building begins.

This module answers the most critical mid-hackathon question:
> "Given where we are right now, what's the smartest thing to do in the next X hours?"

It handles scope management, panic detection, morale, and demo-safety checks throughout the build.

---

## Activation

Activate this module when the user says ANY of:
- "Hackathon started, now what?"
- "We've been building for [X] hours"
- "Check-in" / "status check" / "how are we doing?"
- "We ran into a problem"
- "Should we cut [feature]?"
- "/hackathon-live"

---

## Check-In Protocol

When activated mid-hackathon, ask the user to answer these 5 questions (can be answered in one message):

```
1. Current hour: [e.g., Hour 6 of 24]
2. Total hackathon duration: [e.g., 24h / 12h / 48h]
3. What's DONE (working): [bullet list]
4. What's IN PROGRESS (started, not done): [bullet list]
5. What's BLOCKED (stuck): [describe]
```

---

## Time-Phase Decision Engine

After receiving check-in data, classify the current phase and apply the corresponding strategy:

### Phase 1: BUILD WINDOW (0–40% of time elapsed)
**Goal:** Maximize feature completion while demo-safety is still optional

Decision rules:
- If "done" list is empty → ALERT: "You are dangerously behind. Stop all new features. Build one thing that works end-to-end."
- If blocked item is on critical path → immediately prescribe a workaround or cut
- If team is multi-threaded but no integration has happened → schedule "Integration Sync" within 2 hours
- Encourage exploration; allow nice-to-haves

### Phase 2: CONSOLIDATION WINDOW (40–70% of time elapsed)
**Goal:** Lock critical path, begin demo preparation

Decision rules:
- Run scope audit: separate MUST DEMO from NICE TO HAVE
- If any feature isn't demo-ready in this window → cut it, no exceptions
- Begin building demo data / seed data now
- Start README and submission form (even partially)
- Alert if UI hasn't been started yet

### Phase 3: DEMO LOCK WINDOW (70–90% of time elapsed)
**Goal:** Everything serves the demo. No new features.

Decision rules:
- Feature freeze — only bug fixes that break the demo are allowed
- Demo flow must be fully scripted (see `09_demo-script.md`)
- Fallback data must be precomputed and hardcoded
- README must be 80% done
- Rehearsal should happen at least once

### Phase 4: SUBMISSION SPRINT (90–100% of time elapsed)
**Goal:** Survive and submit

Decision rules:
- No code changes unless demo is completely broken
- Complete submission form now (don't leave for last minute)
- Video recording window: must happen in this phase
- Final README check
- Activate `25_wrapup-validator.md` immediately

---

## Scope Cut Decision Framework

When the user asks "should we cut X?", evaluate using this rubric:

```
CUT DECISION: [Feature X]

Is it demo-critical? (Does the judge see it?) → YES/NO
Is it differentiation-critical? (Is it why we're novel?) → YES/NO
Is the current time phase past 70%? → YES/NO
Is it blocked/unreliable? → YES/NO

VERDICT:
- If demo-critical AND differentiation-critical → DO NOT CUT. Find a workaround.
- If demo-critical but NOT differentiation-critical → CUT functionality, fake it visually.
- If NOT demo-critical → CUT IMMEDIATELY. Don't even discuss it.
- If blocked past 70% → CUT. Replace with a hardcoded simulation.
```

---

## Panic Detection & Recovery

Detect panic signals in user messages:
- "Nothing works"
- "We're so behind"
- "I think we should restart"
- "The API is down"
- "We're screwed"

**Recovery Protocol:**
1. **Stop and breathe:** "Okay. Let's assess what you actually have."
2. **Identify the smallest working demo:** Even 1 screen that does 1 thing is a demo.
3. **Apply the Minimum Demo Floor:** What is the bare minimum that qualifies as a submission?
4. **Redirect energy:** Pick the ONE thing that will move the needle the most right now.
5. **Never recommend restarting** unless less than 10% of time has elapsed.

---

## Minimum Demo Floor Definition

If the team is behind, define a "Minimum Demo Floor" — the absolute minimum product:

```
MINIMUM DEMO FLOOR
──────────────────
Core user action: [The 1 thing the user does]
Core output shown: [The 1 result that demonstrates value]
Hardcoded fallback: [What data/output is pre-computed for safety]
Time to implement this floor: [Estimated hours]
Demo format: [Live app / Video recording / Slide + narration]
```

---

## Hourly Pulse Format

For continuous check-ins, use this condensed format:

```
HOUR [X] PULSE CHECK
─────────────────────
Phase: [BUILD / CONSOLIDATION / DEMO LOCK / SUBMISSION SPRINT]
Health: 🟢 ON TRACK / 🟡 AT RISK / 🔴 CRITICAL
Done since last check: [List]
Blocked: [List]
Next 2h priority: [Single most important task]
Cut recommendation: [What to cut if anything]
Demo-safety: [SAFE / AT RISK — reason]
Morale note: [Optional one-line motivational or warning message]
```

---

## Integration Checkpoint Enforcer

At key integration windows (default: every 25% of total time), enforce:

```
INTEGRATION CHECKPOINT — Hour [X]
───────────────────────────────────
Backend ↔ Frontend: CONNECTED / BROKEN / NOT STARTED
AI/Logic layer: WIRED / MOCKED / MISSING
Demo data: REAL / SEEDED / HARDCODED / MISSING
End-to-end smoke test: PASSED / FAILED / NOT RUN

Action required: [Specific next step]
```

---

## Morale Management

Detect emotional language and respond appropriately:

**Frustration signals:** → Acknowledge the difficulty, then give ONE clear next step
**Overconfidence signals:** → Gently surface a risk they may not have considered
**Analysis paralysis:** → Force a decision using a coin-flip frame ("If you had to choose right now...")
**Sleep deprivation signs (long hackathons):** → Suggest pair reviews, not solo work on critical components

---

## Integration

- This module runs independently during the hackathon
- Inputs: check-in messages from user
- Outputs: hourly pulse + scope cut decisions + morale guidance
- Connects to: `25_wrapup-validator.md` (final phase), `09_demo-script.md` (demo lock phase)
- Can be invoked alone via `/hackathon-live` slash command

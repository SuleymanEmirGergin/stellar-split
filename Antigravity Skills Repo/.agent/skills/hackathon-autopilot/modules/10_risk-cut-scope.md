# Risk, Cut & Scope — Module 10

## Purpose

Identify all risks that can kill the hackathon project, decide explicitly what to cut, and ensure every risk has a demo-safe fallback. This is the **discipline module** — it prevents teams from over-scoping and failing to ship.

---

## Core Principle: Demo Line First, Cuts Second

Before analyzing risks, establish the Demo Line from `07_architecture-mvp.md`:

```
DEMO LINE REMINDER
───────────────────
The demo works when:
[Paste exact Demo Line from architecture module]

Everything that doesn't serve this Demo Line is a cut candidate.
```

---

## Risk Taxonomy

Rate each risk: **Probability** (H/M/L) × **Impact** (H/M/L) → Priority score

Priority = H×H → Critical | H×M or M×H → High | M×M → Medium | Rest → Low

### Category 1: Technical Risks

| Risk | Probability | Impact | Priority | Mitigation | Fallback |
|------|------------|--------|----------|------------|---------|
| External API goes down during demo | H | H | Critical | Demo mode = pre-computed responses | Level 1 fallback always active |
| AI output is inconsistent / wrong | M | H | High | Deterministic validation layer | Curated pre-computed examples |
| Database connection fails | L | H | High | Local SQLite for demo | In-memory mock data |
| Auth / login breaks during demo | M | M | Medium | Skip auth for demo; hardcode demo user | Bypass auth flow entirely |
| Real-time latency too high | M | H | High | Pre-compute; show "processing" animation | Simulate with timed delay |
| Third-party data unavailable | M | H | High | Seed own data; synthetic dataset | Use representative mock data |

**For every Technical Risk → produce:**
```
Risk: [Name]
Trigger condition: [What causes it]
Mitigation: [What we do before demo to prevent]
Demo fallback: [If it happens anyway, what we show / say]
Responsible: [Who on the team owns this]
Status at T-2h: [Verified working / Fallback activated / Unknown]
```

---

### Category 2: Scope Risks

Scope risks = features we planned that might not get built in time.

**The Cut Priority Matrix:**

| Feature | Demo Critical? | Scores on Rubric? | Cut Level |
|---------|---------------|-------------------|-----------|
| Core AI pipeline | YES | YES | NEVER CUT |
| Primary user flow (input → output) | YES | YES | NEVER CUT |
| Offline fallback | YES | YES | NEVER CUT |
| UI polish | NO | Slightly | CUT FIRST |
| Secondary features | NO | Maybe | CUT SECOND |
| Auth / user accounts | NO (for demo) | NO | CUT THIRD |
| Mobile responsiveness | NO | NO | CUT FOURTH |
| Multi-language support | NO | NO | DO NOT BUILD |
| Admin dashboard | NO | NO | DO NOT BUILD |
| Email notifications | NO | NO | DO NOT BUILD |
| Onboarding flow | NO | NO | DO NOT BUILD |
| Settings page | NO | NO | DO NOT BUILD |

**Decision rule for any feature:**
```
IF feature is not visible in the 90-second demo:
  → CUT it. Spend the time polishing what IS visible.
```

---

### Category 3: Team/Execution Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Teammate gets stuck and blocks others | M | H | Pair assignment + 2h check-in rule |
| Integration hell (frontend/backend don't connect) | H | H | Agree on API contract at hour 2; mock before connecting |
| Scope creep mid-build | H | M | Scope cut board visible at all times; team lead has veto |
| Sleep/energy collapse | M | H | Schedule sleep. No all-nighter if < 36h hackathon. |
| Presenter freeze during demo | L | H | All team members can give the 60s pitch. Not just one. |

---

### Category 4: Demo Day Risks

| Risk | Prevention |
|------|-----------|
| Internet failure at venue | Test venue Wi-Fi. Have mobile hotspot. Have offline fallback. |
| Laptop crash | Second device ready with repo cloned and running. |
| Presenter sick | Second presenter briefed and able to present. |
| Slide deck won't open | Export to PDF. Have it on 2 devices + USB. |
| Demo account compromised | Create fresh demo account day before. Use different email. |
| Time overrun | Practice 3 times. Know your cut points. |
| Judge asks about a cut feature | Honest answer: "We focused on [core] — this is in the roadmap." |

---

### Category 5: Judging Risks

| Risk | Prevention |
|------|-----------|
| Judge doesn't understand the domain | Lead with a human story, not a technical one |
| Idea sounds too similar to existing product | Have the differentiation line memorized |
| Impact metric challenged | Have the methodology explained in Q&A (from `27_negotiation-qa-simulator.md`) |
| Technical question we can't answer | "Great question — we haven't solved [X] yet; our current approach is [Y]" |

---

## Explicit Cut List

Produce a definitive cut list for the winning idea:

```
CUT LIST: [Hackathon Name] — [Project Name]
────────────────────────────────────────────
As of [timestamp], these features WILL NOT be built:

☒ [Feature] — Reason: [Not demo-critical / No time / No rubric value]
☒ [Feature] — Reason: [...]
☒ [Feature] — Reason: [...]
☒ [Feature] — Reason: [...]
☒ [Feature] — Reason: [...]

TEAM AGREEMENT:
These cuts are DECIDED. No discussion during the build.
If a cut must be reconsidered → call a team huddle → max 5 min → majority rules.
```

---

## Scope Budget Table

Map time allocation assuming 100% of remaining hours:

```
SCOPE BUDGET: [Hackathon Name]
────────────────────────────────────────
Total build hours: [N]h

Feature                 │ Hours Allocated │ Priority │ Cut-if-behind?
─────────────────────────────────────────────────────────────────────
Core AI pipeline        │ [Xh]            │ Critical │ Never
Input + output UI       │ [Xh]            │ Critical │ Never
Demo mode / fallback    │ [Xh]            │ Critical │ Never
Seed data / demo prep   │ [Xh]            │ Critical │ Never
UI polish               │ [Xh]            │ High     │ YES — cut to [Xh/2]
[Feature N]             │ [Xh]            │ Medium   │ YES — cut first
[Feature M]             │ [Xh]            │ Low      │ YES — cut immediately
Pitch + slide deck      │ [Xh]            │ Critical │ Reduce to 30 min minimum
Buffer / debug time     │ [Xh]            │ Required │ This must exist
─────────────────────────────────────────────────────────────────────
TOTAL                   │ [Nh] ✓
```

---

## The "Panic Cut" Protocol

If at T-4h the team is behind schedule, activate Panic Cut:

```
PANIC CUT PROTOCOL (activate at T-4h if behind)
─────────────────────────────────────────────────
Step 1: Stop adding features. Freeze scope.
Step 2: List what's NOT working. (5 min max)
Step 3: For each broken thing:
  → If it's visible in the demo: fix it (30 min max)
  → If it's NOT visible in the demo: disable it / hide it
Step 4: Activate demo mode for AI responses.
Step 5: Hardcode the demo flow endpoint-to-endpoint.
Step 6: Run the demo once. If it works → go practice the pitch.
Step 7: Do NOT add anything new. Ship what works.
```

---

## Integration

- Runs in STEP 8 (Winner Pack), alongside architecture and build plan
- Cut List feeds into `18_live-build-tracker.md` (decisions are preset, not re-debated during build)
- Demo fallback strategy connects to `09_demo-script.md` (fallback beats)
- Panic Cut protocol is re-checked during `/wrapup` (module 25)
- Risk table updated at each `/hackathon-live` check-in

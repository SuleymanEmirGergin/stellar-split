# Wrapup Validator — Module 25

## Purpose

A **submission checklist enforcer** for the final 60-90 minutes of a hackathon.

This module ensures nothing critical is missed under pressure by running a structured validation pass across all submission requirements.

---

## Activation

Activate when the user says:
- "1 hour left"
- "Submission time"
- "We're almost done, what do we need to check?"
- "/wrapup"
- "Is everything ready?"

---

## Step 0: Time Remaining Assessment

First, establish urgency level:

```
TIME REMAINING CHECK
─────────────────────
How many minutes until submission closes? [Answer]

90+ min → FULL PROTOCOL — all checks
45-90 min → PRIORITY PROTOCOL — skip nice-to-haves
15-45 min → EMERGENCY PROTOCOL — demo and submission only
<15 min → SURVIVAL PROTOCOL — submit what you have NOW
```

---

## Full Submission Checklist

### BLOCK 1: Core Product (Must-Have)

```
PRODUCT CHECK
──────────────
☐ Does the app/prototype load without errors?
  → YES / NO (if NO: document what's broken; prepare a workaround narrative)

☐ Does the core user journey work end-to-end?
  [Describe the 1 flow judges must see]
  → YES / NO (if NO: activate fallback data / hardcoded mode NOW)

☐ Is the main "aha moment" visible in the demo?
  → YES / NO

☐ Are all critical API keys set in the production environment?
  → YES / NO (if NO: add to .env on deploy platform immediately)

☐ Has the app been tested in the demo environment (not just localhost)?
  → YES / NO (if NO: deploy and test NOW — 5 minutes)

☐ Does the app work on the device/screen you'll demo from?
  → YES / NO

☐ Is there a working fallback (pre-computed / hardcoded data) if something breaks live?
  → YES / NO (if NO: create one now)
```

### BLOCK 2: Submission Form (Must-Have)

```
SUBMISSION FORM CHECK
──────────────────────
☐ Have you located the submission form/portal?
  → YES / NO (if NO: find it NOW, forms often close before deadline)

☐ Project name entered: [Check]
☐ Team members listed correctly: [Check]
☐ Project description written (usually 200-500 words): [Check]
☐ Demo link entered: [URL working? Test in incognito]
☐ GitHub repo link entered: [Check]
☐ Demo video link entered (if required): [Check]
☐ Tech stack listed: [Check]
☐ Track/category selected correctly: [Check]
☐ Sponsor integrations marked (if applicable): [Check]
☐ Form SAVED or SUBMITTED: ⚠️ DO NOT FORGET TO HIT SUBMIT
```

### BLOCK 3: Demo Readiness (Must-Have)

```
DEMO READINESS CHECK
─────────────────────
☐ Is the 90-second demo script finalized?
  → Use: templates/output_demo_script [or describe your current plan]

☐ Has the demo been rehearsed at least once?
  → YES / NO (if NO: do 1 quick run-through NOW — 5 minutes)

☐ Is there a designated presenter?
  → [Name]

☐ Does the presenter know exactly which screens to click through?
  → YES / NO

☐ Is the demo device fully charged or plugged in?
  → YES / NO

☐ Is the screen sharing / projection setup tested?
  → YES / NO (if NO: test before going to presentation area)

☐ Is the audio/microphone tested (if virtual or recorded)?
  → YES / NO

☐ Is the fallback (backup video / hardcoded data) ready?
  → YES / NO
```

### BLOCK 4: Pitch Materials (Should-Have)

```
PITCH MATERIALS CHECK
──────────────────────
☐ Slide deck is complete and accessible?
  → URL or file: [Check]

☐ Slide deck tested on the presentation device?
  → YES / NO

☐ All slide images/fonts loaded correctly (not broken)?
  → YES / NO

☐ Speaker notes prepared for each slide?
  → YES / NO

☐ The pitch fits within the time limit?
  → Estimated duration: [X minutes] / Limit: [Y minutes]
  If over limit: which sections to cut?
```

### BLOCK 5: Documentation (Should-Have)

```
DOCUMENTATION CHECK
────────────────────
☐ GitHub repository is PUBLIC (check settings!)
  → YES / NO (if NO: change to public NOW)

☐ README exists and is readable?
  → YES / NO

☐ README includes: project description, demo link, tech stack, team?
  → YES / NO

☐ Code is at minimum commented enough to not be embarrassing?
  → YES / NO (judges don't usually read code in detail, but have basic best practices)

☐ Sensitive information NOT in the repo? (.env files, API keys, passwords)
  → YES / NO (if NO: rotate keys immediately AND remove from git history if public)

☐ .gitignore includes .env?
  → YES / NO
```

### BLOCK 6: Demo Video (If Required or Recommended)

```
DEMO VIDEO CHECK
─────────────────
☐ Is a demo video required by this event?
  → YES / OPTIONAL / NO

If YES or OPTIONAL:
☐ Video is recorded?
  → YES / NO (if NO: use Loom, OBS, or QuickTime — record in next 10 minutes)

☐ Video is under the required duration?
  → Duration: [X min] / Limit: [Y min]

☐ Video clearly shows the core user flow?
  → YES / NO

☐ Video has readable captions or narration?
  → YES / NO

☐ Video is uploaded to a shareable link (YouTube unlisted, Loom, Google Drive)?
  → YES / NO
  Link: [Check it works in incognito]

☐ Video link added to submission form?
  → YES / NO
```

---

## Anticipated Q&A Preparation

Generate the **Top 8 Questions Judges Will Ask** based on the project type and domain, with pre-prepared 2-sentence answers:

```
Q&A PREP — TOP 8 QUESTIONS
────────────────────────────

Q1: "How does your AI actually work? What's under the hood?"
A: [Tailored answer based on AI architecture of the winning idea]

Q2: "What data does this use? Where does it come from?"
A: [Data source explanation]

Q3: "Have you talked to real users? Is there evidence of demand?"
A: [Answer honestly — even "we interviewed 3 potential users and found..." is valid]

Q4: "How would this scale? What happens with 10,000 users?"
A: [Technical + infrastructure answer]

Q5: "What's the business model? How do you make money?"
A: [Revenue model + pricing approach]

Q6: "What did you NOT build that you wish you had?"
A: [Honest scope cut answer — shows maturity]
   Tip: Name it before they find it.

Q7: "Who does this compete with and how are you different?"
A: [Competitive differentiation from module 17]

Q8: "What happens if [the AI gives wrong output / the API is down / the data is incorrect]?"
A: [Reliability and error handling explanation]
```

---

## Emergency Protocol (< 15 minutes)

If time is critically short:

```
EMERGENCY PROTOCOL
───────────────────
1. STOP coding immediately. No more features.
2. Find the submission form — open it now.
3. Submit with what you have: even a partial submission beats no submission.
4. Minimum viable submission:
   - Project name ✓
   - Team ✓
   - Description (2 sentences minimum) ✓
   - GitHub link (even if README is empty) ✓
   - Demo link or "demo available on request" ✓
5. Breathe. You built something in [X] hours. That's the achievement.
```

---

## Post-Checklist Summary

```
WRAPUP SUMMARY
───────────────
Completed: [N of M checks passed]
Critical missing items: [List any unchecked must-have items]
Action items: [Prioritized list of remaining tasks]
Time estimate to completion: [X minutes]
Submission status: READY / NEEDS [X] / AT RISK
```

---

## Morale Note

Always end with this (or variant):

> "Whatever happens in the next [X] minutes, you shipped something real. Most people never do. That's already a win."

---

## Integration

- Standalone module — invoked in the final phase of hackathon
- Connects to `09_demo-script.md` (demo readiness), `18_live-build-tracker.md` (Phase 4)
- Can be invoked via `/wrapup` slash command at any time
- Output template: `templates/output_wrapup_checklist.md`

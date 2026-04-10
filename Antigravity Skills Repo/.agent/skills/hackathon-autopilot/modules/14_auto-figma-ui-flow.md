# Auto Figma UI Flow — Module 14

## Purpose

Generate a complete, demo-ready UI specification that a designer or AI design tool (Figma, v0, Lovable, Builder.io) can execute immediately. This module produces two outputs:
1. A **screen-by-screen spec** (for manual Figma or code-based implementation)
2. A **copy-paste Figma/v0 prompt** (for AI-assisted UI generation)

**Design philosophy:** Design for the demo, not the product. The demo has 5 screens max that must look excellent. The rest can be empty or minimal.

---

## Step 1: Demo-Critical Screen Identification

Before designing anything, identify the 3-5 screens that will appear in the 90-second demo (from `09_demo-script.md`).

```
DEMO-CRITICAL SCREENS
──────────────────────
Beat 1 (Setup — 0:10):     Screen that establishes the persona's context
Beat 2 (Input — 0:25):     Screen where user performs the key action
Beat 3 (Aha — 0:55):       ⭐ THE MOST IMPORTANT SCREEN — result/insight display
Beat 4 (Drill-down — 1:15): Detail/explainability view
Beat 5 (Impact — 1:30):    Impact summary / tagline screen (optional — can be slide)

Non-demo screens (build minimally or skip):
  - Login / registration (hardcode demo user)
  - Settings / profile (not shown in demo)
  - Admin / management views (not shown in demo)
  - Onboarding flow (skip for hackathon)
```

**Design rule:** Spend 80% of design time on the Beat 3 screen. It's the only one judges will remember.

---

## Step 2: Design System Tokens

Define before designing any screen:

```
DESIGN SYSTEM
──────────────
Color palette:
  Primary:    [HSL value — the brand color, used for CTA buttons and key metrics]
  Background: [Dark: #0F0F13 / Light: #F8F9FA — dark mode recommended for demos]
  Surface:    [Card background: slightly lighter than background]
  Accent:     [Alert / highlight color — used sparingly for the aha moment]
  Success:    [Green variant]
  Warning:    [Amber variant]
  Danger:     [Red variant]
  Text:       [Primary / Secondary / Muted — three levels]

Typography:
  Font family: [Inter / Plus Jakarta Sans / Outfit — pick one from Google Fonts]
  H1: [32-40px, bold]
  H2: [24-28px, semibold]
  Body: [14-16px, regular]
  Label: [12px, medium, caps optional]
  The aha number: [48-72px, bold — the single most important number on screen]

Spacing:
  Base unit: 4px (use 8px, 16px, 24px, 32px, 48px multiples)
  Card padding: 24px
  Section gap: 32-48px

Radius:
  Card: 12px
  Button: 8px
  Badge: 4px

Shadows:
  Card: 0 2px 8px rgba(0,0,0,0.12)
  Active: 0 4px 20px rgba([primary-hex],0.3)
```

---

## Step 3: Screen-by-Screen Specification

For each demo-critical screen, produce:

```
SCREEN: [Screen Name]
══════════════════════════════════════════════════
Demo beat: [Which beat this serves — 1/2/3/4/5]
Time on screen: [Approximate seconds in demo]
Primary goal: [What the judge must understand from this screen]
Persona's action: [What the user does on this screen]

LAYOUT:
  Type: [Single column / Two-column / Dashboard grid / Full-screen result]
  Navigation: [Top navbar / Sidebar / None (full-screen demo mode)]

TOP SECTION:
  Content: [What appears at top — title, persona name, context bar]
  Key element: [The most important element in this section]

MAIN CONTENT AREA:
  Primary component: [The dominant element — chart / card / map / table / text / form]
  Secondary components: [Supporting elements]
  
  [For result screens (Beat 3):]
  THE AHA ELEMENT:
    Component: [Big number / Risk badge / Chart spike / Map cluster / Timeline event]
    Position: [Center-top / Full-width / Left-primary]
    Size: [Large — the judge must see it across the room]
    Color: [Accent color from palette — makes it impossible to miss]
    Label: [Text above the aha element — 3-5 words max]
    Value: [The demo value shown — e.g., "73% likelihood", "4.2 seconds", "3 anomalies"]

BOTTOM SECTION:
  Content: [CTA button / confidence score / data source attribution / action items]

MICROCOPY (exact text for key elements):
  Page title: "[Text]"
  CTA button: "[Text]"
  Empty state: "[Text — for if data isn't loaded]"
  Error state: "[Text — for if something fails]"
  Aha label: "[Text above the key number/insight]"
  Impact statement: "[1-line summary visible below the aha element]"

VISUAL HIERARCHY (order of eye movement):
  1st: [Element — what the judge sees first]
  2nd: [Element]
  3rd: [Element]
  4th: [Everything else]

DEMO MODE INDICATOR:
  Location: [Top-right corner]
  Style: [Subtle badge: "Demo Mode" in muted text or subtle border]
  Purpose: [Reminds presenter they're in pre-computed mode — not visible to judges at normal distance]
══════════════════════════════════════════════════
```

---

## Step 4: Component Checklist

After speccing all screens, list the components needed:

```
COMPONENT CHECKLIST
────────────────────
UI Components (build/find these):
☐ Navigation bar — [top / sidebar / none]
☐ Hero input area — [text field / upload zone / voice button / form]
☐ Loading state — [skeleton / spinner / progress bar]
☐ Primary result card — [THE AHA MOMENT container]
☐ Metric display (big number) — [font size 48-72px, bold]
☐ Chart/visualization — [type: bar / line / map / network / heatmap]
☐ Detail/drill-down panel — [collapsible / modal / side panel]
☐ Explainability panel — ["Why?" section — reasoning, sources, confidence]
☐ Confidence score display — [percentage / stars / signal strength]
☐ Data source attribution — [small text: "Based on X data points"]
☐ CTA button — [primary action]
☐ Status badge — [status indicator: active / processing / complete / alert]
☐ Demo mode toggle — [hidden indicator for presenter]
☐ Impact summary bar — [bottom: metric + scaled impact]

Optional (only if time allows):
☐ User avatar / persona indicator
☐ Timestamp / "updated X minutes ago"
☐ Share / export button
☐ Notification dot
```

---

## Step 5: User Journey (Happy Path)

Map the full demo flow as a user journey:

```
USER JOURNEY: [Persona Name] — [Demo Scenario]
────────────────────────────────────────────────
Entry point → [How persona arrives at the app in the demo]

Step 1: [Screen name]
  Action: [What persona does]
  Sees: [What appears]
  Feels: [Emotional state — stressed / curious / hopeful]

Step 2: [Screen name]
  Action: [What persona does]
  Sees: [What appears]
  Feels: [...]

Step 3 ⭐ [Screen name — AHA MOMENT]
  Action: [What persona does — or: result auto-appears]
  Sees: [THE KEY RESULT — describe exactly]
  Feels: [Relief / surprise / confidence]
  Judge sees: [What the judge notices at this exact moment]

Step 4: [Screen name — if included in demo]
  Action: [...]
  Sees: [...]
  Feels: [...]

End state: [What the persona now knows / can do that they couldn't before]
````

---

## Step 6: Figma / v0 / Lovable Prompt

Generate a ready-to-paste AI design prompt:

```
FIGMA / v0 PROMPT
──────────────────
[Copy and paste this into v0.dev, Lovable, or as a Figma AI prompt]

Create a [dark/light] mode web dashboard UI for a hackathon demo product called "[Product Name]".

The product: [1-sentence product description]
Primary user: [Persona name and role]
Core use case: [What the user does and sees]

Design requirements:
- Color palette: primary [color], background [color], accent [color] for key metrics
- Font: [font name] throughout
- Style: [clean / glassmorphism / minimal / data-dense] — professional, not playful
- Feel: premium SaaS, not a prototype

Generate these screens in order:

SCREEN 1 — [Name]
[2-3 sentence description of what's on this screen and what the dominant visual element is]

SCREEN 2 — [Name]  
[2-3 sentence description]

SCREEN 3 — [Name] ← THE MOST IMPORTANT
[Detailed description: the aha moment screen. Dominant element: [big number/chart/map].
The key metric "[VALUE]" must be prominent, in [accent color], visible across the room.
Below it: "[impact statement text]". Include an "Explainability" section showing [reasoning element].]

SCREEN 4 — [Name]
[2-3 sentence description]

Design system requirements:
- Card radius: 12px
- Spacing: 8px base unit (multiples: 16, 24, 32, 48)
- All cards have subtle shadows
- The Beat 3 screen must have the highest visual weight — largest font, most contrast
- Include a subtle "Demo Mode" badge in the top-right of each screen
- Include a "confidence score" or "data sources: N" indicator on result screens

Component requirements:
[List the exact components needed from the component checklist above]
```

---

## Step 7: Design Anti-Patterns

```
HACKATHON UI ANTI-PATTERNS
───────────────────────────
❌ Building 15 screens when the demo shows 4
   FIX: Polish 4. Leave 11 empty or non-existent.

❌ Default browser fonts (Times New Roman, Arial)  
   FIX: Import Inter or Plus Jakarta Sans from Google Fonts. Takes 2 min.

❌ Output is a dense table with 12 columns
   FIX: One big number + table below. Never lead with a table.

❌ "localhost:3000" visible in the browser URL bar during demo
   FIX: Use browser full-screen mode (F11). Or set up a local domain.

❌ Dark theme app on light projector background — unreadable
   FIX: Test on a projected screen before the event. Adjust contrast.

❌ Empty state shows "No data found" or "null"
   FIX: Seed all data before the demo. Every field must have content.

❌ CTA button says "Submit" 
   FIX: Be specific: "Analyze Contract", "Find Anomalies", "Generate Report"

❌ Color scheme uses 6+ colors
   FIX: 1 primary + 1 accent + neutrals. More colors = less premium.

❌ Mobile layout broken on demo device
   FIX: Test on the exact device being used for the demo. Or lock to desktop.
```

---

## Integration

- Runs in STEP 9 (Auto UI), after Winner Pack is decided
- Uses demo persona from `05_demo-domination.md`
- Screen flow designed around the 5-beat demo structure from `09_demo-script.md`
- Component checklist informs `28_code-starter-generator.md` (UI components to scaffold)
- Figma prompt can be used directly in v0.dev, Lovable, or Figma AI
- Screen polish checklist re-checked in `/wrapup` (module 25)

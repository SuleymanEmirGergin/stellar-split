# Tech Stack Advisor — Module 20

## Purpose

Given the team's **skills profile** and **available time**, recommend the **optimal hackathon tech stack** that:
- Minimizes setup/config time (time is the scarcest resource)
- Maximizes demo visual quality (what judges see)
- Ensures reliability (no live failures during demo)
- Matches the team's existing knowledge (no learning curve mid-hackathon)

---

## Input Collection

Ask the user (or infer from `12_personalization-profile.md`):

```
1. Team size: [1 / 2 / 3 / 4+]
2. Available hours: [e.g., 24h / 36h / 48h]
3. Team skills (rate 1-5):
   - Frontend (HTML/CSS/JS/React/Vue/etc): [score + main framework]
   - Backend (Node/Python/Go/etc): [score + main language]  
   - Mobile (React Native/Flutter/Swift/etc): [score + platform]
   - AI/ML (APIs / fine-tuning / from scratch): [score + comfort level]
   - DevOps/Cloud (deploy, CI, containers): [score + main provider]
   - Design (Figma / CSS / component libraries): [score + tools]

4. Project type (from winner selection):
   [Web App / Mobile App / API/Service / Data Dashboard / CLI Tool / Browser Extension]

5. AI integration needed?
   [None / LLM API calls / Computer Vision / Audio / Custom ML / Multi-agent]

6. Must have a working URL for demo? [YES / NO / Prefer yes]
```

---

## Stack Recommendation Engine

### Stack Scoring Criteria (internal)

For each candidate stack, evaluate:
1. **Setup speed** — How fast from 0 to running dev server? (1-5, 5 = instant)
2. **Demo wow factor** — How impressive does it look out of the box? (1-5)
3. **Reliability** — How likely to break during the demo? (1-5, 5 = very stable)
4. **Team fit** — Does it match their skills? (1-5)
5. **Deployment speed** — How fast to deploy a shareable URL? (1-5)

### Recommended Stacks by Project Type

#### Web App (most common at hackathons)

**Tier S — Fastest to "looks great" (recommended for 24h hackathons):**
```
Frontend: Next.js 14 + App Router + shadcn/ui + Tailwind CSS
Backend: Next.js API routes (same repo) 
Database: Supabase (hosted Postgres, instant setup)
Auth: Supabase Auth or Clerk (pre-built UI)
AI: OpenAI API / Anthropic Claude / Gemini API
Deploy: Vercel (push to deploy, automatic)
Setup time: ~45 minutes
```

**Tier A — Strong choice for 36h+ hackathons:**
```
Frontend: Vite + React + Tailwind + Radix UI
Backend: FastAPI (Python) or Express (Node)
Database: Supabase or PlanetScale
Auth: Supabase Auth
AI: LangChain + OpenAI
Deploy: Railway or Render + Vercel
Setup time: ~90 minutes
```

**Tier B — For teams with specific skill sets:**
```
Vue 3 + Nuxt + PrimeVue (if team knows Vue)
SvelteKit (if familiar — fastest runtime, great UX)
Remix (if team knows it — great for real-time data)
```

#### Mobile App

**Tier S — Cross-platform, fastest:**
```
React Native + Expo (managed workflow)
UI: NativeWind (Tailwind for RN) + React Native Paper
Backend: Supabase
AI: REST API calls to any LLM provider
Deploy: Expo Go (judge scans QR, no install needed) ← CRITICAL ADVANTAGE
```

**Tier A — Native iOS (if team is iOS-focused):**
```
SwiftUI + Swift
Backend: Firebase (easiest native iOS integration)
Auth: Sign in with Apple
AI: Core ML or API calls
Caveat: Can only demo on simulator or real device — no easy URL for judges
```

#### Data Dashboard

**Tier S:**
```
Streamlit (Python, 1 file = full dashboard)
Charts: Plotly / Altair built in
AI: Any Python ML library
Deploy: Streamlit Cloud (free, instant)
Setup time: 20 minutes ← FASTEST
Caveat: Looks "data science-y" not "startup-y"
```

**Tier A:**
```
Next.js + Tremor (React data dashboard components)
Charts: Recharts or Chart.js
Data: Any JSON/CSV or Supabase
Looks more like a product
```

#### API / Service (if demo is via API calls or CLI)

```
FastAPI (Python) — beautiful auto /docs, instant Swagger UI
Deploy: Railway (1-click Docker deploy)
AI: LangChain, direct API calls
Demo: Postman or built-in /docs page
```

---

## AI Integration Stack Recommendations

### LLM (text generation, reasoning, conversation)
| Need | Recommended | Notes |
|------|-------------|-------|
| Fastest integration | OpenAI GPT-4o via API | 3 lines of code, reliable |
| Cost-sensitive | Groq (Llama 3, free tier) | Extremely fast inference |
| Reasoning tasks | Anthropic Claude 3.5 Sonnet | Best at structured JSON output |
| Multimodal | Google Gemini 1.5 Flash | Image + text, generous free tier |
| Local / offline | Ollama + Llama 3 | No API key, but heavier setup |

### Structured AI Output
- Always use JSON mode / structured outputs — don't regex-parse LLM text
- `instructor` library (Python) or `zod` + `openai` (TypeScript) for typed outputs
- This is the difference between demo-stable and demo-explosive

### Computer Vision
- Quick: Google Cloud Vision API or AWS Rekognition (managed, instant)
- More control: OpenCV + Python (if team knows it)
- SOTA with no infra: Replicate.com (run any model, pay per second)

### Audio / Voice
- Transcription: OpenAI Whisper API (fast, accurate)
- Text-to-Speech: ElevenLabs API or OpenAI TTS
- Real-time voice: Deepgram (low latency streaming)

### Multi-agent
- LangGraph (Python, stateful agent graphs)
- CrewAI (easiest multi-agent setup)
- Caution: multi-agent adds orchestration complexity — only if it's the CORE differentiator

---

## Anti-Patterns: What NOT to Do at a Hackathon

```
❌ DON'T: Set up Docker + Kubernetes for a 24h hack
   WHY: Configuration takes 2h+ that you don't have
   DO: Use Railway/Render/Vercel for instant cloud
   
❌ DON'T: Build a custom auth system from scratch
   WHY: Auth bugs break demos. Use Clerk/Supabase Auth.
   
❌ DON'T: Use a new framework you've never used before
   WHY: Learning curve = wasted critical hours
   DO: Use what you know; dress it up with shadcn/ui
   
❌ DON'T: Real-time WebSockets if your demo doesn't need it
   WHY: Complexity without payoff. Polling is fine for demos.
   
❌ DON'T: Manage your own database server
   WHY: Supabase/PlanetScale/Firebase are free and instant
   
❌ DON'T: Build a mobile app if you need a shareable URL
   WHY: Judges can't install your app. Use Expo Go or build web.
   
❌ DON'T: Fine-tune an LLM during the hackathon
   WHY: 6h+ for a marginal improvement. Use prompt engineering.
   
❌ DON'T: Assume the hackathon venue has reliable internet
   WHY: Pre-compute/cache all AI responses. Have offline fallback.
   
❌ DON'T: Start with perfect code architecture
   WHY: Hackathon code is demo code. Clean it up afterward.
```

---

## Deployment Quickstart Guide

### Vercel (Next.js / Vite)
```bash
npm install -g vercel
vercel login
vercel --prod
# Shareable URL in 2 minutes
```

### Railway (Full-stack with backend)
```bash
# Connect GitHub repo in Railway dashboard
# Add environment variables
# Auto-deploys on push
# Free $5/month credit
```

### Supabase Setup
```bash
# 1. Create project at supabase.com (2 min)
# 2. npm install @supabase/supabase-js
# 3. Copy URL + anon key → .env
# Done. Postgres + Auth + Storage + Realtime ready.
```

### Streamlit (Data/AI demos)
```bash
pip install streamlit
streamlit run app.py
# Deploy: streamlit.io/cloud → connect GitHub → deploy
```

---

## Final Stack Recommendation Output

```
RECOMMENDED STACK: [Project Title]
────────────────────────────────────
Setup time estimate: [X minutes]

Frontend: [Framework + UI Library]
Backend:  [Language + Framework]
Database: [Service]
Auth:     [Service or "None needed"]
AI Layer: [API/Service + library]
Deploy:   [Platform + estimated time]

Why this stack for YOU:
- [Team skill match reasoning]
- [Demo visual quality reasoning]
- [Reliability reasoning]

First 60 minutes after stack decision:
1. [Exact command or step 1]
2. [Exact command or step 2]
3. [Exact command or step 3]
4. [Verify: "If you can see X, you're good to go"]

Anti-patterns to avoid with this stack:
- ⚠ [Stack-specific warning 1]
- ⚠ [Stack-specific warning 2]
```

---

## Integration

- Called as part of STEP 7 (Winner Pack), after architecture is defined
- `07_architecture-mvp.md` provides the architectural constraints
- `12_personalization-profile.md` provides the team skill baseline
- Output feeds into `24_team-role-optimizer.md` (who does what with this stack)
- Can be invoked standalone for any team mid-planning

# Code Starter Generator — Module 28

## Purpose

Transform the Winner Pack's architecture + stack into **ready-to-use boilerplate code** that the team can clone and immediately start building on. This eliminates the "setup paralysis" that costs 1-3 hours at the start of every hackathon.

Output is complete, copy-paste ready — not pseudocode, not descriptions.

---

## Activation

Activate when:
- User has a Winner Pack with stack selection
- User says "give me the starter code"
- User says "scaffold the project"
- `/code-starter`

---

## What Gets Generated

Based on the chosen stack, produce:

### 1. Directory Structure
```
[Project Name]/
├── README.md
├── .env.example
├── .gitignore
├── [stack-specific files]
└── [stack-specific directories]
```

### 2. Core Configuration Files
- `package.json` or `requirements.txt` / `pyproject.toml`
- `tsconfig.json` (TypeScript projects)
- `.env.example` (all required keys with placeholder values + comments)
- `.gitignore` (pre-configured for chosen stack)

### 3. Core Boilerplate Files
- Main entry point
- Key API routes (from the minimal API list in the Winner Pack)
- Database client setup
- AI client setup (with structured output configuration)
- Basic UI layout

---

## Stack-Specific Templates

### 📦 Next.js + Supabase + OpenAI (Most Common)

**Directory structure:**
```
my-project/
├── README.md
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── middleware.ts
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/
│       ├── analyze/route.ts      ← Main AI endpoint
│       ├── data/route.ts         ← Data CRUD endpoint
│       └── health/route.ts       ← Health check
├── components/
│   ├── ui/                       ← shadcn components (auto-installed)
│   ├── MainDashboard.tsx
│   └── ResultCard.tsx
├── lib/
│   ├── supabase.ts               ← Supabase client
│   ├── openai.ts                 ← OpenAI client with JSON mode
│   └── utils.ts
└── types/
    └── index.ts                  ← All TypeScript interfaces
```

**.env.example:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_never_expose_client_side

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**package.json (key deps):**
```json
{
  "dependencies": {
    "next": "15.x",
    "react": "19.x",
    "react-dom": "19.x",
    "@supabase/supabase-js": "^2",
    "@supabase/ssr": "^0.5",
    "openai": "^4",
    "zod": "^3",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "lucide-react": "^0.400"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "typescript": "^5",
    "tailwindcss": "^3",
    "autoprefixer": "^10",
    "postcss": "^8"
  }
}
```

**lib/openai.ts:**
```typescript
import OpenAI from 'openai';
import { z } from 'zod';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ALWAYS use structured output — never parse raw text
export async function analyzeWithAI<T>(
  systemPrompt: string,
  userInput: string,
  schema: z.ZodSchema<T>
): Promise<T> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3, // Lower = more deterministic = demo-safe
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from AI');
  
  const parsed = JSON.parse(content);
  return schema.parse(parsed); // Validates the AI output shape
}
```

**lib/supabase.ts:**
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side client (for API routes — has full access)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**app/api/analyze/route.ts (AI endpoint skeleton):**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { analyzeWithAI } from '@/lib/openai';
import { z } from 'zod';

// Define your AI output schema here
const AnalysisSchema = z.object({
  result: z.string(),
  confidence: z.number().min(0).max(1),
  recommendations: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input) {
      return NextResponse.json({ error: 'Input required' }, { status: 400 });
    }

    const analysis = await analyzeWithAI(
      `You are an expert assistant. Analyze the input and return JSON with:
       result (string), confidence (0-1), recommendations (string[]).`,
      input,
      AnalysisSchema
    );

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    
    // DEMO FALLBACK — always have hardcoded data for demo mode
    if (process.env.DEMO_MODE === 'true') {
      return NextResponse.json({
        result: 'Demo result — replace with real AI call',
        confidence: 0.87,
        recommendations: ['Recommendation 1', 'Recommendation 2', 'Recommendation 3'],
      });
    }
    
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
```

**Setup commands:**
```bash
npx create-next-app@latest my-project --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd my-project
npx shadcn@latest init -d
npx shadcn@latest add button card badge input textarea skeleton
npm install @supabase/supabase-js @supabase/ssr openai zod lucide-react
cp .env.example .env.local
# Fill in .env.local, then:
npm run dev
```

---

### 🐍 FastAPI + Supabase + OpenAI (Python teams)

**Directory structure:**
```
my-project/
├── README.md
├── .env.example
├── .gitignore
├── requirements.txt
├── pyproject.toml
├── main.py                    ← FastAPI app entry
├── api/
│   ├── __init__.py
│   ├── routes/
│   │   ├── analyze.py         ← Main AI endpoint
│   │   └── data.py            ← Data endpoints
│   └── models/
│       ├── requests.py        ← Pydantic request models
│       └── responses.py       ← Pydantic response models
├── services/
│   ├── ai_service.py          ← AI logic + structured output
│   └── db_service.py          ← Supabase queries
├── core/
│   ├── config.py              ← Environment variables
│   └── demo_data.py           ← Hardcoded fallback responses
└── tests/
    └── test_analyze.py
```

**requirements.txt:**
```
fastapi==0.111.0
uvicorn[standard]==0.30.0
pydantic==2.7.0
pydantic-settings==2.3.0
openai==1.35.0
instructor==1.3.0        # Structured AI output — better than JSON mode
supabase==2.5.0
python-dotenv==1.0.1
httpx==0.27.0
pytest==8.2.0
pytest-asyncio==0.23.0
```

**core/config.py:**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str
    supabase_url: str
    supabase_key: str
    demo_mode: bool = False  # Set True before demo to use hardcoded data
    
    class Config:
        env_file = ".env"

settings = Settings()
```

**services/ai_service.py:**
```python
import instructor
from openai import OpenAI
from pydantic import BaseModel
from core.config import settings
from core.demo_data import DEMO_RESPONSES

# instructor wraps OpenAI for guaranteed structured output
client = instructor.from_openai(OpenAI(api_key=settings.openai_api_key))

class AnalysisResult(BaseModel):
    result: str
    confidence: float  # 0.0 - 1.0
    recommendations: list[str]
    supporting_data: dict

async def analyze(input_text: str) -> AnalysisResult:
    # DEMO FALLBACK — always have this
    if settings.demo_mode:
        return DEMO_RESPONSES["analysis"]
    
    return client.chat.completions.create(
        model="gpt-4o",
        response_model=AnalysisResult,  # instructor enforces this schema
        temperature=0.2,  # Low temp = deterministic = demo-safe
        messages=[
            {"role": "system", "content": "You are an expert analyst. Return structured JSON."},
            {"role": "user", "content": input_text}
        ]
    )
```

**main.py:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import analyze, data

app = FastAPI(title="[Your Project Name]", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])
app.include_router(data.router, prefix="/api/data", tags=["data"])

@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Setup commands:**
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in .env, then:
uvicorn main:app --reload
# Swagger UI at: http://localhost:8000/docs
```

---

### ⚡ Streamlit + Python (Solo/Data demos — fastest)

**Directory structure:**
```
my-project/
├── README.md
├── .env.example
├── .gitignore
├── requirements.txt
├── app.py                     ← Single file = full app
├── components/
│   ├── sidebar.py             ← Sidebar configuration
│   └── result_display.py     ← Result visualization
├── services/
│   ├── ai_service.py          ← Same as FastAPI version
│   └── data_loader.py
└── data/
    └── demo_data.json         ← Hardcoded demo fallback
```

**app.py:**
```python
import streamlit as st
import json
from services.ai_service import analyze
from data.demo_data import DEMO_DATA

st.set_page_config(
    page_title="[Your Project Name]",
    page_icon="🚀",
    layout="wide"
)

# Demo mode toggle (sidebar)
with st.sidebar:
    st.title("⚙️ Settings")
    demo_mode = st.toggle("Demo Mode (pre-computed)", value=True)
    st.info("Turn on Demo Mode before presenting!")

st.title("🚀 [Your Project Name]")
st.caption("[Your tagline here]")

# Main input
user_input = st.text_area("Enter your input:", height=150, placeholder="...")

if st.button("Analyze", type="primary"):
    with st.spinner("Analyzing..."):
        if demo_mode:
            result = DEMO_DATA["sample_result"]
        else:
            result = analyze(user_input)
        
        # Display results
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Confidence", f"{result['confidence']:.0%}")
        with col2:
            st.metric("Key Finding", result['result'][:20] + "...")
        with col3:
            st.metric("Recommendations", len(result['recommendations']))
        
        st.subheader("📊 Analysis Result")
        st.write(result['result'])
        
        st.subheader("💡 Recommendations")
        for rec in result['recommendations']:
            st.write(f"• {rec}")
```

**Setup commands:**
```bash
pip install streamlit openai instructor supabase python-dotenv
cp .env.example .env
# Fill .env
streamlit run app.py
# Deploy: push to GitHub, connect at share.streamlit.io
```

---

## Supabase Database Setup

For any stack, generate the initial SQL schema from the data model in `07_architecture-mvp.md`:

```sql
-- Generated from Winner Pack data model
-- Run in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- [Entity 1] table
CREATE TABLE [entity_1] (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  [field_1]   TEXT NOT NULL,
  [field_2]   NUMERIC,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- [Entity 2] table  
CREATE TABLE [entity_2] (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  [entity_1_id]   UUID REFERENCES [entity_1](id) ON DELETE CASCADE,
  [field_1]       TEXT,
  [field_2]       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (enable for all tables)
ALTER TABLE [entity_1] ENABLE ROW LEVEL SECURITY;
ALTER TABLE [entity_2] ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy (open for hackathon, restrict in production)
CREATE POLICY "Allow all" ON [entity_1] FOR ALL USING (true);
CREATE POLICY "Allow all" ON [entity_2] FOR ALL USING (true);

-- Seed demo data
INSERT INTO [entity_1] ([field_1], [field_2]) VALUES
  ('Demo record 1', 42),
  ('Demo record 2', 87),
  ('Demo record 3', 15);
```

---

## .gitignore Template

```gitignore
# Environment
.env
.env.local
.env.*.local

# Dependencies
node_modules/
__pycache__/
*.pyc
venv/
.venv/

# Build
.next/
dist/
build/
*.egg-info/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
```

---

## Demo Mode README Section

Always add to README:

```markdown
## Demo Mode

For the hackathon demo, activate pre-computed responses to ensure reliability:

**Web app:** Set `DEMO_MODE=true` in `.env.local`
**Python:** Set `DEMO_MODE=True` in `.env`
**Streamlit:** Toggle "Demo Mode" in the sidebar

This bypasses live AI calls and uses validated, pre-computed responses.
```

---

## Integration

- Called in STEP 8 (Winner Pack), after `07_architecture-mvp.md` and `20_tech-stack-advisor.md`
- Inputs: stack selection, data model, API contract
- Output: ready-to-clone directory structure + key files
- Can be invoked standalone via `/code-starter`

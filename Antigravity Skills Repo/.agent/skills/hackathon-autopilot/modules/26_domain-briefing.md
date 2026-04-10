# Domain Briefing — Module 26

## Purpose

When a team is competing in an **unfamiliar domain**, 15 minutes of structured learning beats hours of shallow research. This module provides a rapid domain intelligence brief that:
- Gives just enough terminology to sound credible to domain experts
- Surfaces the real pain points (not the obvious ones)
- Warns about domain-specific mistakes that will kill credibility with judges
- Provides real metrics and data points to reference in the pitch

---

## Activation

Activate when:
- User says "we're not experts in [domain]"
- User mentions an unfamiliar vertical (healthcare, logistics, fintech, etc.)
- `/domain-brief [domain name]`

---

## Supported Domain Briefings

### 🏥 HEALTHCARE / DIGITAL HEALTH

**Core terminology (use these correctly):**
- **EHR/EMR** — Electronic Health/Medical Record (the patient database doctors use)
- **FHIR** — Fast Healthcare Interoperability Resources (the data standard for health APIs)
- **HL7** — older health data standard; still widely used
- **CPT codes** — billing codes for medical procedures
- **ICD-10** — diagnosis classification codes
- **HIPAA** — US patient data privacy law (EU equivalent: GDPR + specific health directives)
- **Clinical workflow** — the sequence of steps a clinician follows; disrupting this is risky
- **Referral pathway** — how patients move between care providers
- **SDOH** — Social Determinants of Health (housing, income, food access affecting health)
- **Triage** — prioritizing patients by urgency

**Real pain points (non-obvious):**
1. Clinicians spend ~50% of their time on documentation, not patient care (the "pajama time" problem)
2. EHR systems are notoriously bad UX — clinicians hate them but are locked in
3. Interoperability between hospital systems is nearly nonexistent despite FHIR standards
4. Rural patients travel 2+ hours for specialist care that could be remote
5. Medication non-adherence costs $500B/year in preventable hospitalizations

**Killer metrics to cite:**
- "1 in 10 patients is harmed by preventable medical error" (WHO stat)
- "Physician burnout costs ~$4.6B/year in the US alone"
- "Only 20% of health data is structured — 80% is unstructured notes"

**Credibility mistakes to avoid:**
- ⚠️ Saying "patients can self-diagnose" — clinicians will push back hard
- ⚠️ Underestimating regulatory barriers (FDA, CE marking for medical devices)
- ⚠️ Forgetting liability — who is responsible if the AI is wrong?
- ⚠️ "This replaces the doctor" framing — reframe as "supports the clinician"

**Safe framing for AI in healthcare:**
> "AI surfaces the pattern, the clinician makes the decision."

---

### 💰 FINTECH / FINANCIAL SERVICES

**Core terminology:**
- **KYC** — Know Your Customer (identity verification requirement)
- **AML** — Anti-Money Laundering
- **PSD2** — EU open banking directive enabling third-party API access to bank accounts
- **Open banking** — banks must share customer data via API (with consent)
- **Core banking system** — the central software banks run (EXTREMELY legacy, often COBOL)
- **BNPL** — Buy Now Pay Later (Klarna, Affirm model)
- **Credit score / credit risk** — likelihood of loan default
- **Chargeback** — disputed transaction reversed by card network
- **Reconciliation** — matching transactions to confirm they balance
- **Treasury** — managing cash flows and liquidity for companies

**Real pain points:**
1. ~1.4B adults globally are "unbanked" — no access to formal financial services
2. SMEs (small businesses) are rejected for loans because they lack 3 years of financial history
3. Cross-border payments take 3-5 days and cost 5-10% in fees
4. Fraud detection has 99% false positive rates — legitimate transactions blocked
5. Finance teams spend 60%+ of their time on manual reconciliation

**Killer metrics:**
- "Global payment fraud: $48B in 2023, growing 20% annually"
- "SME lending gap: $5.2T globally (World Bank)"
- "Average cost of a data breach in financial services: $5.9M"

**Credibility mistakes:**
- ⚠️ Ignoring regulatory requirements (licenses, compliance with central banks)
- ⚠️ "We'll disrupt banks" — regulators protect banks; work with them
- ⚠️ Treating all countries as the same (banking regulation is hyper-local)
- ⚠️ Promising "instant" cross-border payments without mentioning settlement rails

---

### 🏭 SUPPLY CHAIN / LOGISTICS

**Core terminology:**
- **SKU** — Stock Keeping Unit (unique identifier for a product)
- **3PL / 4PL** — Third/Fourth Party Logistics (outsourced fulfillment providers)
- **Last mile** — the final delivery leg to the customer (most expensive part)
- **Just-in-time (JIT)** — inventory arrives exactly when needed, minimal stock held
- **EOQ** — Economic Order Quantity (optimal reorder amount)
- **Lead time** — time from order to receipt
- **Demand sensing** — using real-time signals to predict short-term demand
- **Reverse logistics** — handling returns
- **Freight forwarding** — coordinating international shipments
- **Dwell time** — time cargo sits idle at a port or warehouse

**Real pain points:**
1. 94% of Fortune 1000 companies experienced supply chain disruption in 2023
2. Inventory visibility: most companies don't know where their goods are in real time
3. "Bullwhip effect" — small demand changes cause massive inventory swings upstream
4. Supplier onboarding takes 3-6 months due to manual due diligence
5. Returns cost retailers up to 66% of the item's original price to process

**Killer metrics:**
- "Supply chain disruptions cost companies $228M per event on average"
- "Inventory carrying costs: 20-30% of inventory value per year"
- "Out-of-stock events cost retailers ~4% of annual revenue"

**Credibility mistakes:**
- ⚠️ Underestimating integration complexity (ERP systems are highly customized)
- ⚠️ Assuming real-time data exists (most supply chain data is 24-48 hours delayed)
- ⚠️ "AI will predict demand perfectly" — demand forecasting has irreducible uncertainty

---

### 🎓 EDUCATION / EDTECH

**Core terminology:**
- **LMS** — Learning Management System (Moodle, Canvas, Blackboard)
- **OER** — Open Educational Resources
- **Bloom's Taxonomy** — framework for classifying learning objectives (remember → create)
- **Formative assessment** — ongoing assessment during learning (vs. summative = final exam)
- **Spaced repetition** — learning technique based on reviewing material at increasing intervals
- **Pedagogy** — theory and practice of teaching
- **Differentiated instruction** — adapting teaching to individual student needs
- **IEP** — Individualized Education Program (for students with special needs)
- **Seat time** — traditional measure of learning by hours spent (increasingly obsolete)

**Real pain points:**
1. Teachers spend 50%+ of their time on administrative tasks, not teaching
2. Large class sizes make personalized feedback impossible at scale
3. Students in different socioeconomic contexts have dramatically different access to resources
4. Learning loss from COVID-19 still not recovered in many regions
5. Degree credentials are not portable or machine-readable across borders

**Killer metrics:**
- "65% of today's students will work in jobs that don't exist yet"
- "Global learning poverty: 70% of 10-year-olds can't read a basic text"
- "Teacher turnover costs US schools $8.5B annually"

**Credibility mistakes:**
- ⚠️ "AI replaces teachers" — deeply politically charged; always say "supports teachers"
- ⚠️ Ignoring data privacy for minors (COPPA in US, GDPR for under-16 in EU)
- ⚠️ Assuming all students have reliable internet access

---

### 🌱 CLIMATE TECH / SUSTAINABILITY

**Core terminology:**
- **GHG / GHG inventory** — Greenhouse Gas emissions accounting
- **Scope 1/2/3** — direct emissions (1), purchased energy (2), value chain (3)
- **Carbon credit** — permit to emit 1 tonne of CO2; tradeable
- **LifeCycle Assessment (LCA)** — measuring environmental impact across a product's life
- **Net zero** — balancing emitting and removing carbon (by 2050 for most pledges)
- **Carbon offset** — compensating for emissions by funding reductions elsewhere
- **Additionality** — carbon savings that wouldn't have happened without the project
- **TCFD** — Task Force on Climate-related Financial Disclosures
- **CSRD** — EU Corporate Sustainability Reporting Directive (mandatory from 2024)
- **Embodied carbon** — CO2 in materials and construction (vs. operational carbon)

**Real pain points:**
1. 93% of companies don't measure Scope 3 emissions (their supply chain)
2. Carbon offset market has rampant fraud — "phantom credits" reported widely
3. SMEs have no affordable way to measure or report their emissions
4. Green washing is increasing consumer skepticism of all sustainability claims
5. Transition risk: companies don't know the financial impact of carbon regulation

**Killer metrics:**
- "Carbon disclosure regulation will cover $100T in assets by 2025"
- "Buildings are responsible for 38% of global energy-related CO2 emissions"
- "Food waste alone contributes 8-10% of global GHG emissions"

**Credibility mistakes:**
- ⚠️ Conflating "net zero" with "carbon neutral" (different standards)
- ⚠️ Promising "carbon negative" without explaining methodology
- ⚠️ Ignoring the political economy of carbon markets

---

### 🏙️ SMART CITY / URBAN TECH / GOVTECH

**Core terminology:**
- **IoT infrastructure** — sensor networks (traffic, air quality, waste, etc.)
- **Digital twin** — virtual replica of a physical city system
- **Open data portal** — government-published datasets (many cities have these!)
- **GDPR / data residency** — EU data sovereignty requirements (EU cities cannot use US cloud)
- **Procurement cycle** — how governments buy technology (18-24 months is normal)
- **Civic tech** — technology built for and with citizens
- **Traffic management** — signal timing, flow optimization, incident detection
- **Asset management** — maintaining public infrastructure (bridges, pipes, roads)

**Real pain points:**
1. Cities have massive sensor data but no capacity to analyze it
2. Government procurement locks cities into legacy vendors for decades
3. Urban mobility: 25% of city surface area is parking lots in most US cities
4. Public services have no real-time visibility into where citizens are in the process
5. Emergency response routing is still largely manual

**Credibility mistakes:**
- ⚠️ Underestimating procurement timelines — "we'll sell to the city next month" will be laughed at
- ⚠️ Ignoring citizen privacy when using sensor data
- ⚠️ Assuming all cities have modern APIs (many still use CSV exports)

---

## Universal Domain Briefing Format

For any domain not listed above, produce:

```
DOMAIN BRIEF: [Domain Name]
─────────────────────────────
10 essential terms:
  1. [Term]: [Definition in plain language]
  ...

3 non-obvious real pain points:
  1. [Pain point + evidence]
  2. [Pain point + evidence]
  3. [Pain point + evidence]

3 killer metrics to cite in pitch:
  - "[Specific statistic with implied source]"
  - [...]

5 credibility mistakes to avoid:
  ⚠️ [Mistake + why it kills credibility]
  ...

Safe AI framing for this domain:
  "[Template sentence that positions AI correctly for this domain's culture]"
```

---

## Integration

- Called in STEP 0 (before idea generation) when domain is unfamiliar
- Outputs feed into `03_jury-psychology.md` (domain-aware judge framing)
- Outputs feed into `08_pitch-script.md` (use domain metrics in pitch)
- Activated via `/domain-brief [domain]`

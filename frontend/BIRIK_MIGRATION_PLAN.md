# Birik Migration Plan

**Context:** StellarSplit's frontend is being reskinned to the "Birik" brand (neon-lime Cash App aesthetic built during standalone design exploration at `C:\Users\emirg\OneDrive\Desktop\kliq-redesign`). **Product functionality stays identical** — still group expense splitting on Stellar + Soroban. Only the brand, palette, typography, and landing page copy change.

**Branch:** `claude/stoic-franklin-7b0db4` (git worktree). Merges to `master` when validated.

---

## Key architectural win

The existing frontend uses **shadcn/ui CSS variable pattern** (`hsl(var(--primary))`). All 81 components consume these variables. **We reskin the entire app by redefining the variables in one file** — zero component changes needed for the vast majority of screens. 880 tests stay green.

---

## Phase plan

### Phase 1 — Brand foundation (1-2 hours)
Goal: flip the visual system without touching any component logic.

- Install `@fontsource/archivo-black` for display type (Inter + JetBrains Mono are already used — keep)
- Rewrite `src/index.css` CSS variables for both `:root` (light) and `.dark` — map to Birik palette:
  - `--background` → ink `#0A0A0A`
  - `--foreground` → bone `#F5F5F0`
  - `--primary` → birik lime `#C4FF4D`
  - `--primary-foreground` → ink (for contrast on lime buttons)
  - `--card` → fog `#1A1A1A`
  - `--border`, `--input`, `--muted`, `--accent`, `--destructive` etc. re-mapped to Birik semantic palette
  - Keep shadow tokens and radius — just update colors
- Add direct Birik color tokens to `tailwind.config.js` (alongside shadcn vars) so copy-paste from kliq-redesign lands cleanly: `ink`, `mist`, `fog`, `edge`, `bone`, `cream`, `birik`, `heat`, `plum`
- Add `font-display` Archivo Black to Tailwind theme
- Add component utility classes (`.btn-birik`, `.btn-ghost`, `.chip`, `.section`, `.display`, `.grain`) to `index.css` under `@layer components`
- Replace `src/components/Logo.tsx` with inline SVG (three rising bars + baseline foot) — keep `{ size, className }` prop API for drop-in compatibility
- Replace `public/favicon.svg` with Birik favicon (lime tile + ink mark)
- Update App.tsx hardcoded colors: `indigo-600 → birik`, `purple-600 → plum`, ambient glow orbs re-tinted
- Update Header: "StellarSplit" wordmark → `<Logo variant="lockup" />`
- Verify: `npm run build` passes, `npm run test:run` stays green (880 tests)

### Phase 2 — Landing page rewrite (2-3 hours)
Goal: replace `components/Landing.tsx` with a StellarSplit-accurate landing in Birik style. Product copy pivots from crypto wallet to expense splitter.

- New architecture: **Ekle · Böl · Settle** (three verbs, parallel to original Al/Kazan/Harca)
- Hero: "Hesabı böl. Stellar'da settle et." (or similar) with phone mockup showing group expense flow
- Preserve the `Props` interface: `onConnect`, `onPasskey`, `freighterAvailable`, `connecting`, `isDemo`, `onTryDemo`
- Section stack: Hero → Marquee → PressBar → Pillars (Ekle/Böl/Settle) → Features (6 features) → Stellar Advantage (replaces Birik Kart — "sıfıra yakın ücret, on-chain transparency") → Steps → Testimonials → Trust (MASAK → replace with "Soroban audit, SIWS auth, open-source") → FAQ → CTA → Footer
- Phone carousel states adapted: **Group list · Add expense · Balances · Settlement** (mirrors dashboard → group detail → settlement flow)
- Turkish copy per i18n — extend `lib/i18n.ts` with new landing keys where needed, keep existing
- Keep `onConnect` and `onTryDemo` CTA wiring intact
- Verify: landing renders on `/`, wallet connect still works, demo mode toggle works

### Phase 3 — Brand name sweep (1 hour)
Goal: every user-facing "StellarSplit" → "Birik". Internal code references (localStorage keys, event names) kept for backward compatibility.

- `index.html` `<title>` + meta description
- `App.tsx` `const base = 'StellarSplit'` → `'Birik'`
- `App.tsx` header wordmark text
- `package.json` name field
- `README.md` root + `frontend/README.md`
- `i18n.ts` translation keys
- Footer brand text
- Toast messages that mention "StellarSplit" (e.g., sponsored-tx toast) → "Birik"
- Email domain refs — keep or update based on deployment (probably `destek@birik.com` but domain not live yet)
- Sentry project name (if defined in code, not env)
- LocalStorage keys (`stellarsplit_theme`) — keep for backward compat OR migrate existing users; document decision
- Custom event names (`stellarsplit:tx-sponsored`, `stellarsplit:new-group`, etc.) — keep for internal compat, users never see these
- Verify: no user-facing "StellarSplit" string remains via grep

### Phase 4 — Polish & Validate (0.5-1 hour)
- Run `npm run lint`, fix any new warnings
- Run `npm run test:run` — 880 tests must stay green
- Run `npm run e2e` if possible — Playwright smoke suite
- Manual QA: landing, dashboard, group detail, settings on both desktop + mobile widths
- Run `npm run build`; inspect bundle size (should stay in budget)
- Lighthouse on preview build, target ≥90 all categories

---

## Rules

1. **Don't touch business logic.** No changes to `store/`, `lib/`, `hooks/`, or contract calls.
2. **Don't break tests.** If a test references `StellarSplit` in UI output, update the test snapshot — don't change the component.
3. **Backup via git.** Every phase = one commit. Easy to revert individual phases.
4. **Keep existing API.** Logo's `size` and `className` props preserved. Landing's `Props` interface preserved.

---

## Out of scope (separate projects)

- Smart contract changes
- Backend API changes
- New features (we're visually rebranding, not adding features)
- Domain purchase (mentioned in kliq-redesign ROADMAP but separate task)
- Translation of full Turkish to English/German/Spanish for new landing copy (do Turkish first, i18n later)

---

## Artifacts from kliq-redesign to port in

Already built at `C:\Users\emirg\OneDrive\Desktop\kliq-redesign`:
- `src/components/Logo.jsx` (three bars + foot)
- `src/components/Reveal.jsx` (motion utility)
- `src/components/CoinIcon.jsx` — **skip**, not relevant
- `src/components/PhoneCarousel.jsx` — **adapt** for expense flow
- `src/components/phoneStates/*` — **rewrite** for StellarSplit screens
- `public/brand/*.svg` — copy to `frontend/public/brand/`
- `public/favicon.svg` — copy to `frontend/public/`
- `tailwind.config.js` tokens — merge into existing Tailwind config
- Landing section components (Hero, Marquee, PressBar, Pillars, Features, Card, Steps, Testimonials, Trust, FAQ, CTA, Footer) — **adapt** copy from crypto-wallet to expense-splitter

---

## Go / no-go decisions logged

| Decision | Choice | Rationale |
|---|---|---|
| Reskin vs. replace frontend | **Reskin** | 880 tests, auth, contract RPC are production-ready. CSS-var pattern lets us re-theme without touching components. |
| Brand name | **Birik** | User preference. "Birik" maps naturally to expense-splitter too (birikim = savings, buluşma, grup hesabı). |
| Product direction | **Expense splitter** | StellarSplit's core value prop stays. Birik is cosmetic rebrand + visual redesign, not product pivot. |
| Design token format | **Merge, don't replace** | Add Birik tokens alongside shadcn vars. Existing components use vars; new landing code can use direct tokens. |
| TypeScript | **Port JS → TSX** | Frontend is strict TS. Convert all ported components at port-time. |
| Router version | **v7 (existing)** | Don't downgrade. The kliq mockup used v6; the v7 API is a mild upgrade. |

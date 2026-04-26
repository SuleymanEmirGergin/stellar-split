# Savings Tab Redesign — Design Spec & Handoff

**Status:** Implementation-ready (April 2026)
**Audience:** Frontend engineers + future contributors picking up the savings surface
**Source of truth for runtime:** [`ADR-0001`](../architecture/adr/0001-savings-hybrid-source-of-truth.md)

---

## 1. Problem statement

The existing `SavingsPool.tsx` is functionally complete (create, list, contribute,
cancel) but flat. Users see a heading and a stack of cards. Three weaknesses
showed up in user feedback:

1. **No sense of progress at the group level.** You see one pool's progress,
   but not "we're 60% of the way across all our goals this month".
2. **No social proof.** No leaderboard, no "MVP contributor", no momentum cue —
   savings is a social product, the UI hides that.
3. **Empty state is generic.** A first-time user staring at the savings tab
   sees the same "no pools yet" panel as if the feature were a placeholder.

Goal: take the savings tab from "table of pools" to **"hero + leaderboard +
pool list"** — a surface that reads at a glance and rewards repeat use, while
keeping every existing function intact.

---

## 2. Design tokens used

All values come from `frontend/src/lib/tokens.ts` — **no hardcoded hex / px**.

| Token | Where | Why |
|---|---|---|
| `glass.medium` (`rgba(255,255,255,0.07)`) | Hero card background | Matches NotificationCenter + WeeklyGoals — same elevation language |
| `glass.subtle` (`rgba(255,255,255,0.04)`) | Pool cards | One step below hero so the eye picks the hero first |
| `glass.faint` (`rgba(255,255,255,0.02)`) | Leaderboard row hover | Subtle differentiation without breaking grid |
| `radius.panel` (24 px) | Hero card | Consistent with Dashboard hero, ImportModal |
| `radius.card` (16 px) | Pool cards, leaderboard rows | Matches ExpensesTab cards |
| `radius.chip` (8 px) | Status badges, currency toggle | Matches TestnetBadge |
| `space.lg` (16 px) | Hero ↔ leaderboard ↔ pool-list vertical rhythm | Same gap as Dashboard sections |
| `space.md` (12 px) | Inside hero card grid | One step tighter than section gap |
| `motionTransition.snappy` (150 ms snappy easing) | Hover reveals, chip switches | Matches FeedbackWidget, NotificationCenter |
| `motionTransition.smooth` (250 ms smooth easing) | Hero number count-up | Long enough to feel rewarded, short enough not to delay reads |
| `shadow.card` | Hero card | Lifts it above the page |
| `shadow.brand` | "Create pool" CTA | Reserved for primary actions |
| Color: `emerald-400` / `teal-400` gradient | Savings primary palette | Consistent with PiggyBank icon + existing pool cards (don't reinvent) |
| Color: `amber-400` / `rose-400` | Deadline urgency states | Matches DeFi APY warning bands |

If you're tempted to write `bg-[#1a1d24]`, stop and reach for a token first.

---

## 3. Information architecture

```
┌──────────────────────────────────────────────────────────┐
│                    SavingsStatsHero                      │  ← new
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│  │   Toplam    │ │   Aktif     │ │   Hedef     │         │
│  │   Birikim   │ │   Havuz     │ │   Ulaşma    │         │
│  │  3450 XLM   │ │     4       │ │    62%      │         │
│  └─────────────┘ └─────────────┘ └─────────────┘         │
│  ── overall progress bar (sum-of-current / sum-of-goal)──│
│  [+ Yeni Havuz CTA  ───────────────────►]                │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│                  SavingsLeaderboard                      │  ← new
│  🥇 alice…XYZ   1200 XLM    32%                          │
│  🥈 bob…123     950 XLM     25%                          │
│  🥉 charlie…    700 XLM     18%                          │
│     diana…      400 XLM     11%                          │
│     +3 more…                                              │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│  Status filter:  [Aktif (4)] [Tamamlanan (2)] [İptal (1)]│  ← new
│                                                           │
│  ┌─ PoolCard (existing component, refined hover) ────┐   │
│  │  🐷 Trip to Ankara              ACTIVE • 12 days  │   │
│  │  ──────────────────  68% funded                   │   │
│  │  680 / 1000 XLM                                   │   │
│  │  [Contribute] [×]                                 │   │
│  └───────────────────────────────────────────────────┘   │
│  …                                                        │
└──────────────────────────────────────────────────────────┘
```

### Why this layout
- **Hero first.** Drives the "we're together making progress" feeling — every
  person in the group sees a number that includes their contribution.
- **Leaderboard second.** Light social proof. Top contributor names are masked
  to last 5 chars (privacy + already established convention in the app).
- **Filter chips third.** Status filter (active / completed / cancelled) takes
  the place of the previous 3 separate sections. Cleaner, easier to scan.
- **Pool cards last.** No structural change — same component, slightly refined
  hover + entry animation so it feels alive when filtered.

---

## 4. Component anatomy

### 4.1 `SavingsStatsHero` (new)

**Props**
```ts
{
  totalCurrent: number;     // sum of currentAmount across all ACTIVE pools
  totalGoal: number;        // sum of goalAmount across all ACTIVE pools
  activeCount: number;      // pools with status === 'ACTIVE'
  currency: 'XLM' | 'USDC'; // group currency (currencyLabel prop)
  onCreatePool: () => void; // open CreatePoolModal
}
```

**Visual states**
- **Loaded with data.** Three KPI cards in a 3-column grid (mobile: 2-col + 1-col stacked), aggregate progress bar below, primary CTA right.
- **No active pools.** Same shell, KPI numbers show `0` / `—`, progress bar is the empty rail (`glass.faint`), CTA is the only emphasis. Empty-state copy moves into the right-hand half of the hero ("İlk havuzunu oluştur · 30 saniye, on-chain proof").
- **Loading.** All three KPI numbers + progress bar render as `Skeleton` shapes with the same dimensions; no layout shift.

**A11y**
- Hero is `<section aria-labelledby="savings-stats-heading">` with a visually-hidden `<h2>` for screen readers ("Birikim özeti").
- KPI numbers use `<span aria-live="polite">` so the count-up animation announces the final value once.
- Progress bar uses `<progress>` semantically — `value`, `max`, `aria-label="Toplam hedef ilerlemesi"`.
- CTA button has explicit `type="button"` and a focus ring (`ring-emerald-500/40`).

**Motion**
- Numbers count up from 0 to target using `motionTransition.smooth` (250 ms). Respect `useMotionEnabled()` — if `false`, just show the final number.
- KPI cards stagger-fade-in on mount (`delay = i * 60 ms`, max 180 ms total).
- Progress bar fills from 0 to %`pct` after numbers settle.

### 4.2 `SavingsLeaderboard` (new)

**Props**
```ts
{
  contributors: Array<{
    walletAddress: string;
    totalAmount: number;
    pct: number; // contributor's % of group total
  }>;
  currency: 'XLM' | 'USDC';
  maxRows?: number; // default 5; "+ N more" link reveals the rest
}
```

**Derivation**
The parent component flattens all `pools[*].contributions` and groups by
`walletAddress`, summing amounts. No new backend endpoint needed — the data
is already in the GET `/savings?groupId=…` response (each pool eagerly
includes its contributions).

**Visual states**
- **3+ contributors.** Top 3 get medal emoji + lighter row background. Rest (up to `maxRows - 3`) render as plain rows. Below `maxRows`, a "+ N more" expand control.
- **1-2 contributors.** Render as 1-2 rows with no medal — the leaderboard is a streak, not a podium.
- **0 contributors.** Whole component returns `null`. Don't render an empty leaderboard.

**A11y**
- `<ol role="list">` so screen readers count rows.
- Medal emoji is decorative (`aria-hidden`); the rank is announced via
  `<span class="sr-only">1.</span>` injected before the address.
- Address shown as `truncateAddress(walletAddress)` (existing helper).

### 4.3 `StatusFilterChips` (new — small)

**Props**
```ts
{
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ALL';
  counts: { ACTIVE: number; COMPLETED: number; CANCELLED: number };
  onChange: (status: …) => void;
}
```

Renders 4 chips. Active chip has `bg-emerald-500/20` + `text-emerald-300` +
`border-emerald-500/30`. Inactive chips use `glass.subtle`.

The previous 3 separate sections (`activePools`, `completedPools`,
`cancelledPools`) collapse into one filtered list driven by this state. The
filtered list animates with `<AnimatePresence mode="popLayout">` so cards
swap smoothly when the user clicks a chip.

### 4.4 `PoolCard` (existing — minor refinements)

Keep the component identity. Two small upgrades:
- **Hover state.** Add `hover:bg-white/[0.04]` + `hover:border-white/[0.1]`
  to the outer wrapper so the card feels selectable. Currently inert.
- **Layout transition.** Wrap the `motion.div` with `layout` prop already
  present, but also add `key={pool.id}` so reorders animate.

No structural prop changes — backwards compatible.

---

## 5. State + behaviour

### Data flow
```
useSavingsPools(groupId)                   ← new hook (thin wrapper around savingsApi.listByGroup)
  │ 
  ├─ pools (BackendSavingsPool[])
  └─ stats (derived):
     ├─ totalCurrent
     ├─ totalGoal
     ├─ activeCount, completedCount, cancelledCount
     └─ contributorRollup (Map<wallet, totalAmount>)
```

The hook caches under `['savings', groupId]` (existing key, no change). Stats
are computed in a `useMemo` so they don't recalc on every render.

### Empty / error / loading

| State | UI |
|---|---|
| `isLoading` first time | `Skeleton` matching hero + 3 pool-card placeholders |
| `isLoading` background refetch | Existing data shown, subtle pulse on hero shadow |
| `isError` from the backend | TabErrorBoundary catches → "couldn't load — Retry" (already wired in `b16ad6b`) |
| `pools.length === 0` | Hero collapses into empty-state form with the CTA |

---

## 6. Accessibility checklist (WCAG 2.1 AA)

- [x] All interactive elements have visible focus rings (existing project convention: indigo / emerald with `ring-2 ring-offset-0`)
- [x] Color contrast ≥ 4.5:1 — emerald-400 on `glass.medium` background passes; check the urgent-deadline rose-400 chip on dark
- [x] Status filter chips use both color AND text label, never color alone
- [x] All numbers in KPI cards include the unit (`XLM` / `USDC`) so currency is obvious without color
- [x] Modals reuse the existing `role="dialog" aria-modal="true" aria-labelledby="…"` pattern (already in place)
- [x] Escape closes both modals (existing behavior, no change)
- [x] Tab order: Hero CTA → Leaderboard expand → Filter chips → Pool cards → Pool actions
- [x] Reduced-motion users: count-up disabled, layout transitions snap, progress bar fills instantly

---

## 7. Internationalisation

New keys to add (4 languages — TR is canonical, EN/DE/ES translated):

```
savings.stats_total_label       "Toplam Birikim" / "Total Saved"
savings.stats_active_label      "Aktif Havuz"    / "Active Pools"
savings.stats_progress_label    "Hedef İlerleme" / "Goal Progress"
savings.leaderboard_title       "En Çok Katkı Verenler" / "Top Contributors"
savings.leaderboard_more        "+{{n}} daha"   / "+{{n}} more"
savings.filter_all              "Tümü"          / "All"
savings.filter_active           "Aktif"         / "Active"
savings.filter_completed        "Tamamlanan"    / "Completed"
savings.filter_cancelled        "İptal"         / "Cancelled"
savings.empty_hero_cta          "İlk havuzu oluştur" / "Create your first pool"
savings.empty_hero_subtitle     "30 saniyede on-chain kanıtla" / "30 seconds, on-chain proof"
```

---

## 8. Engineering handoff

### Files to touch
- **NEW** `frontend/src/components/savings/SavingsStatsHero.tsx`
- **NEW** `frontend/src/components/savings/SavingsLeaderboard.tsx`
- **NEW** `frontend/src/components/savings/StatusFilterChips.tsx`
- **NEW** `frontend/src/components/savings/useSavingsPools.ts` (hook + stats derivation)
- **MODIFIED** `frontend/src/components/SavingsPool.tsx` — orchestrator only (renders the three new pieces + filtered pool list)
- **MODIFIED** `frontend/src/lib/i18n.ts` — 11 new keys × 4 languages

### Tests to add
- `SavingsStatsHero.test.tsx` — KPI rendering, empty data path, motion-disabled path, a11y semantics (`role`, `aria-labelledby`)
- `SavingsLeaderboard.test.tsx` — top-3 with medals, 1-contributor degenerate, 0-contributors returns null, address truncation
- `useSavingsPools.test.ts` — stats derivation, contributor rollup correctness, currency switching

Existing `SavingsPool.test.tsx` (if present) keeps working — only the
orchestrator structure changed; the public API (props) is identical.

### Performance budget
- All three new components together: < 4 KB gzip after tree-shaking
- No new network calls — same `GET /savings?groupId=…`
- Hero count-up animation must run on a `requestAnimationFrame` loop, not a
  React state update per frame; otherwise re-renders cascade through the
  whole tree at 60 fps

---

## 9. Out of scope (deferred)

- Push notifications when goal reached → backend has the hook (`goalReached`
  flag in the contribute response), but UI plumbing is post-MVP
- "Auto-distribute" when goal reached (split the pool back to contributors)
  — future contract entrypoint
- Recurring contributions ("Every Monday, +50 XLM") — overlap with the
  Recurring tab, defer until we unify both surfaces

---

## 10. Sign-off checklist

Before merging:

- [ ] Lighthouse Accessibility score ≥ 95 on the savings tab
- [ ] All new strings have TR/EN/DE/ES translations
- [ ] All new components have unit tests
- [ ] `npx tsc --noEmit` clean
- [ ] Designer or design-savvy reviewer signs off on visual hierarchy
- [ ] No hardcoded colors / radii / spacings — token usage only
- [ ] `prefers-reduced-motion` honored (verify with Chrome DevTools rendering panel)

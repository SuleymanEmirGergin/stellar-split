# ADR-0001 — Savings Pool: Hybrid Source of Truth (Backend Primary, Soroban Best-Effort)

**Status:** Accepted (in production since 2026-04-23, formalised 2026-04-26)
**Deciders:** Birik core team
**Tags:** `savings`, `data-architecture`, `consistency`, `availability`

---

## 1. Context

The savings-pool feature lets group members pool money toward a shared goal (a
trip, a gift, a rent buffer). Two technically valid storage options exist:

1. **Soroban-first** — every pool and contribution is a contract entry,
   queried directly from RPC.
2. **Backend-first** — pools and contributions live in PostgreSQL (Prisma),
   reachable via the `/savings` REST endpoints; the contract holds an
   optional mirrored entry for on-chain proof.

Both options were prototyped during Level 4 / Level 5 work. We need to pick
one **canonical** source of truth so the UI doesn't drift, and document the
trade-offs explicitly so future contributors don't reverse the decision by
accident.

### Forces

- **Read latency.** Soroban `simulateTransaction` against a remote RPC takes
  ~200-400 ms; a Postgres query through Prisma is single-digit ms.
- **Writes need user signature.** Both options need the user to sign a
  Soroban tx if we want on-chain provenance — no way around the wallet
  popup.
- **Cancellable contributions are messy on-chain.** A contract's
  `contribute_pool` entrypoint can't unilaterally void a contribution
  without a separate refund tx. Off-chain, a soft-delete on the row is
  trivial.
- **Discoverability.** Listing all active pools for a group in Soroban means
  a `0..MAX_PROBE` loop because the contract has no enumerable index.
  Backend has `WHERE groupId = ?` with an index.
- **Rich metadata** (notes per contribution, deadline reminders, push
  notifications, leaderboards) is unmodellable in 32-byte ScVal slots.
- **Trust narrative.** "Verifiable on-chain" is a core part of the Birik
  pitch. Pure backend storage feels like Splitwise with extra steps.

---

## 2. Decision

We adopt a **Hybrid: Backend Primary, Soroban Best-Effort** pattern.

### Read path
- **Source of truth:** Postgres (via the `/savings` REST endpoints)
- React Query keys: `['savings', groupId]`, `refetchInterval: 30 s`
- The UI never reads from the contract for savings. Period.

### Write path

```
User → SavingsPool UI
        │
        ├─ Step 1 (synchronous, blocking)
        │  POST /savings (or /savings/:id/contribute) → 201 Created
        │  React Query invalidates ['savings', groupId]
        │  UI shows the new pool / contribution immediately
        │
        └─ Step 2 (asynchronous, non-blocking)
           createSavingsPool() / contributeToPool() — Soroban tx
           ├─ success → on-chain proof is written, no UI change
           └─ failure → console.warn + toast "saved locally; on-chain sync
                        failed", UI state untouched
```

The Soroban call is **fire-and-forget after the backend write succeeds**.
The user already saw their action take effect; the contract write is for
future audit / dispute / recovery.

### Why this shape

| Requirement | Backend-only | Soroban-only | Hybrid (chosen) |
|---|---|---|---|
| Sub-100 ms read latency | ✅ | ❌ (200–400 ms RPC) | ✅ |
| Wallet signature on writes | ❌ (no on-chain) | ✅ | ✅ |
| Listing all pools | ✅ (indexed) | ❌ (no enum) | ✅ |
| On-chain provenance | ❌ | ✅ | ✅ (best-effort) |
| Backend outage tolerance | ❌ | ✅ | ⚠️ (degraded — see §4) |
| Rich metadata (notes, status enum) | ✅ | ❌ | ✅ |
| Soft-delete / cancel | ✅ | ❌ (irreversible) | ✅ |

The hybrid loses to Soroban-only in one dimension — backend outage
tolerance — but we already mitigate that via the daily Postgres backup
+ DLQ + emergency-pause rollback playbook (`docs/ROLLBACK_PLAYBOOK.md`).
Trading a low-likelihood outage scenario for sub-100 ms reads and rich
metadata everywhere else is the right call.

---

## 3. Consequences

### Positive
- **Frontend code is simple.** One hook (`useQuery({ queryKey: ['savings', …]
  })`), one mutation per action, predictable invalidations.
- **The "settle pool when goal is reached" automation** can run server-side
  via a BullMQ job — it doesn't need a wallet signature because the
  contract write was already done at contribution time.
- **A11y / loading states / error recovery** are normal HTTP-shaped
  problems, not contract-shaped problems.

### Negative
- **Possible drift** between backend and on-chain state if a Soroban tx
  succeeds but the backend write fails (extremely rare, but possible if
  someone calls the contract directly via stellar-cli). We treat the
  backend as source of truth; the contract entry becomes orphaned but
  doesn't break anything.
- **Backend outage** means savings tab shows "loading…" indefinitely.
  Mitigation: TabErrorBoundary catches the failed query, shows
  "couldn't load — Retry" instead of crashing the whole GroupDetail
  (added 2026-04-26 in `b16ad6b`).
- **Demo mode** has to fork — `SocialSavings.tsx` is the offline-first
  fallback rendered in `tab === 'savings' && !hasJwt`.

### Neutral
- The contract's `create_savings_pool` and `contribute_pool` entrypoints
  remain in `stellar_split.wasm` and are still admin-guarded. They're
  best-effort writes from the frontend, not user-facing UX gates.

---

## 4. Compliance & Recovery

### Compliance with `docs/architecture/SYSTEM_OVERVIEW.md`
This ADR refines the system diagram's "PostgreSQL ← API" arrow for the
savings module: the arrow is **bidirectional read+write**, not just write.

### Recovery procedure (drift between backend and chain)
1. Detect via cron job: `SELECT COUNT(*) FROM SavingsPool` vs.
   `get_savings_pool(group_id)` for all groups (planned, not yet automated).
2. If divergence detected: emit a `savings_drift_detected` audit log entry.
3. Manual reconciliation tool (planned): replay the Postgres ledger as
   contract calls signed by the admin key.
4. Soft-deleted rows are NEVER replayed — cancellation is intentional.

---

## 5. Alternatives Rejected

### Alt A — Soroban-first
Rejected because the "list active pools per group" path requires probing
expense IDs sequentially, which costs RPC bandwidth and latency. Also no
notes, no soft-delete, and SDK quirks (`TimeBounds has to be set`) make
read-only flows noisy.

### Alt B — Pure backend (no Soroban write)
Rejected because it removes the on-chain provenance narrative. A judge
asking "where on Soroban Expert can I see this savings pool?" would have
no answer. The hybrid lets us point at a real contract event log for
arbitrary pools.

### Alt C — Event-sourced (Soroban events → backend projection)
Considered for V2 once `/api/v1/admin/replay` exists. For now we don't have
event polling for `pool_*` events — we'd need to add `pool_created`,
`pool_contributed`, `pool_completed` events to the contract first. Tracked
in `docs/SPLT_TOKEN_SPEC.md` as part of the longer-term roadmap.

---

## 6. References

- Backend implementation — `backend/src/savings/` (controller, service, DTOs)
- Frontend implementation — `frontend/src/components/SavingsPool.tsx`
  (line 80 — backend mutation; line 84 — best-effort Soroban call)
- Contract entrypoints — `contracts/stellar_split/src/lib.rs::create_savings_pool`
- Off-chain schema — `backend/prisma/schema.prisma::SavingsPool` + `SavingsContribution`

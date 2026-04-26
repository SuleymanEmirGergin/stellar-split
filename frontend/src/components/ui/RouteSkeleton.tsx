/**
 * Route-aware skeleton fallback for React.lazy + Suspense boundaries.
 *
 * Replaces the previous "centered Zap spinner" fallback with a layout
 * that mirrors the destination page's structural shape — header strip,
 * KPI cards, content blocks. The result: when a slow chunk takes 200+
 * ms to fetch, users see something that feels like the page already
 * loading (cumulative-layout-shift-friendly), not a wait spinner that
 * gets replaced by a totally different DOM tree.
 *
 * Five variants:
 *   - dashboard      → 3 KPI cards + chart row + group list rows
 *   - groupDetail    → header + tab rail + content area
 *   - referral       → hero + stats grid
 *   - reputation     → hero + stat tiles
 *   - generic        → 3 stacked rectangles (default fallback)
 *
 * Picked at the call site so each lazy import in App.tsx can pass its
 * own variant. Unknown variant falls back to "generic" so adding new
 * routes never crashes Suspense.
 */

import { SkeletonShimmer } from './SkeletonShimmer';

export type RouteSkeletonVariant =
  | 'dashboard'
  | 'groupDetail'
  | 'referral'
  | 'reputation'
  | 'generic';

interface RouteSkeletonProps {
  variant?: RouteSkeletonVariant;
}

export function RouteSkeleton({ variant = 'generic' }: RouteSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="w-full max-w-[1600px] mx-auto p-6 md:p-8 xl:px-12 2xl:px-16"
    >
      <span className="sr-only">Loading…</span>
      {variant === 'dashboard' && <DashboardSkeleton />}
      {variant === 'groupDetail' && <GroupDetailSkeleton />}
      {variant === 'referral' && <ReferralSkeleton />}
      {variant === 'reputation' && <ReputationSkeleton />}
      {variant === 'generic' && <GenericSkeleton />}
    </div>
  );
}

// ── Variants ────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* "Welcome / wallet" header strip */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md space-y-2">
          <SkeletonShimmer className="h-7 w-40" rounded="lg" />
          <SkeletonShimmer className="h-3 w-32" rounded="md" />
        </div>
        <SkeletonShimmer className="h-10 w-28" rounded="2xl" />
      </div>

      {/* 3 KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <SkeletonShimmer key={i} className="h-24" rounded="2xl" />
        ))}
      </div>

      {/* Global Network Impact card */}
      <SkeletonShimmer className="h-44" rounded="3xl" />

      {/* Network stats row (4 tiles) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonShimmer key={i} className="h-24" rounded="2xl" />
        ))}
      </div>

      {/* Two charts side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SkeletonShimmer className="h-56" rounded="2xl" />
        <SkeletonShimmer className="h-56" rounded="2xl" />
      </div>
    </div>
  );
}

function GroupDetailSkeleton() {
  return (
    <div className="space-y-5">
      {/* Group header strip */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SkeletonShimmer className="h-12 w-12" rounded="2xl" />
          <div className="space-y-2">
            <SkeletonShimmer className="h-5 w-48" rounded="md" />
            <SkeletonShimmer className="h-3 w-24" rounded="md" />
          </div>
        </div>
        <SkeletonShimmer className="h-9 w-24" rounded="2xl" />
      </div>

      {/* Tabs strip + content split */}
      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5">
        {/* Sidebar of 12 tabs */}
        <div className="space-y-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonShimmer key={i} className="h-9 w-full" rounded="xl" />
          ))}
        </div>
        {/* Tab content area */}
        <div className="space-y-3">
          <SkeletonShimmer className="h-32" rounded="2xl" />
          <SkeletonShimmer className="h-20" rounded="2xl" />
          <SkeletonShimmer className="h-20" rounded="2xl" />
        </div>
      </div>
    </div>
  );
}

function ReferralSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero with referral code */}
      <SkeletonShimmer className="h-44" rounded="3xl" />

      {/* Three stat tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <SkeletonShimmer key={i} className="h-28" rounded="2xl" />
        ))}
      </div>

      {/* Wallet rewards row */}
      <SkeletonShimmer className="h-32" rounded="3xl" />

      {/* Invitation history */}
      <SkeletonShimmer className="h-48" rounded="3xl" />
    </div>
  );
}

function ReputationSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <SkeletonShimmer className="h-32" rounded="3xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonShimmer key={i} className="h-24" rounded="2xl" />
        ))}
      </div>
      <SkeletonShimmer className="h-64" rounded="3xl" />
    </div>
  );
}

function GenericSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonShimmer className="h-8 w-48" rounded="md" />
      <SkeletonShimmer className="h-32" rounded="2xl" />
      <SkeletonShimmer className="h-32" rounded="2xl" />
    </div>
  );
}

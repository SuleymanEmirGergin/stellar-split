export default function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-muted/60 animate-pulse rounded ${className}`} />
  );
}

export function GroupCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex flex-col gap-2">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-20 h-3" />
          </div>
        </div>
        <Skeleton className="w-6 h-6 rounded-full" />
      </div>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center gap-2">
      <Skeleton className="w-8 h-8 rounded-full" />
      <Skeleton className="w-12 h-5" />
      <Skeleton className="w-16 h-3" />
    </div>
  );
}

export function ExpenseRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-white/10 rounded-full w-3/4" />
        <div className="h-2.5 bg-white/5 rounded-full w-1/2" />
      </div>
      <div className="w-16 h-6 bg-white/10 rounded-lg shrink-0" />
    </div>
  )
}

export function MemberRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
      <div className="flex-1 h-3 bg-white/10 rounded-full w-2/3" />
      <div className="w-20 h-5 bg-white/5 rounded-lg shrink-0" />
    </div>
  )
}

export function BalanceCardSkeleton() {
  return (
    <div className="bg-card/50 border border-white/5 rounded-2xl p-4 animate-pulse space-y-2">
      <div className="h-7 bg-white/10 rounded-lg w-24" />
      <div className="h-3 bg-white/5 rounded-full w-16" />
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-card/50 border border-white/5 rounded-2xl p-4 animate-pulse">
      <div className="h-3 bg-white/10 rounded-full w-24 mb-4" />
      <div className="flex items-end gap-2 h-32">
        {[60, 85, 45, 70, 55, 90, 40].map((h, i) => (
          <div key={i} className="flex-1 bg-white/10 rounded-t-lg" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

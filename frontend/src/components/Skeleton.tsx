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

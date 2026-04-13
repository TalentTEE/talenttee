export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-border/10 bg-card p-6 space-y-4 animate-pulse">
      <div className="h-4 w-1/3 bg-muted rounded-lg" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-muted rounded-lg"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 4, lines = 3 }: { count?: number; lines?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}

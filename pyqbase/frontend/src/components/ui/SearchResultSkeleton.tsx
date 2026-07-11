/**
 * Skeleton loader that mirrors the exact shape of a SearchResultCard.
 * Uses animate-pulse for a smooth shimmer effect.
 */
export function SearchResultSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 animate-pulse">
      {/* Header badges */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-20 rounded-full bg-muted" />
        <div className="h-5 w-12 rounded-full bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
        <div className="ml-auto h-4 w-8 rounded bg-muted" />
      </div>
      {/* Question stem */}
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-[90%] rounded bg-muted" />
        <div className="h-4 w-[70%] rounded bg-muted" />
      </div>
      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-7 w-28 rounded-full bg-muted" />
      </div>
    </div>
  )
}

export function SearchResultSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SearchResultSkeleton key={i} />
      ))}
    </div>
  )
}

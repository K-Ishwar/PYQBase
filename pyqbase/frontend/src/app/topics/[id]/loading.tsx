export default function TopicLoading() {
  return (
    <div className="container py-10 flex flex-col md:flex-row gap-8 animate-pulse">
      {/* Sidebar Skeleton */}
      <div className="w-full md:w-64 shrink-0 space-y-6">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="h-6 w-32 bg-muted rounded mb-4" />
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end justify-between bg-card p-4 rounded-xl border shadow-sm">
          <div className="h-10 w-full sm:w-64 bg-muted rounded" />
          <div className="h-10 w-full sm:w-32 bg-muted rounded" />
        </div>

        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

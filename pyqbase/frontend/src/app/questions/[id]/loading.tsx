export default function QuestionLoading() {
  return (
    <div className="container py-10 max-w-4xl space-y-8 animate-pulse">
      {/* Navigation Skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-6 w-32 bg-muted rounded"></div>
        <div className="flex gap-4">
          <div className="h-9 w-20 bg-muted rounded-md"></div>
          <div className="h-9 w-20 bg-muted rounded-md"></div>
        </div>
      </div>

      {/* Question Details Skeleton */}
      <div className="rounded-xl border bg-card p-8 shadow-sm space-y-6">
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-muted rounded-md"></div>
          <div className="h-6 w-16 bg-muted rounded-md"></div>
        </div>
        
        <div className="space-y-3">
          <div className="h-6 bg-muted rounded w-full"></div>
          <div className="h-6 bg-muted rounded w-5/6"></div>
        </div>

        <div className="space-y-3 pt-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded-lg w-full"></div>
          ))}
        </div>
      </div>

      {/* Solution Section Skeleton */}
      <div className="rounded-xl border bg-card p-8 shadow-sm space-y-4">
        <div className="h-6 w-32 bg-muted rounded mb-6"></div>
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-5/6"></div>
        <div className="h-4 bg-muted rounded w-4/6"></div>
      </div>
    </div>
  )
}

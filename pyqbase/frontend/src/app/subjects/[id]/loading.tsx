export default function SubjectLoading() {
  return (
    <div className="container py-10 space-y-8 animate-pulse">
      <div className="flex items-center gap-4 mb-10">
        <div className="p-3 bg-muted rounded-xl h-14 w-14"></div>
        <div className="space-y-2">
          <div className="h-10 w-64 bg-muted rounded"></div>
          <div className="h-4 w-40 bg-muted rounded"></div>
        </div>
      </div>
      <div className="h-[400px] w-full bg-muted rounded-xl"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-xl"></div>
        ))}
      </div>
    </div>
  )
}

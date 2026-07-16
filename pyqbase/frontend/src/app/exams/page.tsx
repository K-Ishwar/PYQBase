import Link from "next/link"

export default function ExamsPage() {
  const EXAMS = [
    { id: "upsc-cse", name: "UPSC Civil Services", description: "General Studies Paper 1 & 2" },
    { id: "upsc-capf", name: "UPSC CAPF", description: "Central Armed Police Forces" },
    { id: "mpsc-rajyseva", name: "MPSC Rajyseva", description: "Maharashtra Public Service Commission" },
    { id: "upsc-cds", name: "UPSC CDS", description: "Combined Defence Services" },
  ]

  return (
    <div className="container py-10">
      <h1 className="text-4xl font-extrabold tracking-tight mb-8">All <span className="text-primary">Exams</span></h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {EXAMS.map(exam => (
          <Link href={`/exams/${exam.id}`} key={exam.id} className="block group">
            <div className="p-6 rounded-2xl border bg-card hover:border-primary/50 transition-all shadow-sm group-hover:shadow-md h-full flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">{exam.name}</h3>
                <p className="text-muted-foreground">{exam.description}</p>
              </div>
              <div className="mt-6 text-sm font-medium text-primary">Browse questions &rarr;</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

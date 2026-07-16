import Link from "next/link"
import { Calendar } from "lucide-react"

export default async function YearsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
  
  let exams: string[] = []
  try {
    const res = await fetch(`${apiUrl}/api/v1/analytics/exams`, { next: { revalidate: 60 } })
    if (res.ok) exams = await res.json()
  } catch (error) {
    console.error("Failed to fetch exams", error)
  }

  // Fetch years for each exam
  const examDataList = await Promise.all(exams.map(async (examName) => {
    let years: number[] = []
    try {
      const res = await fetch(`${apiUrl}/api/v1/analytics/exams/${encodeURIComponent(examName)}`, { next: { revalidate: 60 } })
      if (res.ok) {
        const data = await res.json()
        years = data.available_years
      }
    } catch (e) {
      console.error(`Failed to fetch stats for ${examName}`, e)
    }
    return { name: examName, id: examName, years }
  }))

  return (
    <div className="container py-10 max-w-5xl">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">
          Browse by <span className="text-primary">Year</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Select an exam and year to explore historical questions.
        </p>
      </div>

      <div className="space-y-8">
        {examDataList.length === 0 && (
          <div className="text-center text-muted-foreground p-10 bg-card rounded-2xl border">
            No exams with questions found in the database.
          </div>
        )}
        {examDataList.map(exam => (
          <div key={exam.id} className="bg-card border rounded-2xl p-8 shadow-sm">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              {exam.name}
              <span className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                {exam.years.length} Years Available
              </span>
            </h3>
            {exam.years.length === 0 ? (
              <div className="text-sm text-muted-foreground">No questions found for this exam.</div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {exam.years.map(year => (
                  <Link 
                    href={`/years/${year}?exam=${exam.id}`} 
                    key={year}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl border bg-background hover:border-primary hover:text-primary transition-all shadow-sm hover:shadow-md"
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="font-bold">{year}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

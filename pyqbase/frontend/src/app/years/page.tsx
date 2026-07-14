import Link from "next/link"
import { Calendar } from "lucide-react"

export default function YearsPage() {
  const EXAMS = [
    { id: "UPSC CSE", name: "UPSC Civil Services", years: [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015] },
    { id: "UPSC CAPF", name: "UPSC CAPF", years: [2026, 2025, 2024, 2023, 2022, 2021, 2020] },
    { id: "MPSC Rajyseva", name: "MPSC Rajyseva", years: [2026, 2025, 2024, 2023, 2022] },
    { id: "UPSC CDS", name: "UPSC CDS", years: [2026, 2025, 2024, 2023, 2022] },
  ]

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
        {EXAMS.map(exam => (
          <div key={exam.id} className="bg-card border rounded-2xl p-8 shadow-sm">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              {exam.name}
              <span className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                {exam.years.length} Years Available
              </span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {exam.years.map(year => (
                <Link 
                  href={`/search?exam=${exam.id}&year=${year}`} 
                  key={year}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border bg-background hover:border-primary hover:text-primary transition-all shadow-sm hover:shadow-md"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="font-bold">{year}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

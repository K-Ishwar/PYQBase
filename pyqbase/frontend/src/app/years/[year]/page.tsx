import Link from "next/link"
import { ArrowLeft, Calendar } from "lucide-react"
import { YearQuestionList } from "./YearQuestionList"

export default function YearPage({ params }: { params: { year: string } }) {
  const year = parseInt(params.year)

  if (isNaN(year)) {
    return <div className="container py-10 text-center text-destructive">Invalid Year</div>
  }

  return (
    <div className="container py-10 max-w-5xl">
      <div className="mb-8">
        <Link href="/years" className="text-muted-foreground hover:text-foreground flex items-center gap-2 mb-4 text-sm w-fit transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Years
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">{year} Questions</h1>
              <p className="text-muted-foreground">All historical questions asked in {year}</p>
            </div>
          </div>
        </div>
      </div>

      <YearQuestionList year={year} />
    </div>
  )
}

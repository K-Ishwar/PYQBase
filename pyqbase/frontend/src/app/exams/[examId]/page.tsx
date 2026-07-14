import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, BookOpen, Clock, Target, ShieldCheck, Landmark, Briefcase, Compass } from "lucide-react"
import { SpotlightCard } from "@/components/ui/SpotlightCard"
import { MagneticButton } from "@/components/ui/MagneticButton"

const EXAM_DATA = {
  "upsc-cse": {
    name: "UPSC Civil Services",
    id: "UPSC CSE",
    description: "The most prestigious civil service examination in India.",
    stats: "15,200+ PYQs",
    icon: <Landmark className="w-12 h-12 text-primary" />,
    years: [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013],
    subjects: ["Polity", "History", "Geography", "Economy", "Environment", "Science & Tech"]
  },
  "upsc-capf": {
    name: "UPSC CAPF",
    id: "UPSC CAPF",
    description: "Central Armed Police Forces Assistant Commandant Examination.",
    stats: "5,400+ PYQs",
    icon: <ShieldCheck className="w-12 h-12 text-green-500" />,
    years: [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016],
    subjects: ["General Ability", "Intelligence", "Essay", "Comprehension"]
  },
  "mpsc-rajyseva": {
    name: "MPSC Rajyseva",
    id: "MPSC Rajyseva",
    description: "Maharashtra State Services Examination.",
    stats: "8,100+ PYQs",
    icon: <Briefcase className="w-12 h-12 text-orange-500" />,
    years: [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017],
    subjects: ["History of Maharashtra", "Geography of Maharashtra", "Indian Polity", "Economy"]
  },
  "upsc-cds": {
    name: "UPSC CDS",
    id: "UPSC CDS",
    description: "Combined Defence Services Examination.",
    stats: "6,800+ PYQs",
    icon: <Compass className="w-12 h-12 text-red-500" />,
    years: [2024, 2023, 2022, 2021, 2020, 2019, 2018],
    subjects: ["English", "General Knowledge", "Elementary Mathematics"]
  }
}

export default async function ExamDashboardPage({ params }: { params: { examId: string } }) {
  const exam = EXAM_DATA[params.examId as keyof typeof EXAM_DATA]

  if (!exam) {
    notFound()
  }

  // Fetch live stats from backend
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
  let liveStats = { total_questions: 0, available_years: [] as number[] }
  let liveSubjects: string[] = []
  
  try {
    const res = await fetch(`${apiUrl}/api/v1/analytics/exams/${encodeURIComponent(exam.id)}`, {
      next: { revalidate: 60 } // Cache for 60 seconds
    })
    if (res.ok) {
      liveStats = await res.json()
    }

    const subRes = await fetch(`${apiUrl}/api/v1/analytics/exams/${encodeURIComponent(exam.id)}/subjects`, {
      next: { revalidate: 60 }
    })
    if (subRes.ok) {
      liveSubjects = await subRes.json()
    }
  } catch (error) {
    console.error("Failed to fetch exam stats:", error)
  }

  // Fallback to empty array if no live years exist yet
  const displayYears = liveStats.available_years.length > 0 ? liveStats.available_years : []

  return (
    <div className="container py-10 max-w-6xl mx-auto space-y-20">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden glass p-10 md:p-16 flex flex-col md:flex-row items-center gap-10">
        <div className="absolute inset-0 mesh-bg opacity-30 z-0"></div>
        <div className="z-10 bg-card/80 p-6 rounded-2xl shadow-lg border border-black/5 dark:border-white/5 backdrop-blur-md">
          {exam.icon}
        </div>
        <div className="z-10 flex-1 text-center md:text-left">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            {liveStats.total_questions.toLocaleString()} PYQs Available
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-4">{exam.name}</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl">{exam.description}</p>
          
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <MagneticButton className="rounded-xl shadow-md shadow-primary/20 hover:shadow-lg transition-shadow bg-primary">
              <Link href={`/search?exam=${exam.id}`} className="px-6 py-3 flex items-center gap-2 text-sm font-bold text-primary-foreground hover:bg-primary-dark transition-colors rounded-xl">
                <Target className="w-4 h-4" />
                Search All PYQs
              </Link>
            </MagneticButton>
            <MagneticButton className="rounded-xl shadow-md shadow-secondary/20 hover:shadow-lg transition-shadow bg-secondary">
              <Link href={`/mock-tests`} className="px-6 py-3 flex items-center gap-2 text-sm font-bold text-secondary-foreground hover:bg-secondary/90 transition-colors rounded-xl">
                <Clock className="w-4 h-4" />
                Take Mock Test
              </Link>
            </MagneticButton>
          </div>
        </div>
      </section>

      {/* Browse by Year */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Browse by Year</h2>
            <p className="text-muted-foreground">Select a year to view all questions from that exam.</p>
          </div>
        </div>
        
        {displayYears.length === 0 ? (
          <div className="text-muted-foreground p-4 bg-card rounded-xl border">No questions available for this exam yet.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayYears.map((year) => (
              <SpotlightCard key={year}>
                <Link
                  href={`/search?exam=${exam.id}&year=${year}`}
                  className="group flex flex-col items-center justify-center p-6 bg-card h-full w-full rounded-2xl relative"
                >
                  <span className="text-2xl font-black group-hover:text-primary transition-colors">{year}</span>
                  <span className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all font-bold flex items-center gap-1">
                    View <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </SpotlightCard>
            ))}
          </div>
        )}
      </section>

      {/* Browse by Subject */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Key Subjects</h2>
            <p className="text-muted-foreground">Focus your preparation on high-yield topics.</p>
          </div>
        </div>
        
        
        {liveSubjects.length === 0 ? (
          <div className="text-muted-foreground p-4 bg-card rounded-xl border">No subjects available for this exam yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {liveSubjects.map((subject) => (
              <Link
                key={subject}
                href={`/search?exam=${exam.id}&q=${subject}`}
                className="group flex items-center p-5 rounded-2xl border bg-card hover:border-primary/50 transition-all shadow-sm group-hover:shadow-md"
              >
                <div className="bg-primary/10 text-primary p-3 rounded-xl mr-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex-1 font-bold">{subject}</div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transform group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

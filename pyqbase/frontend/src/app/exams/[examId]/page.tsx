import Link from "next/link"
import { notFound } from "next/navigation"
import { Target, Landmark, ShieldCheck, Briefcase, Compass, BookOpen, CheckCircle, Clock } from "lucide-react"
import { MagneticButton } from "@/components/ui/MagneticButton"

async function getExamInfo(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'}/api/v1/taxonomy/exams`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const exams = await res.json();
    return exams.find((e: any) => e.slug === slug);
  } catch (e) {
    return null;
  }
}

export default async function ExamInfoPage({ params }: { params: { examId: string } }) {
  const dbExam = await getExamInfo(params.examId)
  const fallbackName = params.examId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  const exam = {
    name: dbExam?.name || fallbackName,
    id: dbExam?.name || fallbackName,
    description: dbExam?.description || `Explore previous year questions, practice tests, and detailed analytics for ${dbExam?.name || fallbackName}.`,
    icon: <BookOpen className="w-12 h-12 text-primary" />,
    overview: dbExam?.overview || {
      frequency: "Varies",
      mode: "Online / Offline",
      stages: "Check official notification"
    },
    pattern: dbExam?.pattern || [
      { stage: "General Overview", details: `Please refer to the official notification for the detailed exam pattern.` }
    ],
    eligibility: dbExam?.eligibility || [
      `Please check the official website for specific eligibility criteria.`
    ]
  }

  return (
    <div className="container py-10 max-w-5xl mx-auto space-y-16">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden glass p-10 md:p-16 flex flex-col md:flex-row items-center gap-10 border border-primary/10">
        <div className="absolute inset-0 mesh-bg opacity-20 z-0"></div>
        <div className="z-10 bg-card/80 p-8 rounded-3xl shadow-xl border border-black/5 dark:border-white/5 backdrop-blur-md">
          {exam.icon}
        </div>
        <div className="z-10 flex-1 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{exam.name}</h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl leading-relaxed">
            {exam.description}
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <MagneticButton className="rounded-xl shadow-md shadow-primary/20 hover:shadow-lg transition-shadow bg-primary">
              <Link href={`/exams/${params.examId}/practice`} className="px-8 py-4 flex items-center gap-3 text-base font-bold text-primary-foreground hover:bg-primary-dark transition-colors rounded-xl">
                <Target className="w-5 h-5" />
                Start Practicing PYQs
              </Link>
            </MagneticButton>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-12">
          {/* Exam Pattern */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Exam Pattern</h2>
            </div>
            <div className="space-y-4">
              {exam.pattern.map((p, idx) => (
                <div key={idx} className="bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-xl font-bold mb-2 text-primary">{p.stage}</h3>
                  <p className="text-muted-foreground">{p.details}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Eligibility */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Eligibility Criteria</h2>
            </div>
            <div className="bg-card border rounded-2xl p-8 shadow-sm">
              <ul className="space-y-4">
                {exam.eligibility.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
                    <span className="text-muted-foreground leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <section className="bg-secondary/30 rounded-3xl p-8 border border-secondary">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Quick Overview
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Frequency</p>
                <p className="font-bold">{exam.overview.frequency}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Mode of Exam</p>
                <p className="font-bold">{exam.overview.mode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Stages</p>
                <p className="font-bold">{exam.overview.stages}</p>
              </div>
            </div>
          </section>
          
          <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10 text-center">
            <h3 className="font-bold text-lg mb-4">Ready to test your knowledge?</h3>
            <Link href={`/exams/${params.examId}/practice`} className="inline-flex w-full justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors shadow-sm">
              Access PYQ Bank
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

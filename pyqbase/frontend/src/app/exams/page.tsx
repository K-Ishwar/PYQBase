'use client'

import { usePublicExams } from '@/lib/hooks/useTaxonomy'
import { ExamCard } from '@/components/ui/ExamCard'
import { Shield, BookOpen, GraduationCap, Landmark, Loader2 } from 'lucide-react'

// Map icon strings from DB to actual lucide-react icons
const iconMap: Record<string, React.ReactNode> = {
  'landmark': <Landmark className="h-8 w-8" />,
  'shield': <Shield className="h-8 w-8" />,
  'book-open': <BookOpen className="h-8 w-8" />,
  'graduation-cap': <GraduationCap className="h-8 w-8" />,
}

export default function ExamsPage() {
  const { data: exams, isLoading } = usePublicExams()

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container py-12 max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Available Exams</h1>
        <p className="text-muted-foreground">
          Select an exam to view syllabus topics and previous year questions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {exams?.map((exam) => (
          <ExamCard
            key={exam.id}
            title={exam.name}
            description={exam.description || 'View previous year questions'}
            icon={exam.icon ? (iconMap[exam.icon] || <BookOpen className="h-8 w-8" />) : <BookOpen className="h-8 w-8" />}
            href={`/exams/${exam.slug}`}
          />
        ))}
      </div>
    </div>
  )
}

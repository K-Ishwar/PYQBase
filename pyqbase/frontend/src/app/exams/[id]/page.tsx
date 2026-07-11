'use client'

import { usePublicExam, usePublicSubjects } from '@/lib/hooks/useTaxonomy'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Landmark, Shield, BookOpen, GraduationCap, Loader2, Calendar, FileText, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const iconMap: Record<string, React.ReactNode> = {
  'landmark': <Landmark className="h-12 w-12 text-primary" />,
  'shield': <Shield className="h-12 w-12 text-primary" />,
  'book-open': <BookOpen className="h-12 w-12 text-primary" />,
  'graduation-cap': <GraduationCap className="h-12 w-12 text-primary" />,
}

export default function ExamDetailsPage({ params }: { params: { id: string } }) {
  const { id: slug } = params
  
  const { data: exam, isLoading: examLoading, isError } = usePublicExam(slug)
  const { data: subjects, isLoading: subjectsLoading } = usePublicSubjects()

  if (examLoading || subjectsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError || !exam) {
    return (
      <div className="flex h-[50vh] items-center justify-center flex-col gap-4">
        <h2 className="text-2xl font-bold">Exam Not Found</h2>
        <Link href="/exams" className="text-primary hover:underline">
          Return to Exams
        </Link>
      </div>
    )
  }

  return (
    <div className="container py-12 max-w-6xl mx-auto space-y-12">
      {/* Header Section */}
      <div className="flex items-start gap-6 border-b pb-8">
        <div className="bg-primary/10 p-4 rounded-xl">
          {exam.icon ? (iconMap[exam.icon] || <BookOpen className="h-12 w-12 text-primary" />) : <BookOpen className="h-12 w-12 text-primary" />}
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{exam.name}</h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            {exam.description || 'Explore previous year questions and syllabus for this exam.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Subjects */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Subjects Breakdown</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjects?.map((subject: any) => (
              <Link key={subject.id} href={`/subjects/${subject.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}>
                <Card className="hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer h-full">
                  <CardHeader className="p-4 flex flex-row items-center gap-4 space-y-0">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{subject.name}</CardTitle>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column: Papers Timeline */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Past Papers</h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" /> Recent Papers
              </CardTitle>
              <CardDescription>Practice specific years</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[2023, 2022, 2021, 2020].map((year) => (
                <div key={year} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{exam.name} {year}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
              <div className="pt-4">
                <Link href="/mock-tests" className="w-full inline-flex justify-center items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4">
                  Take Full Mock Test
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

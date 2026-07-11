'use client'

import { usePublicSubjects } from '@/lib/hooks/useTaxonomy'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function SubjectsPage() {
  const { data: subjects, isLoading } = usePublicSubjects()

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
        <h1 className="text-3xl font-bold tracking-tight">Browse Subjects</h1>
        <p className="text-muted-foreground">
          Dive deep into topic-wise previous year questions across all subjects.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {subjects?.map((subject: any) => (
          <Link key={subject.id} href={`/subjects/${subject.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}>
            <Card className="hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer h-full">
              <CardHeader className="p-6 flex flex-row items-center gap-4 space-y-0">
                <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl leading-tight">{subject.name}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

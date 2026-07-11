'use client'

import { useState } from 'react'
import { usePublicSubjects, usePublicTopics } from '@/lib/hooks/useTaxonomy'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Loader2, BookOpen, Search, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

function TopicList({ subjectId, subjectName }: { subjectId: string, subjectName: string }) {
  const { data: topics, isLoading } = usePublicTopics(subjectId)

  if (isLoading) {
    return <div className="p-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  if (!topics || topics.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No topics found for this subject.</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 pt-0">
      {topics.map((topic: any) => (
        <Link 
          key={topic.id} 
          href={`/topics/${topic.id}`}
          className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors border border-transparent hover:border-border"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{topic.name}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-50" />
        </Link>
      ))}
    </div>
  )
}

export default function TopicsIndexPage() {
  const { data: subjects, isLoading } = usePublicSubjects()
  const [searchQuery, setSearchQuery] = useState('')

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Basic client-side filter for subjects
  const filteredSubjects = subjects?.filter((s: any) => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container py-12 max-w-4xl mx-auto space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Topics Index</h1>
        <p className="text-muted-foreground">
          Browse our entire taxonomy of topics grouped by subject. Expand a subject to view its topics.
        </p>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter subjects..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Accordion type="multiple" className="w-full bg-card rounded-xl border">
        {filteredSubjects?.map((subject: any) => (
          <AccordionItem key={subject.id} value={subject.id} className="last:border-0 px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-md">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold text-lg">{subject.name}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <TopicList subjectId={subject.id} subjectName={subject.name} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

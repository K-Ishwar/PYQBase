'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, Search, ArrowRight } from 'lucide-react'
import { usePublicSubtopics } from '@/lib/hooks/useTaxonomy'
import { useSearch } from '@/lib/hooks/useSearch'
import Link from 'next/link'

export default function TopicPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URL state
  const [exam, setExam] = useState(searchParams.get('exam') || '')
  const [year, setYear] = useState(searchParams.get('year') || '')
  const [sort, setSort] = useState(searchParams.get('sort') || 'recent')
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10))
  const limit = 20
  
  // Keep URL in sync
  useEffect(() => {
    const params = new URLSearchParams()
    if (exam) params.set('exam', exam)
    if (year) params.set('year', year)
    if (sort) params.set('sort', sort)
    params.set('page', page.toString())
    router.replace(`/topics/${id}?${params.toString()}`)
  }, [exam, year, sort, page, id, router])

  const { data: subtopics, isLoading: isLoadingSubtopics } = usePublicSubtopics(id)
  
  const { data: searchResults, isLoading: isLoadingSearch } = useSearch({
    query: '',
    topic_id: id,
    exam: exam || undefined,
    year: year ? parseInt(year, 10) : undefined,
    sort,
    limit,
    offset: (page - 1) * limit,
  })

  // To perfectly maintain state when navigating to Question detail, we pass the current URL params.
  const currentQueryParams = new URLSearchParams({
    topic_id: id,
    exam,
    year,
    sort,
    limit: limit.toString(),
    offset: ((page - 1) * limit).toString()
  }).toString()

  return (
    <div className="container py-10 flex flex-col md:flex-row gap-8">
      {/* Sidebar: Subtopics */}
      <div className="w-full md:w-64 shrink-0 space-y-6">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Subtopics
          </h3>
          {isLoadingSubtopics ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {subtopics?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subtopics found.</p>
              ) : (
                subtopics?.map((subtopic) => (
                  <div key={subtopic.id} className="text-sm p-2 hover:bg-muted rounded cursor-pointer transition-colors">
                    {subtopic.name}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Questions */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end justify-between bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex gap-4 w-full sm:w-auto">
            <div className="space-y-1.5 flex-1 sm:flex-none">
              <label className="text-xs font-semibold text-muted-foreground">Exam</label>
              <select 
                value={exam}
                onChange={(e) => { setExam(e.target.value); setPage(1); }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="">All Exams</option>
                <option value="UPSC">UPSC</option>
                <option value="UPPSC">UPPSC</option>
              </select>
            </div>
            
            <div className="space-y-1.5 flex-1 sm:flex-none">
              <label className="text-xs font-semibold text-muted-foreground">Year</label>
              <select 
                value={year}
                onChange={(e) => { setYear(e.target.value); setPage(1); }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="">All Years</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-1.5 w-full sm:w-auto">
            <label className="text-xs font-semibold text-muted-foreground">Sort By</label>
            <select 
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="recent">Most Recent</option>
              <option value="relevance">Relevance</option>
            </select>
          </div>
        </div>

        {/* Question List */}
        <div className="space-y-4">
          {isLoadingSearch ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
            ))
          ) : searchResults?.questions.length === 0 ? (
            <div className="text-center py-20 bg-card border rounded-xl shadow-sm text-muted-foreground flex flex-col items-center">
              <Search className="h-10 w-10 mb-2 opacity-20" />
              <p>No questions found for the selected filters.</p>
            </div>
          ) : (
            searchResults?.questions.map((q) => (
              <div key={q.id} className="p-6 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
                <div className="flex gap-2 mb-3">
                  <span className="px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary rounded">{q.exam}</span>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-muted rounded">{q.year}</span>
                  {q.paper && <span className="px-2 py-0.5 text-xs font-semibold bg-muted rounded">{q.paper}</span>}
                </div>
                
                <p className="font-medium mb-4 line-clamp-2">
                  {q.question_number ? `${q.question_number}. ` : ''}{q.question_stem}
                </p>
                
                <div className="flex justify-end">
                  <Link href={`/questions/${q.id}?${currentQueryParams}`}>
                    <button className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                      View Question <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Pagination */}
        {searchResults && searchResults.total > limit && (
          <div className="flex justify-center gap-2 mt-8">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-muted-foreground flex items-center">
              Page {page} of {Math.ceil(searchResults.total / limit)}
            </span>
            <button 
              disabled={page >= Math.ceil(searchResults.total / limit)}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

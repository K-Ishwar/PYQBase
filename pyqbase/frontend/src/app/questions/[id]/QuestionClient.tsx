'use client'

import { use, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Lock, CheckCircle2, BookOpen } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useQuestionDetail, useQuestionSolution } from '@/lib/hooks/useQuestions'
import { useSearch } from '@/lib/hooks/useSearch'
import { createClient } from '@/lib/supabase/client'
import { QuestionTags } from '@/components/ui/QuestionTags'

export function QuestionClient({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: isAuthLoading } = useAuth()
  const supabase = createClient()

  // Extract search params to fetch the same context list for Prev/Next
  const topic_id = searchParams.get('topic_id') || undefined
  const exam = searchParams.get('exam') || undefined
  const year = searchParams.get('year') ? parseInt(searchParams.get('year') as string, 10) : undefined
  const sort = searchParams.get('sort') || 'recent'
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  // Fetch question detail
  const { data: question, isLoading: isQuestionLoading } = useQuestionDetail(id)
  
  // Fetch solution if authenticated
  const { data: solution, isLoading: isSolutionLoading } = useQuestionSolution(id, !!user)

  // Fetch context list for Prev/Next navigation
  const { data: searchResults } = useSearch({
    q: '',
    topic_id,
    exam,
    year,
    sort,
    limit,
    offset,
  })

  // Determine Prev/Next IDs
  const currentIndex = searchResults?.data?.findIndex((q: any) => q.id === id) ?? -1
  const prevId = currentIndex > 0 ? searchResults?.data[currentIndex - 1].id : null
  const nextId = currentIndex !== -1 && currentIndex < (searchResults?.data?.length || 0) - 1 
    ? searchResults?.data[currentIndex + 1].id 
    : null

  const handleLogin = async () => {
    // Basic redirect to auth or open a modal. 
    // Since we don't have a modal built yet, we'll just redirect to the Supabase OAuth or show a placeholder.
    // Assuming standard email/pwd login page exists at /login or similar, but for now we'll trigger OAuth if possible.
    // Or simpler: alert if no login page exists.
    alert('Login modal placeholder. Implement actual login UI here.')
  }

  if (isQuestionLoading || isAuthLoading) {
    return (
      <div className="container py-10 max-w-4xl space-y-6 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded"></div>
        <div className="h-64 bg-card border rounded-xl shadow-sm"></div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="container py-20 text-center max-w-4xl">
        <h1 className="text-2xl font-bold text-destructive mb-2">Question not found</h1>
        <button onClick={() => router.back()} className="text-primary hover:underline">Go back</button>
      </div>
    )
  }

  const queryParamsString = searchParams.toString()
  const backHref = topic_id ? `/topics/${topic_id}?${queryParamsString}` : `/search?${queryParamsString}`

  return (
    <div className="container py-10 max-w-4xl space-y-8">
      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Link href={backHref}>
          <button className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to List
          </button>
        </Link>
        <div className="flex gap-4">
          <Link href={prevId ? `/questions/${prevId}?${queryParamsString}` : '#'}>
            <button 
              disabled={!prevId}
              className="flex items-center gap-2 text-sm font-semibold border rounded-md px-4 py-2 hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Prev
            </button>
          </Link>
          <Link href={nextId ? `/questions/${nextId}?${queryParamsString}` : '#'}>
            <button 
              disabled={!nextId}
              className="flex items-center gap-2 text-sm font-semibold border rounded-md px-4 py-2 hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>

      {/* Question Details */}
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <QuestionTags 
          exam={question.exam} 
          year={question.year} 
          paper={question.paper} 
          subject_name={question.subject_name} 
          topic_name={question.topic_name} 
          question_number={question.question_number} 
          className="mb-6"
        />
        
        <h2 className="text-xl font-medium leading-relaxed mb-8">
          {typeof question.question_stem === 'object' && question.question_stem !== null
            ? (question.question_stem as { en: string }).en
            : question.question_stem as string}
        </h2>
        
        {question.has_image && question.image_url && (
          <img src={question.image_url} alt="Question" className="max-w-full h-auto rounded-lg mb-8 border" />
        )}

        <div className="space-y-3">
          {Object.entries(question.options || {}).map(([key, value]) => {
            const isCorrect = solution?.correct_option === key
            return (
              <div 
                key={key} 
                className={`p-4 rounded-lg border flex gap-4 ${isCorrect ? 'bg-green-500/10 border-green-500/50' : 'bg-background'}`}
              >
                <span className={`font-bold ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {key}.
                </span>
                <span className={isCorrect ? 'text-foreground font-medium' : 'text-foreground'}>
                  {value as string}
                </span>
                {isCorrect && <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 ml-auto" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Solution Section */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        {!user ? (
          <div className="p-10 flex flex-col items-center justify-center text-center bg-muted/30">
            <div className="p-4 bg-background rounded-full border shadow-sm mb-4">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">Login to View Answer & Explanation</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Create a free account or log in to see the correct answer, detailed AI explanation, and track your progress.
            </p>
            <button 
              onClick={handleLogin}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Sign In / Sign Up
            </button>
          </div>
        ) : (
          <div className="p-8">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Explanation
            </h3>
            {isSolutionLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
                <div className="h-4 bg-muted rounded w-4/6"></div>
              </div>
            ) : solution?.explanation ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {/* Assuming explanation is stored as text or JSON containing a text field */}
                {typeof solution.explanation === 'string' 
                  ? <p>{solution.explanation}</p> 
                  : <pre className="bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap">{JSON.stringify(solution.explanation, null, 2)}</pre>
                }
              </div>
            ) : (
              <p className="text-muted-foreground italic">No detailed explanation available for this question.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

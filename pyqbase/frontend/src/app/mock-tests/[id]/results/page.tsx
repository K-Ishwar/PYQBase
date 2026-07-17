'use client'

import { useParams } from 'next/navigation'
import { useMockTest } from '@/lib/hooks/useMockTests'
import { Trophy, ArrowLeft, RotateCcw, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export default function MockTestResultsPage() {
  const { id } = useParams<{ id: string }>()
  const { data: mockTest, isLoading } = useMockTest(id)
  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null)

  if (isLoading || !mockTest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const totalQuestions = mockTest.question_ids.length
  const maxScore = totalQuestions * 2.0 // standard +2 per question
  const score = mockTest.score !== null && mockTest.score !== undefined ? mockTest.score : 0
  const percentage = Math.max(0, Math.round((score / maxScore) * 100))

  const scoreColor = mockTest.score === null || mockTest.score === undefined
    ? 'text-muted-foreground'
    : percentage >= 75 ? 'text-emerald-600 dark:text-emerald-400'
    : percentage >= 50 ? 'text-amber-600 dark:text-amber-400'
    : 'text-destructive'

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/mock-tests" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">Mock Test Results</h1>
      </div>

      {/* Score card */}
      <div className="rounded-2xl border bg-card p-8 text-center space-y-4 shadow-sm">
        <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-primary/10">
          <Trophy className="h-10 w-10 text-primary" />
        </div>
        <div>
          <p className={`text-6xl font-extrabold tabular-nums ${scoreColor}`}>
            {score.toFixed(2)} / {maxScore}
          </p>
          <p className="mt-2 text-muted-foreground text-sm font-semibold">
            {percentage}%
          </p>
          <p className="mt-2 text-muted-foreground text-xs">
            {mockTest.exam.replace('_', ' ')} · {mockTest.test_format === 'cbt' ? 'CBT' : 'Scrollable'} Mode
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6">
        <Link 
          href="/mock-tests"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 font-semibold hover:bg-muted transition-colors"
        >
          <RotateCcw className="h-5 w-5" />
          New Test
        </Link>
        <Link 
          href="/mock-tests/history"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
        >
          View History
        </Link>
      </div>

      {/* Review Section */}
      {mockTest.questions && mockTest.questions.length > 0 && (
        <div className="mt-12 space-y-6">
          <h2 className="text-xl font-bold border-b pb-2">Review Your Answers</h2>
          
          <div className="space-y-8">
            {mockTest.questions.map((q: any, index: number) => {
              const userAnswer = mockTest.user_answers?.[q.id]
              const isCorrect = userAnswer === q.correct_option
              const isUnattempted = !userAnswer
              
              const isExpanded = expandedExplanation === q.id
              
              return (
                <div key={q.id} className={`rounded-xl border p-5 ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : isUnattempted ? 'bg-muted/30' : 'bg-destructive/5 border-destructive/20'}`}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="mt-1">
                      {isCorrect ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                      ) : (
                        <XCircle className={`h-6 w-6 ${isUnattempted ? 'text-muted-foreground' : 'text-destructive'}`} />
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-muted-foreground">Question {index + 1}</span>
                        {isUnattempted && <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">Unattempted</span>}
                      </div>
                      
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="text-base font-medium">{q.question_stem?.en || q.question_stem}</p>
                      </div>
                      
                      {q.has_image && q.image_url && (
                        <img src={q.image_url} alt="Question figure" className="max-h-64 rounded-lg object-contain bg-white" />
                      )}
                      
                      <div className="space-y-2 mt-4">
                        {['A', 'B', 'C', 'D'].map((opt) => {
                          const optionText = q.options?.[opt]?.en || q.options?.[opt]
                          if (!optionText) return null
                          
                          const isSelected = userAnswer === opt
                          const isActualCorrect = q.correct_option === opt
                          
                          let optClass = "border-border bg-background text-foreground"
                          if (isActualCorrect) {
                            optClass = "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                          } else if (isSelected && !isCorrect) {
                            optClass = "border-destructive/50 bg-destructive/10 text-destructive font-medium"
                          }
                          
                          return (
                            <div key={opt} className={`flex items-start p-3 rounded-lg border ${optClass}`}>
                              <span className="font-bold mr-3">{opt}.</span>
                              <span className="flex-1">{optionText}</span>
                              {isSelected && <span className="text-xs uppercase tracking-wider ml-2 opacity-70">Your Answer</span>}
                              {isActualCorrect && !isSelected && <span className="text-xs uppercase tracking-wider ml-2 opacity-70 text-emerald-600 dark:text-emerald-400">Correct Answer</span>}
                            </div>
                          )
                        })}
                      </div>
                      
                      {q.explanation && (
                        <div className="pt-4 mt-4 border-t">
                          <button 
                            onClick={() => setExpandedExplanation(isExpanded ? null : q.id)}
                            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            {isExpanded ? 'Hide Explanation' : 'View Explanation'}
                          </button>
                          
                          {isExpanded && (
                            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10 prose prose-sm dark:prose-invert max-w-none">
                              {typeof q.explanation === 'string' ? q.explanation : q.explanation?.en || JSON.stringify(q.explanation)}
                            </div>
                          )}
                        </div>
                      )}
                      
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

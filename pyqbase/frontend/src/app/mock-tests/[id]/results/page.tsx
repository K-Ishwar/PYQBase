'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useMockTest } from '@/lib/hooks/useMockTests'
import { CheckCircle2, XCircle, Clock, Trophy, ArrowLeft, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

interface QuestionResult {
  questionId: string
  isCorrect: boolean
  selectedOption: string
  correctOption: string
  timeTaken: number
}

export default function MockTestResultsPage() {
  const { id } = useParams<{ id: string }>()
  const { data: mockTest, isLoading } = useMockTest(id)
  const [results, setResults] = useState<QuestionResult[]>([])

  useEffect(() => {
    // Load results saved by the test page in sessionStorage
    const saved = sessionStorage.getItem(`mock-test-results-${id}`)
    if (saved) {
      setResults(JSON.parse(saved))
    }
  }, [id])

  if (isLoading || !mockTest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const total = results.length || mockTest.question_ids.length
  const correct = results.filter(r => r.isCorrect).length
  const score = total > 0 ? Math.round((correct / total) * 100) : mockTest.score ? Math.round(mockTest.score) : null
  const avgTime = results.length > 0
    ? Math.round(results.reduce((a, r) => a + r.timeTaken, 0) / results.length)
    : null

  const wrongAnswers = results.filter(r => !r.isCorrect)

  const scoreColor = score === null
    ? 'text-muted-foreground'
    : score >= 75 ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 50 ? 'text-amber-600 dark:text-amber-400'
    : 'text-destructive'

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/mock-tests" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">Results</h1>
      </div>

      {/* Score card */}
      <div className="rounded-2xl border bg-card p-8 text-center space-y-4 shadow-sm">
        <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-primary/10">
          <Trophy className="h-10 w-10 text-primary" />
        </div>
        <div>
          <p className={`text-6xl font-extrabold tabular-nums ${scoreColor}`}>
            {score !== null ? `${score}%` : '—'}
          </p>
          <p className="mt-2 text-muted-foreground text-sm">
            {correct} / {total} correct · {mockTest.exam.replace('_', ' ')} · {mockTest.mode === 'weak_area' ? 'Weak Areas' : 'Custom'}
          </p>
        </div>

        {avgTime !== null && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Avg time per question: <span className="font-semibold text-foreground">{avgTime}s</span>
          </div>
        )}
      </div>

      {/* Stat row */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Correct', value: correct, color: 'text-emerald-600' },
            { label: 'Wrong', value: total - correct, color: 'text-destructive' },
            { label: 'Total', value: total, color: 'text-foreground' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-card p-4 text-center">
              <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Time per question breakdown */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Time per Question</h2>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={r.questionId} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
                <span className="text-xs font-mono text-muted-foreground w-6">Q{i + 1}</span>
                {r.isCorrect
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  : <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                }
                <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-full rounded-full ${r.isCorrect ? 'bg-emerald-500' : 'bg-destructive'}`}
                    style={{ width: `${Math.min(100, (r.timeTaken / 120) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground w-10 text-right">{r.timeTaken}s</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wrong answers review */}
      {wrongAnswers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-destructive">Wrong Answers Review</h2>
          <div className="space-y-3">
            {wrongAnswers.map((r, i) => (
              <div key={r.questionId} className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 space-y-1">
                <p className="text-xs text-muted-foreground font-mono">Question ID: {r.questionId.slice(0, 8)}…</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-destructive font-medium">Your answer: <strong>{r.selectedOption}</strong></span>
                  <span className="text-emerald-600 font-medium">Correct: <strong>{r.correctOption}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && (
        <div className="rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Detailed question breakdown is available only when the test is completed in the timed flow.
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/mock-tests" className="flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold hover:bg-muted transition-colors">
          <RotateCcw className="h-4 w-4" /> New Test
        </Link>
        <Link href="/mock-tests/history" className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all">
          View History
        </Link>
      </div>
    </div>
  )
}

'use client'

import { useMockTestHistory } from '@/lib/hooks/useMockTests'
import { useAuth } from '@/components/providers/auth-provider'
import { format } from 'date-fns'
import { ClipboardList, ArrowLeft, ChevronRight, Lock, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function MockTestHistoryPage() {
  const { user } = useAuth()
  const { data: history = [], isLoading } = useMockTestHistory(!!user)

  // Free users: backend already limits to 3. We just show the gate notice.
  const isFree = true // will be wired to actual subscription check

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/mock-tests" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Mock Test History</h1>
          {isFree && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Lock className="h-3 w-3" /> Free plan shows your last 3 tests ·{' '}
              <Link href="/pricing" className="text-primary font-semibold hover:underline">Upgrade for full history</Link>
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold">No mock tests yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">Generate your first mock test and the history will appear here.</p>
          <Link href="/mock-tests" className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Create a Test
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(test => {
            const scoreColor = test.score === null || test.score === undefined
              ? 'text-muted-foreground'
              : test.score >= 75 ? 'text-emerald-600 dark:text-emerald-400'
              : test.score >= 50 ? 'text-amber-500'
              : 'text-destructive'

            return (
              <Link
                key={test.id}
                href={`/mock-tests/${test.id}/results`}
                className="flex items-center gap-4 rounded-2xl border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all group"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {test.exam.replace('_', ' ')}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground capitalize">
                      {test.mode.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {test.question_ids.length} questions · {format(new Date(test.created_at), 'dd MMM yyyy, h:mm a')}
                  </p>
                </div>
                <div className="text-right">
                  {test.score !== null && test.score !== undefined ? (
                    <p className={`text-2xl font-extrabold tabular-nums ${scoreColor}`}>
                      {Math.round(test.score)}%
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No score</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            )
          })}

          {/* Upgrade gate visible row for free users */}
          {isFree && (
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm font-medium text-amber-700 dark:text-amber-400 hover:border-amber-500 transition-colors"
            >
              <Lock className="h-4 w-4" /> Upgrade to see your full history
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

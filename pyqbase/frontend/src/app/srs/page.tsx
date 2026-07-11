'use client'

import { useState } from 'react'
import { useSrsQueue } from '@/lib/hooks/useSrsQueue'
import { useQuestion } from '@/lib/hooks/useQuestion'
import { QuizEngine } from '@/components/ui/QuizEngine'
import { useQueryClient } from '@tanstack/react-query'
import { Brain, ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function SrsQuizPage() {
  const { data: queueData, isLoading: queueLoading } = useSrsQueue()
  const queryClient = useQueryClient()
  
  // Keep track of which question we are on locally so we don't need a full refetch on every next click
  const [localIndex, setLocalIndex] = useState(0)
  
  const currentQueueItem = queueData?.data?.[localIndex]
  const currentId = currentQueueItem?.question_id ?? null
  
  const { data: questionDetail, isLoading: questionLoading, isFetching: questionFetching } = useQuestion(currentId)

  const handleNext = () => {
    // When they click next, we just increment the local index
    setLocalIndex(i => i + 1)
    // We should also invalidate the queue in the background so the dashboard count updates
    queryClient.invalidateQueries({ queryKey: ['srs-queue'] })
  }

  // Loading states
  if (queueLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading your revision queue...</p>
      </div>
    )
  }

  // All caught up!
  if (!queueData?.data || localIndex >= queueData.data.length) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 mb-6">
          <Sparkles className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">You&apos;re all caught up!</h1>
        <p className="text-muted-foreground max-w-sm mb-8 text-lg">
          You&apos;ve completed your daily revision. Great job keeping the streak alive.
        </p>
        <Link 
          href="/"
          className="rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
        >
          Return to Dashboard
        </Link>
      </div>
    )
  }

  const remainingCount = queueData.data.length - localIndex

  // Focus Mode layout (hides standard nav/footers if we had a special layout, but here we just take full screen via absolute/fixed positioning or simple div)
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full min-h-screen flex flex-col py-8 px-4">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Exit
          </Link>
          <div className="flex items-center gap-2 text-primary font-bold bg-primary/10 px-3 py-1.5 rounded-full text-sm">
            <Brain className="h-4 w-4" />
            {remainingCount} due
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col justify-center">
          {(questionLoading || questionFetching) ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading question...</p>
            </div>
          ) : questionDetail ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <QuizEngine
                question={questionDetail}
                isFreeUser={false} // SRS mode ignores global quota visually, or we can tie it in
                onNext={handleNext}
              />
            </div>
          ) : (
             <div className="text-center py-20 text-muted-foreground">
               Failed to load question details.
             </div>
          )}
        </main>
      </div>
    </div>
  )
}

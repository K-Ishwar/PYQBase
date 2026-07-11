'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMockTest } from '@/lib/hooks/useMockTests'
import { useQuestion } from '@/lib/hooks/useQuestion'
import { QuizEngine } from '@/components/ui/QuizEngine'
import { Timer, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react'

interface QuestionResult {
  questionId: string
  isCorrect: boolean
  selectedOption: string
  correctOption: string
  timeTaken: number
}

export default function MockTestTakePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: mockTest, isLoading } = useMockTest(id)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<QuestionResult[]>([])
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [testStarted, setTestStarted] = useState(false)
  const [testComplete, setTestComplete] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Total time: 90 seconds per question
  useEffect(() => {
    if (mockTest && timeLeft === null) {
      setTimeLeft(mockTest.question_ids.length * 90)
    }
  }, [mockTest, timeLeft])

  // Countdown timer
  useEffect(() => {
    if (!testStarted || testComplete) return
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t !== null && t <= 1) {
          clearInterval(intervalRef.current!)
          setTestComplete(true)
          return 0
        }
        return (t ?? 0) - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [testStarted, testComplete])

  const currentId = mockTest?.question_ids[currentIndex] ?? null
  const { data: questionDetail, isLoading: qLoading } = useQuestion(currentId)

  const handleNext = useCallback(() => {
    if (!mockTest) return
    if (currentIndex + 1 >= mockTest.question_ids.length) {
      setTestComplete(true)
      clearInterval(intervalRef.current!)
    } else {
      setCurrentIndex(i => i + 1)
    }
  }, [currentIndex, mockTest])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  if (isLoading || !mockTest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (testComplete) {
    const questionIds = mockTest.question_ids.map(String)
    router.push(`/mock-tests/${id}/results`)
    return null
  }

  // Start screen
  if (!testStarted) {
    const totalMinutes = Math.round((mockTest.question_ids.length * 90) / 60)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
          <div className="flex items-center justify-center h-16 w-16 mx-auto rounded-full bg-primary/10">
            <Timer className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Ready to Start?</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              {mockTest.question_ids.length} questions · {totalMinutes} minutes · {mockTest.mode === 'weak_area' ? 'Weak Area' : 'Custom'} Mode
            </p>
          </div>
          <div className="text-left rounded-xl bg-muted/40 p-4 text-sm space-y-2 text-muted-foreground">
            <p>✦ Answers are submitted individually via the Quiz Engine</p>
            <p>✦ Timer counts down from {totalMinutes} minutes total</p>
            <p>✦ You cannot pause once started</p>
          </div>
          <button
            onClick={() => setTestStarted(true)}
            className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
          >
            Start Test
          </button>
        </div>
      </div>
    )
  }

  const progress = ((currentIndex) / mockTest.question_ids.length) * 100
  const isTimeWarning = timeLeft !== null && timeLeft < 120

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-2xl mx-auto min-h-screen flex flex-col py-6 px-4">
        {/* Top bar */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              Q {currentIndex + 1} / {mockTest.question_ids.length}
            </span>
          </div>
          <div className={`flex items-center gap-2 font-mono text-base font-bold rounded-full px-4 py-1.5 ${
            isTimeWarning
              ? 'bg-destructive/10 text-destructive border border-destructive/30'
              : 'bg-primary/10 text-primary border border-primary/20'
          }`}>
            <Timer className="h-4 w-4" />
            {timeLeft !== null ? formatTime(timeLeft) : '—'}
          </div>
        </header>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-border mb-6">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question */}
        <main className="flex-1 flex flex-col justify-center">
          {qLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : questionDetail ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <QuizEngine
                question={questionDetail}
                isFreeUser={false}
                onNext={handleNext}
              />
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-20">Failed to load question.</p>
          )}
        </main>
      </div>
    </div>
  )
}

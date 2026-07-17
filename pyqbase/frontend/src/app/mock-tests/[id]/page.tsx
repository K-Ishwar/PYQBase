'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMockTest, useSubmitMockTest } from '@/lib/hooks/useMockTests'
import { Timer, Loader2, Bookmark, CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import { MagneticButton } from '@/components/ui/MagneticButton'
import { QuestionTags } from '@/components/ui/QuestionTags'

type Option = 'A' | 'B' | 'C' | 'D'
const OPTIONS: Option[] = ['A', 'B', 'C', 'D']

export default function MockTestTakePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: mockTest, isLoading } = useMockTest(id)
  const submitMutation = useSubmitMockTest(id)

  const [currentIndex, setCurrentIndex] = useState(0)
  
  // State for answers and statuses
  const [answers, setAnswers] = useState<Record<string, Option>>({})
  type Status = 'not_visited' | 'not_answered' | 'answered' | 'marked' | 'answered_marked'
  const [statuses, setStatuses] = useState<Record<string, Status>>({})
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [testStarted, setTestStarted] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  const startTime = useRef(Date.now())

  // Initialize test constraints
  useEffect(() => {
    if (mockTest && timeLeft === null && !mockTest.score) {
      // Initialize statuses to not_visited
      const initialStatuses: Record<string, Status> = {}
      mockTest.questions?.forEach(q => {
        initialStatuses[q.id] = 'not_visited'
      })
      // The first question is 'not_answered' since they are seeing it
      if (mockTest.questions && mockTest.questions.length > 0) {
        initialStatuses[mockTest.questions[0].id] = 'not_answered'
      }
      setStatuses(initialStatuses)
      setTimeLeft(mockTest.time_limit * 60)
    }
  }, [mockTest, timeLeft])

  // Redirect if already submitted
  useEffect(() => {
    if (mockTest?.score !== undefined && mockTest?.score !== null) {
      router.push(`/mock-tests/${id}/results`)
    }
  }, [mockTest, router, id])

  const submitTest = useCallback(async () => {
    if (submitMutation.isPending) return
    const timeTaken = Math.floor((Date.now() - startTime.current) / 1000)
    try {
      await submitMutation.mutateAsync({
        answers,
        time_taken_seconds: timeTaken
      })
      router.push(`/mock-tests/${id}/results`)
    } catch (e) {
      alert("Failed to submit test. Please try again.")
    }
  }, [answers, submitMutation, router, id])

  // Countdown timer
  useEffect(() => {
    if (!testStarted || submitMutation.isPending || mockTest?.score !== null) return
    
    // Reset start time on actual start
    startTime.current = Date.now()
    
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t !== null && t <= 1) {
          clearInterval(intervalRef.current!)
          // Auto submit
          submitTest()
          return 0
        }
        return (t ?? 0) - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [testStarted, submitMutation.isPending, submitTest, mockTest])

  if (isLoading || !mockTest || mockTest.score !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Start screen
  if (!testStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
          <div className="flex items-center justify-center h-16 w-16 mx-auto rounded-full bg-primary/10">
            <Timer className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Ready to Start?</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              {mockTest.question_ids.length} questions · {mockTest.time_limit} minutes · {mockTest.test_format === 'cbt' ? 'CBT' : 'Scrollable'} Mode
            </p>
          </div>
          <div className="text-left rounded-xl bg-muted/40 p-4 text-sm space-y-2 text-muted-foreground">
            <p>✦ You can navigate between questions using the palette.</p>
            <p>✦ Timer counts down from {mockTest.time_limit} minutes total.</p>
            <p>✦ Test auto-submits when time is up.</p>
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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const isTimeWarning = timeLeft !== null && timeLeft < 120
  const currentQuestion = mockTest.questions?.[currentIndex]

  // Status updaters
  const goToQuestion = (index: number) => {
    setCurrentIndex(index)
    const qId = mockTest.questions![index].id
    setStatuses(prev => {
      const currentStatus = prev[qId]
      if (currentStatus === 'not_visited') {
        return { ...prev, [qId]: 'not_answered' }
      }
      return prev
    })
  }

  const handleSaveAndNext = () => {
    if (!currentQuestion) return
    setStatuses(prev => ({ ...prev, [currentQuestion.id]: 'answered' }))
    if (currentIndex < mockTest.questions!.length - 1) {
      goToQuestion(currentIndex + 1)
    }
  }

  const handleMarkAndNext = () => {
    if (!currentQuestion) return
    const hasAnswer = !!answers[currentQuestion.id]
    setStatuses(prev => ({ 
      ...prev, 
      [currentQuestion.id]: hasAnswer ? 'answered_marked' : 'marked' 
    }))
    if (currentIndex < mockTest.questions!.length - 1) {
      goToQuestion(currentIndex + 1)
    }
  }

  const handleClear = () => {
    if (!currentQuestion) return
    setAnswers(prev => {
      const next = { ...prev }
      delete next[currentQuestion.id]
      return next
    })
    setStatuses(prev => ({ ...prev, [currentQuestion.id]: 'not_answered' }))
  }

  const handleOptionSelect = (qId: string, opt: Option) => {
    setAnswers(prev => ({ ...prev, [qId]: opt }))
    // If they were 'not_answered', they are now answering it.
    // If they were 'marked', they remain 'marked' but we can upgrade to 'answered_marked' on NEXT.
  }

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'not_visited': return 'bg-background border-border text-muted-foreground'
      case 'not_answered': return 'bg-destructive text-destructive-foreground border-destructive'
      case 'answered': return 'bg-success text-success-foreground border-success'
      case 'marked': return 'bg-purple-500 text-white border-purple-500 rounded-full'
      case 'answered_marked': return 'bg-purple-500 text-white border-purple-500 rounded-full relative'
    }
  }

  const getStatusCounts = () => {
    let counts = { not_visited: 0, not_answered: 0, answered: 0, marked: 0, answered_marked: 0 }
    Object.values(statuses).forEach(s => counts[s]++)
    return counts
  }

  const renderQuestion = (q: any, index: number) => {
    const selected = answers[q.id]
    return (
      <div key={q.id} className="bg-card border rounded-xl p-6 shadow-sm mb-6" id={`q-${index}`}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold text-lg">Question {index + 1}</span>
          <QuestionTags question={q} />
        </div>
        
        {q.question_stem?.en && (
          <div className="prose prose-sm dark:prose-invert max-w-none mb-6 text-base font-medium leading-relaxed">
            {q.question_stem.en}
          </div>
        )}
        
        {q.image_url && (
          <img src={q.image_url} alt="Question" className="rounded-lg max-w-full h-auto mb-6 border" />
        )}

        <div className="space-y-3">
          {OPTIONS.map(opt => {
            const text = q.options?.[opt]
            if (!text) return null
            const isSelected = selected === opt
            
            return (
              <div 
                key={opt}
                onClick={() => handleOptionSelect(q.id, opt)}
                className={`relative flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                    : 'border-border hover:border-primary/40 bg-background'
                }`}
              >
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                  isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30 text-muted-foreground'
                }`}>
                  {opt}
                </div>
                <div className={`text-sm ${isSelected ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {text}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const counts = getStatusCounts()

  return (
    <div className="fixed inset-0 z-50 bg-muted/20 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-card border-b flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div className="font-extrabold text-xl tracking-tight">PYQBase <span className="text-primary">Mock Test</span></div>
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 font-mono text-lg font-bold rounded-lg px-4 py-1.5 ${
            isTimeWarning
              ? 'bg-destructive/10 text-destructive border border-destructive/30 animate-pulse'
              : 'bg-primary/10 text-primary border border-primary/20'
          }`}>
            <Timer className="h-5 w-5" />
            {timeLeft !== null ? formatTime(timeLeft) : '—'}
          </div>
          <MagneticButton
            onClick={submitTest}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold shadow-md hover:shadow-lg transition-all"
            style={{ opacity: submitMutation.isPending ? 0.5 : 1, pointerEvents: submitMutation.isPending ? 'none' : 'auto' }}
          >
            {submitMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Submit Test'}
          </MagneticButton>
        </div>
      </header>

      {/* Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto relative">
          <div className="max-w-4xl w-full mx-auto p-6 pb-32">
            {mockTest.test_format === 'scrollable' ? (
              // Scrollable mode
              <div className="space-y-2">
                {mockTest.questions?.map((q, i) => renderQuestion(q, i))}
              </div>
            ) : (
              // CBT mode
              currentQuestion && renderQuestion(currentQuestion, currentIndex)
            )}
          </div>
          
          {/* Bottom Action Bar (only in CBT mode) */}
          {mockTest.test_format === 'cbt' && (
            <div className="absolute bottom-0 left-0 right-0 bg-card border-t p-4 flex items-center justify-between shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)]">
              <div className="flex gap-3">
                <button 
                  onClick={handleMarkAndNext}
                  className="px-5 py-2.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 font-semibold text-sm hover:bg-purple-100 transition-colors"
                >
                  Mark for Review & Next
                </button>
                <button 
                  onClick={handleClear}
                  className="px-5 py-2.5 rounded-lg border border-border bg-background text-muted-foreground font-semibold text-sm hover:bg-muted transition-colors"
                >
                  Clear Response
                </button>
              </div>
              <button 
                onClick={handleSaveAndNext}
                className="px-8 py-2.5 rounded-lg bg-success text-success-foreground font-bold text-sm shadow-md hover:shadow-lg hover:bg-success/90 transition-all"
              >
                Save & Next
              </button>
            </div>
          )}
        </main>

        {/* Right Sidebar - Palette */}
        <aside className="w-80 bg-card border-l flex flex-col shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]">
          {/* Legend */}
          <div className="p-4 border-b space-y-3 bg-muted/10">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Status</h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
              <div className="flex items-center gap-2"><div className="w-6 h-6 border rounded flex items-center justify-center font-bold bg-success text-white border-success">{counts.answered}</div> Answered</div>
              <div className="flex items-center gap-2"><div className="w-6 h-6 border rounded flex items-center justify-center font-bold bg-destructive text-white border-destructive">{counts.not_answered}</div> Not Answered</div>
              <div className="flex items-center gap-2"><div className="w-6 h-6 border rounded flex items-center justify-center font-bold bg-background text-muted-foreground">{counts.not_visited}</div> Not Visited</div>
              <div className="flex items-center gap-2"><div className="w-6 h-6 border rounded-full flex items-center justify-center font-bold bg-purple-500 text-white">{counts.marked}</div> Marked</div>
              <div className="flex items-center gap-2 col-span-2"><div className="w-6 h-6 border rounded-full flex items-center justify-center font-bold bg-purple-500 text-white relative"><div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border border-card" /></div> Answered & Marked for Review</div>
            </div>
          </div>
          
          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Question Palette</h3>
            <div className="grid grid-cols-5 gap-2">
              {mockTest.questions?.map((q, i) => {
                const status = statuses[q.id] || 'not_visited'
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      if (mockTest.test_format === 'scrollable') {
                        document.getElementById(`q-${i}`)?.scrollIntoView({ behavior: 'smooth' })
                      }
                      goToQuestion(i)
                    }}
                    className={`h-10 w-10 flex items-center justify-center font-bold text-sm border hover:opacity-80 transition-opacity ${getStatusColor(status)} ${
                      currentIndex === i && mockTest.test_format === 'cbt' ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''
                    }`}
                  >
                    {i + 1}
                    {status === 'answered_marked' && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-card" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
        
      </div>
    </div>
  )
}

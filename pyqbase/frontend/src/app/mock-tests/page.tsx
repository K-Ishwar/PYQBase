'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSubjects } from '@/lib/hooks/useTaxonomy'
import { useGenerateMockTest } from '@/lib/hooks/useMockTests'
import { useAuth } from '@/components/providers/auth-provider'
import { Lock, Zap, BookOpen, Target, ChevronRight, History } from 'lucide-react'
import Link from 'next/link'
import { MagneticButton } from '@/components/ui/MagneticButton'

import { apiClient } from '@/lib/api-client'

export default function MockTestsPage() {
  const router = useRouter()
  const { user, isSubscribed } = useAuth()
  const { data: subjects = [] } = useSubjects()
  const generateMutation = useGenerateMockTest()

  const [exams, setExams] = useState<string[]>([])
  const [exam, setExam] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [questionCount, setQuestionCount] = useState(20)
  const [mode, setMode] = useState<'custom' | 'weak_area'>('custom')
  const [error, setError] = useState<string | null>(null)

  // Fetch live exams
  useEffect(() => {
    apiClient('/api/v1/analytics/exams')
      .then(res => res.json())
      .then(data => {
        setExams(data)
        const targetExam = user?.user_metadata?.target_exam
        if (targetExam && data.includes(targetExam)) {
          setExam(targetExam)
        } else if (data.length > 0) {
          setExam(data[0])
        }
      })
      .catch(err => console.error("Failed to fetch exams:", err))
  }, [user])

  // Ensure an exam is selected if none is initially
  useEffect(() => {
    if (exams.length > 0 && !exam) {
      setExam(exams[0])
    }
  }, [exams, exam])

  const handleGenerate = async () => {
    if (!subjectId) { setError('Please select a subject.'); return }
    setError(null)
    try {
      const result = await generateMutation.mutateAsync({ exam, subject_id: subjectId, question_count: questionCount, mode })
      router.push(`/mock-tests/${result.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate mock test'
      setError(msg)
    }
  }

  return (
    <div className="container max-w-3xl mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Mock Tests</h1>
          <p className="mt-1 text-muted-foreground">Generate a timed practice test tailored to your exam.</p>
        </div>
        <Link href="/mock-tests/history" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <History className="h-4 w-4" /> History
        </Link>
      </div>

      <div className="relative rounded-2xl border bg-card p-6 space-y-6 shadow-sm overflow-hidden">
        
        {/* Premium Lock Overlay */}
        {!isSubscribed && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-6 text-center">
            <div className="bg-card border shadow-xl rounded-2xl p-8 max-w-md w-full flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Premium Feature</h2>
              <p className="text-muted-foreground text-sm mb-6">
                The Mock Test Generator allows you to create custom, timed practice tests and target your weak areas. Upgrade to Premium to unlock this feature.
              </p>
              <Link href="/pricing" className="w-full">
                <MagneticButton className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
                  Upgrade to Premium
                </MagneticButton>
              </Link>
            </div>
          </div>
        )}

        {/* Exam selector */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Exam</label>
          <div className="flex flex-wrap gap-2">
            {exams.length === 0 && <span className="text-sm text-muted-foreground animate-pulse">Loading exams...</span>}
            {exams.map(e => (
              <button
                key={e}
                onClick={() => setExam(e)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                  exam === e ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'
                }`}
              >
                {e.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Subject selector */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Subject</label>
          <select
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">— Select a subject —</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Question count selector */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Number of Questions</label>
          <div className="grid grid-cols-4 gap-3">
            {[10, 20, 50, 100].map(count => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                className={`rounded-xl py-3 text-sm font-bold border-2 transition-all ${
                  questionCount === count 
                    ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                    : 'border-border bg-card hover:border-primary/40 text-foreground'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Mode toggle */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Test Mode</label>
          <div className="grid grid-cols-2 gap-3">
            {/* Custom mode */}
            <button
              onClick={() => setMode('custom')}
              className={`flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-all ${
                mode === 'custom' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              }`}
            >
              <BookOpen className={`h-5 w-5 ${mode === 'custom' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-semibold">Custom</span>
              <span className="text-xs text-muted-foreground">Random questions from your selected filters.</span>
            </button>

            {/* Weak area mode */}
            <button
              onClick={() => setMode('weak_area')}
              className={`flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-all ${
                mode === 'weak_area'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <Target className={`h-5 w-5 ${mode === 'weak_area' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-semibold">Weak Areas</span>
              <span className="text-xs text-muted-foreground">Targets questions you&apos;ve answered incorrectly.</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
            {(error.toLowerCase().includes('premium') || error.toLowerCase().includes('week') || error.toLowerCase().includes('limit')) && (
              <Link href="/pricing" className="ml-2 font-semibold underline">Upgrade →</Link>
            )}
          </div>
        )}

        <MagneticButton
          onClick={handleGenerate}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 hover:shadow-lg"
          style={{ opacity: generateMutation.isPending || !subjectId ? 0.5 : 1, pointerEvents: generateMutation.isPending || !subjectId ? 'none' : 'auto' }}
        >
          {generateMutation.isPending ? (
            <><span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Generating…</>
          ) : (
            <>Generate Mock Test <ChevronRight className="h-4 w-4" /></>
          )}
        </MagneticButton>
      </div>
    </div>
  )
}

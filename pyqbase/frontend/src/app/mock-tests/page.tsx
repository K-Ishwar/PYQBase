'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSubjects } from '@/lib/hooks/useTaxonomy'
import { useGenerateMockTest } from '@/lib/hooks/useMockTests'
import { useAuth } from '@/components/providers/auth-provider'
import { Lock, Zap, BookOpen, Target, ChevronRight, History } from 'lucide-react'
import Link from 'next/link'

const EXAMS = ['UPSC_CSE', 'CAPF', 'MPSC', 'CDS']

export default function MockTestsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { data: subjects = [] } = useSubjects()
  const generateMutation = useGenerateMockTest()

  const [exam, setExam] = useState(EXAMS[0])
  const [subjectId, setSubjectId] = useState('')
  const [questionCount, setQuestionCount] = useState(20)
  const [mode, setMode] = useState<'custom' | 'weak_area'>('custom')
  const [error, setError] = useState<string | null>(null)

  // Treat as free unless user has subscription data from a backend /me call
  // For now, read subscription_status from auth provider Supabase metadata
  const isFree = true // will be replaced with actual subscription check

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

      <div className="rounded-2xl border bg-card p-6 space-y-6 shadow-sm">
        {/* Exam selector */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Exam</label>
          <div className="flex flex-wrap gap-2">
            {EXAMS.map(e => (
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

        {/* Question count slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold">Questions</label>
            <span className="text-2xl font-extrabold text-primary">{questionCount}</span>
          </div>
          <input
            type="range"
            min={5}
            max={isFree ? 25 : 100}
            step={5}
            value={questionCount}
            onChange={e => setQuestionCount(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5</span>
            {isFree && <span className="text-amber-600 font-medium">Free limit: 25 · Upgrade for 100</span>}
            <span>{isFree ? 25 : 100}</span>
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

            {/* Weak area mode — lock for free users */}
            <button
              onClick={() => !isFree && setMode('weak_area')}
              className={`relative flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-all ${
                isFree
                  ? 'border-border opacity-70 cursor-not-allowed'
                  : mode === 'weak_area'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              {isFree && (
                <div className="group absolute inset-0 flex items-center justify-center rounded-xl">
                  <div className="absolute inset-0 rounded-xl bg-background/60 backdrop-blur-[2px]" />
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <Lock className="h-5 w-5 text-amber-500" />
                    <Link href="/pricing" onClick={e => e.stopPropagation()}
                      className="text-xs font-semibold text-amber-600 hover:underline">
                      Upgrade to unlock
                    </Link>
                  </div>
                </div>
              )}
              <Target className={`h-5 w-5 ${mode === 'weak_area' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-semibold">Weak Areas</span>
              <span className="text-xs text-muted-foreground">Targets questions you&apos;ve answered incorrectly.</span>
            </button>
          </div>
        </div>

        {/* Free tier notice for custom weekly limit */}
        {isFree && mode === 'custom' && (
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            <Zap className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Free plan: 1 custom mock test per ISO week (resets Monday 00:00 IST). <Link href="/pricing" className="font-semibold hover:underline">Upgrade for unlimited.</Link></span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
            {(error.toLowerCase().includes('premium') || error.toLowerCase().includes('week') || error.toLowerCase().includes('limit')) && (
              <Link href="/pricing" className="ml-2 font-semibold underline">Upgrade →</Link>
            )}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generateMutation.isPending || !subjectId}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-all active:scale-[0.99]"
        >
          {generateMutation.isPending ? (
            <><span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Generating…</>
          ) : (
            <>Generate Mock Test <ChevronRight className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </div>
  )
}

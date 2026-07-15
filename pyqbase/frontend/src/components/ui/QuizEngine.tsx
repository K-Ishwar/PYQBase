'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSubmitAttempt, AttemptResponse } from '@/lib/hooks/useSubmitAttempt'
import type { QuestionListItem } from '@/lib/hooks/useSearch'
import { QuestionTags } from './QuestionTags'

interface QuizEngineProps {
  question: Partial<QuestionListItem> & {
    id: string
    exam: string
    year: number
    paper: string
    question_number: number
    question_stem?: { en: string }
    options?: Record<string, string>
    image_url?: string | null
  }
  attemptsUsed?: number
  attemptsLimit?: number
  isFreeUser?: boolean
  onNext?: () => void
}

type Option = 'A' | 'B' | 'C' | 'D'
const OPTIONS: Option[] = ['A', 'B', 'C', 'D']

export function QuizEngine({
  question,
  attemptsUsed = 0,
  attemptsLimit = 30,
  isFreeUser = true,
  onNext,
}: QuizEngineProps) {
  const [selected, setSelected] = useState<Option | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<AttemptResponse | null>(null)
  const [quotaError, setQuotaError] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startTime = useRef(Date.now())
  const submitMutation = useSubmitAttempt()

  // Reset state when question changes
  useEffect(() => {
    setSelected(null)
    setSubmitted(false)
    setResult(null)
    setQuotaError(false)
    setElapsed(0)
    startTime.current = Date.now()
  }, [question.id])

  // Timer
  useEffect(() => {
    if (submitted) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [submitted])

  // ── Keyboard shortcuts: A/B/C/D to select, Enter to submit ──────────────
  const handleSubmit = useCallback(async () => {
    if (!selected || submitted || submitMutation.isPending) return
    setSubmitted(true) // disable immediately to prevent double-submit

    const timeTaken = Math.floor((Date.now() - startTime.current) / 1000)

    try {
      const res = await submitMutation.mutateAsync({
        question_id: question.id,
        selected_option: selected,
        time_taken_seconds: timeTaken,
      })
      setResult(res)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'QUOTA_EXCEEDED') {
        setQuotaError(true)
      }
      // Don't re-enable submit — attempt was rejected, but UX stays locked
    }
  }, [selected, submitted, submitMutation, question.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (submitted) return
      if (['a', 'b', 'c', 'd'].includes(e.key.toLowerCase())) {
        setSelected(e.key.toUpperCase() as Option)
      }
      if (e.key === 'Enter' && selected) {
        handleSubmit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [submitted, selected, handleSubmit])

  // ── Option styling ───────────────────────────────────────────────────────
  function optionClass(opt: Option) {
    const base = 'relative flex items-start gap-3 rounded-xl border-2 p-4 text-sm cursor-pointer transition-all duration-200 select-none'
    if (!submitted) {
      return `${base} ${
        selected === opt
          ? 'border-primary bg-primary/5 font-medium'
          : 'border-border hover:border-primary/40 hover:bg-muted/30'
      }`
    }
    // Post-submit coloring
    const isCorrect = result?.correct_option === opt
    const isWrong = selected === opt && !isCorrect
    if (isCorrect) return `${base} border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300`
    if (isWrong) return `${base} border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300`
    return `${base} border-border opacity-50`
  }

  const optionLabel = (opt: Option) => {
    const opts = question.options
    return opts?.[opt] ?? `Option ${opt}`
  }

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* ── Quota progress bar (free users) ─────────────────────────────── */}
      {isFreeUser && (
        <div className="border-b px-6 py-3 bg-muted/30">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {attemptsUsed}/{attemptsLimit} Attempts Used Today
            </span>
            {attemptsUsed >= attemptsLimit * 0.8 && (
              <span className="text-xs text-amber-600 font-semibold">
                {attemptsLimit - attemptsUsed} remaining
              </span>
            )}
          </div>
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                attemptsUsed >= attemptsLimit
                  ? 'bg-destructive'
                  : attemptsUsed >= attemptsLimit * 0.8
                  ? 'bg-amber-500'
                  : 'bg-primary'
              }`}
              style={{ width: `${Math.min(100, (attemptsUsed / attemptsLimit) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* ── Question metadata row ─────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <QuestionTags 
            exam={question.exam} 
            year={question.year} 
            paper={question.paper} 
            subject_name={question.subject_name} 
            topic_name={question.topic_name} 
            question_number={question.question_number} 
            className="flex-1"
          />
          <span className="text-xs font-mono text-muted-foreground ml-auto">
            {elapsed}s
          </span>
        </div>

        {/* ── Question stem ─────────────────────────────────────────────── */}
        <div className="text-base font-medium leading-relaxed text-foreground">
          {question.question_stem?.en}
        </div>

        {/* ── Options ───────────────────────────────────────────────────── */}
        <div className="space-y-3" role="radiogroup" aria-label="Answer options">
          {OPTIONS.map((opt) => (
            <button
              key={opt}
              role="radio"
              aria-checked={selected === opt}
              onClick={() => !submitted && setSelected(opt)}
              className={optionClass(opt)}
              disabled={submitted}
            >
              <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-current text-xs font-bold">
                {opt}
              </span>
              <span className="flex-1 text-left">{optionLabel(opt)}</span>
              {submitted && result?.correct_option === opt && (
                <span className="text-emerald-500 text-lg">✓</span>
              )}
              {submitted && selected === opt && result?.correct_option !== opt && (
                <span className="text-rose-500 text-lg">✗</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Submit Button ─────────────────────────────────────────────── */}
        {!submitted && (
          <button
            onClick={handleSubmit}
            disabled={!selected || submitMutation.isPending || submitted}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-all active:scale-[0.99]"
          >
            {submitMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Submitting…
              </span>
            ) : selected ? (
              'Submit Answer (Enter ↵)'
            ) : (
              'Select an option (A / B / C / D)'
            )}
          </button>
        )}

        {/* ── Quota exceeded error ──────────────────────────────────────── */}
        {quotaError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive text-center">
            <p className="font-bold mb-1">Daily limit reached 🔒</p>
            <p>Free users can attempt 30 questions per day (IST).</p>
            <a
              href="/pricing"
              className="mt-2 inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Upgrade for unlimited access
            </a>
          </div>
        )}

        {/* ── Result feedback ───────────────────────────────────────────── */}
        {submitted && result && !quotaError && (
          <div
            className={`rounded-xl border-2 p-5 space-y-3 transition-all duration-300 ${
              result.is_correct
                ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-rose-300 bg-rose-50 dark:bg-rose-900/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{result.is_correct ? '✅' : '❌'}</span>
              <div>
                <p className={`font-bold ${result.is_correct ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                  {result.correct_option === 'DROPPED'
                    ? 'Question Dropped — Neutral (no marks deducted)'
                    : result.is_correct
                    ? 'Correct!'
                    : `Wrong — Correct answer is Option ${result.correct_option}`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  New difficulty rating: <span className="font-mono font-semibold">{result.new_elo_rating}</span>
                </p>
              </div>
            </div>

            {/* AI Explanation */}
            {result.explanation && (
              <div className="border-t border-current/10 pt-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Explanation
                </p>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {result.explanation}
                </p>
              </div>
            )}

            {/* Keyboard hint or Next button */}
            {onNext && (
              <button
                onClick={onNext}
                className="w-full rounded-lg border-2 border-current/20 py-2 text-sm font-medium hover:bg-current/5 transition-colors"
              >
                Next Question →
              </button>
            )}
          </div>
        )}

        {/* ── Keyboard hint ─────────────────────────────────────────────── */}
        {!submitted && (
          <p className="text-center text-xs text-muted-foreground">
            Press <kbd className="rounded border px-1 py-0.5 font-mono">A</kbd>
            {' '}<kbd className="rounded border px-1 py-0.5 font-mono">B</kbd>
            {' '}<kbd className="rounded border px-1 py-0.5 font-mono">C</kbd>
            {' '}<kbd className="rounded border px-1 py-0.5 font-mono">D</kbd>
            {' '}to select · <kbd className="rounded border px-1 py-0.5 font-mono">Enter</kbd> to submit
          </p>
        )}
      </div>
    </div>
  )
}

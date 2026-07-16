import * as React from 'react'
import { PillBadge } from './PillBadge'
import { QuestionTags } from './QuestionTags'
import type { QuestionListItem } from '@/lib/hooks/useSearch'
import { useGenerateExplanation } from '@/lib/hooks/useQuestions'

import { Lock, Sparkles, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../providers/auth-provider'

interface SearchResultCardProps {
  item: QuestionListItem
  query?: string
  isPremiumLocked?: boolean
}

/**
 * Highlights occurrences of `query` words inside `text` with a <mark> element.
 */
function highlightText(text: string, query?: string): React.ReactNode {
  if (!query || !query.trim()) return text

  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  const regex = new RegExp(`(${words.join('|')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="bg-primary/20 text-primary font-semibold rounded px-0.5 not-italic"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  )
}

const EXAM_LABELS: Record<string, string> = {
  'UPSC CSE': 'UPSC CSE',
  'UPSC CAPF': 'UPSC CAPF',
  'MPSC Rajyseva': 'MPSC Rajyseva',
  'UPSC CDS': 'UPSC CDS',
}

export function SearchResultCard({ item, query, isPremiumLocked }: SearchResultCardProps) {
  const [showExplanation, setShowExplanation] = useState(false)
  const [localExplanation, setLocalExplanation] = useState<any>(null)
  const { isSubscribed } = useAuth()
  const stemPreview = item.question_stem?.en || ''
  
  const { mutate: generateExplanation, isPending: isGeneratingExplanation } = useGenerateExplanation(item.id)
  
  const displayExplanation = localExplanation || item.explanation

  return (
    <div className="group relative rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md">
      {/* Header row */}
      <QuestionTags 
        exam={item.exam} 
        year={item.year} 
        paper={item.paper} 
        subject_name={item.subject_name} 
        topic_name={item.topic_name} 
        question_number={item.question_number} 
        className="mb-3"
      />

      {/* Question stem preview */}
      <div className="text-sm text-foreground leading-relaxed">
        {isPremiumLocked ? (
          <span className="blur-[3px] select-none pointer-events-none text-muted-foreground">
            {stemPreview}
          </span>
        ) : (
          highlightText(stemPreview, query)
        )}
      </div>

      {/* Premium lock overlay */}
      {isPremiumLocked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[2px]">
          <div className="text-center">
            <div className="text-2xl mb-1">🔒</div>
            <p className="text-xs font-semibold text-muted-foreground">Premium required</p>
            <a
              href="/pricing"
              className="mt-2 inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
            >
              Upgrade
            </a>
          </div>
        </div>
      )}

      {/* Options and Explanation */}
      {!isPremiumLocked && item.options && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {['A', 'B', 'C', 'D'].map((key) => {
              const optionText = item.options[key]
              if (!optionText) return null
              
              const isCorrect = key === item.correct_option
              
              return (
                <div
                  key={key}
                  className={`p-3 rounded-lg border text-sm transition-colors ${
                    showExplanation && isCorrect 
                      ? 'bg-green-500/10 border-green-500 text-green-900 dark:text-green-300 font-medium' 
                      : 'bg-card hover:bg-muted'
                  }`}
                >
                  <span className="font-bold mr-2">{key}.</span>
                  {highlightText(optionText, query)}
                </div>
              )
            })}
          </div>
          
          {showExplanation && (
            displayExplanation ? (
              <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
                <h4 className="font-bold mb-2 text-primary">Explanation:</h4>
                <p className="leading-relaxed">
                  {typeof displayExplanation === 'string' 
                    ? displayExplanation 
                    : (displayExplanation.en || JSON.stringify(displayExplanation))}
                </p>
              </div>
            ) : !isSubscribed ? (
              <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm text-center">
                <Lock className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="font-semibold text-primary mb-1">Premium Explanation</p>
                <p className="text-xs text-muted-foreground mb-3">Upgrade to a Premium Subscription to unlock detailed AI-generated explanations.</p>
                <a href="/pricing" className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-primary/90 transition-colors">Upgrade to Premium</a>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-xl bg-secondary/20 border border-secondary/30 text-sm text-center">
                <Sparkles className="h-5 w-5 mx-auto mb-2 text-secondary-foreground" />
                <p className="font-semibold text-secondary-foreground mb-1">No Explanation Available</p>
                <p className="text-xs text-muted-foreground mb-3">Be the first to generate an AI explanation for this question!</p>
                <button 
                  onClick={() => generateExplanation(undefined, {
                    onSuccess: (data) => {
                      if (data.explanation) {
                        setLocalExplanation(data.explanation)
                      }
                    }
                  })}
                  disabled={isGeneratingExplanation}
                  className="bg-secondary text-secondary-foreground px-4 py-1.5 rounded-md text-xs font-semibold hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                >
                  {isGeneratingExplanation ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</>
                  ) : 'Generate with AI'}
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Footer */}
      {!isPremiumLocked && (
        <div className="mt-6 pt-4 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {item.ts_rank != null ? `Relevance: ${(item.ts_rank * 100).toFixed(0)}%` : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="rounded-full border px-4 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-colors"
            >
              {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import * as React from 'react'
import { PillBadge } from './PillBadge'
import type { QuestionListItem } from '@/lib/hooks/useSearch'

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
  const stemPreview = item.question_stem?.en
    ? item.question_stem.en.slice(0, 220) + (item.question_stem.en.length > 220 ? '…' : '')
    : ''

  return (
    <div className="group relative rounded-xl border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <PillBadge variant="exam">{EXAM_LABELS[item.exam] ?? item.exam}</PillBadge>
        <PillBadge variant="default">{item.year}</PillBadge>
        <PillBadge variant="default">{item.paper}</PillBadge>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          #{item.question_number}
        </span>
      </div>

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

      {/* Footer */}
      {!isPremiumLocked && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {item.ts_rank != null ? `Relevance: ${(item.ts_rank * 100).toFixed(0)}%` : ''}
          </span>
          <a
            href={`/questions/${item.id}`}
            className="rounded-full border px-3 py-1 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            View Question →
          </a>
        </div>
      )}
    </div>
  )
}

import * as React from 'react'
import { PillBadge } from './PillBadge'

interface QuestionTagsProps {
  exam: string
  year: number
  paper?: string
  subject_name?: string | null
  topic_name?: string | null
  question_number?: number | string
  className?: string
}

const EXAM_LABELS: Record<string, string> = {
  'UPSC CSE': 'UPSC CSE',
  'UPSC CAPF': 'UPSC CAPF',
  'MPSC Rajyseva': 'MPSC Rajyseva',
  'UPSC CDS': 'UPSC CDS',
}

export function QuestionTags({
  exam,
  year,
  paper,
  subject_name,
  topic_name,
  question_number,
  className = ""
}: QuestionTagsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <PillBadge variant="exam">{EXAM_LABELS[exam] ?? exam}</PillBadge>
      <PillBadge variant="default">{year}</PillBadge>
      {paper && <PillBadge variant="default">{paper}</PillBadge>}
      
      {subject_name && (
        <PillBadge 
          variant="default" 
          className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
        >
          {subject_name}
        </PillBadge>
      )}
      
      {topic_name && (
        <PillBadge 
          variant="default" 
          className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
        >
          {topic_name}
        </PillBadge>
      )}

      {question_number !== undefined && (
        <span className="ml-auto font-mono text-xs text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
          Q.{question_number}
        </span>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { QuizEngine } from '@/components/ui/QuizEngine'

// Mock questions for UI testing — in production these come from the search API
const MOCK_QUESTIONS = [
  {
    id: 'aaaaaaaa-0000-0000-0000-000000000001',
    exam: 'UPSC CSE',
    year: 2024,
    paper: 'Prelims',
    question_number: 1,
    question_stem: {
      en: 'With reference to the El Niño phenomenon, which of the following statements is/are correct?\n\n1. El Niño causes drought conditions over the Indian subcontinent.\n2. During El Niño years, the Walker Circulation weakens significantly.\n3. El Niño is associated with anomalously warm sea surface temperatures in the central and eastern Pacific Ocean.',
    },
    options: {
      A: '1 and 2 only',
      B: '2 and 3 only',
      C: '1, 2 and 3',
      D: '1 and 3 only',
    },
    question_type: 'MCQ',
    has_image: false,
    image_url: undefined,
    subtopic_id: 'dddd0001-0001-0001-0001-000000000001',
    elo_rating: 1240,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'bbbbbbbb-0000-0000-0000-000000000002',
    exam: 'UPSC CAPF',
    year: 2023,
    paper: 'Paper I',
    question_number: 42,
    question_stem: {
      en: "Which Article of the Indian Constitution deals with the 'Right to Constitutional Remedies'?",
    },
    options: {
      A: 'Article 19',
      B: 'Article 21',
      C: 'Article 32',
      D: 'Article 226',
    },
    question_type: 'MCQ',
    has_image: false,
    image_url: undefined,
    subtopic_id: 'cccc0001-0001-0001-0001-000000000001',
    elo_rating: 1180,
    created_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 'cccccccc-0000-0000-0000-000000000003',
    exam: 'MPSC Rajyseva',
    year: 2022,
    paper: 'Prelims',
    question_number: 15,
    question_stem: {
      en: 'Consider the following statements about the Fiscal Responsibility and Budget Management (FRBM) Act:\n\n1. It mandates the elimination of revenue deficit by 2025-26.\n2. The Act was enacted in 2003.\n\nWhich of the above statements is/are correct?',
    },
    options: {
      A: '1 only',
      B: '2 only',
      C: 'Both 1 and 2',
      D: 'Neither 1 nor 2',
    },
    question_type: 'MCQ',
    has_image: false,
    image_url: undefined,
    subtopic_id: 'dddd0003-0003-0003-0003-000000000003',
    elo_rating: 1290,
    created_at: '2022-01-01T00:00:00Z',
  },
]

export default function QuizPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [attemptsUsed, setAttemptsUsed] = useState(0)

  const current = MOCK_QUESTIONS[currentIndex]

  function handleNext() {
    setAttemptsUsed((n) => n + 1)
    setCurrentIndex((i) => (i + 1) % MOCK_QUESTIONS.length)
  }

  return (
    <div className="container py-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Quiz Mode</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Question {currentIndex + 1} of {MOCK_QUESTIONS.length} · Practice set
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-6">
        {MOCK_QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i < currentIndex
                ? 'bg-emerald-500'
                : i === currentIndex
                ? 'bg-primary'
                : 'bg-border'
            }`}
          />
        ))}
      </div>

      <QuizEngine
        question={current}
        attemptsUsed={attemptsUsed}
        attemptsLimit={30}
        isFreeUser={true}
        onNext={handleNext}
      />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Using mock data — connect backend for live questions &amp; ELO tracking.
      </p>
    </div>
  )
}

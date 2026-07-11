'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { useSearch } from '@/lib/hooks/useSearch'
import { SearchResultCard } from '@/components/ui/SearchResultCard'
import { SearchResultSkeletonList } from '@/components/ui/SearchResultSkeleton'

const EXAMS = [
  { value: '', label: 'All Exams' },
  { value: 'UPSC_CSE', label: 'UPSC CSE' },
  { value: 'CAPF', label: 'CAPF' },
  { value: 'MPSC', label: 'MPSC' },
  { value: 'CDS', label: 'CDS' },
]

const SORTS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'year_desc', label: 'Newest First' },
]

// Simulates free user quota — first 5 results free, rest locked
const FREE_QUOTA = 5

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container py-10 text-center text-muted-foreground animate-pulse">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  )
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [inputValue, setInputValue] = useState(searchParams.get('q') ?? '')
  const [exam, setExam] = useState(searchParams.get('exam') ?? '')
  const [sort, setSort] = useState('relevance')
  const [offset, setOffset] = useState(0)
  const LIMIT = 10

  const debouncedQuery = useDebounce(inputValue, 300)

  // Sync URL params when query/exam changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedQuery) params.set('q', debouncedQuery)
    if (exam) params.set('exam', exam)
    router.replace(`/search?${params.toString()}`, { scroll: false })
    setOffset(0) // reset pagination on new search
  }, [debouncedQuery, exam, router])

  const { data, isFetching, isError } = useSearch({
    q: debouncedQuery || undefined,
    exam: exam || undefined,
    sort,
    limit: LIMIT,
    offset,
  })

  const results = data?.data ?? []
  const meta = data?.meta

  const pillClass = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-medium border transition-all cursor-pointer ${
      active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-background text-muted-foreground border-input hover:border-primary/50 hover:text-foreground'
    }`

  return (
    <div className="container py-10">
      {/* ── Hero Search Bar ──────────────────────────────────────────────── */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          Search <span className="text-primary">Every PYQ</span>
        </h1>
        <p className="text-muted-foreground mb-6">
          Cross-exam full-text search across UPSC, CAPF, MPSC &amp; CDS.
        </p>
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <input
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder='Try "El Nino", "Fundamental Rights", "Fiscal deficit"…'
            className="w-full rounded-full border border-input bg-card py-4 pl-12 pr-6 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/40"
          />
          {isFetching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* ── Sidebar Filters ──────────────────────────────────────────────── */}
        <aside className="md:w-52 flex-shrink-0 space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Exam
            </p>
            <div className="flex flex-col gap-2">
              {EXAMS.map((e) => (
                <button
                  key={e.value}
                  onClick={() => setExam(e.value)}
                  className={pillClass(exam === e.value)}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Sort By
            </p>
            <div className="flex flex-col gap-2">
              {SORTS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSort(s.value)}
                  className={pillClass(sort === s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Results ──────────────────────────────────────────────────────── */}
        <div className="flex-1 space-y-4">
          {/* Result count */}
          {meta && !isFetching && (
            <p className="text-sm text-muted-foreground">
              {meta.total === 0
                ? 'No results found.'
                : `${meta.total.toLocaleString()} question${meta.total !== 1 ? 's' : ''} found`}
              {debouncedQuery && (
                <span className="ml-1">
                  for <span className="font-semibold text-foreground">&quot;{debouncedQuery}&quot;</span>
                </span>
              )}
            </p>
          )}

          {/* Skeleton */}
          {isFetching && <SearchResultSkeletonList count={LIMIT} />}

          {/* Error */}
          {isError && !isFetching && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
              Failed to load results. Make sure the backend is running at{' '}
              <code className="font-mono">localhost:8000</code>.
            </div>
          )}

          {/* Empty state */}
          {!isFetching && !isError && results.length === 0 && meta && (
            <div className="py-20 text-center">
              <p className="text-6xl mb-4">🔍</p>
              <h3 className="text-lg font-bold mb-1">No questions found</h3>
              <p className="text-muted-foreground text-sm">
                Try a different keyword or remove filters.
              </p>
            </div>
          )}

          {/* Results list */}
          {!isFetching && results.map((item, i) => (
            <SearchResultCard
              key={item.id}
              item={item}
              query={debouncedQuery}
              isPremiumLocked={offset === 0 && i >= FREE_QUOTA}
            />
          ))}

          {/* Pagination */}
          {meta && (meta.has_next || offset > 0) && !isFetching && (
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                disabled={offset === 0}
                className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
              >
                ← Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {Math.floor(offset / LIMIT) + 1} of{' '}
                {Math.ceil((meta.total || 0) / LIMIT)}
              </span>
              <button
                onClick={() => setOffset(offset + LIMIT)}
                disabled={!meta.has_next}
                className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

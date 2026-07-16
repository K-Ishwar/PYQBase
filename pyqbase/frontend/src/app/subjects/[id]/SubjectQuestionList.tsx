'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { SearchResultCard } from '@/components/ui/SearchResultCard'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/components/providers/auth-provider'

const LIMIT = 10
const FREE_QUOTA = 15 // Assuming 15 for premium lock

interface SubjectQuestionListProps {
  subjectId: string
}

export function SubjectQuestionList({ subjectId }: SubjectQuestionListProps) {
  const [offset, setOffset] = useState(0)
  const { user } = useAuth()
  
  const isAdmin = user?.user_metadata?.role === 'admin'

  const { data, isFetching, isError } = useQuery<any>({
    queryKey: ['subject-questions', subjectId, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        subject_id: subjectId,
        limit: LIMIT.toString(),
        offset: offset.toString()
      })
      
      const res = await apiClient(`/api/v1/questions?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch questions')
      return res.json()
    }
  })

  const results = data?.data || []
  const meta = data?.meta

  return (
    <div className="space-y-8 mt-12">
      <div className="flex items-center justify-between border-t pt-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Subject Questions</h2>
          <p className="text-muted-foreground">Browse all questions for this subject.</p>
        </div>
      </div>

      <div className="space-y-4">
        {meta && !isFetching && (
          <p className="text-sm text-muted-foreground">
            {meta.total === 0
              ? 'No questions found.'
              : `${meta.total.toLocaleString()} question${meta.total !== 1 ? 's' : ''} found`}
          </p>
        )}

        {isFetching && (
          <div className="text-muted-foreground animate-pulse py-8">Loading questions...</div>
        )}

        {isError && !isFetching && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
            Failed to load questions.
          </div>
        )}

        <motion.div layout className="space-y-4">
          <AnimatePresence mode="popLayout">
            {results.map((item: any, i: number) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={item.id}
              >
                <SearchResultCard
                  item={item}
                  isPremiumLocked={!isAdmin && offset === 0 && i >= FREE_QUOTA}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Pagination */}
        {meta && (meta.has_next || offset > 0) && !isFetching && (
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={offset === 0}
              className="rounded-lg border bg-card px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
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
              className="rounded-lg border bg-card px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

interface AdminQuestion {
  id: string
  exam: string
  year: number
  paper: string
  question_number: number
  subtopic_id: string
  correct_option: string
}

export default function AdminQuestionsPage() {
  const { data: questions = [], isLoading, error } = useQuery<AdminQuestion[]>({
    queryKey: ['admin-questions'],
    queryFn: async () => {
      const res = await apiClient('/api/v1/admin/questions')
      if (!res.ok) throw new Error('Failed to load questions')
      return res.json()
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Questions</h1>
          <p className="mt-1 text-muted-foreground">Manage all PYQ content.</p>
        </div>
        <Link
          href="/admin/questions/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark transition-colors"
        >
          + Add Question
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Exam</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Year</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Paper</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Q#</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Topic</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Answer</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground animate-pulse">
                  Loading questions...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-destructive">
                  Error loading questions
                </td>
              </tr>
            ) : questions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No questions found in the database.
                </td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {q.exam.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{q.year}</td>
                  <td className="px-4 py-3 text-muted-foreground">{q.paper}</td>
                  <td className="px-4 py-3 font-mono text-xs">#{q.question_number}</td>
                  <td className="px-4 py-3 text-xs">{q.subtopic_id || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      q.correct_option === 'DROPPED'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-success/10 text-success'
                    }`}>
                      {q.correct_option}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/questions/${q.id}`}
                      className="text-primary text-xs font-medium hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

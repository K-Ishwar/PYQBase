'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

interface QuestionLogue {
  id: string
  exam: string
  year: number
  statement: string
  subject_id: string | null
  subject_name: string | null
}

export default function AdminQuestionsPage() {
  const queryClient = useQueryClient()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const { data: questions = [], isLoading, error } = useQuery<QuestionLogue[]>({
    queryKey: ['admin-questions-logue'],
    queryFn: async () => {
      const res = await apiClient('/api/v1/admin/questions/logue')
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to load questions')
      }
      return res.json()
    }
  })

  // Group by Exam + Subject
  const groupedQuestions = useMemo(() => {
    const groups: Record<string, { exam: string, subject_name: string, questions: QuestionLogue[] }> = {}
    questions.forEach(q => {
      const exam = q.exam
      const subject = q.subject_name || 'Unknown'
      const key = `${exam}::${subject}`
      if (!groups[key]) {
        groups[key] = { exam, subject_name: subject, questions: [] }
      }
      groups[key].questions.push(q)
    })
    // Sort groups
    return Object.values(groups).sort((a, b) => {
      if (a.exam !== b.exam) return a.exam.localeCompare(b.exam)
      return a.subject_name.localeCompare(b.subject_name)
    })
  }, [questions])

  const deleteGroupMutation = useMutation({
    mutationFn: async ({ exam, subject_name }: { exam: string, subject_name: string }) => {
      const res = await apiClient('/api/v1/admin/questions/group', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam, subject_name }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to delete group')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions-logue'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })

  const toggleGroup = (key: string) => {
    const next = new Set(expandedGroups)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setExpandedGroups(next)
  }

  const handleDeleteGroup = (exam: string, subject: string, count: number) => {
    if (confirm(`Are you sure you want to permanently delete ALL ${count} questions for ${exam} - ${subject}?`)) {
      deleteGroupMutation.mutate({ exam, subject_name: subject })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Question Logue</h1>
          <p className="mt-1 text-muted-foreground">Manage uploaded question blocks grouped by Exam and Subject.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/questions/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark transition-colors"
          >
            + Add Question
          </Link>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        {isLoading ? (
          <div className="text-center py-10 animate-pulse text-muted-foreground">Loading Question Logue...</div>
        ) : error ? (
          <div className="text-center py-10 text-destructive">Error: {error.message}</div>
        ) : groupedQuestions.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">No questions found.</div>
        ) : (
          <div className="space-y-4">
            {groupedQuestions.map(group => {
              const key = `${group.exam}::${group.subject_name}`
              const isExpanded = expandedGroups.has(key)
              return (
                <div key={key} className="border rounded-lg overflow-hidden">
                  <div 
                    className="bg-muted/50 p-4 flex justify-between items-center cursor-pointer hover:bg-muted" 
                    onClick={() => toggleGroup(key)}
                  >
                    <div>
                      <h3 className="font-bold text-lg">{group.exam} - {group.subject_name}</h3>
                      <p className="text-sm text-muted-foreground">{group.questions.length} questions</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation()
                          handleDeleteGroup(group.exam, group.subject_name, group.questions.length) 
                        }}
                        disabled={deleteGroupMutation.isPending}
                        className="px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        Delete Group
                      </button>
                      <span className="text-muted-foreground">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="p-4 border-t bg-background max-h-[500px] overflow-y-auto space-y-2">
                      {group.questions.map(q => (
                        <div key={q.id} className="p-3 border rounded-md hover:border-primary/50 transition-colors flex justify-between items-start gap-4">
                          <div>
                            <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded mr-2">{q.year}</span>
                            <span className="text-sm">{q.statement}</span>
                          </div>
                          <Link href={`/admin/questions/${q.id}`} className="text-primary text-xs font-semibold whitespace-nowrap hover:underline">
                            Edit
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

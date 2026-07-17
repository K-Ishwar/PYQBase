'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'

interface QuestionLogue {
  id: string
  exam: string
  year: number
  paper: string
  batch_time: string
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

  // Group strictly by Batch Time (Published Batch)
  const groupedQuestions = useMemo(() => {
    const groups: Record<string, { batch_time: string, questions: QuestionLogue[] }> = {}
    questions.forEach(q => {
      const { batch_time } = q
      if (!groups[batch_time]) {
        groups[batch_time] = { batch_time, questions: [] }
      }
      groups[batch_time].questions.push(q)
    })
    // Sort groups (newest batch first)
    return Object.values(groups).sort((a, b) => {
      return b.batch_time.localeCompare(a.batch_time)
    })
  }, [questions])

  const deleteGroupMutation = useMutation({
    mutationFn: async ({ batch_time }: { batch_time: string }) => {
      const res = await apiClient('/api/v1/admin/questions/group', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_time }),
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

  const handleDeleteGroup = (batch_time: string, count: number) => {
    if (confirm(`Are you sure you want to permanently delete ALL ${count} questions uploaded at ${batch_time}?`)) {
      deleteGroupMutation.mutate({ batch_time })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Question Logue</h1>
          <p className="mt-1 text-muted-foreground">Manage uploaded question blocks grouped by Published Batch (Exam, Year, Paper).</p>
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
        <h2 className="text-xl font-bold mb-4">Current Database Logue</h2>
        {isLoading ? (
          <div className="text-center py-10 animate-pulse text-muted-foreground">Loading Question Logue...</div>
        ) : error ? (
          <div className="text-destructive">Failed to load question logue.</div>
        ) : groupedQuestions.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">No questions found in database.</div>
        ) : (
          <div className="space-y-4">
            {groupedQuestions.map((group) => {
              const groupKey = group.batch_time
              const isExpanded = expandedGroups.has(groupKey)
              
              return (
                <div key={groupKey} className="border rounded-lg overflow-hidden bg-background">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1" onClick={() => toggleGroup(groupKey)}>
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                      <div>
                        <h3 className="font-bold text-lg">Batch: {group.batch_time}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-medium text-muted-foreground">
                            Includes multiple exams/papers from this upload session
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold bg-primary/10 text-primary px-2 py-1 rounded">
                        {group.questions.length} Qs
                      </span>
                      <button 
                        className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-semibold"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteGroup(group.batch_time, group.questions.length)
                        }}
                        disabled={deleteGroupMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Delete Batch</span>
                      </button>
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

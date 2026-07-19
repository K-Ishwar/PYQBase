'use client'

import { useState } from 'react'
import {
  useExams,
  useCreateExam,
  useDeleteExam,
  useSubjects,
  useTopics,
  useCreateSubject,
  useDeleteSubject,
  useCreateTopic,
  useDeleteTopic,
  useGenerateExamInfo
} from '@/lib/hooks/useTaxonomy'

export default function TaxonomyPage() {
  const { data: exams = [], isLoading: isLoadingExams } = useExams()
  const { data: subjects = [], isLoading: isLoadingSubjects } = useSubjects()
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const { data: topics = [], isLoading: isLoadingTopics } = useTopics(selectedSubjectId ?? undefined)

  const [newExam, setNewExam] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [newTopic, setNewTopic] = useState('')

  const createExam = useCreateExam()
  const deleteExam = useDeleteExam()
  const createSubject = useCreateSubject()
  const deleteSubject = useDeleteSubject()
  const createTopic = useCreateTopic()
  const deleteTopic = useDeleteTopic()
  const generateExamInfo = useGenerateExamInfo()

  function handleAddExam() {
    if (!newExam.trim()) return
    createExam.mutate(newExam.trim(), {
      onSuccess: () => setNewExam('')
    })
  }

  function handleDeleteExam(id: string) {
    if (confirm('Are you sure you want to delete this exam?')) {
      deleteExam.mutate(id)
    }
  }

  function handleAddSubject() {
    if (!newSubject.trim()) return
    createSubject.mutate(newSubject.trim(), {
      onSuccess: () => setNewSubject('')
    })
  }

  function handleDeleteSubject(id: string) {
    if (confirm('Are you sure you want to delete this subject and all its topics?')) {
      deleteSubject.mutate(id, {
        onSuccess: () => {
          if (selectedSubjectId === id) {
            setSelectedSubjectId(null)
          }
        }
      })
    }
  }

  function handleAddTopic() {
    if (!selectedSubjectId || !newTopic.trim()) return
    createTopic.mutate({ subjectId: selectedSubjectId, name: newTopic.trim() }, {
      onSuccess: () => setNewTopic('')
    })
  }

  function handleDeleteTopic(id: string) {
    if (confirm('Are you sure you want to delete this topic?')) {
      deleteTopic.mutate(id)
    }
  }



  const inputClass = 'flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
  const btnClass = 'rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-dark transition-colors disabled:opacity-50'
  const deleteBtnClass = 'rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50'

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Taxonomy Management</h1>
        <p className="mt-1 text-muted-foreground">Manage subjects and topics directly in the database.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exams Column */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-bold text-base">Exams</h2>
          <div className="flex gap-2">
            <input
              value={newExam}
              onChange={(e) => setNewExam(e.target.value)}
              placeholder="New exam name…"
              className={inputClass}
              onKeyDown={(e) => e.key === 'Enter' && handleAddExam()}
              disabled={createExam.isPending}
            />
            <button onClick={handleAddExam} disabled={createExam.isPending} className={btnClass}>Add</button>
          </div>
          {isLoadingExams ? (
            <p className="text-xs text-muted-foreground animate-pulse">Loading exams...</p>
          ) : (
            <ul className="space-y-1">
              {exams.map((e) => (
                <li
                  key={e.id}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-muted`}
                >
                  <span>{e.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(ev) => { ev.stopPropagation(); generateExamInfo.mutate(e.id) }}
                      className="rounded px-2 py-1 text-xs text-blue-500 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                      disabled={generateExamInfo.isPending}
                      title="Regenerate AI Info"
                    >
                      ✨ AI Info
                    </button>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); handleDeleteExam(e.id) }}
                      className={deleteBtnClass}
                      disabled={deleteExam.isPending}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
              {exams.length === 0 && <p className="text-xs text-muted-foreground px-3">No exams found.</p>}
            </ul>
          )}
        </div>

        {/* Subjects Column */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-bold text-base">Subjects</h2>
          <div className="flex gap-2">
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="New subject name…"
              className={inputClass}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
              disabled={createSubject.isPending}
            />
            <button onClick={handleAddSubject} disabled={createSubject.isPending} className={btnClass}>Add</button>
          </div>
          {isLoadingSubjects ? (
            <p className="text-xs text-muted-foreground animate-pulse">Loading subjects...</p>
          ) : (
            <ul className="space-y-1">
              {subjects.map((s) => (
                <li
                  key={s.id}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer transition-colors ${
                    selectedSubjectId === s.id
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => {
                    setSelectedSubjectId(s.id)
                  }}
                >
                  <span>{s.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSubject(s.id) }}
                    className={deleteBtnClass}
                    disabled={deleteSubject.isPending}
                  >
                    ✕
                  </button>
                </li>
              ))}
              {subjects.length === 0 && <p className="text-xs text-muted-foreground px-3">No subjects found.</p>}
            </ul>
          )}
        </div>

        {/* Topics Column */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-bold text-base">
            Topics
            {selectedSubjectId && (
              <span className="ml-2 text-sm font-normal text-primary">
                ({subjects.find((s) => s.id === selectedSubjectId)?.name})
              </span>
            )}
          </h2>
          {!selectedSubjectId ? (
            <p className="text-sm text-muted-foreground px-3">← Select a subject first</p>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="New topic name…"
                  className={inputClass}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                  disabled={createTopic.isPending}
                />
                <button onClick={handleAddTopic} disabled={createTopic.isPending} className={btnClass}>Add</button>
              </div>
              {isLoadingTopics ? (
                <p className="text-xs text-muted-foreground animate-pulse">Loading topics...</p>
              ) : (
                <ul className="space-y-1">
                  {topics.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
                    >
                      <span>{t.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTopic(t.id) }}
                        className={deleteBtnClass}
                        disabled={deleteTopic.isPending}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                  {topics.length === 0 && <p className="text-xs text-muted-foreground px-3">No topics yet.</p>}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

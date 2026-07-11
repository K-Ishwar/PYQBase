'use client'

import { useState } from 'react'
import {
  useSubjects,
  useTopics,
  useSubtopics,
  useCreateSubject,
  useDeleteSubject,
  useCreateTopic,
  useDeleteTopic,
  useCreateSubtopic,
  useDeleteSubtopic,
} from '@/lib/hooks/useTaxonomy'

export default function TaxonomyPage() {
  const { data: subjects = [], isLoading: isLoadingSubjects } = useSubjects()
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const { data: topics = [], isLoading: isLoadingTopics } = useTopics(selectedSubjectId ?? undefined)

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const { data: subtopics = [], isLoading: isLoadingSubtopics } = useSubtopics(selectedTopicId ?? undefined)

  // Form states
  const [newSubject, setNewSubject] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [newSubtopic, setNewSubtopic] = useState('')

  // Mutations
  const createSubject = useCreateSubject()
  const deleteSubject = useDeleteSubject()
  const createTopic = useCreateTopic()
  const deleteTopic = useDeleteTopic()
  const createSubtopic = useCreateSubtopic()
  const deleteSubtopic = useDeleteSubtopic()

  function handleAddSubject() {
    if (!newSubject.trim()) return
    createSubject.mutate(newSubject.trim(), {
      onSuccess: () => setNewSubject('')
    })
  }

  function handleDeleteSubject(id: string) {
    if (confirm('Are you sure you want to delete this subject and all its topics/subtopics?')) {
      deleteSubject.mutate(id, {
        onSuccess: () => {
          if (selectedSubjectId === id) {
            setSelectedSubjectId(null)
            setSelectedTopicId(null)
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
    if (confirm('Are you sure you want to delete this topic and all its subtopics?')) {
      deleteTopic.mutate(id, {
        onSuccess: () => {
          if (selectedTopicId === id) setSelectedTopicId(null)
        }
      })
    }
  }

  function handleAddSubtopic() {
    if (!selectedTopicId || !newSubtopic.trim()) return
    createSubtopic.mutate({ topicId: selectedTopicId, name: newSubtopic.trim() }, {
      onSuccess: () => setNewSubtopic('')
    })
  }

  function handleDeleteSubtopic(id: string) {
    if (confirm('Are you sure you want to delete this subtopic?')) {
      deleteSubtopic.mutate(id)
    }
  }

  const inputClass = 'flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
  const btnClass = 'rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-dark transition-colors disabled:opacity-50'
  const deleteBtnClass = 'rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50'

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Taxonomy Management</h1>
        <p className="mt-1 text-muted-foreground">Manage subjects, topics, and subtopics directly in the database.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    setSelectedTopicId(null)
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
                      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer transition-colors ${
                        selectedTopicId === t.id
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedTopicId(t.id)}
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

        {/* Subtopics Column */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-bold text-base">
            Subtopics
            {selectedTopicId && (
              <span className="ml-2 text-sm font-normal text-primary">
                ({topics.find((t) => t.id === selectedTopicId)?.name})
              </span>
            )}
          </h2>
          {!selectedTopicId ? (
            <p className="text-sm text-muted-foreground px-3">← Select a topic first</p>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={newSubtopic}
                  onChange={(e) => setNewSubtopic(e.target.value)}
                  placeholder="New subtopic name…"
                  className={inputClass}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubtopic()}
                  disabled={createSubtopic.isPending}
                />
                <button onClick={handleAddSubtopic} disabled={createSubtopic.isPending} className={btnClass}>Add</button>
              </div>
              {isLoadingSubtopics ? (
                <p className="text-xs text-muted-foreground animate-pulse">Loading subtopics...</p>
              ) : (
                <ul className="space-y-1">
                  {subtopics.map((st) => (
                    <li key={st.id} className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted">
                      <span>{st.name}</span>
                      <button
                        onClick={() => handleDeleteSubtopic(st.id)}
                        className={deleteBtnClass}
                        disabled={deleteSubtopic.isPending}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                  {subtopics.length === 0 && <p className="text-xs text-muted-foreground px-3">No subtopics yet.</p>}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}


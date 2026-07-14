"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subject { id: string; name: string }
interface Topic { id: string; name: string; subject_id: string }
interface Subtopic { id: string; name: string; topic_id: string }
interface Question {
  id: string
  question_number: number
  exam?: string
  year?: number
  header_context?: string
  raw_question_stem?: string
  raw_options?: Record<string, string>
  correct_option?: string
  parse_confidence: number
  review_status: string
  reviewer_notes?: string
  subject_id?: string | null
  topic_id?: string | null
  subtopic_id?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ConfidenceBadge({ score }: { score: number }) {
  const pct = (score * 100).toFixed(0)
  const cls =
    score >= 0.95
      ? "bg-green-100 text-green-800"
      : score >= 0.80
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800"
  return <span className={`text-xs px-2 py-1 rounded-full font-medium ${cls}`}>Conf: {pct}%</span>
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "approved"
      ? "bg-green-100 text-green-800"
      : status === "rejected"
      ? "bg-red-100 text-red-800"
      : status === "needs_edit"
      ? "bg-orange-100 text-orange-800"
      : "bg-slate-100 text-slate-700"
  return <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${cls}`}>{status.replace("_", " ")}</span>
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReviewBatchPage() {
  const { batch_id } = useParams()
  const router = useRouter()

  const [batch, setBatch] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [bulkApproving, setBulkApproving] = useState(false)
  const [error, setError] = useState("")

  // Taxonomy data — loaded once and cached
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topicsMap, setTopicsMap] = useState<Record<string, Topic[]>>({}) // subject_id → topics[]
  const [subtopicsMap, setSubtopicsMap] = useState<Record<string, Subtopic[]>>({}) // topic_id → subtopics[]
  const [taxonomyReady, setTaxonomyReady] = useState(false)

  // Track pending PATCH saves so we show a subtle "saving..." indicator
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchBatchAndQuestions = useCallback(async () => {
    try {
      const [batchRes, qsRes] = await Promise.all([
        apiClient(`/api/v1/admin/ingestion/batches/${batch_id}`),
        apiClient(`/api/v1/admin/ingestion/batches/${batch_id}/staged`),
      ])
      if (batchRes.ok) {
        const b = await batchRes.json()
        setBatch(b)
      }
      if (qsRes.ok) {
        const data: Question[] = await qsRes.json()
        if (data.length === 0) {
          router.push("/admin/ingestion")
        } else {
          setQuestions(data)
        }
      }
    } catch (err) {
      console.error("fetchBatchAndQuestions error:", err)
    } finally {
      setPageLoading(false)
    }
  }, [batch_id])

  // Load all taxonomy upfront — subjects → all topics per subject → all subtopics per topic
  const fetchAllTaxonomy = useCallback(async () => {
    try {
      const subRes = await apiClient("/api/v1/taxonomy/subjects")
      if (!subRes.ok) return
      const subList: Subject[] = await subRes.json()
      setSubjects(subList)

      // Fetch all topics for every subject in parallel
      const topicResponses = await Promise.all(
        subList.map(s => apiClient(`/api/v1/taxonomy/subjects/${s.id}/topics`))
      )
      const newTopicsMap: Record<string, Topic[]> = {}
      const allTopics: Topic[] = []
      for (let i = 0; i < subList.length; i++) {
        if (topicResponses[i].ok) {
          const ts: Topic[] = await topicResponses[i].json()
          newTopicsMap[subList[i].id] = ts
          allTopics.push(...ts)
        }
      }
      setTopicsMap(newTopicsMap)

      // Fetch all subtopics for every topic in parallel (deduplicated)
      const subtopicResponses = await Promise.all(
        allTopics.map(t => apiClient(`/api/v1/taxonomy/topics/${t.id}/subtopics`))
      )
      const newSubtopicsMap: Record<string, Subtopic[]> = {}
      for (let i = 0; i < allTopics.length; i++) {
        if (subtopicResponses[i].ok) {
          const ss: Subtopic[] = await subtopicResponses[i].json()
          newSubtopicsMap[allTopics[i].id] = ss
        }
      }
      setSubtopicsMap(newSubtopicsMap)
      setTaxonomyReady(true)
    } catch (err) {
      console.error("fetchAllTaxonomy error:", err)
    }
  }, [])

  useEffect(() => {
    fetchBatchAndQuestions()
    fetchAllTaxonomy()
  }, [])

  // Poll while AI is processing
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    const isProcessing = batch?.status === "parsing" || batch?.status === "parsed"
    if (isProcessing) {
      pollRef.current = setInterval(fetchBatchAndQuestions, 5000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [batch?.status])

  // ── Background PATCH helper — optimistic UI ────────────────────────────────
  const patchQuestion = useCallback(async (id: string, updates: Partial<Question>) => {
    // 1. Update local state immediately (optimistic)
    setQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, ...updates } : q))
    )

    // 2. Fire PATCH in background
    setSavingIds(prev => new Set(prev).add(id))
    try {
      const res = await apiClient(`/api/v1/admin/ingestion/staged/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error("PATCH failed:", data.detail || res.statusText)
      }
    } catch (err) {
      console.error("patchQuestion error:", err)
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [])

  // ── Subject change — clear topic & subtopic ────────────────────────────────
  const handleSubjectChange = useCallback((q: Question, newSubjectId: string) => {
    patchQuestion(q.id, {
      subject_id: newSubjectId || null,
      topic_id: null,
      subtopic_id: null,
    })
  }, [patchQuestion])

  const handleTopicChange = useCallback((q: Question, newTopicId: string) => {
    patchQuestion(q.id, { topic_id: newTopicId || null, subtopic_id: null })
  }, [patchQuestion])

  // ── Bulk approve ───────────────────────────────────────────────────────────
  const handleBulkApprove = useCallback(async () => {
    const toApprove = questions.filter(
      q => q.review_status !== "approved" && q.review_status !== "rejected"
    )
    if (toApprove.length === 0) {
      alert("No pending questions to approve.")
      return
    }

    setBulkApproving(true)

    // Optimistic update all at once
    setQuestions(prev =>
      prev.map(q =>
        toApprove.find(ta => ta.id === q.id) ? { ...q, review_status: "approved" } : q
      )
    )

    // Fire ONE bulk request instead of N individual ones
    try {
      const res = await apiClient(`/api/v1/admin/ingestion/staged/bulk-approve`, {
        method: "POST",
        body: JSON.stringify({ ids: toApprove.map(q => q.id) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Bulk approve failed")
      }
      alert(`✓ Bulk approved ${toApprove.length} questions.`)
    } catch (err: any) {
      console.error("Bulk approve error:", err)
      alert(`Error: ${err.message}. Please refresh and try again.`)
    } finally {
      setBulkApproving(false)
    }
  }, [questions])

  // ── Publish ────────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    setPublishing(true)
    setError("")
    try {
      const res = await apiClient(`/api/v1/admin/ingestion/batches/${batch_id}/publish`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || "Failed to publish")
      }
      const data = await res.json()
      alert(`✓ Successfully published ${data.published_count} questions!`)
      fetchBatchAndQuestions()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setPublishing(false)
    }
  }, [batch_id])

  // ── Derived state ──────────────────────────────────────────────────────────
  const isAIProcessing = batch?.status === "parsing" || batch?.status === "parsed"
  const processedCount = questions.filter(q => q.subject_id !== null).length
  const progressPercent = questions.length > 0 ? Math.round((processedCount / questions.length) * 100) : 0
  const approvedCount = questions.filter(q => q.review_status === "approved").length
  const pendingCount = questions.filter(q => q.review_status === "pending" || q.review_status === "needs_edit").length

  // ── Loading / error states ─────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="p-10 flex flex-col items-center gap-4 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-muted-foreground">Loading batch data...</p>
      </div>
    )
  }
  if (!batch) return <div className="p-10 text-center text-red-500">Batch not found</div>

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-card p-5 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">
            {batch.exam} — {batch.year} ({batch.paper})
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Status: <span className="font-semibold uppercase">{batch.status}</span>
            {" · "}
            <span className="text-green-700 font-medium">{approvedCount} approved</span>
            {" · "}
            <span className="text-orange-700 font-medium">{pendingCount} pending</span>
            {" · "}
            {questions.length} total
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleBulkApprove}
            disabled={bulkApproving || publishing || pendingCount === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {bulkApproving ? "Approving..." : `Approve All Pending (${pendingCount})`}
          </button>
          <button
            onClick={handlePublish}
            disabled={approvedCount === 0 || publishing}
            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
          >
            {publishing ? "Publishing..." : `Publish Approved (${approvedCount})`}
          </button>
        </div>
      </div>

      {/* ── AI Progress Bar ── */}
      {isAIProcessing && questions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-2">
          <div className="flex justify-between text-sm font-medium text-blue-800">
            <span>🤖 AI is categorizing questions...</span>
            <span>{processedCount} / {questions.length} ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-700 ease-in-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 whitespace-pre-wrap text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ── Taxonomy not ready warning ── */}
      {!taxonomyReady && (
        <div className="bg-yellow-50 text-yellow-700 p-3 rounded-xl border border-yellow-200 text-sm">
          Loading taxonomy dropdowns...
        </div>
      )}

      {/* ── Question Cards ── */}
      <div className="space-y-4">
        {questions.map((q) => {
          const isSaving = savingIds.has(q.id)
          const topicsForSubject = (q.subject_id && topicsMap[q.subject_id]) || []
          const subtopicsForTopic = (q.topic_id && subtopicsMap[q.topic_id]) || []
          const isApproved = q.review_status === "approved"

          return (
            <div
              key={q.id}
              className={`border rounded-xl shadow-sm transition-colors duration-300 ${
                isApproved ? "border-green-300 bg-green-50/40" : "border-border bg-card"
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-wrap justify-between items-center gap-3 p-4 border-b">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base">Q{q.question_number}</span>
                  <ConfidenceBadge score={q.parse_confidence} />
                  <StatusBadge status={q.review_status} />
                  {(q.year || q.exam) && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                      {q.exam} {q.year}
                    </span>
                  )}
                  {isSaving && (
                    <span className="text-xs text-muted-foreground italic">saving...</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => patchQuestion(q.id, { review_status: "approved" })}
                    disabled={isApproved}
                    className="px-3 py-1.5 bg-green-100 text-green-800 hover:bg-green-200 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => patchQuestion(q.id, { review_status: "rejected" })}
                    className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    ✗ Reject
                  </button>
                  {q.review_status !== "pending" && (
                    <button
                      onClick={() => patchQuestion(q.id, { review_status: "pending" })}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      ↩ Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 grid md:grid-cols-2 gap-5">
                {/* Left: Question content */}
                <div className="space-y-3">
                  {q.header_context && (
                    <p className="text-xs text-muted-foreground font-mono truncate" title={q.header_context}>
                      📂 {q.header_context}
                    </p>
                  )}
                  <textarea
                    className="w-full bg-background border rounded-lg p-3 text-sm resize-y font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    defaultValue={q.raw_question_stem || ""}
                    rows={4}
                    onBlur={(e) => {
                      if (e.target.value !== q.raw_question_stem) {
                        patchQuestion(q.id, { raw_question_stem: e.target.value })
                      }
                    }}
                  />
                  <div className="space-y-1.5">
                    {Object.entries(q.raw_options || {}).map(([k, v]) => (
                      <div key={k} className="flex gap-2 items-center">
                        <span
                          className={`font-bold w-6 text-center shrink-0 text-sm ${
                            q.correct_option === k ? "text-green-600" : "text-muted-foreground"
                          }`}
                        >
                          {k}
                        </span>
                        <input
                          className="flex-1 bg-background border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          defaultValue={v as string}
                          onBlur={(e) => {
                            if (e.target.value !== v) {
                              patchQuestion(q.id, { raw_options: { ...q.raw_options, [k]: e.target.value } })
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Taxonomy + Correct Answer */}
                <div className="space-y-4">
                  {/* Correct Answer */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Correct Answer
                    </label>
                    <div className="flex gap-2">
                      {["A", "B", "C", "D"].map(opt => (
                        <button
                          key={opt}
                          onClick={() => patchQuestion(q.id, { correct_option: opt })}
                          className={`w-9 h-9 rounded-lg text-sm font-bold border-2 transition-colors ${
                            q.correct_option === opt
                              ? "bg-green-500 text-white border-green-500"
                              : "bg-background text-foreground border-border hover:border-green-400"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                      {q.correct_option && (
                        <button
                          onClick={() => patchQuestion(q.id, { correct_option: undefined })}
                          className="px-2 h-9 rounded-lg text-xs text-muted-foreground border hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Taxonomy */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Taxonomy Assignment
                    </label>
                    <div className="space-y-2">
                      {/* Subject */}
                      <select
                        className="w-full text-sm p-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        value={q.subject_id || ""}
                        onChange={(e) => handleSubjectChange(q, e.target.value)}
                        disabled={!taxonomyReady}
                      >
                        <option value="">— Select Subject —</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>

                      {/* Topic */}
                      <select
                        className="w-full text-sm p-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        value={q.topic_id || ""}
                        disabled={!q.subject_id || !taxonomyReady}
                        onChange={(e) => handleTopicChange(q, e.target.value)}
                      >
                        <option value="">— Select Topic —</option>
                        {topicsForSubject.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>

                      {/* Subtopic */}
                      <select
                        className="w-full text-sm p-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        value={q.subtopic_id || ""}
                        disabled={!q.topic_id || !taxonomyReady}
                        onChange={(e) => patchQuestion(q.id, { subtopic_id: e.target.value || null })}
                      >
                        <option value="">— Select Subtopic —</option>
                        {subtopicsForTopic.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Reviewer notes */}
                  {q.reviewer_notes && (
                    <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                      ⚠ {q.reviewer_notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

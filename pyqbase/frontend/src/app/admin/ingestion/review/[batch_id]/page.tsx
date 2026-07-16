"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { QuestionTags } from "@/components/ui/QuestionTags"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subject { id: string; name: string }
interface Topic { id: string; name: string; subject_id: string }

interface Question {
  id: string
  question_number: number
  exam?: string
  year?: number
  paper?: string
  header_context?: string
  raw_question_stem?: string
  raw_options?: Record<string, string>
  correct_option?: string
  parse_confidence: number
  review_status: string
  reviewer_notes?: string
  subject_id?: string | null
  topic_id?: string | null
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
  const [isStartingAI, setIsStartingAI] = useState(false)
  const [error, setError] = useState("")
  const [duplicates, setDuplicates] = useState<any[]>([]) // Questions flagged as duplicates after publish


  // Taxonomy data — loaded once and cached
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topicsMap, setTopicsMap] = useState<Record<string, Topic[]>>({}) // subject_id → topics[]
  const [taxonomyReady, setTaxonomyReady] = useState(false)

  // Track pending PATCH saves so we show a subtle "saving..." indicator
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchBatchAndQuestions = useCallback(async () => {
    try {
      const [batchRes, qsRes, taxRes] = await Promise.all([
        apiClient(`/api/v1/admin/ingestion/batches/${batch_id}`),
        apiClient(`/api/v1/admin/ingestion/batches/${batch_id}/staged`),
        apiClient(`/api/v1/taxonomy/all`)
      ])
      if (batchRes.ok) {
        const b = await batchRes.json()
        setBatch(b)
      }
      if (qsRes.ok) {
        const data: Question[] = await qsRes.json()
        setQuestions(data)
      }
      if (taxRes.ok) {
        const taxData = await taxRes.json()
        setSubjects(taxData.subjects)
        const newTopicsMap: Record<string, Topic[]> = {}
        taxData.topics.forEach((t: Topic) => {
          if (!newTopicsMap[t.subject_id]) newTopicsMap[t.subject_id] = []
          newTopicsMap[t.subject_id].push(t)
        })
        setTopicsMap(newTopicsMap)
        setTaxonomyReady(true)
      }
    } catch (err) {
      console.error("fetchBatchAndQuestions error:", err)
    } finally {
      setPageLoading(false)
    }
  }, [batch_id])

  // Load all taxonomy upfront — subjects → all topics per subject
  const fetchAllTaxonomy = useCallback(async () => {
    try {
      const res = await apiClient("/api/v1/taxonomy/all")
      if (!res.ok) return
      
      const data: { subjects: Subject[], topics: Topic[] } = await res.json()
      
      setSubjects(data.subjects)

      const newTopicsMap: Record<string, Topic[]> = {}
      data.topics.forEach(t => {
        if (!newTopicsMap[t.subject_id]) newTopicsMap[t.subject_id] = []
        newTopicsMap[t.subject_id].push(t)
      })
      setTopicsMap(newTopicsMap)


      
      setTaxonomyReady(true)
    } catch (err) {
      console.error("fetchAllTaxonomy error:", err)
    }
  }, [])

  useEffect(() => {
    fetchBatchAndQuestions()
  }, [])

  // Poll while AI is processing or while no questions have loaded yet
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    const isProcessing = batch?.status === "parsing" || batch?.status === "parsed" || questions.length === 0
    if (isProcessing) {
      // Poll every 3 seconds while parsing for faster feedback
      pollRef.current = setInterval(fetchBatchAndQuestions, 3000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [batch?.status, questions.length])

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

  // ── Subject change — clear topic ────────────────────────────────
  const handleSubjectChange = useCallback((q: Question, newSubjectId: string) => {
    patchQuestion(q.id, {
      subject_id: newSubjectId || null,
      topic_id: null,
    })
  }, [patchQuestion])

  const handleTopicChange = useCallback((q: Question, newTopicId: string) => {
    patchQuestion(q.id, { topic_id: newTopicId || null })
  }, [patchQuestion])

  // ── Bulk approve — only questions with complete taxonomy ──────────────────
  const handleBulkApprove = useCallback(async () => {
    const toApprove = questions.filter(
      q => q.review_status !== "approved"
        && q.review_status !== "rejected"
        && q.subject_id && q.topic_id // Must have full taxonomy
        && q.correct_option           // Must have correct answer
    )
    const missingData = questions.filter(
      q => q.review_status !== "approved"
        && q.review_status !== "rejected"
        && (!q.subject_id || !q.topic_id || !q.correct_option)
    )
    if (toApprove.length === 0) {
      if (missingData.length > 0) {
        alert(`No questions can be bulk approved yet — ${missingData.length} question(s) are missing Subject/Topic or Correct Answer. Please categorize and assign answers first.`)
      } else {
        alert("No pending questions to approve.")
      }
      return
    }

    setBulkApproving(true)
    // Optimistic update
    setQuestions(prev =>
      prev.map(q =>
        toApprove.find(ta => ta.id === q.id) ? { ...q, review_status: "approved" } : q
      )
    )

    try {
      const res = await apiClient(`/api/v1/admin/ingestion/staged/bulk-approve`, {
        method: "POST",
        body: JSON.stringify({ ids: toApprove.map(q => q.id) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Bulk approve failed")
      }
      const skippedMsg = missingData.length > 0
        ? ` (${missingData.length} skipped — missing taxonomy or answer)`
        : ""
      alert(`✓ Bulk approved ${toApprove.length} questions.${skippedMsg}`)
    } catch (err: any) {
      console.error("Bulk approve error:", err)
      alert(`Error: ${err.message}. Please refresh and try again.`)
    } finally {
      setBulkApproving(false)
    }
  }, [questions])


  // ── Run AI Categorization ─────────────────────────────────────────────────
  const handleRunAI = useCallback(async () => {
    if (!confirm("Start AI categorization for perfectly structured questions?")) return;
    setIsStartingAI(true)
    try {
      const res = await apiClient(`/api/v1/admin/ingestion/batches/${batch_id}/run-ai`, {
        method: "POST"
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Failed to start AI")
      }
      alert("AI Categorization started! It will process in the background.")
      // Fetch right away to update the batch status
      fetchBatchAndQuestions()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setIsStartingAI(false)
    }
  }, [batch_id, fetchBatchAndQuestions])

  // ── Publish ────────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    setPublishing(true)
    setError("")
    try {
      const res = await apiClient(`/api/v1/admin/ingestion/batches/${batch_id}/publish`, {
        method: "POST",
        body: JSON.stringify({ force_publish_ids: [] })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || "Failed to publish")
      }
      const data = await res.json()

      // Show duplicates panel if any were found
      if (data.duplicates && data.duplicates.length > 0) {
        setDuplicates(data.duplicates)
      }

      const msg = [
        data.published_count > 0 ? `✓ Published ${data.published_count} questions.` : null,
        data.duplicates?.length > 0 ? `⚠ ${data.duplicates.length} duplicates detected — review below.` : null,
        data.invalid?.length > 0 ? `⚠ ${data.invalid.length} questions missing taxonomy/answer — fix and re-approve.` : null,
      ].filter(Boolean).join("\n")
      
      if (msg) alert(msg)
      fetchBatchAndQuestions()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setPublishing(false)
    }
  }, [batch_id])

  // ── Derived state ──────────────────────────────────────────────────────────
  const isAIProcessing = batch?.status === "parsing" || isStartingAI
  const processedCount = questions.filter(q => q.subject_id !== null && q.topic_id !== null).length
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

  // Still waiting for questions to be parsed and inserted
  if (questions.length === 0) {
    return (
      <div className="p-10 flex flex-col items-center gap-6 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
        <div>
          <h2 className="text-xl font-bold mb-2">Parsing your file...</h2>
          <p className="text-muted-foreground">
            Batch status: <span className="font-semibold uppercase">{batch?.status}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">Questions will appear here automatically once extraction is complete.</p>
        </div>
        {batch?.error_log && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm max-w-lg text-left">
            <strong>Error:</strong> {batch.error_log}
          </div>
        )}
      </div>
    )
  }

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
          {(batch?.status === "parsed" || processedCount < questions.length) && (
            <button
              onClick={handleRunAI}
              disabled={isStartingAI}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {isStartingAI ? "Starting AI..." : "Run AI Categorization"}
            </button>
          )}
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

      {/* ── AI Progress Bar / Uncategorized Alert ── */}
      {(isAIProcessing || processedCount < questions.length) && questions.length > 0 && (
        <div className={`border p-4 rounded-xl space-y-2 ${processedCount < questions.length && !isAIProcessing ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className={`flex justify-between text-sm font-medium ${processedCount < questions.length && !isAIProcessing ? 'text-amber-800' : 'text-blue-800'}`}>
            <span>
              {isAIProcessing 
                ? "🤖 AI is categorizing questions..." 
                : "⚠️ Some questions need AI categorization (or manual selection)"}
            </span>
            <span>{processedCount} / {questions.length} ({progressPercent}%)</span>
          </div>
          <div className={`w-full rounded-full h-2.5 ${processedCount < questions.length && !isAIProcessing ? 'bg-amber-200' : 'bg-blue-100'}`}>
            <div
              className={`${processedCount < questions.length && !isAIProcessing ? 'bg-amber-500' : 'bg-blue-500'} h-2.5 rounded-full transition-all duration-700 ease-in-out`}
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

      {/* ── Duplicates Panel ── */}
      {duplicates.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 space-y-3">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <div>
              <h3 className="font-bold text-amber-900">⚠️ {duplicates.length} Duplicate Question{duplicates.length > 1 ? 's' : ''} Found</h3>
              <p className="text-sm text-amber-700 mt-0.5">These already exist in the database. Discard them or keep for manual review.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!confirm(`Discard all ${duplicates.length} duplicate questions?`)) return
                  try {
                    await apiClient(`/api/v1/admin/ingestion/staged/bulk-reject`, {
                      method: "POST",
                      body: JSON.stringify({ ids: duplicates.map((d: any) => d.id) }),
                    })
                    setDuplicates([])
                    setQuestions(prev => prev.map(q =>
                      duplicates.find((d: any) => d.id === q.id) ? { ...q, review_status: "rejected" } : q
                    ))
                  } catch { alert("Failed to reject duplicates") }
                }}
                className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium"
              >
                Discard All
              </button>
              <button onClick={() => setDuplicates([])} className="px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-sm font-medium">
                Dismiss
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {duplicates.map((d: any) => (
              <div key={d.id} className="flex justify-between items-start bg-white border border-amber-200 rounded-lg p-3 gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-amber-800 mr-2">Q{d.question_number}</span>
                  <span className="text-sm text-gray-700 line-clamp-2">{d.raw_question_stem}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      try {
                        // Set to approved first
                        await apiClient(`/api/v1/admin/ingestion/staged/${d.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ review_status: "approved" }),
                        })
                        // Then force publish
                        const res = await apiClient(`/api/v1/admin/ingestion/batches/${batch_id}/publish`, {
                          method: "POST",
                          body: JSON.stringify({ force_publish_ids: [d.id] })
                        })
                        if (!res.ok) {
                          const errData = await res.json()
                          throw new Error(errData.detail || "Failed to force publish")
                        }
                        alert("Forced publish successful.")
                        setDuplicates(prev => prev.filter((x: any) => x.id !== d.id))
                        fetchBatchAndQuestions()
                      } catch (err: any) { 
                        alert(err.message || "Failed to force publish") 
                      }
                    }}
                    className="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium"
                  >
                    Force Publish
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await apiClient(`/api/v1/admin/ingestion/staged/${d.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ review_status: "rejected" }),
                        })
                        setDuplicates(prev => prev.filter((x: any) => x.id !== d.id))
                        setQuestions(prev => prev.map(q => q.id === d.id ? { ...q, review_status: "rejected" } : q))
                      } catch { alert("Failed to reject") }
                    }}
                    className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium"
                  >
                    Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
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
                  <QuestionTags
                    exam={q.exam || batch?.exam || ''}
                    year={q.year || batch?.year || 0}
                    paper={q.paper || batch?.paper || ''}
                  />
                  {isSaving && (
                    <span className="text-xs text-muted-foreground italic">saving...</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* Approve requires full taxonomy */}
                  {(() => {
                    const canApprove = !!(q.subject_id && q.topic_id && q.correct_option)
                    return (
                      <div className="relative group">
                        <button
                          onClick={() => patchQuestion(q.id, { review_status: "approved" })}
                          disabled={isApproved || !canApprove}
                          className="px-3 py-1.5 bg-green-100 text-green-800 hover:bg-green-200 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          ✓ Approve
                        </button>
                        {!canApprove && !isApproved && (
                          <div className="absolute bottom-full left-0 mb-1 w-48 bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            {!q.subject_id ? "Select Subject first" : !q.topic_id ? "Select Topic first" : "Select correct answer"}
                          </div>
                        )}
                      </div>
                    )
                  })()}
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

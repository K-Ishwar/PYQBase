"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

export default function ReviewBatchPage() {
  const { batch_id } = useParams()
  const router = useRouter()
  
  const [batch, setBatch] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState("")

  // Taxonomy states
  const [subjects, setSubjects] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [subtopics, setSubtopics] = useState<any[]>([])

  useEffect(() => {
    fetchData()
    fetchTaxonomy()
    // Poll every 5 seconds if still parsing or reviewing
    const interval = setInterval(() => {
      if (batch?.status === "parsing" || batch?.status === "reviewing") {
        fetchData()
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [batch?.status])

  const fetchData = async () => {
    try {
      const [batchRes, qsRes] = await Promise.all([
        fetch(`http://localhost:8000/api/v1/admin/ingestion/batches/${batch_id}`),
        fetch(`http://localhost:8000/api/v1/admin/ingestion/batches/${batch_id}/staged`)
      ])
      if (batchRes.ok) setBatch(await batchRes.json())
      if (qsRes.ok) setQuestions(await qsRes.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTaxonomy = async () => {
    try {
      const subRes = await fetch("http://localhost:8000/api/v1/taxonomy/subjects")
      if (subRes.ok) setSubjects(await subRes.json())
      // For simplicity in UI, we fetch all topics and subtopics for now if we can,
      // but the API requires subject_id for topics. We will fetch them lazily or just fetch all topics/subtopics if we modify the API.
      // Wait, let's just make it simpler by relying on the auto-classification.
      // We will fetch topics/subtopics dynamically when a user clicks, or if the question already has them.
    } catch (err) {
      console.error(err)
    }
  }

  // Helper to fetch topics when a subject is selected/known
  const loadTopics = async (subjectId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/taxonomy/subjects/${subjectId}/topics`)
      if (res.ok) {
        const data = await res.json()
        setTopics(prev => {
          const newTopics = [...prev]
          data.forEach((d: any) => { if (!newTopics.find(t => t.id === d.id)) newTopics.push(d) })
          return newTopics
        })
      }
    } catch (err) {}
  }

  // Helper to fetch subtopics when a topic is selected/known
  const loadSubtopics = async (topicId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/taxonomy/topics/${topicId}/subtopics`)
      if (res.ok) {
        const data = await res.json()
        setSubtopics(prev => {
          const newSubtopics = [...prev]
          data.forEach((d: any) => { if (!newSubtopics.find(t => t.id === d.id)) newSubtopics.push(d) })
          return newSubtopics
        })
      }
    } catch (err) {}
  }

  // Initial load of taxonomy for questions that already have it
  useEffect(() => {
    questions.forEach(q => {
      if (q.subject_id) loadTopics(q.subject_id)
      if (q.topic_id) loadSubtopics(q.topic_id)
    })
  }, [questions])

  const updateQuestionStatus = async (id: string, updates: any) => {
    try {
      await fetch(`http://localhost:8000/api/v1/admin/ingestion/staged/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    setError("")
    try {
      const res = await fetch(`http://localhost:8000/api/v1/admin/ingestion/batches/${batch_id}/publish`, {
        method: "POST"
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || "Failed to publish")
      }
      alert("Batch published successfully!")
      router.push("/admin/ingestion")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setPublishing(false)
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.95) return "bg-green-100 text-green-800"
    if (score >= 0.90) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  if (loading) return <div className="p-10 text-center">Loading batch data...</div>
  if (!batch) return <div className="p-10 text-center text-red-500">Batch not found</div>

  const canPublish = questions.length > 0 && questions.every(q => 
    q.review_status === "approved" || q.review_status === "rejected"
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Review Batch: {batch.exam} {batch.year}</h1>
          <p className="text-sm text-muted-foreground">Status: <span className="font-semibold uppercase">{batch.status}</span> | Questions: {questions.length}</p>
        </div>
        <div className="space-x-4">
          <button 
            onClick={() => {
              questions.forEach(q => {
                if (q.parse_confidence >= 0.95 && q.review_status !== "approved") {
                  updateQuestionStatus(q.id, { review_status: "approved" })
                }
              })
            }}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 text-sm font-medium"
          >
            Bulk Approve (>0.95)
          </button>
          <button 
            onClick={handlePublish}
            disabled={!canPublish || publishing}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 font-medium"
          >
            {publishing ? "Publishing..." : "Publish Approved"}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">{error}</div>}

      <div className="space-y-6">
        {questions.map((q: any) => (
          <div key={q.id} className={`border rounded-xl p-6 shadow-sm ${q.review_status === 'approved' ? 'bg-green-50/50 border-green-200' : 'bg-card'}`}>
            <div className="flex justify-between items-start mb-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold">Q{q.question_number}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConfidenceColor(q.parse_confidence)}`}>
                  Conf: {(q.parse_confidence * 100).toFixed(1)}%
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-800 font-medium capitalize">
                  Status: {q.review_status}
                </span>
              </div>
              <div className="space-x-2">
                <button onClick={() => updateQuestionStatus(q.id, { review_status: "approved" })} className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-sm font-medium">Approve</button>
                <button onClick={() => updateQuestionStatus(q.id, { review_status: "needs_edit" })} className="px-3 py-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded text-sm font-medium">Needs Edit</button>
                <button onClick={() => updateQuestionStatus(q.id, { review_status: "rejected" })} className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-sm font-medium">Reject</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Left: Raw Extraction */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Raw OCR Extraction (Ground Truth)</h4>
                <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
                  {q.raw_question_stem}
                  <div className="mt-4 space-y-1">
                    {Object.entries(q.raw_options || {}).map(([k, v]) => (
                      <div key={k}>{k}) {v as string}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: AI Paraphrased */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">AI Paraphrased (Public)</h4>
                  {q.lexical_similarity_score && (
                    <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Sim: {(q.lexical_similarity_score * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
                
                <div className="bg-background border p-4 rounded-lg space-y-4">
                  <textarea 
                    className="w-full text-sm p-2 border rounded resize-y" 
                    defaultValue={q.paraphrased_stem?.en || "Processing..."}
                    rows={3}
                  />
                  
                  <div className="space-y-2">
                    {Object.entries(q.paraphrased_options?.en || {}).map(([k, v]) => (
                      <div key={k} className="flex gap-2 items-start">
                        <span className={`font-bold mt-2 ${q.correct_option === k ? 'text-green-600' : ''}`}>{k})</span>
                        <input className="flex-1 text-sm p-2 border rounded" defaultValue={v as string} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subject/Topic Assignment */}
                <div className="grid grid-cols-3 gap-2">
                   <select 
                     className="text-sm p-2 border rounded bg-white" 
                     value={q.subject_id || ""}
                     onChange={(e) => {
                       updateQuestionStatus(q.id, { subject_id: e.target.value, topic_id: null, subtopic_id: null })
                       loadTopics(e.target.value)
                     }}
                   >
                     <option value="">Select Subject...</option>
                     {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>

                   <select 
                     className="text-sm p-2 border rounded bg-white" 
                     value={q.topic_id || ""}
                     disabled={!q.subject_id}
                     onChange={(e) => {
                       updateQuestionStatus(q.id, { topic_id: e.target.value, subtopic_id: null })
                       loadSubtopics(e.target.value)
                     }}
                   >
                     <option value="">Select Topic...</option>
                     {topics.filter(t => t.subject_id === q.subject_id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                   </select>

                   <select 
                     className="text-sm p-2 border rounded bg-white"
                     value={q.subtopic_id || ""}
                     disabled={!q.topic_id}
                     onChange={(e) => updateQuestionStatus(q.id, { subtopic_id: e.target.value })}
                   >
                     <option value="">Select Subtopic...</option>
                     {subtopics.filter(s => s.topic_id === q.topic_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

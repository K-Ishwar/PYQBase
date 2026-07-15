'use client'

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Activity } from "lucide-react"

interface TopicHeatmapData {
  topic_id: string
  topic_name: string
  question_count: number
  weightage_percent: number
}

interface SubjectHeatmapResponse {
  subject_id: string
  subject_name: string
  topics: TopicHeatmapData[]
}

import { apiClient } from "@/lib/api-client"

export default function SubjectHeatmapPage() {
  const { id } = useParams()
  const [data, setData] = useState<SubjectHeatmapResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    apiClient(`/api/v1/analytics/heatmaps/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load heatmap")
        return res.json()
      })
      .then(json => {
        setData(json)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return <div className="container py-10 text-center animate-pulse">Loading heatmap analytics...</div>
  }

  if (error || !data) {
    return (
      <div className="container py-10 text-center text-destructive">
        <p>{error || "Subject not found."}</p>
        <Link href="/subjects" className="text-primary hover:underline mt-4 inline-block">Return to Subjects</Link>
      </div>
    )
  }

  // Determine color intensity based on weightage
  const getColorClass = (percent: number) => {
    if (percent > 20) return "bg-red-500 text-white border-red-600"
    if (percent > 10) return "bg-orange-500 text-white border-orange-600"
    if (percent > 5) return "bg-amber-400 text-amber-950 border-amber-500"
    if (percent > 0) return "bg-yellow-200 text-yellow-900 border-yellow-300"
    return "bg-slate-100 text-slate-500 border-slate-200"
  }

  return (
    <div className="container py-10 max-w-5xl">
      <div className="mb-8">
        <Link href="/subjects" className="text-muted-foreground hover:text-foreground flex items-center gap-2 mb-4 text-sm w-fit transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Subjects
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">{data.subject_name}</h1>
              <p className="text-muted-foreground">Historical Topic Heatmap & Weightage</p>
            </div>
          </div>
          
          <Link href={`/search?subject_id=${id}`}>
            <button className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
              View All Questions
            </button>
          </Link>
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Topic Frequency Analysis</h2>
        
        {data.topics.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No historical data available for this subject yet.</p>
        ) : (
          <div className="space-y-4">
            {data.topics.map(topic => (
              <div key={topic.topic_id} className="flex items-center gap-4">
                <div className="w-1/3 truncate font-medium text-sm" title={topic.topic_name}>
                  {topic.topic_name}
                </div>
                <div className="w-2/3 flex items-center gap-3">
                  <div className="flex-1 h-8 bg-secondary rounded-full overflow-hidden flex items-center relative">
                    <div 
                      className={`h-full absolute left-0 top-0 transition-all duration-1000 ${getColorClass(topic.weightage_percent)}`}
                      style={{ width: `${Math.max(topic.weightage_percent, 1)}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-sm">
                    <span className="font-bold">{topic.weightage_percent.toFixed(1)}%</span>
                    <span className="text-muted-foreground text-xs ml-1">({topic.question_count} Qs)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-4 text-sm text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> &gt; 20% (Critical)</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div> 10-20% (High Yield)</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400"></div> 5-10% (Medium)</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-200"></div> 1-5% (Low)</div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useMemo } from "react"
import { apiClient } from "@/lib/api-client"

interface ExamSubjectYearStats {
  exam: string
  subject: string
  year: number
  total_questions: number
}

export default function ReportsPage() {
  const [data, setData] = useState<ExamSubjectYearStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filtering states
  const [examFilter, setExamFilter] = useState<string>("")
  const [subjectFilter, setSubjectFilter] = useState<string>("")
  const [yearFilter, setYearFilter] = useState<string>("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await apiClient("/api/v1/admin/reports/exam-subject-year")
      if (!res.ok) {
        throw new Error("Failed to fetch report data")
      }
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Calculate unique options for filters
  const uniqueExams = useMemo(() => Array.from(new Set(data.map(d => d.exam))).sort(), [data])
  const uniqueSubjects = useMemo(() => Array.from(new Set(data.map(d => d.subject))).sort(), [data])
  const uniqueYears = useMemo(() => Array.from(new Set(data.map(d => d.year))).sort((a, b) => b - a), [data])

  // Apply filters
  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchExam = examFilter ? d.exam === examFilter : true
      const matchSubject = subjectFilter ? d.subject === subjectFilter : true
      const matchYear = yearFilter ? d.year.toString() === yearFilter : true
      return matchExam && matchSubject && matchYear
    })
  }, [data, examFilter, subjectFilter, yearFilter])

  // Calculate total across filtered
  const totalQuestions = useMemo(() => filteredData.reduce((acc, curr) => acc + curr.total_questions, 0), [filteredData])

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading report data...</div>
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200">
        <h3 className="font-bold mb-2">Error loading data</h3>
        <p>{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-100 rounded hover:bg-red-200 transition-colors">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Reports</h1>
          <p className="text-muted-foreground mt-1">
            Questions broken down by Exam, Subject, and Year
          </p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-bold text-lg">
          Total: {totalQuestions.toLocaleString()}
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b bg-slate-50/50 flex gap-4 flex-wrap">
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Filter by Exam</label>
            <select 
              value={examFilter} 
              onChange={e => setExamFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">All Exams</option>
              {uniqueExams.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Filter by Subject</label>
            <select 
              value={subjectFilter} 
              onChange={e => setSubjectFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">All Subjects</option>
              {uniqueSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Filter by Year</label>
            <select 
              value={yearFilter} 
              onChange={e => setYearFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">All Years</option>
              {uniqueYears.map(yr => <option key={yr} value={yr.toString()}>{yr}</option>)}
            </select>
          </div>
          
          <div className="flex items-end">
            <button 
              onClick={() => { setExamFilter(""); setSubjectFilter(""); setYearFilter("") }}
              className="px-4 py-2 text-sm text-muted-foreground hover:bg-slate-100 rounded-md transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-600 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-6 py-3 font-bold">Exam</th>
                <th className="px-6 py-3 font-bold">Subject</th>
                <th className="px-6 py-3 font-bold">Year</th>
                <th className="px-6 py-3 font-bold text-right">Total Questions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No data found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={`${row.exam}-${row.subject}-${row.year}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium">{row.exam}</td>
                    <td className="px-6 py-3">{row.subject}</td>
                    <td className="px-6 py-3">{row.year}</td>
                    <td className="px-6 py-3 text-right font-bold text-primary">{row.total_questions.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot className="bg-slate-100 text-slate-700 font-bold sticky bottom-0 shadow-sm border-t-2 border-slate-200">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right uppercase tracking-wider text-xs">
                    Grand Total
                  </td>
                  <td className="px-6 py-4 text-right text-primary text-base">
                    {totalQuestions.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

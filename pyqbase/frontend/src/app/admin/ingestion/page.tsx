"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"

export default function IngestionUploadPage() {
  const router = useRouter()
  const [exam, setExam] = useState("UPSC CSE")
  const [year, setYear] = useState(new Date().getFullYear())
  const [paper, setPaper] = useState("GS Paper 1")
  const [subjectId, setSubjectId] = useState("")
  const [subjects, setSubjects] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [paperFile, setPaperFile] = useState<File | null>(null)
  const [ingestionMode, setIngestionMode] = useState<"file" | "text">("file")
  const [paperText, setPaperText] = useState("")
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    // Fetch subjects
    apiClient("/api/v1/taxonomy/subjects")
      .then(res => res.json())
      .then(data => setSubjects(data))
      .catch(err => console.error("Failed to load subjects", err))

    // Fetch exams
    apiClient("/api/v1/taxonomy/exams")
      .then(res => res.json())
      .then(data => {
        setExams(data)
        if (data.length > 0) setExam(data[0].name)
      })
      .catch(err => console.error("Failed to load exams", err))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (ingestionMode === "file" && !paperFile) {
      setError("Please select a paper file.")
      return
    }
    if (ingestionMode === "text" && !paperText.trim()) {
      setError("Please enter the question paper text.")
      return
    }

    setIsUploading(true)
    setError("")
    setDebugInfo(null)

    const formData = new FormData()
    formData.append("exam", exam)
    formData.append("year", year.toString())
    formData.append("paper", paper)
    
    if (ingestionMode === "file" && paperFile) {
      formData.append("paper_file", paperFile)
    } else if (ingestionMode === "text") {
      formData.append("paper_text", paperText)
    }

    if (answerKeyFile) {
      formData.append("answer_key_file", answerKeyFile)
    }

    if (subjectId) {
      formData.append("subject_id", subjectId)
    }

    try {
      // Log attempt for debugging
      console.log("Starting upload to:", `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/admin/ingestion/upload`)
      console.log("Form data:", {
        exam,
        year,
        paper,
        mode: ingestionMode,
        paperFile: paperFile?.name,
        textLength: paperText.length,
        answerKeyFile: answerKeyFile?.name
      })

      const response = await apiClient("/api/v1/admin/ingestion/upload", {
        method: "POST",
        body: formData,
      })

      // Capture debug info
      const debugData = {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries()),
      }

      if (!response.ok) {
        let errorDetail = "Unknown error"
        try {
          const errorData = await response.json()
          errorDetail = errorData.detail || JSON.stringify(errorData)
          debugData.responseBody = errorData
        } catch {
          errorDetail = await response.text()
          debugData.responseBody = errorDetail
        }
        
        setDebugInfo(debugData)
        throw new Error(errorDetail)
      }
      
      const data = await response.json()
      debugData.responseBody = data
      setDebugInfo(debugData)
      
      console.log("Upload successful:", data)
      
      // Redirect to the review page where they can see the progress bar
      router.push(`/admin/ingestion/review/${data.batch_id}`)
    } catch (err: any) {
      let errorMessage = err.message || "Unknown error occurred"
      
      // Enhanced error detection
      if (err.message === "Failed to fetch" || err.name === "TypeError") {
        errorMessage = "Cannot connect to backend server"
        setDebugInfo({
          error: "Network Error",
          possibleCauses: [
            "Backend server is not running",
            "Backend is running on wrong port",
            "CORS is blocking the request",
            "Network connectivity issue"
          ],
          expectedURL: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/admin/ingestion/upload`,
          checkList: [
            "1. Is backend running? Check terminal for 'uvicorn app.main:app --reload'",
            "2. Is it on port 8000? Check the terminal output",
            "3. Test manually: Open http://localhost:8000/health in browser",
            "4. Check CORS settings in backend/app/main.py",
            "5. Check frontend .env.local: NEXT_PUBLIC_API_URL"
          ]
        })
      }
      
      setError(errorMessage)
      setIsUploading(false)
      setShowDebug(true)
      
      // Log to console for debugging
      console.error("Upload error:", err)
      console.error("Error name:", err.name)
      console.error("Error message:", err.message)
      console.error("Debug info:", debugInfo)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Bulk Content Ingestion</h1>
      <p className="text-muted-foreground">Upload a Markdown or PDF question paper to automatically extract, paraphrase, and stage questions for review.</p>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
        {error && (
          <div className="space-y-3">
            <div className="text-red-600 bg-red-50 p-4 rounded-md border border-red-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-1">❌ Upload Failed</p>
                  <p className="text-sm">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 rounded border border-red-300 ml-3"
                >
                  {showDebug ? "Hide" : "Show"} Debug Info
                </button>
              </div>
            </div>
            {showDebug && debugInfo && (
              <div className="bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono overflow-auto max-h-96">
                <div className="mb-2 text-yellow-400 font-bold">🔍 DEBUG INFORMATION</div>
                <div className="space-y-2">
                  {debugInfo.error && (
                    <div className="mb-3 pb-3 border-b border-gray-700">
                      <div className="text-red-400 font-bold mb-2">⚠️ {debugInfo.error}</div>
                      {debugInfo.possibleCauses && (
                        <div className="mb-2">
                          <div className="text-blue-400">Possible Causes:</div>
                          <ul className="list-disc list-inside pl-2 text-gray-300">
                            {debugInfo.possibleCauses.map((cause: string, i: number) => (
                              <li key={i}>{cause}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {debugInfo.expectedURL && (
                        <div className="mb-2">
                          <div className="text-blue-400">Expected URL:</div>
                          <div className="text-green-400 pl-2">{debugInfo.expectedURL}</div>
                        </div>
                      )}
                      {debugInfo.checkList && (
                        <div>
                          <div className="text-blue-400 mb-1">Troubleshooting Steps:</div>
                          <div className="space-y-1 pl-2 text-gray-300">
                            {debugInfo.checkList.map((step: string, i: number) => (
                              <div key={i}>{step}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {debugInfo.status && (
                    <div>
                      <span className="text-blue-400">Status:</span> {debugInfo.status} {debugInfo.statusText}
                    </div>
                  )}
                  {debugInfo.url && (
                    <div>
                      <span className="text-blue-400">URL:</span> {debugInfo.url}
                    </div>
                  )}
                  {debugInfo.responseBody && (
                    <div>
                      <span className="text-blue-400">Response:</span>
                      <pre className="mt-1 pl-2 border-l-2 border-gray-700">
                        {JSON.stringify(debugInfo.responseBody, null, 2)}
                      </pre>
                    </div>
                  )}
                  {debugInfo.headers && (
                    <div>
                      <span className="text-blue-400">Headers:</span>
                      <pre className="mt-1 pl-2 border-l-2 border-gray-700">
                        {JSON.stringify(debugInfo.headers, null, 2)}
                      </pre>
                    </div>
                  )}
                  {!debugInfo.error && (
                    <div className="pt-2 border-t border-gray-700 text-gray-400">
                      <p className="mb-1">Common Solutions:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Check if backend server is running</li>
                        <li>Verify authentication token is valid</li>
                        <li>Ensure file format is .md, .pdf, or .txt</li>
                        <li>Check backend logs for detailed error: <code className="bg-gray-800 px-1">python diagnose_ingestion.py</code></li>
                        <li>Status 401: Not authenticated as admin</li>
                        <li>Status 400: Invalid input data</li>
                        <li>Status 500: Server error (check backend logs)</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Exam</label>
            <select value={exam} onChange={(e) => setExam(e.target.value)} className="w-full p-2 border rounded-md" required>
              {exams.map(e => (
                <option key={e.id} value={e.name}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full p-2 border rounded-md" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Paper Name</label>
            <input type="text" value={paper} onChange={(e) => setPaper(e.target.value)} className="w-full p-2 border rounded-md" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject (Optional)</label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full p-2 border rounded-md bg-muted/30">
              <option value="">Auto-detect by AI</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex space-x-4 mb-4">
            <button
              type="button"
              onClick={() => setIngestionMode("file")}
              className={`px-4 py-2 text-sm font-medium rounded-md ${ingestionMode === "file" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setIngestionMode("text")}
              className={`px-4 py-2 text-sm font-medium rounded-md ${ingestionMode === "text" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              Paste Text
            </button>
          </div>

          {ingestionMode === "file" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Question Paper File (MD or PDF)</label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer relative">
                <input type="file" accept=".md,.pdf,.txt" onChange={(e) => setPaperFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required={ingestionMode === "file"} />
                <div className="text-sm text-muted-foreground">
                  {paperFile ? <span className="text-primary font-medium">{paperFile.name}</span> : "Drag & Drop or Click to Select File"}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Paste Raw Questions</label>
              <textarea 
                value={paperText} 
                onChange={(e) => setPaperText(e.target.value)} 
                rows={10} 
                className="w-full p-3 border rounded-md font-mono text-sm" 
                placeholder="Paste your questions here..."
                required={ingestionMode === "text"}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Answer Key File (Optional)</label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer relative">
              <input type="file" accept=".md,.pdf,.txt" onChange={(e) => setAnswerKeyFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <div className="text-sm text-muted-foreground">
                {answerKeyFile ? <span className="text-primary font-medium">{answerKeyFile.name}</span> : "Select separate answer key file (if not inline)"}
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={isUploading} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
          {isUploading ? "Uploading & Initializing Batch..." : "Upload & Parse Paper"}
        </button>
      </form>
    </div>
  )
}

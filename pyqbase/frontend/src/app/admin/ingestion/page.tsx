"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"

export default function IngestionUploadPage() {
  const router = useRouter()
  const [exam, setExam] = useState("UPSC")
  const [year, setYear] = useState(new Date().getFullYear())
  const [paper, setPaper] = useState("GS Paper 1")
  const [paperFile, setPaperFile] = useState<File | null>(null)
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paperFile) {
      setError("Please select a paper file.")
      return
    }

    setIsUploading(true)
    setError("")

    const formData = new FormData()
    formData.append("exam", exam)
    formData.append("year", year.toString())
    formData.append("paper", paper)
    formData.append("paper_file", paperFile)
    if (answerKeyFile) {
      formData.append("answer_key_file", answerKeyFile)
    }

    try {
      const response = await apiClient("/api/v1/admin/ingestion/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Failed to upload")
      const data = await response.json()
      
      // Redirect to the review page where they can see the progress bar
      router.push(`/admin/ingestion/review/${data.batch_id}`)
    } catch (err) {
      setError("An error occurred during upload. Please try again.")
      setIsUploading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Bulk Content Ingestion</h1>
      <p className="text-muted-foreground">Upload a Markdown or PDF question paper to automatically extract, paraphrase, and stage questions for review.</p>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
        {error && <div className="text-red-500 bg-red-50 p-3 rounded-md">{error}</div>}
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Exam</label>
            <input type="text" value={exam} onChange={(e) => setExam(e.target.value)} className="w-full p-2 border rounded-md" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-full p-2 border rounded-md" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Paper Name</label>
            <input type="text" value={paper} onChange={(e) => setPaper(e.target.value)} className="w-full p-2 border rounded-md" required />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <label className="text-sm font-medium">Question Paper File (MD or PDF)</label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer relative">
              <input type="file" accept=".md,.pdf" onChange={(e) => setPaperFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
              <div className="text-sm text-muted-foreground">
                {paperFile ? <span className="text-primary font-medium">{paperFile.name}</span> : "Drag & Drop or Click to Select File"}
              </div>
            </div>
          </div>

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

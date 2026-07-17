"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"
import { MessageSquare, User, Calendar, Loader2, Trash2 } from "lucide-react"

interface Feedback {
  id: string
  user_id: string
  user_name: string
  user_email: string
  message: string
  status: string
  created_at: string
}

export default function AdminFeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchFeedbacks()
  }, [])

  const fetchFeedbacks = async () => {
    try {
      const res = await apiClient("/api/v1/admin/feedbacks?limit=100")
      if (!res.ok) throw new Error("Failed to load feedbacks")
      const data = await res.json()
      setFeedbacks(data)
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;
    
    try {
      const res = await apiClient(`/api/v1/admin/feedbacks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete feedback");
      
      setFeedbacks((prev) => prev.filter((fb) => fb.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-500/10 rounded-2xl">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            User Feedback
          </h1>
          <p className="text-muted-foreground">Review suggestions and bug reports from users.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold">
          {feedbacks.length} Total
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {feedbacks.length === 0 ? (
          <div className="p-12 text-center border rounded-2xl bg-muted/20 text-muted-foreground">
            No feedback received yet.
          </div>
        ) : (
          feedbacks.map((fb) => (
            <div key={fb.id} className="liquid-glass rounded-2xl p-6 border hover:border-primary/30 transition-all flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold">
                    {fb.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold">{fb.user_name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" /> {fb.user_email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(fb.created_at + 'Z').toLocaleString()}
                  </div>
                  <button
                    onClick={() => handleDelete(fb.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-95"
                    title="Delete feedback"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-foreground whitespace-pre-wrap">
                {fb.message}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

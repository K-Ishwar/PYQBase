"use client"

import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { MessageSquare, Send, Loader2, CheckCircle2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"

export function FeedbackBar() {
  const { user } = useAuth()
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setIsSubmitting(true)
    setError("")

    try {
      const res = await apiClient("/api/v1/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() })
      })

      if (!res.ok) {
        throw new Error("Failed to send feedback")
      }

      setIsSuccess(true)
      setMessage("")
      setTimeout(() => setIsSuccess(false), 5000)
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="w-full max-w-3xl mx-auto liquid-glass rounded-3xl p-8 text-center space-y-4">
        <MessageSquare className="w-12 h-12 text-primary mx-auto opacity-50" />
        <h3 className="text-xl font-bold">Have feedback or suggestions?</h3>
        <p className="text-muted-foreground">Please log in to share your thoughts with us.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto liquid-glass rounded-3xl p-8 border hover:border-primary/50 transition-colors">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold">We value your feedback</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Help us improve PYQBase. Notice a bug, want a new feature, or have general thoughts? Let us know below!
          </p>
        </div>
        
        <div className="w-full md:w-[60%]">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center h-full p-4 bg-green-500/10 border border-green-500/20 text-green-600 rounded-2xl animate-in zoom-in duration-300">
              <CheckCircle2 className="w-8 h-8 mb-2" />
              <p className="font-bold">Thank you for your feedback!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your feedback here..."
                className="w-full bg-background/50 backdrop-blur-sm border border-border/50 rounded-2xl p-4 min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                required
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="absolute bottom-3 right-3 bg-primary text-primary-foreground p-2 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

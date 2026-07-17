'use client'

import { useSrsQueue } from '@/lib/hooks/useSrsQueue'
import { Brain, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'

export function DailyRevisionCard() {
  const { user } = useAuth()
  const { data, isLoading } = useSrsQueue(!!user)

  if (!user) return null // Hide if not logged in

  const totalDue = data?.meta?.total_due ?? 0

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm animate-pulse">
        <div className="h-6 w-32 bg-muted rounded mb-2"></div>
        <div className="h-4 w-48 bg-muted rounded"></div>
      </div>
    )
  }

  if (totalDue === 0) {
    return null
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Brain className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Daily Revision</h2>
          <p className="text-sm text-muted-foreground mt-1">
            <strong className="text-foreground">{totalDue}</strong> questions due today. Keep your streak alive!
          </p>
        </div>
      </div>
      <Link 
        href="/srs"
        className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98] shrink-0"
      >
        Start Revision <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </div>
  )
}

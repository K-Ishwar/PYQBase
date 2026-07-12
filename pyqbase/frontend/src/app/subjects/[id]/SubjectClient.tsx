'use client'

import { use } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { useSubjectHeatmap } from '@/lib/hooks/useAnalytics'

// Lazy load the Recharts component
const HeatmapChart = dynamic(() => import('./HeatmapChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-muted/20 animate-pulse rounded-xl flex items-center justify-center">
      <p className="text-muted-foreground">Loading interactive heatmap...</p>
    </div>
  ),
})

export function SubjectClient({ id }: { id: string }) {
  const { data, isLoading, isError } = useSubjectHeatmap(id)

  if (isLoading) {
    return (
      <div className="container py-10 space-y-8 animate-pulse">
        <div className="h-10 w-1/3 bg-muted rounded"></div>
        <div className="h-[400px] w-full bg-muted rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl"></div>
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Error loading subject</h1>
        <p className="text-muted-foreground">Could not load heatmap data for this subject.</p>
      </div>
    )
  }

  // Determine color based on weightage
  const getCardColor = (weightage: number) => {
    if (weightage > 15) return 'border-red-500/50 bg-red-500/10'
    if (weightage > 10) return 'border-orange-500/50 bg-orange-500/10'
    if (weightage > 5) return 'border-yellow-500/50 bg-yellow-500/10'
    return 'border-green-500/50 bg-green-500/10'
  }

  return (
    <div className="container py-10 space-y-10">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-xl text-primary">
          <BookOpen className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">{data.subject_name}</h1>
          <p className="text-muted-foreground mt-1">Topic Heatmap & Analysis</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-4">Weightage Heatmap</h2>
        <HeatmapChart topics={data.topics} />
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-6">Explore Topics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.topics.map((topic) => (
            <Link key={topic.topic_id} href={`/topics/${topic.topic_id}`}>
              <div className={`group rounded-xl border p-6 transition-all hover:shadow-md cursor-pointer ${getCardColor(topic.weightage_percent)}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                    {topic.topic_name}
                  </h3>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
                
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-black">{topic.question_count}</p>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Questions</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{topic.weightage_percent.toFixed(1)}%</p>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Weightage</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

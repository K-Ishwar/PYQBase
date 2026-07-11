import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface TopicHeatmapData {
  topic_id: string
  topic_name: string
  question_count: number
  weightage_percent: number
}

export interface SubjectHeatmapResponse {
  subject_id: string
  subject_name: string
  topics: TopicHeatmapData[]
}

export function useSubjectHeatmap(subjectId: string) {
  return useQuery<SubjectHeatmapResponse>({
    queryKey: ['analytics', 'heatmaps', subjectId],
    queryFn: async () => {
      const res = await apiClient(`/api/v1/analytics/heatmaps/${subjectId}`)
      if (!res.ok) throw new Error('Failed to fetch heatmap')
      return res.json() as Promise<SubjectHeatmapResponse>
    },
    enabled: !!subjectId,
  })
}

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface SrsQueueItem {
  question_id: string
  exam: string
  subject_name: string
  topic_name: string
  subtopic_name: string
  difficulty_label: string
  elo_rating: number
  next_review_date: string
}

export interface SrsQueueResponse {
  data: SrsQueueItem[]
  meta: {
    total_due: number
  }
}

export function useSrsQueue() {
  return useQuery<SrsQueueResponse>({
    queryKey: ['srs-queue'],
    queryFn: async () => {
      const res = await apiClient('/api/v1/srs/queue')
      if (!res.ok) {
        throw new Error('Failed to fetch SRS queue')
      }
      return res.json()
    },
  })
}

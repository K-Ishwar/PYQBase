import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface QuestionDetail {
  id: string
  exam: string
  year: number
  paper: string
  question_number: number
  question_stem: { en: string }
  options: Record<string, string>
  question_type: string
  has_image: boolean
  image_url: string | null
  elo_rating: number
}

export function useQuestion(id: string | null) {
  return useQuery<QuestionDetail>({
    queryKey: ['question', id],
    queryFn: async () => {
      const res = await apiClient(`/api/v1/questions/${id}`)
      if (!res.ok) throw new Error('Failed to fetch question')
      return res.json()
    },
    enabled: !!id,
  })
}

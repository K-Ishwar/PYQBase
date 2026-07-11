import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { Question } from './useSearch' // Has the base Question type

export interface QuestionDetailResponse {
  id: string
  exam: string
  year: number
  paper?: string
  question_number?: number
  question_stem: string
  options: Record<string, string>
  question_type: string
  has_image: boolean
  image_url?: string
  elo_rating: number
}

export interface QuestionSolutionResponse {
  id: string
  correct_option: string
  explanation?: Record<string, any>
}

export function useQuestionDetail(id: string) {
  return useQuery({
    queryKey: ['questions', id],
    queryFn: async () => {
      const res = await apiClient(`/api/v1/questions/${id}`)
      if (!res.ok) throw new Error('Failed to fetch question detail')
      return res.json() as Promise<QuestionDetailResponse>
    },
    enabled: !!id,
  })
}

export function useQuestionSolution(id: string, isAuthenticated: boolean) {
  return useQuery({
    queryKey: ['questions', id, 'solution'],
    queryFn: async () => {
      const res = await apiClient(`/api/v1/questions/${id}/solution`)
      if (!res.ok) throw new Error('Failed to fetch solution')
      return res.json() as Promise<QuestionSolutionResponse>
    },
    enabled: !!id && isAuthenticated,
    retry: false, // If it fails due to auth, don't keep retrying
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface QuestionDetailResponse {
  id: string
  exam: string
  year: number
  paper?: string
  question_number?: number
  question_stem: string | { en: string }
  options: Record<string, string>
  question_type: string
  has_image: boolean
  image_url?: string
  subject_name?: string
  topic_name?: string
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

export function useGenerateExplanation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient(`/api/v1/questions/${id}/explanation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Failed to generate explanation')
      return res.json() as Promise<QuestionSolutionResponse>
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['questions', id, 'solution'], data)
    }
  })
}

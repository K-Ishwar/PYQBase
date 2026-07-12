import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api-client'

export interface MockTestResponse {
  id: string
  exam: string
  question_ids: string[]
  mode: string
  score?: number
  created_at: string
}

export interface MockTestGenerateRequest {
  exam: string
  subject_id: string
  question_count: number
  mode: string // "custom" | "weak_area"
}

export function useGenerateMockTest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: MockTestGenerateRequest) => {
      const res = await apiClient('/api/v1/mock-tests/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const message =
          errorData?.error?.message || errorData?.detail || 'Failed to generate mock test'
        const code = errorData?.error?.code || 'UNKNOWN_ERROR'
        const err = new Error(message) as Error & { code: string; status: number }
        err.code = code
        err.status = res.status
        throw err
      }
      return res.json() as Promise<MockTestResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mock-tests', 'history'] })
    },
  })
}

export function useMockTestHistory(isAuthenticated: boolean) {
  return useQuery({
    queryKey: ['mock-tests', 'history'],
    queryFn: async () => {
      const res = await apiClient('/api/v1/mock-tests/history')
      if (!res.ok) throw new Error('Failed to fetch history')
      return res.json() as Promise<MockTestResponse[]>
    },
    enabled: isAuthenticated,
  })
}

export function useMockTest(id: string) {
  return useQuery({
    queryKey: ['mock-tests', id],
    queryFn: async () => {
      const res = await apiClient(`/api/v1/mock-tests/${id}`)
      if (!res.ok) throw new Error('Failed to fetch mock test')
      return res.json() as Promise<MockTestResponse>
    },
    enabled: !!id,
  })
}

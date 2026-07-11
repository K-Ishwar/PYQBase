import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface AttemptRequest {
  question_id: string
  selected_option: string
  time_taken_seconds: number
}

export interface AttemptResponse {
  is_correct: boolean
  correct_option: string
  new_elo_rating: number
  explanation: string | null
}

export function useSubmitAttempt() {
  return useMutation<AttemptResponse, Error, AttemptRequest>({
    mutationFn: async (body) => {
      const res = await apiClient('/api/v1/attempts', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText, code: 'UNKNOWN' } }))
        const error = new Error(err?.error?.message ?? 'Submission failed') as Error & { code?: string; status?: number }
        error.code = err?.error?.code ?? 'UNKNOWN'
        error.status = res.status
        throw error
      }
      return res.json()
    },
  })
}

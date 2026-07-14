import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface QuestionListItem {
  id: string
  exam: string
  year: number
  paper: string
  question_number: number
  question_stem: { en: string }
  question_type: string
  has_image: boolean
  image_url?: string | null
  subtopic_id: string
  subject_name?: string
  topic_name?: string
  subtopic_name?: string
  elo_rating: number
  ts_rank?: number
  created_at: string
}

export interface SearchMeta {
  total: number
  limit: number
  offset: number
  has_next: boolean
}

export interface SearchResponse {
  data: QuestionListItem[]
  meta: SearchMeta
}

export interface SearchParams {
  q?: string
  exam?: string
  year?: number
  subject_id?: string
  topic_id?: string
  sort?: string
  limit?: number
  offset?: number
}

export function useSearch(params: SearchParams) {
  const queryString = new URLSearchParams()
  if (params.q) queryString.set('q', params.q)
  if (params.exam) queryString.set('exam', params.exam)
  if (params.year) queryString.set('year', String(params.year))
  if (params.subject_id) queryString.set('subject_id', params.subject_id)
  if (params.topic_id) queryString.set('topic_id', params.topic_id)
  if (params.sort) queryString.set('sort', params.sort)
  queryString.set('limit', String(params.limit ?? 20))
  queryString.set('offset', String(params.offset ?? 0))

  return useQuery<SearchResponse>({
    queryKey: ['questions', params],
    queryFn: async () => {
      const res = await apiClient(`/api/v1/questions?${queryString.toString()}`)
      if (!res.ok) throw new Error('Search failed')
      return res.json()
    },
    // Keep previous data while fetching new results — prevents flicker
    placeholderData: (prev) => prev,
    staleTime: 0, // Fetch immediately so admin changes reflect instantly
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface TaxonomyItem {
  id: string
  name: string
  created_at: string
}

export interface Topic extends TaxonomyItem {
  subject_id: string
}


export function useSubjects() {
  return useQuery<TaxonomyItem[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await apiClient('/api/v1/admin/subjects')
      if (!res.ok) throw new Error('Failed to fetch subjects')
      return res.json()
    },
  })
}

export function useTopics(subjectId?: string) {
  return useQuery<Topic[]>({
    queryKey: ['topics', subjectId],
    queryFn: async () => {
      if (!subjectId) return []
      const res = await apiClient(`/api/v1/admin/subjects/${subjectId}/topics`)
      if (!res.ok) throw new Error('Failed to fetch topics')
      return res.json()
    },
    enabled: !!subjectId,
  })
}


// --- Public Endpoints ---
export function usePublicSubjects() {
  return useQuery({
    queryKey: ['public', 'taxonomy', 'subjects'],
    queryFn: async () => {
      const res = await apiClient('/api/v1/taxonomy/subjects')
      if (!res.ok) throw new Error('Failed to fetch public subjects')
      return res.json()
    },
  })
}

export function usePublicTopics(subjectId: string) {
  return useQuery({
    queryKey: ['public', 'taxonomy', 'topics', subjectId],
    queryFn: async () => {
      const res = await apiClient(`/api/v1/taxonomy/subjects/${subjectId}/topics`)
      if (!res.ok) throw new Error('Failed to fetch public topics')
      return res.json()
    },
    enabled: !!subjectId,
  })
}


// Mutations
export function useCreateSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient('/api/v1/admin/subjects', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to create subject')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })
}

export function useDeleteSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient(`/api/v1/admin/subjects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete subject')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })
}

export function useCreateTopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ subjectId, name }: { subjectId: string; name: string }) => {
      const res = await apiClient(`/api/v1/admin/subjects/${subjectId}/topics`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to create topic')
      return res.json()
    },
    onSuccess: (_, { subjectId }) => {
      queryClient.invalidateQueries({ queryKey: ['topics', subjectId] })
    },
  })
}

export function useDeleteTopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient(`/api/v1/admin/topics/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete topic')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] })
    },
  })
}


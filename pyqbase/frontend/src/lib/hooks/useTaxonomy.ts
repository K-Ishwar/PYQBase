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

export interface Subtopic extends TaxonomyItem {
  topic_id: string
}

export interface Exam {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
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

export function useSubtopics(topicId?: string) {
  return useQuery<Subtopic[]>({
    queryKey: ['subtopics', topicId],
    queryFn: async () => {
      if (!topicId) return []
      const res = await apiClient(`/api/v1/admin/topics/${topicId}/subtopics`)
      if (!res.ok) throw new Error('Failed to fetch subtopics')
      return res.json()
    },
    enabled: !!topicId,
  })
}

// --- Public Endpoints ---
export function usePublicExams() {
  return useQuery<Exam[]>({
    queryKey: ['public', 'taxonomy', 'exams'],
    queryFn: async () => {
      const res = await apiClient('/api/v1/taxonomy/exams')
      if (!res.ok) throw new Error('Failed to fetch public exams')
      return res.json()
    },
  })
}

export function usePublicExam(slug: string) {
  return useQuery<Exam>({
    queryKey: ['public', 'taxonomy', 'exams', slug],
    queryFn: async () => {
      const res = await apiClient(`/api/v1/taxonomy/exams/${slug}`)
      if (!res.ok) throw new Error('Failed to fetch exam')
      return res.json()
    },
    enabled: !!slug,
  })
}

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

export function usePublicSubtopics(topicId: string) {
  return useQuery({
    queryKey: ['public', 'taxonomy', 'subtopics', topicId],
    queryFn: async () => {
      const res = await apiClient(`/api/v1/taxonomy/topics/${topicId}/subtopics`)
      if (!res.ok) throw new Error('Failed to fetch public subtopics')
      return res.json()
    },
    enabled: !!topicId,
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

export function useCreateSubtopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ topicId, name }: { topicId: string; name: string }) => {
      const res = await apiClient(`/api/v1/admin/topics/${topicId}/subtopics`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to create subtopic')
      return res.json()
    },
    onSuccess: (_, { topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['subtopics', topicId] })
    },
  })
}

export function useDeleteSubtopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient(`/api/v1/admin/subtopics/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete subtopic')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtopics'] })
    },
  })
}

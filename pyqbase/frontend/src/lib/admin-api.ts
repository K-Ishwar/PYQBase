/**
 * Typed fetch wrappers for the admin API.
 * All endpoints require a valid admin JWT sent as Authorization: Bearer <token>.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'

async function adminFetch<T>(
  path: string,
  options: RequestInit = {},
  token: string
): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ─── Question Types ────────────────────────────────────────────────────────

export interface QuestionUpsertPayload {
  exam: 'UPSC CSE' | 'UPSC CAPF' | 'MPSC Rajyseva' | 'UPSC CDS'
  year: number
  paper: string
  question_number: number
  question_stem: { en: string }
  options: { A: string; B: string; C: string; D: string }
  correct_option: 'A' | 'B' | 'C' | 'D' | 'DROPPED'
  has_image: boolean
  image_url?: string | null
  parse_confidence?: number | null
  subtopic_id: string
  manual_review_approved?: boolean
}

export interface QuestionResponse {
  id: string
  exam: string
  year: number
  paper: string
  question_number: number
  question_stem: { en: string }
  options: { A: string; B: string; C: string; D: string }
  correct_option: string
  has_image: boolean
  image_url?: string
  parse_confidence?: number
  subtopic_id: string
  elo_rating: number
  created_at: string
}

export const adminApi = {
  // Questions
  listQuestions: (token: string) =>
    adminFetch<QuestionResponse[]>('/api/v1/admin/questions', {}, token),

  upsertQuestion: (id: string, payload: QuestionUpsertPayload, token: string) =>
    adminFetch<QuestionResponse>(`/api/v1/admin/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, token),

  // Subjects
  listSubjects: (token: string) =>
    adminFetch<{ id: string; name: string }[]>('/api/v1/admin/subjects', {}, token),

  createSubject: (name: string, token: string) =>
    adminFetch<{ id: string; name: string }>('/api/v1/admin/subjects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }, token),

  deleteSubject: (id: string, token: string) =>
    adminFetch<void>(`/api/v1/admin/subjects/${id}`, { method: 'DELETE' }, token),

  // Topics
  listTopics: (subjectId: string, token: string) =>
    adminFetch<{ id: string; subject_id: string; name: string }[]>(
      `/api/v1/admin/subjects/${subjectId}/topics`, {}, token
    ),

  createTopic: (subjectId: string, name: string, token: string) =>
    adminFetch<{ id: string; subject_id: string; name: string }>(
      `/api/v1/admin/subjects/${subjectId}/topics`,
      { method: 'POST', body: JSON.stringify({ name }) },
      token
    ),

  deleteTopic: (topicId: string, token: string) =>
    adminFetch<void>(`/api/v1/admin/topics/${topicId}`, { method: 'DELETE' }, token),

  // Subtopics
  listSubtopics: (topicId: string, token: string) =>
    adminFetch<{ id: string; topic_id: string; name: string }[]>(
      `/api/v1/admin/topics/${topicId}/subtopics`, {}, token
    ),

  createSubtopic: (topicId: string, name: string, token: string) =>
    adminFetch<{ id: string; topic_id: string; name: string }>(
      `/api/v1/admin/topics/${topicId}/subtopics`,
      { method: 'POST', body: JSON.stringify({ name }) },
      token
    ),

  deleteSubtopic: (subtopicId: string, token: string) =>
    adminFetch<void>(`/api/v1/admin/subtopics/${subtopicId}`, { method: 'DELETE' }, token),
}

'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api-client'
import { useSubjects, useTopics } from '@/lib/hooks/useTaxonomy'

// ─── Zod Schema — mirrors backend QuestionUpsertPayload ─────────────────────

const questionSchema = z.object({
  exam: z.enum(['UPSC CSE', 'UPSC CAPF', 'MPSC Rajyseva', 'UPSC CDS']),
  year: z.coerce.number().min(1990).max(2030),
  paper: z.string().min(1, 'Paper is required'),
  question_number: z.coerce.number().min(1),
  question_stem_en: z.string().min(10, 'Question text must be at least 10 characters'),
  option_a: z.string().min(1, 'Option A is required'),
  option_b: z.string().min(1, 'Option B is required'),
  option_c: z.string().min(1, 'Option C is required'),
  option_d: z.string().min(1, 'Option D is required'),
  correct_option: z.enum(['A', 'B', 'C', 'D', 'DROPPED']),
  subject_id: z.string().uuid('Please select a subject'),
  topic_id: z.string().uuid('Please select a topic'),
  has_image: z.boolean().default(false),
  image_url: z.string().url().optional().or(z.literal('')),
  parse_confidence: z.coerce.number().min(0).max(1).optional(),
  manual_review_approved: z.boolean().default(false),
}).refine((data) => {
  if (data.manual_review_approved) return true
  if (data.parse_confidence !== undefined && data.parse_confidence < 0.90) {
    return false
  }
  return true
}, {
  message: 'parse_confidence must be ≥ 0.90, or check Manual Review Approved',
  path: ['parse_confidence'],
})

type QuestionFormValues = z.infer<typeof questionSchema>



// ─── Component ────────────────────────────────────────────────────────────────

interface QuestionEditorFormProps {
  questionId?: string
  defaultValues?: Partial<QuestionFormValues>
}

export function QuestionEditorForm({ questionId, defaultValues }: QuestionEditorFormProps) {
  const isNew = !questionId || questionId === 'new'
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState<string>('')

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(questionSchema) as any,
    defaultValues: {
      exam: 'UPSC CSE',
      year: new Date().getFullYear(),
      paper: 'Prelims',
      correct_option: 'A',
      has_image: false,
      manual_review_approved: false,
      ...defaultValues,
    },
  })

  const selectedSubjectId = watch('subject_id')
  const selectedTopicId = watch('topic_id')
  const hasImage = watch('has_image')

  // Reset topic when subject changes
  useEffect(() => {
    setValue('topic_id', '' as never)
  }, [selectedSubjectId, setValue])

  const { data: availableSubjects = [], isLoading: isLoadingSubjects } = useSubjects()
  const { data: availableTopics = [], isLoading: isLoadingTopics } = useTopics(selectedSubjectId || undefined)

  // ── Image Upload (direct to Supabase Storage) ─────────────────────────────
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadStatus('uploading')
    try {
      const supabase = createClient()
      const exam = watch('exam')
      const year = watch('year')
      const id = questionId ?? 'new-' + Date.now()
      const path = `questions/${exam}/${year}/${id}.jpg`

      const { data, error } = await supabase.storage
        .from('questions')
        .upload(path, file, { upsert: true, contentType: 'image/jpeg' })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('questions')
        .getPublicUrl(data.path)

      setValue('image_url', publicUrl)
      setUploadStatus('done')
    } catch {
      setUploadStatus('error')
    }
  }

  // ── Form Submit ───────────────────────────────────────────────────────────
  async function onSubmit(values: QuestionFormValues) {
    setSubmitStatus('loading')
    setSubmitError('')
    try {
      const targetId = isNew ? crypto.randomUUID() : questionId!
      const body = {
        exam: values.exam,
        year: values.year,
        paper: values.paper,
        question_number: values.question_number,
        question_stem: { en: values.question_stem_en },
        options: { A: values.option_a, B: values.option_b, C: values.option_c, D: values.option_d },
        correct_option: values.correct_option,
        has_image: values.has_image,
        image_url: values.image_url || null,
        parse_confidence: values.parse_confidence ?? null,
        topic_id: values.topic_id,
        manual_review_approved: values.manual_review_approved,
      }

      const res = await apiClient(`/api/v1/admin/questions/${targetId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Server error')
      }

      setSubmitStatus('success')
    } catch (err: unknown) {
      setSubmitStatus('error')
      setSubmitError((err as Error).message ?? 'Unknown error')
    }
  }

  // ─── Field helpers ─────────────────────────────────────────────────────────
  const fieldClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all'
  const labelClass = 'block text-sm font-medium mb-1'
  const errorClass = 'mt-1 text-xs text-destructive'

  return <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
      {submitStatus === 'success' && (
        <div className="rounded-lg border border-success/30 bg-success-bg p-4 text-sm text-success font-medium">
          ✓ Question saved successfully!
        </div>
      )}
      {submitStatus === 'error' && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          ✗ Error: {submitError}
        </div>
      )}

      {/* ── Section 1: Metadata ─────────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-base font-bold">Question Metadata</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Exam *</label>
            <select {...register('exam')} className={fieldClass}>
              <option value="UPSC CSE">UPSC CSE</option>
              <option value="UPSC CAPF">UPSC CAPF</option>
              <option value="MPSC Rajyseva">MPSC Rajyseva</option>
              <option value="UPSC CDS">UPSC CDS</option>
            </select>
            {errors.exam && <p className={errorClass}>{errors.exam.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Year *</label>
            <input type="number" {...register('year')} className={fieldClass} />
            {errors.year && <p className={errorClass}>{errors.year.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Paper *</label>
            <input {...register('paper')} placeholder="e.g. Prelims" className={fieldClass} />
            {errors.paper && <p className={errorClass}>{errors.paper.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Q. Number *</label>
            <input type="number" {...register('question_number')} className={fieldClass} />
            {errors.question_number && <p className={errorClass}>{errors.question_number.message}</p>}
          </div>
        </div>
      </section>

      {/* ── Section 2: Question Body ─────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-base font-bold">Question Content</h2>
        <div>
          <label className={labelClass}>Question Stem (English) *</label>
          <textarea
            {...register('question_stem_en')}
            rows={4}
            className={`${fieldClass} resize-y font-sans`}
            placeholder="Enter the full question text here..."
          />
          {errors.question_stem_en && <p className={errorClass}>{errors.question_stem_en.message}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['a', 'b', 'c', 'd'] as const).map((opt) => (
            <div key={opt}>
              <label className={labelClass}>Option {opt.toUpperCase()} *</label>
              <input
                {...register(`option_${opt}` as 'option_a' | 'option_b' | 'option_c' | 'option_d')}
                placeholder={`Option ${opt.toUpperCase()}`}
                className={fieldClass}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6">
          <div>
            <label className={labelClass}>Correct Option *</label>
            <select {...register('correct_option')} className={`${fieldClass} w-36`}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="DROPPED">DROPPED</option>
            </select>
            {errors.correct_option && <p className={errorClass}>{errors.correct_option.message}</p>}
          </div>
        </div>
      </section>

      {/* ── Section 3: Taxonomy ──────────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-base font-bold">Taxonomy Classification</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Subject * {isLoadingSubjects && <span className="animate-pulse">...</span>}</label>
            <select {...register('subject_id')} className={fieldClass}>
              <option value="">Select subject…</option>
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.subject_id && <p className={errorClass}>{errors.subject_id.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Topic * {isLoadingTopics && <span className="animate-pulse">...</span>}</label>
            <select {...register('topic_id')} className={fieldClass} disabled={!selectedSubjectId}>
              <option value="">Select topic…</option>
              {availableTopics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {errors.topic_id && <p className={errorClass}>{errors.topic_id.message}</p>}
          </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Image ─────────────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-base font-bold">Image (Optional)</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <Controller
            name="has_image"
            control={control}
            render={({ field }) => (
              <input
                type="checkbox"
                checked={field.value}
                onChange={field.onChange}
                className="rounded"
              />
            )}
          />
          <span className="text-sm">This question has an image</span>
        </label>
        {hasImage && (
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="text-sm"
              />
              {uploadStatus === 'uploading' && <p className="text-xs text-muted-foreground mt-1">Uploading to Supabase Storage…</p>}
              {uploadStatus === 'done' && <p className="text-xs text-success mt-1">✓ Uploaded successfully</p>}
              {uploadStatus === 'error' && <p className="text-xs text-destructive mt-1">Upload failed. Check Supabase credentials.</p>}
            </div>
            <div>
              <label className={labelClass}>Image URL (auto-filled after upload)</label>
              <input {...register('image_url')} readOnly className={`${fieldClass} font-mono text-xs`} />
            </div>
          </div>
        )}
      </section>

      {/* ── Section 5: Quality Controls ───────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-base font-bold">Quality Controls (BR-04)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Parse Confidence (0–1)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              {...register('parse_confidence')}
              className={fieldClass}
              placeholder="e.g. 0.95"
            />
            {errors.parse_confidence && <p className={errorClass}>{errors.parse_confidence.message}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Must be ≥ 0.90 to publish without override.</p>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <Controller
                name="manual_review_approved"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="rounded"
                  />
                )}
              />
              <div>
                <span className="text-sm font-medium">Manual Review Approved</span>
                <p className="text-xs text-muted-foreground">Bypasses parse_confidence check</p>
              </div>
            </label>
          </div>
        </div>
      </section>

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={submitStatus === 'loading'}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          {submitStatus === 'loading' ? 'Saving…' : isNew ? 'Create Question' : 'Update Question'}
        </button>
        <a href="/admin/questions" className="text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </a>
      </div>
    </form>
}

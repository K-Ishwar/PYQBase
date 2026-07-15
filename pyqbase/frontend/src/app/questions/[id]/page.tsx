import type { Metadata } from 'next'
import { QuestionClient } from './QuestionClient'

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    const res = await fetch(`${apiUrl}/api/v1/questions/${id}`)
    if (!res.ok) throw new Error('Failed to fetch')
    const question = await res.json()
    
    // Snippet the question text to ~100 characters for the description
    const snippet = question.question_stem.length > 100 
      ? question.question_stem.substring(0, 100) + '...' 
      : question.question_stem

    return {
      title: `${question.exam} ${question.year} PYQ | PYQBase`,
      description: snippet,
    }
  } catch (e) {
    return {
      title: 'Question Detail | PYQBase',
      description: 'View Previous Year Question details and AI explanation.',
    }
  }
}

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <QuestionClient id={id} />
}

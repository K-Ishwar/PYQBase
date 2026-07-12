import type { Metadata } from 'next'
import { SubjectClient } from './SubjectClient'

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  
  try {
    const res = await fetch(`http://localhost:8000/api/v1/taxonomy/subjects/${id}`)
    if (!res.ok) throw new Error('Failed to fetch')
    const subject = await res.json()
    
    return {
      title: `${subject.name} Previous Year Questions | PYQBase`,
      description: `Topic-wise analysis and heatmap for ${subject.name}. Explore detailed PYQs and track your weak areas in ${subject.name}.`,
    }
  } catch (e) {
    return {
      title: 'Subject PYQs | PYQBase',
      description: 'Explore Previous Year Questions by Subject',
    }
  }
}

export default async function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SubjectClient id={id} />
}

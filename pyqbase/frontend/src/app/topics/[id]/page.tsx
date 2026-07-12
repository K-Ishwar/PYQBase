import type { Metadata } from 'next'
import { TopicClient } from './TopicClient'

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  
  try {
    const res = await fetch(`http://localhost:8000/api/v1/taxonomy/topics/${id}`)
    if (!res.ok) throw new Error('Failed to fetch')
    const topic = await res.json()
    
    return {
      title: `${topic.name} Questions | PYQBase`,
      description: `Practice and explore all previous year questions for ${topic.name}. Filter by exam, year, and difficulty.`,
    }
  } catch (e) {
    return {
      title: 'Topic Questions | PYQBase',
      description: 'Explore Previous Year Questions by Topic',
    }
  }
}

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TopicClient id={id} />
}

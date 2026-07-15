'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen } from "lucide-react"

import { apiClient } from "@/lib/api-client"

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient('/api/v1/taxonomy/subjects')
      .then(res => res.json())
      .then(data => {
        setSubjects(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch subjects:", err)
        setLoading(false)
      })
  }, [])

  return (
    <div className="container py-10">
      <h1 className="text-4xl font-extrabold tracking-tight mb-8">Browse <span className="text-primary">Subjects</span></h1>
      
      {loading ? (
        <div className="text-muted-foreground animate-pulse">Loading subjects...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map(subject => (
            <Link href={`/subjects/${subject.id}`} key={subject.id} className="block group">
              <div className="p-6 rounded-2xl border bg-card hover:border-primary/50 transition-all shadow-sm group-hover:shadow-md flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{subject.name}</h3>
                </div>
              </div>
            </Link>
          ))}
          {subjects.length === 0 && !loading && (
            <div className="text-muted-foreground">No subjects found.</div>
          )}
        </div>
      )}
    </div>
  )
}

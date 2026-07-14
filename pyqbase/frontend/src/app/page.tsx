"use client"

import { SearchBar } from "@/components/ui/SearchBar"
import { ExamCard } from "@/components/ui/ExamCard"
import { Shield, BookOpen, GraduationCap, Landmark, BookCopy, Globe, ArrowRight, Lightbulb, Leaf, Component, ShieldCheck, Briefcase, Compass } from "lucide-react"
import Link from "next/link"
import { DailyRevisionCard } from "@/components/ui/DailyRevisionCard"
import { motion } from "framer-motion"

import { useState, useEffect } from "react"

export default function Home() {
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  }

  const [liveSubjects, setLiveSubjects] = useState<{ id: string, name: string }[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    fetch(`${apiUrl}/api/v1/taxonomy/subjects`)
      .then(res => res.json())
      .then(data => {
        setLiveSubjects(data.slice(0, 10))
        setLoadingSubjects(false)
      })
      .catch(e => {
        console.error("Failed to fetch subjects", e)
        setLoadingSubjects(false)
      })
  }, [])

  return (
    <div className="container py-16 md:py-32 max-w-6xl mx-auto space-y-32">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center space-y-8 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5, type: "spring" }}
          className="relative z-10 space-y-8 flex flex-col items-center"
        >
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
            Alpha v3.0 is live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-tight">
            Every <span className="text-gradient">PYQ</span>.<br className="hidden md:block" />
            Every Topic. One <span className="text-gradient">Base</span>.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl font-medium">
            Topic-wise Previous Year Questions for UPSC CSE, UPSC CAPF, MPSC Rajyseva & more.
          </p>
          
          <div className="w-full max-w-3xl flex justify-center pt-8">
            <SearchBar />
          </div>
        </motion.div>
      </section>

      {/* SRS Daily Revision Section */}
      <motion.section 
        initial="hidden" 
        whileInView="show" 
        viewport={{ once: true }} 
        variants={fadeIn}
      >
        <DailyRevisionCard />
      </motion.section>

      {/* Choose Your Exam Section */}
      <motion.section 
        initial="hidden" 
        whileInView="show" 
        viewport={{ once: true }} 
        variants={staggerContainer}
        className="space-y-8"
      >
        <motion.div variants={fadeIn} className="flex flex-col items-center text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Choose Your Exam</h2>
          <p className="text-muted-foreground">Master the pattern of your specific examination</p>
        </motion.div>
        
        <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div variants={fadeIn} className="h-full">
            <ExamCard 
              title="UPSC CSE" 
              description="Union Public Service Commission" 
              icon={<Landmark className="h-8 w-8 text-primary" />}
              href="/exams/upsc-cse" 
            />
          </motion.div>
          <motion.div variants={fadeIn} className="h-full">
            <ExamCard 
              title="UPSC CAPF" 
              description="Central Armed Police Forces" 
              icon={<ShieldCheck className="h-8 w-8 text-green-600" />} 
              href="/exams/upsc-capf"
            />
          </motion.div>
          <motion.div variants={fadeIn} className="h-full">
            <ExamCard 
              title="MPSC Rajyseva" 
              description="Maharashtra State Services" 
              icon={<Briefcase className="h-8 w-8 text-orange-600" />} 
              href="/exams/mpsc-rajyseva"
            />
          </motion.div>
          <motion.div variants={fadeIn} className="h-full">
            <ExamCard 
              title="UPSC CDS" 
              description="Combined Defence Services" 
              icon={<Compass className="h-8 w-8 text-red-600" />} 
              href="/exams/upsc-cds"
            />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Browse by Subject Section */}
      <motion.section 
        initial="hidden" 
        whileInView="show" 
        viewport={{ once: true }} 
        variants={fadeIn}
        className="space-y-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Browse by Subject</h2>
          <Link href="/subjects" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        
        <div className="flex flex-wrap gap-4">
          {loadingSubjects ? (
             <div className="text-sm text-muted-foreground animate-pulse">Loading subjects...</div>
          ) : (
            liveSubjects.map(subject => (
              <SubjectPill key={subject.id} icon={<BookOpen className="h-4 w-4" />} name={subject.name} />
            ))
          )}
        </div>
      </motion.section>
    </div>
  );
}

function SubjectPill({ icon, name }: { icon: React.ReactNode; name: string }) {
  return (
    <Link 
      href={`/subjects/${name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
      className="flex items-center gap-2 rounded-full liquid-glass px-5 py-3 text-sm font-bold hover:border-primary/50 hover:bg-primary/10 transition-all hover:scale-105 active:scale-95"
    >
      <span className="text-primary">{icon}</span>
      {name}
    </Link>
  )
}

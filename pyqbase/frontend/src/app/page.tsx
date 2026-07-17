"use client"

import { ExamCard } from "@/components/ui/ExamCard"
import { Shield, BookOpen, GraduationCap, Landmark, BookCopy, Globe, ArrowRight, Lightbulb, Leaf, Component, ShieldCheck, Briefcase, Compass, Target, Clock, BrainCircuit, Search, Repeat, BarChart3, Database, Users, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { DailyRevisionCard } from "@/components/ui/DailyRevisionCard"
import { motion } from "framer-motion"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Target as TargetIcon, Clock as ClockIcon } from "lucide-react"

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

  const { user, isLoading } = useAuth()
  const targetExam = user?.user_metadata?.target_exam
  const firstName = user?.user_metadata?.first_name || 'Student'
  const targetYear = user?.user_metadata?.target_year

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

          {!isLoading && targetExam ? (
            <>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-tight">
                Welcome back, <span className="text-gradient">{firstName}</span>
              </h1>
              <div className="flex items-center gap-4 text-lg md:text-xl text-muted-foreground font-medium">
                <span className="flex items-center gap-2"><TargetIcon className="w-5 h-5 text-primary" /> {targetExam}</span>
                <span className="text-border">•</span>
                <span className="flex items-center gap-2"><ClockIcon className="w-5 h-5 text-secondary" /> Target {targetYear}</span>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-tight">
                Every <span className="text-gradient">PYQ</span>.<br className="hidden md:block" />
                Every Topic. One <span className="text-gradient">Base</span>.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl font-medium">
                Topic-wise Previous Year Questions for UPSC CSE, UPSC CAPF, MPSC Rajyseva & more.
              </p>
            </>
          )}
          
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

      {/* Stats Section (By the Numbers) */}
      <motion.section 
        initial="hidden" 
        whileInView="show" 
        viewport={{ once: true }} 
        variants={staggerContainer}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-y border-border/50"
      >
        <motion.div variants={fadeIn} className="flex flex-col items-center justify-center p-6 text-center space-y-2">
          <Database className="h-8 w-8 text-primary mb-2 opacity-80" />
          <h3 className="text-4xl font-extrabold tracking-tight">10k+</h3>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total PYQs</p>
        </motion.div>
        <motion.div variants={fadeIn} className="flex flex-col items-center justify-center p-6 text-center space-y-2">
          <ClockIcon className="h-8 w-8 text-secondary mb-2 opacity-80" />
          <h3 className="text-4xl font-extrabold tracking-tight">15+</h3>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Years of Data</p>
        </motion.div>
        <motion.div variants={fadeIn} className="flex flex-col items-center justify-center p-6 text-center space-y-2">
          <CheckCircle2 className="h-8 w-8 text-green-500 mb-2 opacity-80" />
          <h3 className="text-4xl font-extrabold tracking-tight">100%</h3>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Detailed Explanations</p>
        </motion.div>
        <motion.div variants={fadeIn} className="flex flex-col items-center justify-center p-6 text-center space-y-2">
          <Users className="h-8 w-8 text-blue-500 mb-2 opacity-80" />
          <h3 className="text-4xl font-extrabold tracking-tight">4+</h3>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Major Exams</p>
        </motion.div>
      </motion.section>

      {/* Why PYQBase? (Features) */}
      <motion.section 
        initial="hidden" 
        whileInView="show" 
        viewport={{ once: true }} 
        variants={staggerContainer}
        className="space-y-12 pt-8"
      >
        <motion.div variants={fadeIn} className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground">
            Why PYQBase?
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">A Smarter Way to Prepare</h2>
          <p className="text-lg text-muted-foreground font-medium">
            Stop relying on generic test series. Master the actual exam pattern with intelligent, data-driven features designed specifically for serious aspirants.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div variants={fadeIn} className="liquid-glass rounded-3xl p-8 space-y-6 hover:border-primary/50 transition-colors">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Component className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Micro-Topic Organization</h3>
              <p className="text-muted-foreground">Don&apos;t just practice &quot;History&quot;. Dive deep into specific micro-topics like &quot;Buddhism&quot; or &quot;Gandhian Phase&quot;. Track your mastery at the most granular level possible.</p>
            </div>
          </motion.div>

          <motion.div variants={fadeIn} className="liquid-glass rounded-3xl p-8 space-y-6 hover:border-secondary/50 transition-colors">
            <div className="h-12 w-12 rounded-2xl bg-secondary/20 flex items-center justify-center">
              <Search className="h-6 w-6 text-secondary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Cross-Exam Intelligence</h3>
              <p className="text-muted-foreground">UPSC loves to repeat themes. Search for a keyword and see how the same topic was asked across CSE, CAPF, and CDS over the last decade.</p>
            </div>
          </motion.div>

          <motion.div variants={fadeIn} className="liquid-glass rounded-3xl p-8 space-y-6 hover:border-green-500/50 transition-colors">
            <div className="h-12 w-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <Repeat className="h-6 w-6 text-green-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Spaced Repetition System</h3>
              <p className="text-muted-foreground">Our intelligent algorithm tracks your mistakes and schedules daily revision batches, forcing you to re-attempt questions right before you forget them.</p>
            </div>
          </motion.div>

          <motion.div variants={fadeIn} className="liquid-glass rounded-3xl p-8 space-y-6 hover:border-orange-500/50 transition-colors">
            <div className="h-12 w-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-orange-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Detailed Analytics</h3>
              <p className="text-muted-foreground">Identify exactly where you are losing marks. Are you weak in Polity conceptual questions or factual History dates? Our analytics pinpoints it instantly.</p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* How it Works Section */}
      <motion.section 
        initial="hidden" 
        whileInView="show" 
        viewport={{ once: true }} 
        variants={staggerContainer}
        className="space-y-16 pt-8 pb-16"
      >
        <motion.div variants={fadeIn} className="text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">How it Works</h2>
          <p className="text-muted-foreground">Your journey from preparation to perfection</p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Connector Line for Desktop */}
          <div className="hidden md:block absolute top-8 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-border to-transparent" />
          
          <motion.div variants={fadeIn} className="flex flex-col items-center text-center space-y-4 relative z-10">
            <div className="h-16 w-16 rounded-full bg-background border-2 border-primary flex items-center justify-center text-2xl font-bold text-primary shadow-lg shadow-primary/20">1</div>
            <h3 className="text-xl font-bold mt-4">Select Target</h3>
            <p className="text-muted-foreground max-w-xs">Choose your primary exam (e.g. UPSC CSE) and dive into a specific subject or topic.</p>
          </motion.div>

          <motion.div variants={fadeIn} className="flex flex-col items-center text-center space-y-4 relative z-10">
            <div className="h-16 w-16 rounded-full bg-background border-2 border-primary flex items-center justify-center text-2xl font-bold text-primary shadow-lg shadow-primary/20">2</div>
            <h3 className="text-xl font-bold mt-4">Generate Mock Tests</h3>
            <p className="text-muted-foreground max-w-xs">Instantly generate a mock test from that exact topic to test your knowledge in real-time.</p>
          </motion.div>

          <motion.div variants={fadeIn} className="flex flex-col items-center text-center space-y-4 relative z-10">
            <div className="h-16 w-16 rounded-full bg-background border-2 border-primary flex items-center justify-center text-2xl font-bold text-primary shadow-lg shadow-primary/20">3</div>
            <h3 className="text-xl font-bold mt-4">Revise Intelligently</h3>
            <p className="text-muted-foreground max-w-xs">Review detailed explanations and let the Spaced Repetition System schedule your revisions.</p>
          </motion.div>
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

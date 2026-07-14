'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronRight, Target, Calendar } from 'lucide-react'
import { MagneticButton } from '@/components/ui/MagneticButton'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [exams, setExams] = useState<string[]>([])
  const [years, setYears] = useState<number[]>([])
  const [loadingExams, setLoadingExams] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [targetExam, setTargetExam] = useState('')
  const [targetYear, setTargetYear] = useState('')
  const [name, setName] = useState('')

  const router = useRouter()
  const supabase = createClient()
  
  useEffect(() => {
    // Fetch live exams from backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
    fetch(`${apiUrl}/api/v1/analytics/exams`)
      .then(res => res.json())
      .then(data => {
        setExams(data)
        setLoadingExams(false)
      })
      .catch(err => {
        console.error("Failed to fetch exams:", err)
        setLoadingExams(false)
      })
  }, [])

  const handleNext = async () => {
    if (step === 1) {
      if (!name) return
      setStep(2)
    } else if (step === 2) {
      if (!targetExam) return
      // Fetch years for selected exam before moving to step 3
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
      try {
        const res = await fetch(`${apiUrl}/api/v1/analytics/exams/${encodeURIComponent(targetExam)}`)
        if (res.ok) {
          const data = await res.json()
          setYears(data.available_years || [])
        }
      } catch (e) {
        console.error(e)
      }
      setStep(3)
    } else if (step === 3) {
      if (!targetYear) return
      completeOnboarding()
    }
  }

  const completeOnboarding = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: name,
          target_exam: targetExam,
          target_year: targetYear,
          onboarding_completed: true
        }
      })
      
      if (error) throw error
      
      // Navigate to homepage which will now show personalized dashboard
      router.push('/')
      // Force refresh to update auth context
      router.refresh()
    } catch (err) {
      console.error("Error saving onboarding:", err)
      setSaving(false)
    }
  }

  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-300 ${step === i ? 'w-8 bg-primary' : step > i ? 'w-2 bg-primary/40' : 'w-2 bg-border'}`}
            />
          ))}
        </div>

        <div className="glass-card p-8 md:p-10 rounded-3xl shadow-xl shadow-primary/5 border border-white/20 relative overflow-hidden">
          <AnimatePresence mode="wait">
            
            {step === 1 && (
              <motion.div
                key="step1"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl font-extrabold tracking-tight">Welcome to PYQBase!</h2>
                  <p className="text-muted-foreground">Let&apos;s set up your personalized study dashboard.</p>
                </div>
                
                <div className="space-y-3 mt-8">
                  <label className="text-sm font-semibold ml-1">What should we call you?</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your first name" 
                    className="w-full px-5 py-4 rounded-xl border bg-background/50 focus:ring-2 focus:ring-primary focus:outline-none transition-all text-lg"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div className="space-y-2 text-center">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight">Your Target Exam</h2>
                  <p className="text-muted-foreground">Which exam are you preparing for?</p>
                </div>
                
                <div className="grid grid-cols-1 gap-3 mt-6">
                  {loadingExams ? (
                    <div className="text-center text-sm text-muted-foreground animate-pulse py-4">Loading exams...</div>
                  ) : exams.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground">No exams found in DB.</div>
                  ) : (
                    exams.map(exam => (
                      <button
                        key={exam}
                        onClick={() => setTargetExam(exam)}
                        className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${targetExam === exam ? 'border-primary bg-primary/5' : 'border-border bg-background/50 hover:border-primary/40'}`}
                      >
                        <span className="font-bold">{exam}</span>
                        {targetExam === exam && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div className="space-y-2 text-center">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight">Target Year</h2>
                  <p className="text-muted-foreground">When are you planning to appear for {targetExam}?</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-6">
                  {[0, 1, 2, 3].map(offset => {
                    const year = String(new Date().getFullYear() + offset)
                    return (
                      <button
                        key={year}
                        onClick={() => setTargetYear(year)}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${targetYear === year ? 'border-primary bg-primary/5' : 'border-border bg-background/50 hover:border-primary/40'}`}
                      >
                        <span className="text-xl font-bold">{year}</span>
                        {targetYear === year && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          <div className="mt-8 pt-6 border-t border-border/50">
            <MagneticButton
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-semibold text-primary-foreground hover:bg-primary-dark transition-all shadow-md shadow-primary/20 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none"
              style={{ opacity: saving ? 0.7 : 1, pointerEvents: saving ? 'none' : 'auto' }}
            >
              {saving ? (
                <><span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving Profile…</>
              ) : step === 3 ? (
                <>Enter Dashboard <Check className="w-4 h-4" /></>
              ) : (
                <>Continue <ChevronRight className="w-4 h-4" /></>
              )}
            </MagneticButton>
          </div>
        </div>
      </div>
    </div>
  )
}

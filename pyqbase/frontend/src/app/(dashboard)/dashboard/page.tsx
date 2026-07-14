'use client'

import { useAuth } from "@/components/providers/auth-provider"
import Link from "next/link"
import { Calendar, TrendingUp, Target, Clock, Zap, BookOpen } from "lucide-react"

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  
  // Hardcoded for now until API is built in Phase 2
  const mockStreak = 12
  const mockTestsTaken = 5
  const mockSrsDue = 24

  if (!user) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Please log in to view your dashboard</h1>
        <Link href="/login" className="text-primary hover:underline">Go to Login</Link>
      </div>
    )
  }

  return (
    <div className="container py-10 max-w-6xl">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Welcome back, <span className="text-primary">{user.email?.split('@')[0]}</span></h1>
          <p className="text-muted-foreground">Here is your study progress overview.</p>
        </div>
        <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground underline">Sign Out</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Streak Card */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">FR-15.1</span>
          </div>
          <div>
            <h3 className="text-4xl font-black">{mockStreak} <span className="text-xl text-muted-foreground font-medium">Days</span></h3>
            <p className="text-sm font-medium mt-1">Current Study Streak</p>
          </div>
        </div>

        {/* SRS Card */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-black">{mockSrsDue} <span className="text-xl text-muted-foreground font-medium">Cards</span></h3>
            <p className="text-sm font-medium mt-1">Due for Daily Revision</p>
            <Link href="/srs" className="text-blue-500 text-sm font-medium hover:underline mt-2 inline-block">Start Revision &rarr;</Link>
          </div>
        </div>

        {/* Mock Tests Card */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
              <Target className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-black">{mockTestsTaken} <span className="text-xl text-muted-foreground font-medium">Tests</span></h3>
            <p className="text-sm font-medium mt-1">Mock Tests Completed</p>
            <Link href="/mock-tests" className="text-green-500 text-sm font-medium hover:underline mt-2 inline-block">Take a Mock Test &rarr;</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Streak Calendar Placeholder */}
        <div className="border rounded-2xl p-6 bg-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-muted-foreground" /> Activity Calendar</h2>
            <span className="text-xs text-muted-foreground">IST Boundaries</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div 
                key={i} 
                className={`aspect-square rounded-md ${
                  i < 12 ? 'bg-orange-500/20' : 
                  i === 12 ? 'bg-orange-500 animate-pulse' : 
                  'bg-secondary'
                }`}
                title={i <= 12 ? 'Studied' : 'Upcoming'}
              />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border rounded-2xl p-6 bg-card">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6"><TrendingUp className="w-5 h-5 text-muted-foreground" /> Quick Actions</h2>
          <div className="space-y-4">
            <Link href="/search" className="flex items-center gap-4 p-4 rounded-xl border hover:border-primary/50 transition-colors group">
              <div className="bg-primary/10 text-primary p-2 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold">Search PYQs</h4>
                <p className="text-sm text-muted-foreground">Cross-exam global search</p>
              </div>
            </Link>
            <Link href="/years" className="flex items-center gap-4 p-4 rounded-xl border hover:border-primary/50 transition-colors group">
              <div className="bg-primary/10 text-primary p-2 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold">Browse by Year</h4>
                <p className="text-sm text-muted-foreground">Find PYQs for any given year</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

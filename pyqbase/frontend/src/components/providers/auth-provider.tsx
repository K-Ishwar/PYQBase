'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useRouter, usePathname } from 'next/navigation'

export type AdminViewMode = 'real' | 'guest' | 'free' | 'premium'

type AuthContextType = {
  user: User | null
  isLoading: boolean
  isAdmin: boolean
  isActualAdmin: boolean
  isSubscribed: boolean
  adminViewMode: AdminViewMode
  setAdminViewMode: (mode: AdminViewMode) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [adminViewMode, setAdminViewModeState] = useState<AdminViewMode>('real')
  const supabase = createClient()
  
  // Load initial view mode from localStorage safely
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('admin_view_override') as AdminViewMode
      if (stored) setAdminViewModeState(stored)
    }
  }, [])
  
  const setAdminViewMode = (mode: AdminViewMode) => {
    setAdminViewModeState(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_view_override', mode)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const isActualAdmin = user?.app_metadata?.role === 'admin' || user?.user_metadata?.role === 'admin' || user?.email === 'omekhande4@gmail.com'
  
  // Apply Overrides if they are an admin
  let effectiveUser = user
  let isAdmin = isActualAdmin
  let isSubscribed = user?.app_metadata?.subscription_status === 'active' || isActualAdmin

  if (isActualAdmin) {
    if (adminViewMode === 'guest') {
      effectiveUser = null
      isAdmin = false
      isSubscribed = false
    } else if (adminViewMode === 'free') {
      isAdmin = false
      isSubscribed = false
    } else if (adminViewMode === 'premium') {
      isAdmin = false
      isSubscribed = true
    }
  }

  const router = useRouter()
  const pathname = usePathname()

  // Client-side onboarding and route protection
  useEffect(() => {
    if (isLoading) return

    if (effectiveUser) {
      const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/onboarding') || pathname.startsWith('/admin')
      if (!isAuthRoute && effectiveUser.user_metadata?.onboarding_completed !== true) {
        router.push('/onboarding')
      }
    } else {
      // User is logged out
      if (pathname.startsWith('/mock-tests')) {
        router.push('/login')
      }
    }
  }, [effectiveUser, isLoading, pathname, router])

  return (
    <AuthContext.Provider value={{ user: effectiveUser, isLoading, isAdmin, isActualAdmin, isSubscribed, adminViewMode, setAdminViewMode }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

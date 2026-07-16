"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Moon, Sun, User as UserIcon, LogOut } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { MagneticButton } from "@/components/ui/MagneticButton"
import { motion } from "framer-motion"

export function Navbar() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [hoveredPath, setHoveredPath] = React.useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  
  const { user, isLoading, isAdmin, isActualAdmin, adminViewMode, setAdminViewMode } = useAuth()
  const [profileOpen, setProfileOpen] = React.useState(false)
  const supabase = createClient()

  React.useEffect(() => { setMounted(true) }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setProfileOpen(false)
    router.push('/login')
  }

  return (
    <nav className="sticky top-0 z-50 w-full liquid-glass border-b-0">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo and Admin Link */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-primary">
              PYQ<span className="text-foreground">Base</span>
            </span>
          </Link>
          
          {isAdmin && (
            <Link 
              href="/admin" 
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground bg-primary/90 hover:bg-primary rounded-full transition-colors"
            >
              Admin
            </Link>
          )}
          
          {isActualAdmin && (
            <select
              value={adminViewMode}
              onChange={(e) => {
                setAdminViewMode(e.target.value as any)
                window.location.reload()
              }}
              className="text-xs bg-muted border-none rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-primary/50 text-muted-foreground font-medium"
            >
              <option value="real">Real Admin</option>
              <option value="premium">Test: Premium User</option>
              <option value="free">Test: Free User</option>
              <option value="guest">Test: Logged Out</option>
            </select>
          )}
        </div>

        {/* Center Nav Links */}
          <div 
            className="hidden md:flex items-center gap-1 text-sm font-medium"
            onMouseLeave={() => setHoveredPath(null)}
          >
            {[
              { href: "/", label: "Home" },
              { href: "/exams", label: "Exams" },
              { href: "/subjects", label: "Subjects" },
              { href: "/years", label: "Years" },
              { href: "/search", label: "Search" },
              { href: "/mock-tests", label: "Mock Tests" },
            ].map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
              return (
                <Link 
                  key={link.href}
                  href={link.href} 
                  onMouseEnter={() => setHoveredPath(link.href)}
                  className="relative px-4 py-2 transition-colors rounded-full flex items-center justify-center"
                >
                  {hoveredPath === link.href && (
                    <motion.div
                      layoutId="navbar-hover-pill"
                      className="absolute inset-0 bg-primary/10 rounded-full z-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.8 }}
                    />
                  )}
                  <span className={`relative z-10 transition-colors ${isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}>
                    {link.label}
                  </span>
                  {isActive && (
                    <div className="absolute inset-x-0 bottom-0 flex justify-center">
                      <motion.div
                        layoutId="navbar-active-indicator"
                        className="w-4 h-0.5 rounded-full bg-primary z-10"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    </div>
                  )}
                </Link>
              )
            })}
          </div>

        <div className="flex items-center gap-2">

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          <div className="hidden sm:flex items-center gap-2">
            {!isLoading && (
              user ? (
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground rounded-md border border-border/50 bg-background/40 backdrop-blur-md shadow-sm hover:bg-muted transition-all active:shadow-[0_0_15px_hsl(var(--primary))] active:scale-95"
                  >
                    <UserIcon className="h-4 w-4" />
                    Profile
                  </button>
                  
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md glass-card py-1 z-50">
                      <div className="px-4 py-2 border-b border-border/50">
                        <p className="text-sm truncate text-muted-foreground">{user.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 backdrop-blur-md border border-primary/20 rounded-md hover:bg-primary/20 transition-all active:shadow-[0_0_15px_hsl(var(--primary))] active:scale-95 shadow-sm"
                  >
                    Login
                  </Link>
                  <MagneticButton className="rounded-md shadow-md shadow-primary/20 hover:shadow-lg transition-all bg-primary border border-primary-foreground/20 backdrop-blur-md active:shadow-[0_0_20px_hsl(var(--primary))]">
                    <Link href="/signup" className="px-4 py-2 block w-full h-full text-sm font-bold text-primary-foreground hover:bg-primary-dark transition-all rounded-md active:scale-95">
                      Sign Up
                    </Link>
                  </MagneticButton>
                </>
              )
            )}
          </div>
        </div>
      </div>
      
      {/* Click outside listener for dropdown */}
      {profileOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setProfileOpen(false)}
        />
      )}
    </nav>
  )
}

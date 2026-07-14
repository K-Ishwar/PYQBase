"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Search, Moon, Sun, X, User as UserIcon, LogOut } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { MagneticButton } from "@/components/ui/MagneticButton"

export function Navbar() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  
  const { user, isLoading } = useAuth()
  const [profileOpen, setProfileOpen] = React.useState(false)
  const supabase = createClient()

  React.useEffect(() => { setMounted(true) }, [])

  // Focus input when search opens
  React.useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  // ⌘K / Ctrl+K shortcut
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery("")
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setProfileOpen(false)
    router.push('/login')
  }

  return (
    <nav className="sticky top-0 z-50 w-full liquid-glass border-b-0">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-primary">
            PYQ<span className="text-foreground">Base</span>
          </span>
        </Link>

        {/* Inline search bar (shown when open) */}
        {searchOpen ? (
          <form onSubmit={handleSearchSubmit} className="flex-1 mx-6 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Try "El Nino" or "Fundamental Rights"…'
                className="w-full rounded-full border border-primary bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </form>
        ) : (
          /* Center Nav Links */
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/" className="transition-colors hover:text-primary">Home</Link>
            <Link href="/exams" className="text-muted-foreground transition-colors hover:text-primary">Exams</Link>
            <Link href="/subjects" className="text-muted-foreground transition-colors hover:text-primary">Subjects</Link>
            <Link href="/years" className="text-muted-foreground transition-colors hover:text-primary">Years</Link>
            <Link href="/search" className="text-muted-foreground transition-colors hover:text-primary">Search</Link>
            <Link href="/mock-tests" className="text-muted-foreground transition-colors hover:text-primary">Mock Tests</Link>
          </div>
        )}

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSearchOpen((o) => !o)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open search"
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-muted-foreground hover:text-foreground"
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
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground rounded-md hover:bg-muted transition-colors"
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
                    className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
                  >
                    Login
                  </Link>
                  <MagneticButton className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary rounded-md shadow-md shadow-primary/20 hover:bg-primary-dark hover:shadow-lg transition-colors">
                    <Link href="/signup">
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

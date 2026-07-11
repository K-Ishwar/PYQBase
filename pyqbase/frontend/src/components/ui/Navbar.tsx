"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Search, Moon, Sun } from "lucide-react"

export function Navbar() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-primary">
            PYQ<span className="text-foreground">Base</span>
          </span>
        </Link>

        {/* Center Nav Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link href="/" className="transition-colors hover:text-primary">Home</Link>
          <Link href="/exams" className="text-muted-foreground transition-colors hover:text-primary">Exams</Link>
          <Link href="/subjects" className="text-muted-foreground transition-colors hover:text-primary">Subjects</Link>
          <Link href="/topics" className="text-muted-foreground transition-colors hover:text-primary">Topics</Link>
          <Link href="/search" className="text-muted-foreground transition-colors hover:text-primary">Search</Link>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          <button className="text-muted-foreground hover:text-foreground">
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
            <Link 
              href="/login" 
              className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
            >
              Login
            </Link>
            <Link 
              href="/signup" 
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary-dark transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

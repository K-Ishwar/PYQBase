'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true)
    setError(null)
    
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (loginError) {
      setError(loginError.message)
      setIsLoading(false)
      return
    }

    try {
      // Sync user with backend immediately after authentication
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      await fetch(`${apiUrl}/api/v1/auth/sync-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.session?.access_token}`
        }
      })
    } catch (e) {
      console.error('Failed to sync user with backend:', e)
      // Continue anyway - user is logged in to Supabase
    }

    router.push('/')
    setIsLoading(false)
  }

  const handleGoogleLogin = async () => {
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })
      if (oauthError) {
        setError(oauthError.message)
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred during Google Login')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen mesh-bg p-4">
      {/* Decorative ambient blur behind the card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50 dark:opacity-20" />
      
      <div className="w-full max-w-[420px] relative">
        <div className="bg-background/70 dark:bg-background/40 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl p-8 md:p-10">
          
          <div className="flex flex-col items-center mb-8 space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-xl">P</span>
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome Back</h1>
              <p className="text-sm text-muted-foreground font-medium">Log into your PYQBase account</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" className="h-12 rounded-xl bg-background/50 border-white/10 shadow-sm transition-all focus:bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" className="h-12 rounded-xl bg-background/50 border-white/10 shadow-sm transition-all focus:bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl font-medium">{error}</div>}
              
              <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl shadow-md transition-all hover:shadow-lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Log In'
                )}
              </Button>
            </form>
          </Form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background/80 px-4 text-muted-foreground font-semibold backdrop-blur-sm rounded-full">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            type="button"
            className="w-full h-12 text-base font-medium rounded-xl bg-background/50 hover:bg-background border-white/10 shadow-sm transition-all hover:shadow-md"
            onClick={handleGoogleLogin}
          >
            <svg className="mr-3 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
            Google
          </Button>
          
          <p className="text-center text-sm text-muted-foreground font-medium mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-foreground hover:underline font-bold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

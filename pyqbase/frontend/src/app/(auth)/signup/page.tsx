'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  // LC-01/LC-02: Explicit consent — must be exactly `true`, never pre-ticked
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms of Service and Privacy Policy to continue.' }),
  }),
})

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    // termsAccepted intentionally omitted from defaultValues → starts unchecked
    defaultValues: { email: '', password: '' } as z.infer<typeof signupSchema>,
  })

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    setIsLoading(true)
    setError(null)
    const { data, error: signupError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    })

    if (signupError) {
      setError(signupError.message)
      setIsLoading(false)
      return
    }

    if (data.session) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        await fetch(`${apiUrl}/api/v1/auth/sync-user`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${data.session.access_token}` },
        })
        router.push('/')
      } catch {
        setError('Failed to sync user with backend')
      }
    } else {
      setError('Please check your email to confirm your account.')
    }
    router.push('/onboarding')
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
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h1>
              <p className="text-sm text-muted-foreground font-medium">Join PYQBase to start your exam prep</p>
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
                      <Input id="signup-email" placeholder="name@example.com" className="h-12 rounded-xl bg-background/50 border-white/10 shadow-sm transition-all focus:bg-background" {...field} />
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
                      <Input id="signup-password" type="password" placeholder="••••••••" className="h-12 rounded-xl bg-background/50 border-white/10 shadow-sm transition-all focus:bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Explicit, unchecked consent */}
              <FormField
                control={form.control}
                name="termsAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-border/50 p-4 bg-muted/20">
                    <FormControl>
                      <Checkbox
                        id="terms-consent"
                        checked={field.value === true}
                        onCheckedChange={(v) => field.onChange(v === true ? true : undefined)}
                        className="mt-1 rounded-sm"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel htmlFor="terms-consent" className="text-xs font-medium text-muted-foreground cursor-pointer leading-relaxed">
                        By signing up, you agree to our{' '}
                        <Link href="/terms" className="text-foreground hover:underline font-semibold" target="_blank">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-foreground hover:underline font-semibold" target="_blank">
                          Privacy Policy
                        </Link>.
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl font-medium">{error}</div>}

              <Button
                id="signup-submit"
                type="submit"
                className="w-full h-12 text-base font-semibold rounded-xl shadow-md transition-all hover:shadow-lg"
                disabled={isLoading || form.watch('termsAccepted') !== true}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
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
            Already have an account?{' '}
            <Link href="/login" className="text-foreground hover:underline font-bold">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

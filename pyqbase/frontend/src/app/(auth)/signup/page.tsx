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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { createClient } from '@/lib/supabase/client'

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
    setIsLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-[400px]">
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>Join PYQBase to start your exam preparation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input id="signup-email" placeholder="email@example.com" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input id="signup-password" type="password" placeholder="Min. 8 characters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Explicit, unchecked consent (DPDP / LC-01 / LC-02) */}
              <FormField
                control={form.control}
                name="termsAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
                    <FormControl>
                      <Checkbox
                        id="terms-consent"
                        checked={field.value === true}
                        onCheckedChange={(v) => field.onChange(v === true ? true : undefined)}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel htmlFor="terms-consent" className="font-normal cursor-pointer">
                        I have read and agree to the{' '}
                        <Link href="/terms" className="text-primary hover:underline font-medium" target="_blank">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-primary hover:underline font-medium" target="_blank">
                          Privacy Policy
                        </Link>.
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {error && <p className="text-destructive text-sm">{error}</p>}

              <Button
                id="signup-submit"
                type="submit"
                className="w-full"
                disabled={isLoading || form.watch('termsAccepted') !== true}
              >
                {isLoading ? 'Creating account…' : 'Create Account'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
          >
            Sign up with Google
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">Log in</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

'use client'

import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function PricingPage() {
  return (
    <div className="container py-16 md:py-24 max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that best fits your preparation needs. Upgrade anytime to unlock unlimited potential.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
        {/* Free Plan */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-2xl">Basic</CardTitle>
            <CardDescription>Perfect for getting started and casual practice</CardDescription>
            <div className="mt-4 flex items-baseline text-4xl font-extrabold">
              ₹0
              <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span>30 question attempts per day</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span>1 Custom Mock Test per week</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span>Basic Spaced Repetition (SRS)</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <X className="h-5 w-5" />
                <span>No Weak-Area targeted mock tests</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <X className="h-5 w-5" />
                <span>No detailed analytics & insights</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/signup">Get Started for Free</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Premium Plan */}
        <Card className="border-primary shadow-lg shadow-primary/20 relative">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-4 bg-primary text-primary-foreground px-3 py-1 text-sm font-medium rounded-full shadow-sm">
            Most Popular
          </div>
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Pro</CardTitle>
            <CardDescription>Everything you need for serious preparation</CardDescription>
            <div className="mt-4 flex items-baseline text-4xl font-extrabold">
              ₹299
              <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="font-semibold">Unlimited question attempts</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="font-semibold">Unlimited Custom Mock Tests</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span className="font-semibold">Weak-Area targeted Mock Tests</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span>Advanced ELO Analytics & Heatmaps</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <span>Priority support</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full text-lg h-12" asChild>
              {/* Note: This is a placeholder for Stripe/Razorpay checkout */}
              <Link href="#">Buy Now</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

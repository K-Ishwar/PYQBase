"use client";

import { apiClient } from "@/lib/api-client";
import { useState } from "react";
import { Check } from "lucide-react";
import Script from "next/script";

const PLANS = {
  monthly: {
    id: "plan_monthly_299", // Replace with real Razorpay Plan ID
    name: "Monthly",
    price: "₹299",
    period: "/month",
  },
  annual: {
    id: "plan_annual_1499", // Replace with real Razorpay Plan ID
    name: "Annual Pass",
    price: "₹1,499",
    period: "/year",
    popular: true,
  },
};

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (planKey: keyof typeof PLANS) => {
    try {
      setLoadingPlan(planKey);
      const planId = PLANS[planKey].id;
      
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      // 1. Create subscription on backend
      const res = await apiClient("/api/v1/payments/create-subscription", {
        method: "POST",
        body: JSON.stringify({ plan_id: planId }),
      });

      if (!res.ok) {
        throw new Error("Failed to initialize payment");
      }
      
      const data = await res.json();
      
      // 2. Launch Razorpay Checkout Modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use public key from env
        subscription_id: data.subscription_id,
        name: "PYQBase Premium",
        description: `Upgrade to ${PLANS[planKey].name}`,
        handler: function (response: any) {
          alert("Payment Successful! Your account has been upgraded.");
          window.location.href = "/subjects";
        },
        theme: {
          color: "#4F46E5",
        },
      };
      
      // @ts-ignore - Razorpay is injected via Script tag
      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-24">
      {/* Load Razorpay SDK securely */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-xl text-muted-foreground">
            Unlock the ultimate UPSC preparation toolkit. No hidden fees.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-8 flex flex-col">
            <h3 className="text-2xl font-semibold text-foreground">Freemium</h3>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold">
              ₹0
              <span className="ml-1 text-xl font-medium text-muted-foreground">/forever</span>
            </div>
            <p className="mt-4 text-muted-foreground">Essential access for daily practice.</p>
            <ul className="mt-8 space-y-4 flex-1">
              <li className="flex items-center">
                <Check className="h-5 w-5 text-primary mr-3" />
                <span>30 Questions per day limit</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-primary mr-3" />
                <span>1 Custom Mock Test per week</span>
              </li>
              <li className="flex items-center text-muted-foreground opacity-70">
                <Check className="h-5 w-5 mr-3" />
                <span>No Weak-Area Mock Tests</span>
              </li>
            </ul>
            <button
              disabled
              className="mt-8 w-full bg-muted text-muted-foreground rounded-lg px-4 py-3 font-semibold"
            >
              Current Plan
            </button>
          </div>

          {/* Premium Plan */}
          <div className="bg-primary rounded-2xl shadow-lg border border-primary p-8 flex flex-col text-primary-foreground relative transform md:-scale-y-100 md:scale-105" style={{ transform: "none" }}>
            <div className="absolute top-0 right-0 -mr-2 -mt-2">
              <span className="bg-gradient-to-r from-pink-500 to-orange-400 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Most Popular
              </span>
            </div>
            <h3 className="text-2xl font-semibold">Premium</h3>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold">
              {PLANS.annual.price}
              <span className="ml-1 text-xl font-medium text-primary-foreground/80">{PLANS.annual.period}</span>
            </div>
            <p className="mt-4 text-primary-foreground/90">Unlimited access to supercharge your prep.</p>
            <ul className="mt-8 space-y-4 flex-1 text-primary-foreground">
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-400 mr-3" />
                <span>Unlimited daily questions</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-400 mr-3" />
                <span>Unlimited Mock Tests</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-400 mr-3" />
                <span>AI Weak-Area Targeted Tests</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-400 mr-3" />
                <span>Priority Data Exports</span>
              </li>
            </ul>
            <button
              onClick={() => handleUpgrade("annual")}
              disabled={loadingPlan === "annual"}
              className="mt-8 w-full bg-background text-primary rounded-lg px-4 py-3 font-bold hover:bg-muted transition-colors"
            >
              {loadingPlan === "annual" ? "Processing..." : "Upgrade to Annual"}
            </button>
            <button
              onClick={() => handleUpgrade("monthly")}
              disabled={loadingPlan === "monthly"}
              className="mt-4 w-full bg-primary-foreground/10 text-primary-foreground rounded-lg px-4 py-3 font-semibold hover:bg-primary-foreground/20 transition-colors"
            >
              {loadingPlan === "monthly" ? "Processing..." : `Or ${PLANS.monthly.price} ${PLANS.monthly.period}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

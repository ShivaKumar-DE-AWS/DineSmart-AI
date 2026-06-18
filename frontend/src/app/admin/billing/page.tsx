"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Crown, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [isSubscribing, setIsSubscribing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => api<{ subscription_status: string; subscription_expiry: string }>("/api/billing/status"),
  });

  const subscribeMutation = useMutation({
    mutationFn: () => api("/api/billing/subscribe", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-status"] });
      toast.success("Subscription activated successfully!");
      setIsSubscribing(false);
    },
    onError: (error) => {
      toast.error("Failed to activate subscription. " + error.message);
      setIsSubscribing(false);
    }
  });

  if (isLoading) {
    return <div className="p-8 text-stone animate-pulse">Loading billing details...</div>;
  }

  const isTrial = data?.subscription_status === "trial";
  const isActive = data?.subscription_status === "active";
  const isExpired = data?.subscription_status === "expired";
  
  const expiryDate = data?.subscription_expiry ? new Date(data.subscription_expiry).toLocaleDateString() : "Unknown";
  
  const handleSubscribe = () => {
    setIsSubscribing(true);
    // Simulating a brief payment gateway delay for realistic feel
    setTimeout(() => {
      subscribeMutation.mutate();
    }, 1500);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-up">
      <h1 className="font-heading text-3xl tracking-tight mb-8">Billing & Subscription</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-bone rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${isActive ? 'bg-sage/10 text-sage' : isTrial ? 'bg-clay/10 text-clay' : 'bg-red-100 text-red-600'}`}>
            {isActive ? <CheckCircle2 className="h-6 w-6" /> : isTrial ? <Clock className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div className="text-sm font-medium text-stone uppercase tracking-widest mb-1">Status</div>
          <div className="font-heading text-2xl capitalize">{data?.subscription_status || "Unknown"}</div>
        </div>
        
        <div className="bg-white border border-bone rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-ink/5 flex items-center justify-center mb-4 text-ink">
            <Clock className="h-6 w-6" />
          </div>
          <div className="text-sm font-medium text-stone uppercase tracking-widest mb-1">Valid Until</div>
          <div className="font-heading text-2xl">{expiryDate}</div>
        </div>
        
        <div className="bg-white border border-bone rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-ink/5 flex items-center justify-center mb-4 text-ink">
            <Crown className="h-6 w-6" />
          </div>
          <div className="text-sm font-medium text-stone uppercase tracking-widest mb-1">Current Plan</div>
          <div className="font-heading text-2xl">{isTrial ? "Free Trial" : "Premium"}</div>
        </div>
      </div>

      <div className="bg-ink text-white rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 h-64 w-64 bg-clay rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="h-8 w-8 text-clay" />
            <h2 className="font-heading text-3xl">SmartDine Premium</h2>
          </div>
          <p className="text-white/70 max-w-xl mb-8 leading-relaxed">
            Unlock the full potential of your restaurant with AI waiters, unlimited tables, real-time analytics, and Priority support.
          </p>
          
          <div className="flex flex-col sm:flex-row items-end gap-6">
            <div>
              <div className="text-sm text-white/50 uppercase tracking-widest mb-1">Subscription Fee</div>
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-5xl">₹10,000</span>
                <span className="text-white/50">/month</span>
              </div>
            </div>
            
            <button
              onClick={handleSubscribe}
              disabled={isSubscribing || isActive}
              className={`px-8 py-4 rounded-full font-medium transition ml-auto flex items-center gap-2 ${isActive ? 'bg-white/10 text-white/50 cursor-not-allowed' : 'bg-clay hover:bg-clay-dark text-white shadow-lg shadow-clay/20'}`}
            >
              {isSubscribing ? (
                <><span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span> Processing Payment...</>
              ) : isActive ? (
                <><CheckCircle2 className="h-5 w-5" /> Active Plan</>
              ) : (
                "Subscribe Now"
              )}
            </button>
          </div>
          
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10 pt-10 border-t border-white/10">
            {['Unlimited AI Waiter interactions', 'Unlimited POS & Kitchen Display connections', 'Real-time revenue analytics & exports', 'Priority 24/7 technical support'].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                <CheckCircle2 className="h-4 w-4 text-clay shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CreditCard, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Globe } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

function CheckIcon() {
  return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
}

export default function BillingPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success")) {
      toast.success("Subscription updated successfully!");
    }
    if (searchParams.get("canceled")) {
      toast.error("Checkout was canceled.");
    }
  }, [searchParams]);

  const { data: billing, isLoading } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => api<any>("/api/billing/status"),
  });

  const { data: geo } = useQuery({
    queryKey: ["geo-pricing"],
    queryFn: () => api<any>("/api/pricing/geo"),
  });

  const checkoutMut = useMutation({
    mutationFn: () => api<{ url: string }>("/api/billing/create-checkout-session", { method: "POST" }),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const portalMut = useMutation({
    mutationFn: () => api<{ url: string }>("/api/billing/create-portal-session", { method: "POST" }),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-stone">Loading billing info...</div>;
  }

  const isTrial = billing?.subscription_status === "trial";
  const isPro = billing?.plan_tier === "pro";
  const daysLeft = billing?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(billing.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-ink flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-clay" />
          Billing & Subscription
        </h1>
        <p className="text-stone mt-1">Manage your restaurant's subscription plan and billing methods.</p>
      </div>

      {/* Geo-Pricing Panel */}
      {geo && (
        <div className="bg-white rounded-2xl shadow-sm border border-bone p-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="h-5 w-5 text-clay" />
            <h2 className="text-lg font-semibold text-ink">Your Regional Pricing</h2>
            <span className="ml-auto px-3 py-1 rounded-full bg-sand text-sm flex items-center gap-1.5">
              {geo.flag && <span>{geo.flag}</span>}
              {geo.country_name}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(geo.plans ?? []).map((plan: any) => (
              <div
                key={plan.id}
                className={`rounded-xl border p-5 flex flex-col ${
                  plan.id === "pro"
                    ? "border-clay bg-clay/5"
                    : plan.id === "enterprise"
                      ? "border-amber-300 bg-amber-50/50"
                      : "border-bone bg-sand/30"
                }`}
              >
                <h3 className="font-semibold text-ink text-sm">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-ink">
                    {geo.currency_symbol}{plan.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-stone">
                    /{plan.interval}
                  </span>
                </div>
                {plan.price > 0 && (
                  <p className="text-xs text-stone mt-0.5">
                    ~{geo.currency_symbol}{Math.round(plan.price / 30)} /day
                  </p>
                )}
                <ul className="mt-4 space-y-2 text-xs text-stone flex-1">
                  {(plan.features ?? []).map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Current Status Card */}
        <div className="col-span-1 md:col-span-2 bg-white rounded-2xl shadow-sm border border-bone p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-semibold text-ink">Current Plan</h2>
              <div className="mt-2 flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isPro ? 'bg-emerald-100 text-emerald-800' : 'bg-clay/10 text-clay'
                }`}>
                  {billing?.plan_tier === 'pro' ? 'Pro Plan' : 'Starter Plan'}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isTrial ? 'bg-amber-100 text-amber-800' :
                  billing?.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {billing?.subscription_status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
            </div>
          </div>

          {isTrial && daysLeft !== null && (
            <div className={`p-4 rounded-xl border ${daysLeft <= 4 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900'} mb-6`}>
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-semibold">Your trial ends in {daysLeft} days</h3>
              </div>
              <p className="text-sm opacity-90">
                You will lose access to premium features and order taking capabilities on {new Date(billing.trial_ends_at).toLocaleDateString()}.
              </p>
            </div>
          )}

          <div className="flex gap-4">
            {!isPro ? (
              <button
                onClick={() => checkoutMut.mutate()}
                disabled={checkoutMut.isPending}
                className="flex items-center gap-2 bg-clay text-white px-6 py-2.5 rounded-lg font-medium hover:bg-clay/90 transition"
              >
                <Zap className="h-4 w-4" />
                {checkoutMut.isPending ? 'Loading...' : 'Upgrade to Pro'}
              </button>
            ) : (
              <button
                disabled
                className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-6 py-2.5 rounded-lg font-medium border border-emerald-200"
              >
                <CheckCircle2 className="h-4 w-4" />
                You are on the Pro Plan
              </button>
            )}

            {billing?.has_payment_method && (
              <button
                onClick={() => portalMut.mutate()}
                disabled={portalMut.isPending}
                className="flex items-center gap-2 bg-sand text-ink px-6 py-2.5 rounded-lg font-medium hover:bg-bone transition border border-bone"
              >
                Manage Billing
              </button>
            )}
          </div>
        </div>

        {/* Feature List Card */}
        <div className="col-span-1 bg-white rounded-2xl shadow-sm border border-bone p-6">
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-clay" />
            Pro Features
          </h2>
          <ul className="space-y-3 text-sm text-stone">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Unlimited monthly orders</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>AI Waiter capabilities</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Advanced analytics dashboard</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Priority customer support</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, X } from "lucide-react";
import Link from "next/link";

export function PricingSection() {
  const plans = [
    {
      name: "Starter",
      description: "Essential tools for small cafes and takeaways.",
      price: "₹4,999",
      popular: false,
      features: [
        { text: "Digital QR Code Menu", included: true },
        { text: "Basic Table Ordering", included: true },
        { text: "Kitchen Display System", included: true },
        { text: "Unlimited Orders", included: true },
        { text: "Basic Sales Analytics", included: true },
        { text: "Standard Support", included: true },
        { text: "AI Waiter (Conversational)", included: false },
        { text: "Inventory Management", included: false },
        { text: "Multi-location", included: false },
      ]
    },
    {
      name: "Pro",
      description: "Everything you need to run an AI-powered restaurant.",
      price: "₹9,999",
      popular: true,
      features: [
        { text: "Digital QR Code Menu", included: true },
        { text: "Basic Table Ordering", included: true },
        { text: "Kitchen Display System", included: true },
        { text: "Unlimited Orders", included: true },
        { text: "Advanced Analytics", included: true },
        { text: "Priority Support", included: true },
        { text: "AI Waiter (Conversational)", included: true },
        { text: "Inventory Management", included: true },
        { text: "Multi-location", included: false },
      ]
    },
    {
      name: "Enterprise",
      description: "For chains needing custom branding and scale.",
      price: "Custom",
      popular: false,
      features: [
        { text: "Digital QR Code Menu", included: true },
        { text: "Basic Table Ordering", included: true },
        { text: "Kitchen Display System", included: true },
        { text: "Unlimited Orders", included: true },
        { text: "Custom Export Reports", included: true },
        { text: "24/7 Dedicated Manager", included: true },
        { text: "AI Waiter (Conversational)", included: true },
        { text: "Inventory Management", included: true },
        { text: "Multi-location (5+)", included: true },
      ]
    }
  ];

  return (
    <section className="py-24 px-6 lg:px-24 max-w-[1400px] mx-auto relative" id="pricing">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-electric-blue/10 rounded-full blur-[120px] -z-10" />
      
      <div className="text-center mb-16 relative z-10">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">Simple, Transparent Pricing</h2>
        <p className="text-stone text-lg max-w-2xl mx-auto">
          Choose the plan that fits your restaurant's size. Start with a 14-day free trial of our Pro features!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto relative z-10">
        {plans.map((plan, idx) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className={`relative group rounded-[2.5rem] p-8 md:p-10 transition-colors ${
              plan.popular 
                ? 'bg-ink border-2 border-clay/50 shadow-2xl shadow-clay/10 scale-105 z-20' 
                : 'bg-ink/80 border border-white/10 hover:border-white/20 z-10 mt-4 md:mt-8 mb-4 md:mb-8'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 inset-x-0 flex justify-center z-20">
                <div className="bg-gradient-to-r from-clay to-gold text-ink text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                  <Sparkles className="w-3 h-3" /> Most Popular
                </div>
              </div>
            )}
            
            <h3 className="font-heading text-2xl text-white mb-2">{plan.name}</h3>
            <p className="text-stone text-sm mb-8 h-10">{plan.description}</p>
            
            <div className="flex items-baseline gap-2 mb-8 border-b border-white/10 pb-8">
              <span className="font-heading text-4xl md:text-5xl text-cream">{plan.price}</span>
              {plan.price !== "Custom" && <span className="text-stone">/ Month</span>}
            </div>

            <div className="space-y-4 mb-10">
              {plan.features.map((feature, i) => (
                <div key={i} className={`flex items-center gap-3 ${feature.included ? 'text-cream' : 'text-stone/50'}`}>
                  {feature.included ? (
                    <CheckCircle2 className="w-5 h-5 text-electric-blue shrink-0" />
                  ) : (
                    <X className="w-5 h-5 shrink-0" />
                  )}
                  <span className="text-sm">{feature.text}</span>
                </div>
              ))}
            </div>

            <Link
              href={plan.name === "Enterprise" ? "mailto:sales@smartdine.ai" : "/auth/restaurant"}
              className={`w-full block text-center font-semibold py-4 rounded-full transition ${
                plan.popular 
                  ? 'bg-white hover:bg-cream text-ink shadow-lg shadow-white/10'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {plan.name === "Enterprise" ? "Contact Sales" : "Start 14-Day Free Trial"}
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

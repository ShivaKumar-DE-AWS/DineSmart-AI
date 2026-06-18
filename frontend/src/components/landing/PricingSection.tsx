"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";

export function PricingSection() {
  const features = [
    "AI Waiter (Conversational Ordering)",
    "Unlimited Orders & Scans",
    "QR Ordering System",
    "Kitchen Display System (KDS)",
    "Revenue Analytics Dashboard",
    "Dynamic Menu Management",
    "Customer Insights & Loyalty",
    "Token Tracking System",
    "Instant Notifications",
    "24/7 Priority Support",
  ];

  return (
    <section className="py-24 px-6 lg:px-24 max-w-[1400px] mx-auto relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-electric-blue/10 rounded-full blur-[120px] -z-10" />
      
      <div className="text-center mb-16">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">Simple Pricing</h2>
        <p className="text-stone text-lg max-w-2xl mx-auto">
          One flat rate. All features included. No hidden fees or commissions on your orders.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto relative group"
      >
        <div className="absolute -top-4 inset-x-0 flex justify-center z-20">
          <div className="bg-gradient-to-r from-clay to-gold text-ink text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
            <Sparkles className="w-3 h-3" /> Most Popular
          </div>
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-b from-clay/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] -z-10 blur-xl" />
        
        <div className="bg-ink border-2 border-white/10 group-hover:border-clay/50 transition-colors rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative z-10 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-electric-blue/10 to-transparent rounded-bl-full pointer-events-none" />
          
          <h3 className="font-heading text-3xl text-white mb-2">SmartDine Pro</h3>
          <p className="text-stone text-sm mb-8">Everything you need to run an AI-powered restaurant.</p>
          
          <div className="flex items-baseline gap-2 mb-8 border-b border-white/10 pb-8">
            <span className="font-heading text-5xl md:text-6xl text-cream">₹10,000</span>
            <span className="text-stone">/ Month</span>
          </div>

          <div className="space-y-4 mb-10">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-electric-blue shrink-0" />
                <span className="text-cream text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <Link
            href="/auth/login"
            className="w-full block text-center bg-white hover:bg-cream text-ink font-semibold py-4 rounded-full transition shadow-lg shadow-white/10"
          >
            Start 14-Day Free Trial
          </Link>
          
          <div className="mt-6 flex justify-center gap-4 text-xs text-stone">
            <span>No Setup Fee</span>
            <span>•</span>
            <span>Cancel Anytime</span>
            <span>•</span>
            <span>No Credit Card</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

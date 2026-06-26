"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export function FreeTrialSection() {
  const benefits = [
    "Full Access to All Features",
    "Free Setup Assistance",
    "Demo Data Included",
    "Dedicated Priority Support",
  ];

  return (
    <section className="py-24 px-6 lg:px-24 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-br from-ink to-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 md:p-20 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-clay/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <h2 className="font-heading text-4xl md:text-6xl tracking-tight text-white mb-6">
            Transform Your Restaurant With AI
          </h2>
          <p className="text-stone text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Join the next generation of smart restaurants. Experience the full power of SmartDine AI for 14 days, completely free.
          </p>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-12">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-cream text-sm">
                <Check className="w-4 h-4 text-ready" />
                {benefit}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/restaurant"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-clay hover:bg-clay-dark text-white rounded-full px-8 py-4 font-semibold transition shadow-xl shadow-clay/20"
            >
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/r/mehfil"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white rounded-full px-8 py-4 font-medium transition backdrop-blur-sm"
            >
              Book Live Demo
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

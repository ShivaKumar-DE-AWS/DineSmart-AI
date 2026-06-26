"use client";

import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

export function ComparisonSection() {
  const features = [
    { label: "Ordering Process", traditional: "Manual taking", smart: "Conversational AI" },
    { label: "Error Rate", traditional: "High human error", smart: "Zero miscommunication" },
    { label: "Upselling", traditional: "If waiter remembers", smart: "Automated & Contextual" },
    { label: "Service Speed", traditional: "Slow during rush", smart: "Instant at table" },
    { label: "Analytics", traditional: "End of day reports", smart: "Real-time dashboard" },
    { label: "Kitchen Sync", traditional: "Paper tickets", smart: "Digital KDS" },
  ];

  return (
    <section className="py-24 px-6 lg:px-24 max-w-[1400px] mx-auto">
      <div className="text-center mb-16">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">The Upgrade is Clear</h2>
        <p className="text-stone text-lg max-w-2xl mx-auto">
          Stop relying on outdated methods. Embrace the future of restaurant operations.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 px-4 md:px-8">
          <div className="text-stone font-medium text-sm hidden md:block">Feature</div>
          <div className="text-stone font-medium text-sm hidden md:block"></div>
          <div className="text-white font-heading text-lg md:text-xl text-center">Traditional</div>
          <div className="text-clay font-heading text-xl md:text-2xl text-center relative">
            SmartDine AI
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] bg-electric-blue/20 text-electric-blue px-2 py-0.5 rounded-full whitespace-nowrap">
              Your Restaurant
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4 md:p-6 items-center"
            >
              <div className="col-span-2 md:col-span-1 text-cream text-base md:text-base font-medium text-center md:text-left mb-2 md:mb-0">
                {feature.label}
              </div>
              <div className="flex flex-col md:flex-row items-center gap-2 justify-center text-center text-stone text-sm">
                <X className="w-4 h-4 text-alert/50" />
                <span>{feature.traditional}</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-2 justify-center text-center text-white text-sm font-medium bg-gradient-to-r from-clay/10 to-transparent p-2 rounded-lg border border-clay/20">
                <Check className="w-4 h-4 text-ready" />
                <span>{feature.smart}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

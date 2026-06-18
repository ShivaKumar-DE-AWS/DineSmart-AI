"use client";

import { motion } from "framer-motion";
import { ArrowRight, User, Bot, ShoppingCart, CreditCard, MonitorSmartphone, Receipt, BellRing, UtensilsCrossed } from "lucide-react";

export function SolutionSection() {
  const steps = [
    { icon: User, label: "Customer" },
    { icon: Bot, label: "AI Waiter" },
    { icon: ShoppingCart, label: "Order Placement" },
    { icon: CreditCard, label: "Payment" },
    { icon: MonitorSmartphone, label: "Kitchen Dashboard" },
    { icon: Receipt, label: "Token Generation" },
    { icon: UtensilsCrossed, label: "Order Tracking" },
    { icon: BellRing, label: "Pickup Notification" },
  ];

  return (
    <section className="py-24 px-6 lg:px-24 max-w-[1400px] mx-auto bg-white/[0.01] border-y border-white/5">
      <div className="text-center mb-16">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">Meet SmartDine AI</h2>
        <p className="text-stone text-lg max-w-2xl mx-auto">
          The seamless workflow that connects your guests, your kitchen, and your bottom line.
        </p>
      </div>

      <div className="relative max-w-5xl mx-auto py-10">
        {/* Connection Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-clay via-gold to-electric-blue -translate-y-1/2 hidden md:block opacity-30" />
        
        <div className="flex flex-col md:flex-row flex-wrap justify-center items-center gap-6 md:gap-x-4 md:gap-y-12 relative z-10">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col md:flex-row items-center gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="flex flex-col items-center gap-3 w-32"
              >
                <div className="w-16 h-16 rounded-2xl bg-ink border border-white/10 flex items-center justify-center shadow-xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <step.icon className="w-7 h-7 text-cream" />
                </div>
                <div className="text-sm font-medium text-cream text-center">{step.label}</div>
              </motion.div>
              
              {i < steps.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 + 0.1 }}
                  className="hidden md:block text-stone/50 rotate-90 md:rotate-0"
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

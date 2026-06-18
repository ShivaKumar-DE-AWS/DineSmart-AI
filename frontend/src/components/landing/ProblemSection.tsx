"use client";

import { motion } from "framer-motion";
import { XCircle, CheckCircle2 } from "lucide-react";

export function ProblemSection() {
  const problems = [
    "Waiters miss upselling opportunities",
    "Long ordering times during rush hours",
    "Order errors and kitchen miscommunication",
    "Lack of actionable customer insights",
    "No real-time analytics for owners",
    "Manual kitchen coordination slows service",
  ];

  return (
    <section className="py-24 px-6 lg:px-24 max-w-[1400px] mx-auto relative">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-alert/5 rounded-full blur-[150px] -z-10 pointer-events-none" />
      
      <div className="text-center mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-heading text-4xl md:text-5xl text-white mb-6"
        >
          Restaurants Are <span className="text-alert">Losing Revenue</span> Every Day
        </motion.h2>
        <p className="text-stone text-lg max-w-2xl mx-auto">
          Traditional dining experiences are bottlenecked by manual processes, costing you both money and customer satisfaction.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-x-12 gap-y-6 max-w-4xl mx-auto mb-20">
        {problems.map((problem, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5"
          >
            <XCircle className="w-6 h-6 text-alert shrink-0 mt-0.5" />
            <span className="text-cream text-lg">{problem}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative p-[1px] rounded-3xl overflow-hidden max-w-3xl mx-auto"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-clay via-gold to-electric-blue opacity-50" />
        <div className="bg-ink p-10 md:p-14 rounded-[23px] relative z-10 text-center flex flex-col items-center">
          <CheckCircle2 className="w-16 h-16 text-ready mb-6" />
          <h3 className="font-heading text-3xl md:text-4xl text-white mb-4">
            SmartDine AI solves all of these <span className="italic text-gold">automatically.</span>
          </h3>
          <p className="text-stone">
            Transform your operations from reactive to proactive with our intelligent restaurant OS.
          </p>
        </div>
      </motion.div>
    </section>
  );
}

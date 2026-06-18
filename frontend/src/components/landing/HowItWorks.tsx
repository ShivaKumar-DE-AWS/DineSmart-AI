"use client";

import { motion } from "framer-motion";

export function HowItWorks() {
  const steps = [
    { num: "01", title: "Create Account", desc: "Sign up and configure your restaurant details in 5 minutes." },
    { num: "02", title: "Upload Menu", desc: "Add your categories, items, and high-quality images." },
    { num: "03", title: "Print QR Codes", desc: "Generate and print beautiful, branded QR codes for your tables." },
    { num: "04", title: "Go Live", desc: "Place QRs on tables. The AI Waiter is immediately ready." },
    { num: "05", title: "Receive Orders", desc: "Orders flow directly to your Kitchen Display System." },
    { num: "06", title: "Grow Revenue", desc: "Watch your AOV increase through AI upselling and insights." },
  ];

  return (
    <section className="py-24 px-6 lg:px-24 max-w-[1400px] mx-auto border-t border-white/5">
      <div className="text-center mb-16">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">Setup in 15 Minutes</h2>
        <p className="text-stone text-lg max-w-2xl mx-auto">
          No hardware installation. No complex training. Just sign up and start taking orders.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="bg-white/[0.01] border border-white/5 rounded-3xl p-8 hover:bg-white/[0.03] transition-colors relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-6 text-6xl font-heading text-white/[0.03] group-hover:text-white/[0.05] transition-colors select-none">
              {step.num}
            </div>
            <div className="text-electric-blue font-mono mb-4 text-sm font-bold tracking-widest">STEP {step.num}</div>
            <h3 className="font-heading text-2xl text-cream mb-3">{step.title}</h3>
            <p className="text-stone leading-relaxed relative z-10">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

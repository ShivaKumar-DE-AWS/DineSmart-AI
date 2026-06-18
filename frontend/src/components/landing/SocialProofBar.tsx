"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

export function SocialProofBar() {
  const metrics = [
    { label: "Orders Processed", value: "10,000+" },
    { label: "Customer Satisfaction", value: "98%" },
    { label: "Faster Ordering", value: "40%" },
    { label: "Higher Average Order Value", value: "25%" },
  ];

  return (
    <section className="py-12 border-y border-white/5 bg-white/[0.02]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-24">
        <div className="text-center mb-10">
          <p className="text-stone text-sm font-medium tracking-widest uppercase mb-4">
            Trusted by premium restaurants across Hyderabad
          </p>
          <div className="flex justify-center gap-1 text-gold">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5">
          {metrics.map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center px-4"
            >
              <div className="text-3xl md:text-4xl font-heading text-cream mb-2">
                {metric.value}
              </div>
              <div className="text-xs md:text-sm text-stone">{metric.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

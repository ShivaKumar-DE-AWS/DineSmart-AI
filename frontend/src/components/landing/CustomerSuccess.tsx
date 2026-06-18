"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

export function CustomerSuccess() {
  const stories = [
    {
      name: "Bawarchi Restaurant",
      growth: "28%",
      metric: "Revenue Growth",
      feedback: "SmartDine AI increased our average order value by 28% within the first month. The AI's combo suggestions are incredibly effective, and our waiters now focus purely on hospitality.",
    },
    {
      name: "The Daily Roast Cafe",
      growth: "45%",
      metric: "Faster Table Turnaround",
      feedback: "During our morning rush, the line used to be out the door. Now, people just sit down, scan, and their coffee is ready in minutes. It completely eliminated our bottleneck.",
    },
    {
      name: "Mehfil Biryani",
      growth: "0%",
      metric: "Order Errors",
      feedback: "We used to have at least 5-6 wrongly punched orders a day. Since switching to SmartDine AI, the kitchen gets exactly what the customer typed. Zero errors. Zero wastage.",
    }
  ];

  return (
    <section className="py-24 px-6 lg:px-24 max-w-[1400px] mx-auto relative">
      <div className="text-center mb-16">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">Customer Success Stories</h2>
        <p className="text-stone text-lg max-w-2xl mx-auto">
          Don't just take our word for it. See how other restaurants are transforming their operations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {stories.map((story, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            className="bg-ink border border-bone rounded-[2rem] p-8 shadow-xl relative"
          >
            <Quote className="absolute top-8 right-8 w-12 h-12 text-white/5" />
            
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-4xl font-heading text-clay">{story.growth}</span>
              <span className="text-sm font-medium text-stone uppercase tracking-wide">{story.metric}</span>
            </div>
            
            <p className="text-cream leading-relaxed mb-8 relative z-10 italic">
              "{story.feedback}"
            </p>
            
            <div className="pt-6 border-t border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-clay flex items-center justify-center font-bold text-ink">
                {story.name.charAt(0)}
              </div>
              <div>
                <div className="text-white font-medium">{story.name}</div>
                <div className="text-xs text-stone">Verified Customer</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

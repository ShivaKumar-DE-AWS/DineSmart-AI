"use client";

import { motion } from "framer-motion";
import { Check, Mic, Sparkles } from "lucide-react";

export function AIWaiterShowcase() {
  const features = [
    "Conversational Ordering",
    "Smart Dish Recommendations",
    "Personalized Suggestions",
    "Combo Upselling",
    "Dietary Preferences",
    "Voice Interaction",
  ];

  return (
    <section className="py-24 px-6 lg:px-24 max-w-[1400px] mx-auto overflow-hidden">
      <div className="flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 text-center lg:text-left">
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">Your Best Waiter Never Takes a Break</h2>
          <p className="text-stone text-lg max-w-xl mx-auto lg:mx-0 mb-10">
            Our AI understands complex requests, remembers regular customers, and perfectly times its upsell recommendations to maximize ticket size.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto lg:mx-0">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="flex items-center gap-3 text-cream bg-white/[0.03] border border-white/5 p-4 rounded-xl"
              >
                <div className="w-6 h-6 rounded-full bg-electric-blue/20 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-electric-blue" />
                </div>
                <span className="text-sm font-medium">{feature}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex-1 w-full max-w-md relative">
          {/* Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-electric-blue/10 rounded-full blur-[100px] -z-10" />
          
          <div className="bg-ink border-[8px] border-bone rounded-[3rem] p-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-bone rounded-b-3xl z-20" />
            
            <div className="bg-[#0A0A0A] rounded-[2rem] h-[600px] overflow-hidden flex flex-col relative">
              {/* Chat Header */}
              <div className="bg-white/5 p-4 pt-8 pb-4 flex items-center gap-3 border-b border-white/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-electric-blue to-clay flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-cream font-medium">SmartDine AI</div>
                  <div className="text-xs text-ready flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-ready" /> Online
                  </div>
                </div>
              </div>

              {/* Chat Body */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/10 text-cream p-3 px-4 rounded-2xl rounded-tl-sm w-10/12 backdrop-blur-md text-sm"
                >
                  Welcome to Bawarchi! How can I help you today?
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1 }}
                  className="bg-electric-blue text-white p-3 px-4 rounded-2xl rounded-tr-sm w-9/12 ml-auto backdrop-blur-md text-sm"
                >
                  I want something spicy.
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 2.5 }}
                  className="bg-white/10 text-cream p-3 px-4 rounded-2xl rounded-tl-sm w-11/12 backdrop-blur-md text-sm"
                >
                  Our <span className="text-gold font-medium">Chicken Dum Biryani</span> is today's bestseller and has a great spice kick. Would you like <span className="text-clay font-medium">Apollo Fish</span> as a starter?
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 3.5 }}
                  className="bg-white/5 border border-white/10 p-3 rounded-xl w-10/12"
                >
                  <div className="flex gap-3 items-center">
                    <div className="w-12 h-12 bg-clay/20 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🌶️</span>
                    </div>
                    <div>
                      <div className="text-cream text-sm font-medium">Combo Offer</div>
                      <div className="text-stone text-xs">Save ₹50 on this pairing</div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white/5 border-t border-white/10 flex items-center gap-2">
                <div className="flex-1 bg-white/5 rounded-full px-4 py-2 text-sm text-stone border border-white/10">
                  Type a message...
                </div>
                <div className="w-10 h-10 rounded-full bg-electric-blue/20 flex items-center justify-center text-electric-blue">
                  <Mic className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, Play, Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative pt-24 pb-16 md:pt-48 md:pb-32 px-6 lg:px-24 max-w-[1400px] mx-auto overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-clay/20 rounded-full blur-[120px] -z-10 mix-blend-screen" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-electric-blue/10 rounded-full blur-[150px] -z-10 mix-blend-screen" />

      <div className="flex flex-col lg:flex-row items-center gap-16 relative z-10">
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-cream text-sm font-medium mb-8 backdrop-blur-md"
          >
            <Sparkles className="h-4 w-4 text-gold" />
            <span>Turn Every Restaurant Into an AI-Powered Dining Experience</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] tracking-tight text-white mb-6"
          >
            Your Restaurant <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-clay via-gold to-electric-blue">
              Deserves an AI Waiter
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-stone max-w-2xl mx-auto lg:mx-0 leading-relaxed mb-10"
          >
            Let customers order through a conversational AI assistant while you automate kitchen operations, order management, analytics, and customer engagement.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-8"
          >
            <Link
              href="/auth/restaurant"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-cream hover:bg-white text-ink rounded-full px-8 py-4 font-semibold transition shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
            >
              Start 14-Day Free Trial
            </Link>
            <Link
              href="/r/mehfil-hyderabad"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white rounded-full px-8 py-4 font-medium transition backdrop-blur-sm"
            >
              <Play className="h-4 w-4 fill-current" /> Watch Live Demo
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex items-center justify-center lg:justify-start gap-3 text-sm text-stone"
          >
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-ink bg-bone flex items-center justify-center overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i}`} alt="user" />
                </div>
              ))}
            </div>
            <p>No Credit Card Required • Setup in 15 Minutes</p>
          </motion.div>
        </div>

        <div className="flex-1 w-full max-w-xl lg:max-w-none relative hidden lg:block">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotateY: 10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
            className="relative"
            style={{ perspective: "1000px" }}
          >
            {/* Main Dashboard Mockup */}
            <div className="bg-graphite/80 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl relative z-10 overflow-hidden transform-gpu">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                </div>
                <div className="text-xs font-medium text-stone">Live Revenue Dashboard</div>
              </div>

              {/* Fake Dashboard Content */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 bg-white/5 rounded-2xl p-6 border border-white/5">
                    <div className="text-stone text-sm mb-2">Today's Revenue</div>
                    <div className="text-3xl font-heading text-cream">₹ 1,42,850</div>
                    <div className="text-ready text-xs mt-2 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" /> +24.5% vs yesterday
                    </div>
                  </div>
                  <div className="flex-1 bg-white/5 rounded-2xl p-6 border border-white/5">
                    <div className="text-stone text-sm mb-2">Active Orders</div>
                    <div className="text-3xl font-heading text-cream">42</div>
                    <div className="text-electric-blue text-xs mt-2 flex items-center gap-1">
                      12 in kitchen, 30 dining
                    </div>
                  </div>
                </div>

                {/* Animated Chart Bars */}
                <div className="h-32 bg-white/5 rounded-2xl border border-white/5 p-4 flex items-end gap-2">
                  {[40, 70, 45, 90, 65, 85, 120, 95, 110].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                      className="flex-1 bg-gradient-to-t from-clay to-gold rounded-t-sm opacity-80"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Floating AI Waiter Mobile Mockup */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: [0, -10, 0], opacity: 1 }}
              transition={{ 
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                opacity: { duration: 0.5, delay: 0.8 }
              }}
              className="absolute -bottom-10 -left-10 w-64 bg-[#0a0a0a] border-[6px] border-slate rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 overflow-hidden"
            >
              <div className="bg-gradient-to-b from-clay/20 to-transparent p-4 pb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-clay/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-clay" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-cream">AI Sommelier</div>
                    <div className="text-[10px] text-stone">Online</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-white/10 text-xs text-cream p-3 rounded-2xl rounded-tl-sm w-11/12 backdrop-blur-md">
                    Hi! The Chicken Dum Biryani is our bestseller today. Would you like to start with Apollo Fish?
                  </div>
                  <div className="bg-electric-blue/20 text-xs text-electric-blue p-3 rounded-2xl rounded-tr-sm w-10/12 ml-auto backdrop-blur-md">
                    Yes, make the Biryani extra spicy please.
                  </div>
                  <div className="bg-white/10 text-xs text-cream p-3 rounded-2xl rounded-tl-sm w-11/12 backdrop-blur-md">
                    Noted! 1x Apollo Fish, 1x Extra Spicy Biryani. Sending to kitchen... 👨‍🍳
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

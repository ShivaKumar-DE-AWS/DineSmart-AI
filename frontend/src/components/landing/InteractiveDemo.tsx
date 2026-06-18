"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Monitor, ChefHat, Tv } from "lucide-react";

export function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState("customer");

  const tabs = [
    { id: "customer", label: "Customer App", icon: Smartphone },
    { id: "dashboard", label: "Admin Dashboard", icon: Monitor },
    { id: "kitchen", label: "Kitchen KDS", icon: ChefHat },
    { id: "counter", label: "Counter Screen", icon: Tv },
  ];

  return (
    <section className="py-24 px-6 lg:px-24 max-w-[1400px] mx-auto bg-ink relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-clay/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="text-center mb-12 relative z-10">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">See It In Action</h2>
        <p className="text-stone text-lg max-w-2xl mx-auto mb-10">
          Switch between different interfaces to see how SmartDine AI unifies your entire restaurant ecosystem.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-ink shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  : "bg-white/5 text-stone hover:bg-white/10 hover:text-cream"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto relative h-[500px] md:h-[600px] bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {activeTab === "customer" && (
            <motion.div
              key="customer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm h-full max-h-[700px] bg-[#0A0A0A] border-[6px] border-slate rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col"
            >
              <div className="bg-clay/20 p-6 pb-10 text-center relative">
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-ink rounded-full border-4 border-[#0A0A0A] flex items-center justify-center">
                  🍔
                </div>
                <h3 className="text-white font-heading text-xl">The Burger Joint</h3>
              </div>
              <div className="flex-1 p-6 pt-10 overflow-y-auto">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white/5 rounded-2xl p-4 flex gap-4 border border-white/5">
                      <div className="w-20 h-20 bg-white/10 rounded-xl" />
                      <div className="flex-1">
                        <div className="w-3/4 h-4 bg-white/20 rounded mb-2" />
                        <div className="w-1/2 h-3 bg-white/10 rounded mb-4" />
                        <div className="flex justify-between items-center">
                          <div className="w-12 h-4 bg-electric-blue/50 rounded" />
                          <div className="w-8 h-8 rounded-full bg-clay/20 flex items-center justify-center text-clay text-lg font-bold">+</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full max-h-[800px] bg-graphite border border-white/10 rounded-2xl shadow-2xl flex"
            >
              <div className="w-48 bg-black/50 border-r border-white/5 p-4 flex flex-col gap-4">
                <div className="w-32 h-6 bg-white/10 rounded mb-8" />
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`w-full h-10 rounded-lg ${i === 1 ? 'bg-electric-blue/20' : 'bg-white/5'}`} />
                ))}
              </div>
              <div className="flex-1 p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="w-48 h-8 bg-white/10 rounded" />
                  <div className="w-32 h-8 bg-clay/20 rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col justify-end">
                      <div className="w-1/2 h-8 bg-white/20 rounded mb-2" />
                      <div className="w-1/3 h-4 bg-white/10 rounded" />
                    </div>
                  ))}
                </div>
                <div className="h-64 bg-white/5 rounded-xl border border-white/5 flex items-end p-6 gap-4">
                   {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-clay to-gold rounded-t-sm" style={{ height: `${Math.max(20, Math.random() * 100)}%` }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "kitchen" && (
            <motion.div
              key="kitchen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full bg-coal border border-white/10 rounded-2xl shadow-2xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="text-white text-2xl font-bold">Kitchen Display</div>
                <div className="flex gap-4">
                  <div className="px-4 py-2 bg-ready/20 text-ready rounded-lg font-medium">12 Active</div>
                  <div className="px-4 py-2 bg-warn/20 text-warn rounded-lg font-medium">3 Delayed</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 h-[calc(100%-4rem)] overflow-y-hidden">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white/5 rounded-xl border border-white/5 p-4 flex flex-col">
                    <div className="flex justify-between border-b border-white/10 pb-2 mb-4">
                      <span className="text-white font-bold">Order #{Math.floor(Math.random() * 1000) + 1000}</span>
                      <span className="text-ready font-mono">12:0{i}</span>
                    </div>
                    <div className="space-y-3 flex-1">
                      {[1, 2].map((j) => (
                        <div key={j} className="flex justify-between text-cream text-sm">
                          <span>{j}x Dish Name</span>
                          <span className="text-stone">Mod</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <button className="w-full py-2 bg-white/10 hover:bg-ready/20 text-white rounded-lg transition-colors">Mark Ready</button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "counter" && (
            <motion.div
              key="counter"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full bg-slate border border-white/10 rounded-2xl shadow-2xl flex overflow-hidden"
            >
              <div className="flex-1 bg-white/5 p-8 flex flex-col">
                 <h2 className="text-3xl font-heading text-white mb-8 text-center">Preparing</h2>
                 <div className="flex-1 flex flex-col gap-4 overflow-y-hidden">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-white/10 py-4 px-6 rounded-xl text-3xl font-mono text-stone flex justify-between">
                         <span>#{1020 + i}</span>
                         <span className="text-sm self-center">Cooking...</span>
                      </div>
                    ))}
                 </div>
              </div>
              <div className="w-px bg-white/10" />
              <div className="flex-1 bg-ready/5 p-8 flex flex-col">
                 <h2 className="text-3xl font-heading text-ready mb-8 text-center">Ready to Collect</h2>
                 <div className="flex-1 flex flex-col gap-4 overflow-y-hidden">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-ready/20 border border-ready/30 py-4 px-6 rounded-xl text-4xl font-mono text-ready font-bold flex justify-between animate-pulse">
                         <span>#{1015 + i}</span>
                         <span>←</span>
                      </div>
                    ))}
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

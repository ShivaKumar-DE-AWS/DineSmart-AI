"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, TrendingUp, Clock, IndianRupee } from "lucide-react";

export function ROICalculator() {
  const [orders, setOrders] = useState(150);
  const [aov, setAov] = useState(800);
  const [tables, setTables] = useState(20);

  // Conservative estimates based on case studies
  const aovIncrease = 0.25; // 25% increase from smart upselling
  const timeSavedPerOrder = 3; // 3 minutes saved per order
  
  const additionalRevenue = orders * aov * aovIncrease * 30; // Monthly
  const hoursSaved = (orders * timeSavedPerOrder * 30) / 60;

  return (
    <section className="py-24 px-6 lg:px-24 max-w-[1400px] mx-auto relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[150px] -z-10" />
      
      <div className="text-center mb-16">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">See How Much You Can Earn</h2>
        <p className="text-stone text-lg max-w-2xl mx-auto">
          Calculate your potential ROI with SmartDine AI based on conservative industry averages.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 max-w-5xl mx-auto bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 md:p-12 shadow-2xl backdrop-blur-xl">
        <div className="flex-1 space-y-8">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-cream text-sm font-medium">Orders Per Day</label>
              <span className="text-electric-blue font-mono">{orders}</span>
            </div>
            <input 
              type="range" 
              min="20" max="1000" step="10"
              value={orders}
              onChange={(e) => setOrders(Number(e.target.value))}
              className="w-full accent-electric-blue bg-white/10 h-2 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-cream text-sm font-medium">Average Bill Value (₹)</label>
              <span className="text-clay font-mono">₹{aov}</span>
            </div>
            <input 
              type="range" 
              min="100" max="5000" step="50"
              value={aov}
              onChange={(e) => setAov(Number(e.target.value))}
              className="w-full accent-clay bg-white/10 h-2 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-cream text-sm font-medium">Number of Tables</label>
              <span className="text-gold font-mono">{tables}</span>
            </div>
            <input 
              type="range" 
              min="5" max="100" step="1"
              value={tables}
              onChange={(e) => setTables(Number(e.target.value))}
              className="w-full accent-gold bg-white/10 h-2 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="w-px bg-white/10 hidden lg:block" />

        <div className="flex-1 flex flex-col justify-center gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 text-stone mb-2">
              <IndianRupee className="w-5 h-5 text-ready" />
              <span className="text-sm font-medium uppercase tracking-wider">Est. Additional Monthly Revenue</span>
            </div>
            <div className="text-4xl md:text-5xl font-heading text-ready">
              +₹{additionalRevenue.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-stone mb-2">
                  <TrendingUp className="w-4 h-4 text-clay" />
                  <span className="text-xs font-medium uppercase tracking-wider">AOV Increase</span>
                </div>
                <div className="text-2xl font-heading text-cream">+25%</div>
             </div>
             <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-stone mb-2">
                  <Clock className="w-4 h-4 text-electric-blue" />
                  <span className="text-xs font-medium uppercase tracking-wider">Hours Saved</span>
                </div>
                <div className="text-2xl font-heading text-cream">{Math.round(hoursSaved)} hrs/mo</div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}

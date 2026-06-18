"use client";

import { motion } from "framer-motion";
import { BarChart3, PieChart, Activity, LineChart } from "lucide-react";

export function DashboardShowcase() {
  return (
    <section className="py-24 px-6 lg:px-24 max-w-[1400px] mx-auto bg-ink relative overflow-hidden">
      <div className="text-center mb-16 relative z-10">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">Total Control at Your Fingertips</h2>
        <p className="text-stone text-lg max-w-2xl mx-auto">
          Make data-driven decisions with real-time revenue analytics, inventory tracking, and customer insights.
        </p>
      </div>

      <div className="relative max-w-5xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-tr from-electric-blue/20 to-clay/20 blur-[100px] -z-10" />
        
        <div className="bg-graphite/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative z-10 overflow-hidden transform-gpu">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
            <div className="flex gap-4">
              <div className="text-white font-medium border-b-2 border-electric-blue pb-4 -mb-4">Overview</div>
              <div className="text-stone font-medium pb-4">Orders</div>
              <div className="text-stone font-medium pb-4">Inventory</div>
            </div>
            <div className="bg-white/5 px-4 py-1.5 rounded-lg text-sm text-cream border border-white/10">
              Today
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
               <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-electric-blue/20 flex items-center justify-center">
                     <BarChart3 className="text-electric-blue w-5 h-5" />
                  </div>
                  <span className="text-ready text-sm bg-ready/10 px-2 py-1 rounded">+14.2%</span>
               </div>
               <div className="text-stone text-sm mb-1">Gross Revenue</div>
               <div className="text-3xl font-heading text-white">₹ 1,42,850</div>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
               <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-clay/20 flex items-center justify-center">
                     <Activity className="text-clay w-5 h-5" />
                  </div>
                  <span className="text-ready text-sm bg-ready/10 px-2 py-1 rounded">+5.1%</span>
               </div>
               <div className="text-stone text-sm mb-1">Total Orders</div>
               <div className="text-3xl font-heading text-white">428</div>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
               <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center">
                     <PieChart className="text-gold w-5 h-5" />
                  </div>
               </div>
               <div className="text-stone text-sm mb-1">Average Order Value</div>
               <div className="text-3xl font-heading text-white">₹ 845</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white/5 rounded-2xl p-6 border border-white/5 h-64 flex flex-col">
              <div className="text-cream mb-4 font-medium flex items-center gap-2"><LineChart className="w-4 h-4 text-stone" /> Revenue Trend</div>
              <div className="flex-1 flex items-end gap-2">
                 {[40, 70, 45, 90, 65, 85, 120, 95, 110, 80, 105, 130].map((h, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-electric-blue to-cyan-400 rounded-t-sm opacity-80" style={{ height: `${h}%` }} />
                 ))}
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
               <div className="text-cream mb-4 font-medium">Top Items</div>
               <div className="space-y-4">
                  {[
                    { name: 'Chicken Dum Biryani', sales: '142', color: 'bg-clay' },
                    { name: 'Apollo Fish', sales: '98', color: 'bg-gold' },
                    { name: 'Butter Naan', sales: '85', color: 'bg-electric-blue' },
                  ].map((item, i) => (
                    <div key={i}>
                       <div className="flex justify-between text-sm mb-1">
                          <span className="text-white">{item.name}</span>
                          <span className="text-stone">{item.sales}</span>
                       </div>
                       <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${(parseInt(item.sales)/150)*100}%` }} />
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

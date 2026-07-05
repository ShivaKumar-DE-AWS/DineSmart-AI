"use client";
import { Sparkles, ToggleLeft, ToggleRight, Search } from "lucide-react";
import { useState } from "react";

export default function SuperAdminFeaturesPage() {
  const [search, setSearch] = useState("");

  const features = [
    { id: "ai_waiter", name: "AI Voice Waiter", desc: "Enable the AI voice ordering system for customers.", status: true, tier: "PRO" },
    { id: "kitchen_display", name: "Kitchen Display System (KDS)", desc: "Digital kitchen order management interface.", status: true, tier: "STARTER" },
    { id: "advanced_analytics", name: "Advanced Analytics", desc: "Detailed revenue and item performance reports.", status: true, tier: "PRO" },
    { id: "whatsapp_bot", name: "WhatsApp Ordering Bot", desc: "Allow customers to order via WhatsApp.", status: false, tier: "ENTERPRISE" },
    { id: "loyalty_program", name: "Loyalty & Rewards", desc: "Customer retention and points system.", status: false, tier: "PRO" },
    { id: "multi_location", name: "Multi-Location Sync", desc: "Sync menus and inventory across branches.", status: true, tier: "ENTERPRISE" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-brand" />
            Feature Flags
          </h1>
          <p className="text-stone text-sm">Manage global features and early access rollouts.</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone" />
        <input 
          type="text" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search features..." 
          className="w-full bg-white border border-bone rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map(f => (
          <div key={f.id} className={`bg-white rounded-xl shadow-sm border p-5 ${f.status ? 'border-brand/30 ring-1 ring-brand/10' : 'border-bone'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-brand/10 text-brand text-[10px] font-bold uppercase tracking-wider">{f.tier}</span>
              </div>
              <button className="text-stone hover:text-brand transition">
                {f.status ? <ToggleRight className="h-6 w-6 text-brand" /> : <ToggleLeft className="h-6 w-6" />}
              </button>
            </div>
            <h3 className="font-semibold text-lg text-ink mb-1">{f.name}</h3>
            <p className="text-sm text-stone">{f.desc}</p>
            <div className="mt-4 pt-4 border-t border-bone text-xs font-mono text-stone flex justify-between items-center">
              <span>{f.id}</span>
              <span className={f.status ? "text-emerald-600 font-bold" : ""}>{f.status ? "ENABLED globally" : "DISABLED"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

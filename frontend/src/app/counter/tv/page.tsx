"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Order } from "@/types";
import { ChefHat, Sparkles, Volume2, VolumeX, Utensils, Clock } from "lucide-react";
import { playChime } from "@/lib/notify";
import { useSession } from "@/stores/session";


export default function TVDisplayPage() {
  const { user } = useSession();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const { data } = useQuery({
    queryKey: ["tv-orders", user?.restaurant_id],
    queryFn: () => api<{ orders: Order[] }>("/api/orders"),
    refetchInterval: 3000,
  });

  const allOrders = data?.orders || [];
  const preparing = allOrders.filter((o) => ["confirmed", "preparing"].includes(o.status));
  const ready = allOrders.filter((o) => o.status === "ready" || (o.status === "served" && o.payment_status !== "paid"));

  const readyIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(ready.map((o) => o.id));
    if (readyIdsRef.current === null) {
      readyIdsRef.current = ids;
      return;
    }
    const fresh = ready.filter((o) => !readyIdsRef.current!.has(o.id));
    if (fresh.length && soundEnabled) {
      playChime("ready");
    }
    readyIdsRef.current = ids;
  }, [ready, soundEnabled]);

  return (
    <div className="min-h-screen bg-[#07070a] text-white flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Banner Header */}
      <header className="bg-gradient-to-r from-zinc-900 via-[#0f1015] to-zinc-900 border-b border-zinc-800 px-8 py-5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/20 border border-amber-400/30">
            <Utensils className="h-9 w-9 text-white animate-pulse" />
          </div>
          <div>
            <p className="text-amber-400 font-extrabold text-sm tracking-[0.25em] uppercase">Phase C: TV Pickup Display</p>
            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md">ORDER PICKUP MONITOR</h1>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-2xl px-6 py-3 flex items-center gap-3">
            <Clock className="h-6 w-6 text-amber-400 animate-spin" style={{ animationDuration: "12s" }} />
            <span className="text-3xl font-mono font-bold text-zinc-200 tracking-wider">{currentTime}</span>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-4 rounded-2xl border transition-all flex items-center justify-center shadow-lg active:scale-95 ${
              soundEnabled
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 shadow-emerald-500/10"
                : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700"
            }`}
            title={soundEnabled ? "Mute Chimes" : "Enable Chimes"}
          >
            {soundEnabled ? <Volume2 className="h-8 w-8" /> : <VolumeX className="h-8 w-8" />}
          </button>
        </div>
      </header>

      {/* Two Column Display Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 max-w-[1920px] mx-auto w-full">
        {/* Preparing Column */}
        <section className="bg-zinc-900/40 border-2 border-zinc-800/80 rounded-3xl p-8 flex flex-col shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <ChefHat className="h-7 w-7 text-blue-400" />
              </div>
              <h2 className="text-3xl font-extrabold text-zinc-200 uppercase tracking-wide">In Preparation / Cooking</h2>
            </div>
            <div className="bg-blue-500/20 border border-blue-500/40 text-blue-400 font-black text-3xl px-5 py-1.5 rounded-2xl">
              {preparing.length}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-max overflow-y-auto max-h-[75vh] pr-2">
            {preparing.map((o) => (
              <div
                key={o.id}
                className="bg-zinc-900/90 border-2 border-zinc-700/60 rounded-3xl p-6 text-center shadow-xl flex flex-col items-center justify-center transform hover:scale-105 transition duration-300"
              >
                <div className="text-5xl xl:text-6xl font-black text-white tracking-tighter mb-2">{o.token}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  {o.order_type === "takeaway" ? "Takeaway" : "Dine-In"}
                </div>
                {o.items && o.items.length > 0 && (
                  <div className="mt-3 text-xs text-zinc-300 font-medium line-clamp-2 bg-zinc-800/80 px-2.5 py-1.5 rounded-xl w-full text-left">
                    {o.items.map(i => `${i.qty}× ${i.name}`).join(", ")}
                  </div>
                )}
              </div>
            ))}
            {preparing.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-32 opacity-40">
                <ChefHat className="h-20 w-20 mb-4 text-zinc-600" />
                <p className="text-2xl font-bold uppercase tracking-widest text-zinc-500">No active orders cooking</p>
              </div>
            )}
          </div>
        </section>

        {/* Ready Column */}
        <section className="bg-gradient-to-b from-emerald-950/30 to-zinc-900/50 border-2 border-emerald-500/40 rounded-3xl p-8 flex flex-col shadow-2xl shadow-emerald-500/10 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-emerald-500/30 pb-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center animate-bounce">
                <Sparkles className="h-7 w-7 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-extrabold text-emerald-400 uppercase tracking-wide">Ready for Pickup</h2>
            </div>
            <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-3xl px-5 py-1.5 rounded-2xl animate-pulse">
              {ready.length}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max overflow-y-auto max-h-[75vh] pr-2">
            {ready.map((o) => (
              <div
                key={o.id}
                className="bg-gradient-to-br from-emerald-600 to-teal-700 border-4 border-emerald-300 rounded-3xl p-7 text-center shadow-2xl shadow-emerald-500/40 flex flex-col items-center justify-center animate-pulse transform scale-105"
              >
                <div className="text-6xl xl:text-7xl font-black text-white tracking-tighter mb-2 drop-shadow-md">{o.token}</div>
                <div className="bg-white/20 backdrop-blur-md text-white font-extrabold text-sm px-4 py-1.5 rounded-full uppercase tracking-widest mt-2 border border-white/30">
                  {o.table_number ? `Table ${o.table_number}` : "Please Collect"}
                </div>
                {o.items && o.items.length > 0 && (
                  <div className="mt-3 text-xs text-white/95 font-medium line-clamp-2 bg-black/20 px-2.5 py-1.5 rounded-xl w-full text-left">
                    {o.items.map(i => `${i.qty}× ${i.name}`).join(", ")}
                  </div>
                )}
              </div>
            ))}
            {ready.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-32 opacity-40">
                <Sparkles className="h-20 w-20 mb-4 text-emerald-600" />
                <p className="text-2xl font-bold uppercase tracking-widest text-emerald-500">All ready orders collected</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="bg-zinc-950 border-t border-zinc-800/80 py-4 px-8 text-center text-xs text-zinc-500 font-medium tracking-wider uppercase">
        Powered by SmartDine AI · Phase B & C KDS Automation
      </footer>
    </div>
  );
}

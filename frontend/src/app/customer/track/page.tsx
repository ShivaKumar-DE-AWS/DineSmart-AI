"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

export default function TrackLanding() {
  const router = useRouter();
  const [id, setId] = useState("");
  return (
    <div className="max-w-xl mx-auto px-5 md:px-10 py-20 text-center" data-testid="track-landing">
      <div className="mehfil-divider mb-4 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-[10px] uppercase">Live tracking</span></div>
      <h1 className="font-royal text-4xl md:text-5xl text-[#8A1A2A] tracking-wide">
        Where is my <span className="font-editorial italic mehfil-gold-gradient">mehfil</span>?
      </h1>
      <p className="font-editorial italic text-sm text-[#1A1106]/70 mt-3 mb-8">Paste the order ID we shared on confirmation.</p>
      <div className="flex items-center gap-3 bg-[#FAF5EC] border border-[#C9A348]/40 rounded-full px-5 py-2.5 shadow-sm max-w-md mx-auto">
        <Search className="h-4 w-4 text-[#8A1A2A]" />
        <input
          data-testid="track-id-input"
          placeholder="Order ID"
          value={id}
          onChange={(e) => setId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && id && router.push(`/customer/track/${id}`)}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#1A1106]/40 font-editorial"
        />
      </div>
      <button
        data-testid="track-go-btn"
        onClick={() => id && router.push(`/customer/track/${id}`)}
        disabled={!id}
        className="mt-5 mehfil-btn-royal rounded-full px-7 py-3 font-royal tracking-[0.2em] uppercase text-xs inline-flex items-center gap-2 disabled:opacity-50"
      >
        Track <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

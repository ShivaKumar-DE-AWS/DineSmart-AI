"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTable } from "@/stores/table";
import { Order } from "@/types";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center justify-center mb-6">
      <div className="px-5 py-1.5 rounded-full border border-[#C9A348]/40 bg-[#FAF5EC] shadow-sm flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-[#8A1A2A]" />
        <span className="font-royal tracking-[0.4em] text-[10px] uppercase text-[#8A6A1B]">{children}</span>
      </div>
    </div>
  );
}

export default function TrackLanding() {
  const router = useRouter();
  const [id, setId] = useState("");
  
  const { session } = useTable();
  const { data: sessionOrdersData } = useQuery({
    queryKey: ["session-orders", session?.id],
    queryFn: () => api<{ orders: Order[] }>(`/api/orders?table_session_id=${session?.id}`),
    enabled: !!session?.id,
    refetchInterval: 10000,
  });
  const sessionOrders = sessionOrdersData?.orders ?? [];

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-10 py-10" data-testid="track-landing">
      {session && sessionOrders.length > 0 && (
        <section className="mb-16">
          <div className="text-center">
            <SectionTag>Live Tracking</SectionTag>
            <div className="flex items-center justify-center gap-3 mb-6">
              <h2 className="font-royal text-3xl md:text-4xl text-[#8A1A2A] tracking-wide">
                Your <span className="font-editorial italic font-normal mehfil-gold-gradient">Table Orders</span>
              </h2>
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {sessionOrders.map((order) => {
              const isActive = !["delivered", "cancelled"].includes(order.status);
              return (
                <Link
                  key={order.id}
                  href={`/customer/track/${order.id}`}
                  className="block mehfil-card rounded-2xl p-6 border border-[#C9A348]/30 hover:border-[#8A1A2A] transition-colors relative overflow-hidden group shadow-lg bg-white"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[#8A1A2A]/5 rounded-bl-[3rem] -z-10 group-hover:scale-110 transition-transform duration-500" />
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-royal tracking-widest text-[10px] uppercase text-[#8A6A1B] mb-1">Token</div>
                      <div className="font-royal text-3xl text-[#8A1A2A] tracking-tight">{order.token}</div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-[10px] font-royal tracking-wider uppercase border ${isActive ? 'bg-[#C9A348]/10 border-[#C9A348]/50 text-[#8A6A1B]' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                      {order.status}
                    </div>
                  </div>
                  <div className="font-editorial text-sm text-[#1A1106]/70 mb-5 line-clamp-1 italic">
                    {order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                  </div>
                  <div className="flex items-center justify-between border-t border-[#C9A348]/20 pt-4">
                    <span className="font-royal text-lg text-[#1A1106]">{formatCurrency(order.total)}</span>
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[#FAF5EC] text-[#8A1A2A] group-hover:bg-[#8A1A2A] group-hover:text-[#FAF5EC] transition-colors shadow-sm border border-[#C9A348]/30">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          
          <div className="mt-16 mb-8 border-t border-[#C9A348]/30" />
        </section>
      )}

      <div className="max-w-xl mx-auto text-center">
        {!session || sessionOrders.length === 0 ? (
          <div className="mehfil-divider mb-4 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-[10px] uppercase">Manual Tracking</span></div>
        ) : (
          <div className="font-royal tracking-[0.4em] text-[10px] uppercase text-[#1A1106]/50 mb-6">Or track another order manually</div>
        )}
        
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
          className="mt-5 mehfil-btn-royal rounded-full px-7 py-3 font-royal tracking-[0.2em] uppercase text-xs inline-flex items-center gap-2 disabled:opacity-50 transition-opacity"
        >
          Track <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

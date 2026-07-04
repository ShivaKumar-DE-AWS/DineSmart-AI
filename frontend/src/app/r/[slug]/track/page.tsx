"use client";
import { useState, useEffect } from "react";
import { useRouter , useParams} from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTable } from "@/stores/table";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { Order } from "@/types";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getOrCreateAnonID } from "@/lib/notify";

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center justify-center mb-6">
      <div className="px-5 py-1.5 rounded-full border border-brand-secondary/40 bg-[#FAF5EC] shadow-sm flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
        <span className="font-royal tracking-[0.4em] text-[10px] uppercase text-[#8A6A1B]">{children}</span>
      </div>
    </div>
  );
}

export default function TrackLanding() {
  const params = useParams();
  const slug = params?.slug as string;
  const { config: restaurantConfig } = useRestaurantConfig();

  const router = useRouter();
  const [id, setId] = useState("");
  const normalizedId = id.trim();
  const validId = /^[A-Za-z0-9_-]{6,80}$/.test(normalizedId);
  const goToOrder = () => {
    if (validId) router.push(`/r/${slug}/track/${encodeURIComponent(normalizedId)}`);
  };
  
  const { session } = useTable();
  const [deviceId, setDeviceId] = useState("");
  const [localOrderIds, setLocalOrderIds] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setDeviceId(getOrCreateAnonID());
      try {
        const ids = JSON.parse(localStorage.getItem("sd-my-order-ids") || "[]");
        if (Array.isArray(ids) && ids.length > 0) setLocalOrderIds(ids.join(","));
      } catch {}
    }
  }, []);

  const { data: sessionOrdersData } = useQuery({
    queryKey: ["session-orders", session?.id, deviceId, localOrderIds],
    queryFn: () => {
      const params = new URLSearchParams();
      if (session?.id) params.set("table_session_id", session.id);
      if (deviceId) params.set("device_id", deviceId);
      if (localOrderIds) params.set("order_ids", localOrderIds);
      return api<{ orders: Order[] }>(`/api/orders?${params.toString()}`);
    },
    enabled: !!(session?.id || deviceId || localOrderIds),
    refetchInterval: 15000,
  });
  const sessionOrders = sessionOrdersData?.orders ?? [];
  
  const activeOrders = sessionOrders.filter(o => o.status !== "completed" && o.status !== "cancelled" && o.payment_status !== "paid");
  const pastOrders = sessionOrders.filter(o => o.status === "completed" || o.status === "cancelled" || o.payment_status === "paid");

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-10 py-10" data-testid="track-landing">
      {activeOrders.length > 0 && (
        <section className="mb-16">
          <div className="text-center">
            <SectionTag>Live Tracking</SectionTag>
            <div className="flex items-center justify-center gap-3 mb-6">
              <h2 className="font-royal text-3xl md:text-4xl text-brand-primary tracking-wide">
                Your <span className="font-editorial italic font-normal mehfil-gold-gradient">Active Orders</span>
              </h2>
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {activeOrders.map((order) => {
              const isActive = true;
              return (
                <Link
                  key={order.id}
                  href={`/r/${slug}/track/${order.id}`}
                  className="block mehfil-card rounded-2xl p-6 border border-brand-secondary/30 hover:border-brand-primary transition-colors relative overflow-hidden group shadow-lg bg-white"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-brand-primary/5 rounded-bl-[3rem] -z-10 group-hover:scale-110 transition-transform duration-500" />
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-royal tracking-widest text-[10px] uppercase text-[#8A6A1B] mb-1">
                        Token {order.table_number ? `· Table ${order.table_number}` : ''}
                      </div>
                      <div className="font-royal text-3xl text-brand-primary tracking-tight">{order.token}</div>
                    </div>
                    <div className="px-3 py-1.5 rounded-full text-[10px] font-royal tracking-wider uppercase border bg-brand-secondary/10 border-brand-secondary/50 text-[#8A6A1B]">
                      {order.status}
                    </div>
                  </div>
                  <div className="font-editorial text-sm text-[#1A1106]/70 mb-5 line-clamp-1 italic">
                    {order.items?.map(i => `${i.qty}x ${i.name}`).join(", ")}
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-brand-secondary/20">
                    <div className="font-royal text-xl text-[#1A1106]">{formatCurrency(order.total)}</div>
                    <div className="w-8 h-8 rounded-full bg-[#FAF5EC] flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-colors text-[#8A6A1B]">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {pastOrders.length > 0 && (
        <section className="mb-16">
          <div className="text-center">
            <SectionTag>History</SectionTag>
            <div className="flex items-center justify-center gap-3 mb-6">
              <h2 className="font-royal text-3xl md:text-4xl text-gray-500 tracking-wide">
                Your <span className="font-editorial italic font-normal text-gray-400">Past Orders</span>
              </h2>
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8 opacity-70">
            {pastOrders.map((order) => {
              return (
                <Link
                  key={order.id}
                  href={`/r/${slug}/track/${order.id}`}
                  className="block rounded-2xl p-6 border border-gray-200 transition-colors relative overflow-hidden group bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-royal tracking-widest text-[10px] uppercase text-gray-500 mb-1">
                        Token {order.table_number ? `· Table ${order.table_number}` : ''}
                      </div>
                      <div className="font-royal text-3xl text-gray-600 tracking-tight">{order.token}</div>
                    </div>
                    <div className="px-3 py-1.5 rounded-full text-[10px] font-royal tracking-wider uppercase border bg-gray-200 border-gray-300 text-gray-600">
                      {order.status === "cancelled" ? "Cancelled" : "Settled"}
                    </div>
                  </div>
                  <div className="font-editorial text-sm text-gray-500 mb-5 line-clamp-1 italic">
                    {order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                  </div>
                  <div className="flex items-center justify-between border-t border-brand-secondary/20 pt-4">
                    <span className="font-royal text-lg text-[#1A1106]">{formatCurrency(order.total)}</span>
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[#FAF5EC] text-brand-primary group-hover:bg-brand-primary group-hover:text-[#FAF5EC] transition-colors shadow-sm border border-brand-secondary/30">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          
          <div className="mt-16 mb-8 border-t border-brand-secondary/30" />
        </section>
      )}

      <div className="max-w-xl mx-auto text-center">
        {sessionOrders.length === 0 ? (
          <div className="mehfil-divider mb-4 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-[10px] uppercase">Manual Tracking</span></div>
        ) : (
          <div className="font-royal tracking-[0.4em] text-[10px] uppercase text-[#1A1106]/50 mb-6">Or track another order manually</div>
        )}
        
        <h1 className="font-royal text-4xl md:text-5xl text-brand-primary tracking-wide">
          Where is my <span className="font-editorial italic mehfil-gold-gradient">order</span>?
        </h1>
        <p className="font-editorial italic text-sm text-[#1A1106]/70 mt-3 mb-8">Paste the order ID we shared on confirmation.</p>
        <div className="flex items-center gap-3 bg-[#FAF5EC] border border-brand-secondary/40 rounded-full px-5 py-2.5 shadow-sm max-w-md mx-auto">
          <Search className="h-4 w-4 text-brand-primary" />
          <input
            data-testid="track-id-input"
            aria-label="Order ID"
            aria-describedby="track-id-help"
            placeholder="Order ID"
            value={id}
            onChange={(e) => setId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goToOrder()}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#1A1106]/40 font-editorial"
          />
        </div>
        <p id="track-id-help" className="text-xs text-[#1A1106]/60 mt-2">Use the order ID shown on your confirmation.</p>
        <button
          data-testid="track-go-btn"
          onClick={goToOrder}
          disabled={!validId}
          className="mt-5 mehfil-btn-royal rounded-full px-7 py-3 font-royal tracking-[0.2em] uppercase text-xs inline-flex items-center gap-2 disabled:opacity-50 transition-opacity"
        >
          Track <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

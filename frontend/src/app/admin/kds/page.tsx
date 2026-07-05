"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ChefHat, Maximize, CheckCircle, Clock } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export default function KDSPage() {
  const qc = useQueryClient();
  const prevOrderCount = useRef(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["kds-orders"],
    queryFn: async () => {
      const res = await api<{ orders: any[] }>("/api/orders?status_filter=confirmed,preparing");
      // Fallback local filter and sort (oldest first)
      const filtered = (res.orders || [])
        .filter(o => o.status === 'confirmed' || o.status === 'preparing')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return { orders: filtered };
    },
    refetchInterval: 5000,
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => api(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kds-orders"] });
      toast.success("Order status updated");
    },
    onError: (err: Error) => toast.error(err.message)
  });

  // Sound alert on new orders
  useEffect(() => {
    if (data?.orders) {
      const currentCount = data.orders.length;
      if (currentCount > prevOrderCount.current && prevOrderCount.current !== 0) {
        playBeep();
      }
      prevOrderCount.current = currentCount;
    }
  }, [data?.orders]);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880; // A5
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 300);
    } catch (e) {
      console.error("Audio play error", e);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        toast.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const formatTimeSince = (dateString: string) => {
    const minDiff = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (minDiff < 1) return "Just now";
    return `${minDiff} min ago`;
  };
  
  const isDelayed = (dateString: string) => {
    return Math.floor((Date.now() - new Date(dateString).getTime()) / 60000) > 15;
  };

  if (isLoading) {
    return <div className="p-8 text-center text-stone">Loading Kitchen Display...</div>;
  }

  const orders = data?.orders || [];

  return (
    <div className={`space-y-6 ${isFullscreen ? 'p-6 bg-cream min-h-screen' : ''}`}>
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-bone shadow-sm">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2 text-ink">
            <ChefHat className="h-6 w-6 text-clay" />
            Kitchen Display System
          </h1>
          <p className="text-stone text-sm">Real-time order board for kitchen staff</p>
        </div>
        <button
          onClick={toggleFullscreen}
          className="bg-sand hover:bg-bone text-ink font-medium py-2 px-4 rounded-lg transition flex items-center gap-2 border border-bone"
        >
          <Maximize className="w-4 h-4" /> {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-bone p-16 flex flex-col items-center justify-center text-center shadow-sm h-[60vh]">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-heading font-bold text-ink mb-2">Kitchen is clear!</h2>
          <p className="text-stone text-lg">No pending orders. Take a breather.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map((order) => {
            const delayed = isDelayed(order.created_at);
            const timeStr = formatTimeSince(order.created_at);
            const isPreparing = order.status === 'preparing';

            return (
              <div 
                key={order.id} 
                className={`rounded-2xl shadow-sm border-2 overflow-hidden flex flex-col ${
                  isPreparing ? 'border-amber-400 bg-amber-50/30' : 'border-bone bg-white'
                }`}
              >
                {/* Header */}
                <div className={`p-4 border-b flex justify-between items-start ${isPreparing ? 'border-amber-200 bg-amber-100/50' : 'border-bone bg-sand/30'}`}>
                  <div>
                    <div className="text-stone text-sm font-semibold mb-1 uppercase tracking-wider">Token</div>
                    <div className="font-heading text-6xl font-bold text-ink leading-none mb-2">
                      #{order.token_number || order.id.slice(-4)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      order.order_type === 'dine-in' ? 'bg-indigo-100 text-indigo-700' : 'bg-fuchsia-100 text-fuchsia-700'
                    }`}>
                      {order.order_type} {order.table_id ? `• T${order.table_id}` : ''}
                    </span>
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      delayed ? 'bg-red-100 text-red-700' : 'bg-stone/10 text-stone'
                    }`}>
                      <Clock className="w-3.5 h-3.5" /> {timeStr}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  {order.customer_name && (
                    <div className="text-sm font-medium text-ink/70 border-b border-bone/50 pb-2 mb-3">
                      Customer: {order.customer_name}
                    </div>
                  )}
                  
                  <div className="space-y-3 flex-1">
                    {order.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="bg-ink text-white font-bold text-lg w-8 h-8 rounded flex items-center justify-center shrink-0">
                          {item.quantity}
                        </div>
                        <div>
                          <div className="text-lg font-bold text-ink leading-tight">{item.menu_item?.name || item.name}</div>
                          {item.notes && (
                            <div className="text-sm text-red-600 font-medium mt-1 bg-red-50 p-1.5 rounded inline-block">
                              Note: {item.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 grid grid-cols-2 gap-3 border-t border-bone/50 bg-white">
                  <button
                    onClick={() => updateStatusMut.mutate({ id: order.id, status: 'preparing' })}
                    disabled={isPreparing || updateStatusMut.isPending}
                    className={`py-3 rounded-xl font-bold text-sm transition ${
                      isPreparing 
                        ? 'bg-amber-100 text-amber-400 cursor-not-allowed opacity-50'
                        : 'bg-amber-400 hover:bg-amber-500 text-amber-950 shadow-sm'
                    }`}
                  >
                    {isPreparing ? 'Preparing...' : 'Mark Preparing'}
                  </button>
                  <button
                    onClick={() => updateStatusMut.mutate({ id: order.id, status: 'ready' })}
                    disabled={updateStatusMut.isPending}
                    className="py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition"
                  >
                    Mark Ready
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

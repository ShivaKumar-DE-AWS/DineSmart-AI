"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, fmtTime } from "@/lib/utils";
import { CheckCircle2, Eye, Sparkles } from "lucide-react";
import type { Order } from "@/types";

export default function TokenPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api<Order>(`/api/orders/${orderId}`),
  });

  if (isLoading || !order) return <div className="py-20 text-center text-stone" data-testid="token-loading">Loading order…</div>;

  return (
    <div className="px-6 md:px-12 lg:px-20 py-16 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-ready/15 mb-4">
          <CheckCircle2 className="h-8 w-8 text-ready" />
        </div>
        <p className="uppercase tracking-[0.3em] text-xs text-stone mb-3">Order confirmed</p>
        <h1 className="font-heading text-4xl md:text-5xl tracking-tight">Thanks, {order.customer_name}!</h1>
      </div>

      <div className="bg-ink text-cream rounded-3xl p-10 text-center mb-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 bg-clay/30 rounded-full blur-3xl" />
        <p className="uppercase tracking-[0.3em] text-xs text-cream/60 mb-4">Your token</p>
        <div className="font-display text-[20vw] md:text-[10rem] leading-none text-clay" data-testid="token-number">{order.token}</div>
        <p className="text-cream/70 mt-4">Estimated ready by <span className="font-mono text-cream font-semibold" data-testid="token-eta">{fmtTime(order.estimated_ready_at)}</span></p>
      </div>

      <div className="bg-white border border-bone rounded-2xl p-6 mb-6">
        <h2 className="font-heading text-xl mb-4">Order details</h2>
        <div className="space-y-1.5 text-sm">
          {order.items.map((i) => (
            <div key={i.item_id} className="flex justify-between"><span>{i.qty}× {i.name}</span><span>{formatCurrency(i.qty * i.price)}</span></div>
          ))}
          <div className="border-t border-bone my-3" />
          <div className="flex justify-between"><span className="text-stone">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-stone">Tax</span><span>{formatCurrency(order.tax)}</span></div>
          <div className="flex justify-between font-heading text-lg font-semibold mt-2"><span>Total paid</span><span>{formatCurrency(order.total)}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href={`/customer/track/${order.id}`} data-testid="token-track-link" className="inline-flex items-center justify-center gap-2 bg-clay text-white rounded-full px-6 py-3.5 font-medium hover:bg-clay-dark transition">
          <Eye className="h-4 w-4" /> Track order live
        </Link>
        <Link href="/customer/menu" className="inline-flex items-center justify-center gap-2 border border-ink/20 rounded-full px-6 py-3.5 font-medium hover:bg-ink/5 transition">
          <Sparkles className="h-4 w-4" /> Order something else
        </Link>
      </div>
    </div>
  );
}

"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, Trash2, Plus, Minus, ShoppingBag, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

export default function CartPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const cart = useCart();
  const subtotal = cart.subtotal();
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  if (cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-5 md:px-10 py-20 text-center" data-testid="cart-page">
        <div className="mehfil-divider mb-5 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-[10px] uppercase">Your thali</span></div>
        <h1 className="font-royal text-4xl md:text-5xl text-brand-primary tracking-wide">An empty thali awaits</h1>
        <p className="font-editorial italic text-[#1A1106]/70 mt-4 mb-10 leading-relaxed">
          Step in — browse the menu and let the dishes find you.
        </p>
        <Link href={`/r/${slug}/menu`} data-testid="cart-go-menu" className="inline-flex items-center gap-2 mehfil-btn-royal rounded-full px-7 py-3.5 text-xs font-royal tracking-[0.2em] uppercase">
          <BookOpen className="h-4 w-4" /> Browse menu <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-10 py-12" data-testid="cart-page">
      <div className="text-center mb-10">
        <div className="mehfil-divider mb-4 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-[10px] uppercase">Your thali</span></div>
        <h1 className="font-royal text-4xl md:text-5xl text-brand-primary tracking-wide" data-testid="cart-title">
          A feast for <span className="font-editorial italic mehfil-gold-gradient">{cart.count()}</span>
        </h1>
        <p className="font-editorial italic text-sm text-[#1A1106]/70 mt-3">Review your selections before we send them to our khansama&apos;s kitchen.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3" data-testid="cart-items">
          {cart.items.map((i, idx) => (
            <motion.div
              key={i.item_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="mehfil-card flex items-center gap-4 rounded-xl p-4"
              data-testid={`cart-row-${i.item_id}`}
            >
              <div className="flex-1">
                <div className="font-royal text-[15px] text-brand-primary leading-tight">{i.name}</div>
                <div className="font-editorial italic text-xs text-[#1A1106]/60 mt-0.5">{formatCurrency(i.price)} each</div>
              </div>
              <div className="flex items-center gap-1 bg-[#5C0E1B] text-[#FAF5EC] rounded-full p-1 shadow">
                <button onClick={() => cart.setQty(i.item_id, i.qty - 1)} data-testid={`cart-dec-${i.item_id}`} className="h-8 w-8 rounded-full hover:bg-brand-primary flex items-center justify-center"><Minus className="h-3.5 w-3.5" /></button>
                <span className="px-2 w-7 text-center font-royal text-sm font-semibold" data-testid={`cart-qty-${i.item_id}`}>{i.qty}</span>
                <button onClick={() => cart.setQty(i.item_id, i.qty + 1)} data-testid={`cart-inc-${i.item_id}`} className="h-8 w-8 rounded-full hover:bg-brand-primary flex items-center justify-center"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <div className="font-royal text-base text-brand-primary w-24 text-right">{formatCurrency(i.price * i.qty)}</div>
              <button onClick={() => cart.remove(i.item_id)} data-testid={`cart-remove-${i.item_id}`} className="text-[#1A1106]/40 hover:text-brand-primary p-2 transition" title="Remove"><Trash2 className="h-4 w-4" /></button>
            </motion.div>
          ))}
        </div>

        <aside className="mehfil-card rounded-2xl p-6 h-fit lg:sticky lg:top-24" data-testid="cart-summary">
          <div className="mehfil-divider mb-4"><span className="font-royal tracking-[0.3em] text-[10px] uppercase">Bill of fare</span></div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[#1A1106]/60 font-editorial italic">Subtotal</span><span className="font-royal text-brand-primary" data-testid="summary-subtotal">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-[#1A1106]/60 font-editorial italic">Tax (5%)</span><span className="font-royal text-brand-primary" data-testid="summary-tax">{formatCurrency(tax)}</span></div>
            <div className="border-t border-brand-secondary/30 my-3" />
            <div className="flex justify-between items-end">
              <span className="font-royal tracking-wider uppercase text-xs text-brand-primary">Total</span>
              <span className="font-royal text-2xl text-brand-primary" data-testid="summary-total">{formatCurrency(total)}</span>
            </div>
          </div>
          <Link href={`/r/${slug}/checkout`} data-testid="cart-checkout-btn" className="mt-6 w-full mehfil-btn-royal rounded-full py-3.5 font-royal tracking-[0.2em] uppercase text-xs inline-flex items-center justify-center gap-2">
            Proceed to checkout <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={`/r/${slug}/menu`} className="mt-3 block text-center font-royal tracking-wider uppercase text-[10px] text-brand-primary hover:text-brand-secondary">
            ← Add a few more
          </Link>
        </aside>
      </div>
    </div>
  );
}

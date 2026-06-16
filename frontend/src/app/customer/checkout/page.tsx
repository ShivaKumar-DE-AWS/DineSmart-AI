"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Lock, CreditCard, ExternalLink, ArrowLeft, ScrollText, User2, ChefHat, Plus, Minus, Phone, Gift, Sparkles } from "lucide-react";

interface CustomerProfile {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  points: number;
  lifetime_spend: number;
  orders_count: number;
}

function renderPayLabel(submitting: boolean, stripeEnabled: boolean | null, total: number): string {
  if (submitting) return "Sending to the khansama…";
  const amount = formatCurrency(total);
  if (stripeEnabled) return `Pay ${amount} with Stripe`;
  return `Confirm & Pay ${amount}`;
}

const COOKING_CHIPS = [
  "Less spicy", "Extra spicy", "Double masala", "No onion", "No garlic",
  "Leg piece", "Chest piece", "Less oil", "Less salt", "Boneless", "Extra raita", "Serve hot",
];

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const subtotal = cart.subtotal();
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  useEffect(() => {
    api<{ stripe_enabled: boolean }>("/api/payment/config")
      .then((c) => setStripeEnabled(c.stripe_enabled))
      .catch(() => setStripeEnabled(false));
  }, []);

  // Lookup customer by phone after a small debounce
  useEffect(() => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) { setProfile(null); return; }
    const handle = setTimeout(async () => {
      try {
        const res = await api<{ customer: CustomerProfile | null }>("/api/customers/lookup", {
          method: "POST",
          body: JSON.stringify({ phone }),
        });
        if (res.customer) {
          setProfile(res.customer);
          if (!name.trim()) setName(res.customer.name);
        } else { setProfile(null); }
      } catch { /* ignore */ }
    }, 500);
    return () => clearTimeout(handle);
  }, [phone, name]);

  const toggleChip = (item_id: string, chip: string) => {
    const line = cart.items.find((i) => i.item_id === item_id);
    if (!line) return;
    const current = (line.notes || "").trim();
    const parts = current ? current.split(/,\s*/).filter(Boolean) : [];
    const idx = parts.findIndex((p) => p.toLowerCase() === chip.toLowerCase());
    if (idx >= 0) parts.splice(idx, 1);
    else parts.push(chip);
    cart.setNote(item_id, parts.join(", "));
  };

  const submit = async () => {
    if (!name.trim()) { toast.error("Please share your name — every mehfil starts with a name."); return; }
    if (cart.items.length === 0) { toast.error("Your thali is empty"); return; }
    setSubmitting(true);
    try {
      const payload = {
        order_draft: {
          customer_name: name.trim(),
          customer_phone: phone.trim() || undefined,
          items: cart.items.map((i) => ({
            item_id: i.item_id, name: i.name, price: i.price, qty: i.qty,
            notes: i.notes?.trim() || undefined,
          })),
          payment_method: "stripe",
          notes: generalNotes.trim() || undefined,
        },
        origin_url: window.location.origin,
      };
      const res = await api<{ mode: string; url?: string; session_id?: string; order_id?: string }>(
        "/api/payment/checkout/session", { method: "POST", body: JSON.stringify(payload) },
      );
      if (res.mode === "stripe" && res.url) {
        sessionStorage.setItem("sd_pending_cart_clear", "1");
        window.location.href = res.url;
      } else if (res.order_id) {
        cart.clear();
        toast.success("Your order is on its way to the kitchen");
        router.push(`/customer/token/${res.order_id}`);
      } else {
        throw new Error("Unexpected payment response");
      }
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-10 py-12" data-testid="checkout-page">
      <Link href="/customer/cart" className="inline-flex items-center gap-1 text-[#8A1A2A] hover:text-[#C9A348] font-royal tracking-wider uppercase text-[11px] mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to thali
      </Link>
      <div className="text-center mb-10">
        <div className="mehfil-divider mb-4 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-[10px] uppercase">Final step</span></div>
        <h1 className="font-royal text-4xl md:text-5xl text-[#8A1A2A] tracking-wide">
          Seal the <span className="font-editorial italic mehfil-gold-gradient">mehfil</span>
        </h1>
        <p className="font-editorial italic text-sm text-[#1A1106]/70 mt-3">A name, your preferences, and the feast is yours.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">
          <section className="mehfil-card rounded-2xl p-6" data-testid="checkout-details">
            <div className="mehfil-divider mb-4"><span className="font-royal tracking-[0.3em] text-[10px] uppercase">Your details</span></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">Your name <span className="text-[#8A1A2A]">*</span></span>
                <div className="mt-1.5 flex items-center bg-white border border-[#C9A348]/30 rounded-full px-4">
                  <User2 className="h-4 w-4 text-[#8A1A2A]" />
                  <input
                    data-testid="checkout-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ananya Sharma"
                    required
                    className="flex-1 bg-transparent px-3 py-3 text-sm outline-none font-editorial"
                  />
                </div>
              </label>
              <label className="block">
                <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">Phone <span className="font-editorial italic normal-case text-[#1A1106]/50">(optional — earn points)</span></span>
                <div className="mt-1.5 flex items-center bg-white border border-[#C9A348]/30 rounded-full px-4">
                  <Phone className="h-4 w-4 text-[#8A1A2A]" />
                  <input
                    data-testid="checkout-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 90000 12345"
                    className="flex-1 bg-transparent px-3 py-3 text-sm outline-none font-editorial"
                  />
                </div>
              </label>
            </div>
            {profile && (
              <div className="mt-4 bg-[#FAF5EC] border border-[#C9A348]/40 rounded-xl p-4 flex items-center gap-4" data-testid="checkout-loyalty">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#DDB85C] to-[#8A6A1B] flex items-center justify-center shadow-md">
                  <Sparkles className="h-5 w-5 text-[#5C0E1B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-royal text-sm text-[#8A1A2A]">Welcome back, {profile.name}</div>
                  <div className="font-editorial italic text-[11px] text-[#1A1106]/70 mt-0.5">
                    Member <span className="font-royal text-[#8A6A1B]">{profile.code}</span> · {profile.orders_count} visits · {profile.points} mehfil points
                  </div>
                </div>
                <Gift className="h-5 w-5 text-[#C9A348] shrink-0" />
              </div>
            )}
            {!profile && phone.replace(/\D/g, "").length >= 10 && (
              <div className="mt-4 text-[11px] text-[#1A1106]/55 font-editorial italic" data-testid="checkout-new-member">
                A new mehfil member will be welcomed — your unique code arrives with your token.
              </div>
            )}
          </section>

          <section className="mehfil-card rounded-2xl p-6" data-testid="checkout-cooking-instructions">
            <div className="mehfil-divider mb-4"><span className="font-royal tracking-[0.3em] text-[10px] uppercase flex items-center gap-1.5"><ChefHat className="h-3 w-3" /> Cooking instructions</span></div>
            <p className="font-editorial italic text-xs text-[#1A1106]/65 mb-5 leading-relaxed">
              Tell our khansama exactly how each dish should arrive. Tap a chip or type your own request — &ldquo;leg piece, less spicy, no garam masala.&rdquo;
            </p>
            <div className="space-y-5">
              {cart.items.map((line) => {
                const selected = (line.notes || "").split(/,\s*/).map((s) => s.toLowerCase()).filter(Boolean);
                return (
                  <div key={line.item_id} className="border border-[#C9A348]/20 rounded-xl p-4 bg-white/60" data-testid={`cook-card-${line.item_id}`}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-full bg-[#8A1A2A] text-[#FAF5EC] font-royal text-xs flex items-center justify-center">{line.qty}</span>
                        <div className="font-royal text-[15px] text-[#8A1A2A] leading-tight">{line.name}</div>
                      </div>
                      <div className="flex items-center gap-1 bg-[#FAF5EC] rounded-full p-0.5 border border-[#C9A348]/30">
                        <button data-testid={`cook-dec-${line.item_id}`} onClick={() => cart.setQty(line.item_id, line.qty - 1)} className="h-7 w-7 rounded-full hover:bg-[#8A1A2A] hover:text-[#FAF5EC] flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                        <span className="px-1 w-5 text-center font-royal text-xs">{line.qty}</span>
                        <button data-testid={`cook-inc-${line.item_id}`} onClick={() => cart.setQty(line.item_id, line.qty + 1)} className="h-7 w-7 rounded-full hover:bg-[#8A1A2A] hover:text-[#FAF5EC] flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3" data-testid={`cook-chips-${line.item_id}`}>
                      {COOKING_CHIPS.map((c) => {
                        const active = selected.includes(c.toLowerCase());
                        return (
                          <button
                            key={c}
                            type="button"
                            data-testid={`cook-chip-${line.item_id}-${c.replace(/\W+/g, "-").toLowerCase()}`}
                            onClick={() => toggleChip(line.item_id, c)}
                            className={`rounded-full px-3 py-1 text-[10px] font-royal tracking-[0.15em] uppercase border transition ${
                              active
                                ? "bg-[#8A1A2A] text-[#FAF5EC] border-[#8A1A2A] shadow"
                                : "bg-white text-[#8A1A2A] border-[#C9A348]/40 hover:border-[#8A1A2A]"
                            }`}
                          >
                            {active ? "✓ " : "+ "}{c}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      data-testid={`cook-note-${line.item_id}`}
                      value={line.notes || ""}
                      onChange={(e) => cart.setNote(line.item_id, e.target.value)}
                      placeholder="Type extra preferences — e.g. extra crispy, family-size portion…"
                      className="w-full bg-white border border-[#C9A348]/30 rounded-full px-4 py-2 text-xs outline-none font-editorial italic focus:border-[#8A1A2A]"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <label className="block">
                <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">A note for the whole order (optional)</span>
                <textarea
                  data-testid="checkout-general-notes"
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Birthday — please send out the meetha last with a candle. Allergic to peanuts."
                  rows={2}
                  className="mt-1.5 w-full bg-white border border-[#C9A348]/30 rounded-xl px-4 py-3 text-sm outline-none font-editorial italic resize-none focus:border-[#8A1A2A]"
                />
              </label>
            </div>
          </section>

          <section className="mehfil-card rounded-2xl p-6" data-testid="checkout-payment">
            <div className="mehfil-divider mb-4"><span className="font-royal tracking-[0.3em] text-[10px] uppercase flex items-center gap-1.5"><CreditCard className="h-3 w-3" /> Payment</span></div>
            {stripeEnabled === true && (
              <div className="text-sm text-[#1A1106]/75 leading-relaxed font-editorial">
                <p>You&apos;ll be redirected to Stripe to settle the bill securely. We&apos;ll bring you back with your token in hand.</p>
                <p className="mt-2 text-xs text-[#1A1106]/60">Test card: <span className="font-mono">4242 4242 4242 4242</span>, any future expiry, any CVC.</p>
              </div>
            )}
            {stripeEnabled === false && (
              <div className="text-sm text-[#1A1106]/75 font-editorial italic">Mock payment — instant confirmation, no real charge.</div>
            )}
            <div className="mt-3 text-[11px] text-[#1A1106]/55 flex items-center gap-1.5 font-royal tracking-wider uppercase"><Lock className="h-3 w-3" /> Secured by Stripe</div>
          </section>
        </div>

        <aside className="mehfil-card rounded-2xl p-6 h-fit lg:sticky lg:top-24" data-testid="checkout-summary">
          <div className="mehfil-divider mb-4"><span className="font-royal tracking-[0.3em] text-[10px] uppercase flex items-center gap-1.5"><ScrollText className="h-3 w-3" /> The bill</span></div>
          <div className="space-y-2.5 text-sm mb-4 max-h-72 overflow-y-auto pr-1">
            {cart.items.map((i) => (
              <div key={i.item_id} className="border-b border-[#C9A348]/15 pb-2 last:border-0">
                <div className="flex justify-between gap-3">
                  <span className="font-editorial text-[#1A1106]/85 truncate">{i.qty}× {i.name}</span>
                  <span className="font-royal text-[#8A1A2A] shrink-0">{formatCurrency(i.qty * i.price)}</span>
                </div>
                {i.notes && (
                  <div className="font-editorial italic text-[10px] text-[#8A6A1B] mt-0.5 truncate" data-testid={`summary-notes-${i.item_id}`}>↳ {i.notes}</div>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-[#1A1106]/60 font-editorial italic">Subtotal</span><span className="font-royal text-[#8A1A2A]">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-[#1A1106]/60 font-editorial italic">Tax</span><span className="font-royal text-[#8A1A2A]">{formatCurrency(tax)}</span></div>
            <div className="flex justify-between items-end mt-3">
              <span className="font-royal tracking-wider uppercase text-xs text-[#8A1A2A]">Total</span>
              <span className="font-royal text-2xl text-[#8A1A2A]" data-testid="checkout-total">{formatCurrency(total)}</span>
            </div>
          </div>
          <button onClick={submit} disabled={submitting || stripeEnabled === null} data-testid="place-order-btn" className="mt-6 w-full mehfil-btn-royal rounded-full py-3.5 font-royal tracking-[0.2em] uppercase text-xs disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {stripeEnabled && <ExternalLink className="h-4 w-4" />}
            {renderPayLabel(submitting, stripeEnabled, total)}
          </button>
        </aside>
      </div>
    </div>
  );
}

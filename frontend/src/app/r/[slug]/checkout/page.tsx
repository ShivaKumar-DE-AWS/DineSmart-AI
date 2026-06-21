"use client";
import { useState, useEffect } from "react";
import { useRouter , useParams} from "next/navigation";
import Link from "next/link";
import { useCart } from "@/stores/cart";
import { useTable } from "@/stores/table";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { toast } from "sonner";
import { Lock, CreditCard, ExternalLink, ArrowLeft, ScrollText, User2, ChefHat, Plus, Minus, Phone, Gift, Sparkles, MapPin } from "lucide-react";

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

// Context-aware cooking chips based on item category
const CHIPS_BY_TYPE: Record<string, string[]> = {
  "meat": ["Less spicy", "Extra spicy", "Double masala", "No onion", "No garlic", "Leg piece", "Chest piece", "Less oil", "Boneless", "Extra raita", "Serve hot"],
  "veg": ["Less spicy", "Extra spicy", "No onion", "No garlic", "Less oil", "Less salt", "Extra raita", "Serve hot"],
  "bread": ["Extra butter", "No butter", "Well done", "Soft"],
  "sweets": ["Less sweet", "Extra cream", "No nuts", "Warm", "Chilled", "Extra saffron"],
  "beverages": ["Less sugar", "No sugar", "Extra ice", "No ice", "Warm", "Chilled"],
  "rice_noodles": ["Less spicy", "Extra spicy", "No onion", "Less oil", "Extra saucy", "Serve hot"],
};
function getChipsForItem(name: string, category?: string): string[] {
  const cat = (category || "").toLowerCase();
  if (cat.includes("sweet")) return CHIPS_BY_TYPE.sweets;
  if (cat.includes("beverage")) return CHIPS_BY_TYPE.beverages;
  if (cat.includes("bread")) return CHIPS_BY_TYPE.bread;
  if (cat.includes("rice") || cat.includes("noodle")) return CHIPS_BY_TYPE.rice_noodles;
  const nm = name.toLowerCase();
  if (nm.includes("paneer") || nm.includes("dal") || nm.includes("veg")) return CHIPS_BY_TYPE.veg;
  if (nm.includes("meetha") || nm.includes("jamun") || nm.includes("kheer") || nm.includes("sweet")) return CHIPS_BY_TYPE.sweets;
  if (nm.includes("lassi") || nm.includes("chai") || nm.includes("soda") || nm.includes("drink")) return CHIPS_BY_TYPE.beverages;
  return CHIPS_BY_TYPE.meat;
}


const COURSES = ["Auto (Natural pace)", "Starter", "Main Course", "Dessert", "All together"];

export default function CheckoutPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { config: restaurantConfig } = useRestaurantConfig();

  const router = useRouter();
  const cart = useCart();
  const table = useTable((s) => s.session);
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
        } else {
          setProfile(null);
        }
      } catch (err) {
        // Lookup is best-effort — never block checkout. Log so we notice if the endpoint is down.
        console.warn("[checkout] customer lookup failed:", err);
      }
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
    const finalName = table?.customer_name || name.trim();
    if (!finalName) { toast.error("Please share your name — every great meal starts with a name."); return; }
    if (cart.items.length === 0) { toast.error("Your thali is empty"); return; }
    setSubmitting(true);
    try {
      const restId = restaurantConfig?.id || "";
      if (!restId) { toast.error("Restaurant not found. Please try again."); setSubmitting(false); return; }

      const payload = {
        restaurant_id: restId,
        customer_name: finalName,
        customer_phone: phone.trim() || undefined,
        items: cart.items.map((i) => {
          const courseText = i.course && i.course !== "Auto (Natural pace)" ? `[Serve: ${i.course}] ` : "";
          const finalNotes = `${courseText}${i.notes?.trim() || ""}`.trim();
          return {
            item_id: i.item_id, name: i.name, price: i.price, qty: i.qty,
            notes: finalNotes || undefined,
          };
        }),
        payment_method: "cash", // ignore payment gateway for now
        notes: generalNotes.trim() || undefined,
        table_session_id: table?.id || undefined,
        table_number: table?.table_number || undefined,
        is_ai: cart.isAi,
      };
      const res = await api<{ order_id: string; token: string }>("/api/orders", { method: "POST", body: JSON.stringify(payload) });
      cart.clear();
      toast.success("Your order is on its way to the kitchen");
      router.push(`/r/${slug}/token/${res.order_id}`);
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-10 py-12" data-testid="checkout-page">
      <Link href={`/r/${slug}/cart`} className="inline-flex items-center gap-1 text-brand-primary hover:text-brand-secondary font-royal tracking-wider uppercase text-[11px] mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to thali
      </Link>
      <div className="text-center mb-10">
        <div className="mehfil-divider mb-4 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-[10px] uppercase">Final step</span></div>
        <h1 className="font-royal text-4xl md:text-5xl text-brand-primary tracking-wide">
          Seal the <span className="font-editorial italic mehfil-gold-gradient">{restaurantConfig?.name || "order"}</span>
        </h1>
        <p className="font-editorial italic text-sm text-[#1A1106]/70 mt-3">A name, your preferences, and the feast is yours.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">

          <section className="mehfil-card rounded-2xl p-6" data-testid="checkout-cooking-instructions">
            <div className="mehfil-divider mb-4"><span className="font-royal tracking-[0.3em] text-[10px] uppercase flex items-center gap-1.5"><ChefHat className="h-3 w-3" /> Cooking instructions</span></div>
            <p className="font-editorial italic text-xs text-[#1A1106]/65 mb-5 leading-relaxed">
              Tell our khansama exactly how each dish should arrive. Tap a chip or type your own request — &ldquo;leg piece, less spicy, no garam masala.&rdquo;
            </p>
            <div className="space-y-5">
              {cart.items.map((line) => {
                const selected = (line.notes || "").split(/,\s*/).map((s) => s.toLowerCase()).filter(Boolean);
                return (
                  <div key={line.item_id} className="border border-brand-secondary/20 rounded-xl p-4 bg-white/60" data-testid={`cook-card-${line.item_id}`}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-full bg-brand-primary text-[#FAF5EC] font-royal text-xs flex items-center justify-center">{line.qty}</span>
                        <div className="font-royal text-[15px] text-brand-primary leading-tight">{line.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          className="bg-[#FAF5EC] border border-brand-secondary/30 rounded-full px-2 py-1.5 text-[9px] sm:text-[10px] font-royal tracking-[0.1em] uppercase outline-none text-brand-primary focus:border-brand-primary cursor-pointer"
                          value={line.course || "Auto (Natural pace)"}
                          onChange={(e) => cart.setCourse(line.item_id, e.target.value)}
                        >
                          {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="flex items-center gap-1 bg-[#FAF5EC] rounded-full p-0.5 border border-brand-secondary/30 shrink-0">
                          <button data-testid={`cook-dec-${line.item_id}`} onClick={() => cart.setQty(line.item_id, line.qty - 1)} className="h-7 w-7 rounded-full hover:bg-brand-primary hover:text-[#FAF5EC] flex items-center justify-center transition-colors"><Minus className="h-3 w-3" /></button>
                          <span className="px-1 w-5 text-center font-royal text-xs">{line.qty}</span>
                          <button data-testid={`cook-inc-${line.item_id}`} onClick={() => cart.setQty(line.item_id, line.qty + 1)} className="h-7 w-7 rounded-full hover:bg-brand-primary hover:text-[#FAF5EC] flex items-center justify-center transition-colors"><Plus className="h-3 w-3" /></button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3" data-testid={`cook-chips-${line.item_id}`}>
                      {getChipsForItem(line.name, line.category).map((c) => {
                        const active = selected.includes(c.toLowerCase());
                        return (
                          <button
                            key={c}
                            type="button"
                            data-testid={`cook-chip-${line.item_id}-${c.replace(/\W+/g, "-").toLowerCase()}`}
                            onClick={() => toggleChip(line.item_id, c)}
                            className={`rounded-full px-3 py-1 text-[10px] font-royal tracking-[0.15em] uppercase border transition ${
                              active
                                ? "bg-brand-primary text-[#FAF5EC] border-brand-primary shadow"
                                : "bg-white text-brand-primary border-brand-secondary/40 hover:border-brand-primary"
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
                      className="w-full bg-white border border-brand-secondary/30 rounded-full px-4 py-2 text-xs outline-none font-editorial italic focus:border-brand-primary"
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
                  className="mt-1.5 w-full bg-white border border-brand-secondary/30 rounded-xl px-4 py-3 text-sm outline-none font-editorial italic resize-none focus:border-brand-primary"
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
          {table && (
            <div className="mb-4 flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/30 rounded-xl px-3 py-2" data-testid="checkout-table-badge">
              <MapPin className="h-4 w-4 text-brand-primary" />
              <div className="font-royal tracking-wider uppercase text-[11px] text-brand-primary">Dining at Table {table.table_number}</div>
            </div>
          )}
          <div className="space-y-2.5 text-sm mb-4 max-h-72 overflow-y-auto pr-1">
            {cart.items.map((i) => (
              <div key={i.item_id} className="border-b border-brand-secondary/15 pb-2 last:border-0">
                <div className="flex justify-between gap-3">
                  <span className="font-editorial text-[#1A1106]/85 truncate">{i.qty}× {i.name}</span>
                  <span className="font-royal text-brand-primary shrink-0">{formatCurrency(i.qty * i.price)}</span>
                </div>
                {i.notes && (
                  <div className="font-editorial italic text-[10px] text-[#8A6A1B] mt-0.5 truncate" data-testid={`summary-notes-${i.item_id}`}>↳ {i.notes}</div>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-[#1A1106]/60 font-editorial italic">Subtotal</span><span className="font-royal text-brand-primary">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-[#1A1106]/60 font-editorial italic">Tax</span><span className="font-royal text-brand-primary">{formatCurrency(tax)}</span></div>
            <div className="flex justify-between items-end mt-3">
              <span className="font-royal tracking-wider uppercase text-xs text-brand-primary">Total</span>
              <span className="font-royal text-2xl text-brand-primary" data-testid="checkout-total">{formatCurrency(total)}</span>
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

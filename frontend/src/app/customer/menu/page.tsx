"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCart } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Timer } from "lucide-react";
import { toast } from "sonner";
import type { MenuItem } from "@/types";

export default function MenuPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["menu"],
    queryFn: () => api<{ items: MenuItem[] }>("/api/menu"),
  });
  const [category, setCategory] = useState<string>("All");
  const cart = useCart();

  const items = data?.items ?? [];
  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];
  const filtered = category === "All" ? items : items.filter((i) => i.category === category);

  return (
    <div className="px-6 md:px-12 lg:px-20 py-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <p className="uppercase tracking-[0.3em] text-xs text-stone mb-3">The menu</p>
          <h1 className="font-heading text-4xl md:text-5xl tracking-tight">Eight dishes.<br />Zero compromises.</h1>
        </div>
        <div className="flex flex-wrap gap-2" data-testid="menu-category-filters">
          {categories.map((c) => (
            <button
              key={c}
              data-testid={`category-${c.toLowerCase()}`}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                category === c ? "bg-ink text-cream border-ink" : "bg-white text-ink border-bone hover:border-ink/30"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-stone" data-testid="menu-loading">Loading the menu…</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="menu-grid">
        {filtered.map((item) => {
          const inCart = cart.items.find((i) => i.item_id === item.id);
          return (
            <div key={item.id} className="group bg-white rounded-3xl overflow-hidden border border-bone hover:-translate-y-1 hover:shadow-xl transition-all duration-300" data-testid={`menu-item-${item.id}`}>
              <div className="aspect-[5/4] bg-cover bg-center" style={{ backgroundImage: `url(${item.image_url})` }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-heading text-lg tracking-tight leading-tight">{item.name}</h3>
                  <div className="font-heading font-semibold text-clay">{formatCurrency(item.price)}</div>
                </div>
                <p className="text-sm text-stone leading-relaxed mb-4">{item.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-stone">
                    <Timer className="h-3.5 w-3.5" /> {item.prep_time_min} min
                    {item.tags?.[0] && <Badge variant="clay" className="ml-1">{item.tags[0]}</Badge>}
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-1 bg-cream rounded-full border border-bone p-1" data-testid={`qty-control-${item.id}`}>
                      <button onClick={() => cart.setQty(item.id, inCart.qty - 1)} data-testid={`qty-dec-${item.id}`} className="h-8 w-8 rounded-full hover:bg-bone flex items-center justify-center"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="px-2 font-mono text-sm font-semibold w-6 text-center" data-testid={`qty-val-${item.id}`}>{inCart.qty}</span>
                      <button onClick={() => cart.setQty(item.id, inCart.qty + 1)} data-testid={`qty-inc-${item.id}`} className="h-8 w-8 rounded-full hover:bg-bone flex items-center justify-center"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <button
                      data-testid={`add-to-cart-${item.id}`}
                      onClick={() => { cart.add(item); toast.success(`${item.name} added`); }}
                      className="bg-ink text-cream px-4 py-2 rounded-full text-sm font-medium hover:bg-clay transition"
                    >
                      Add +
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

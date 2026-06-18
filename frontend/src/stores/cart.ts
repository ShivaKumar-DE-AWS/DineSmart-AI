"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, MenuItem } from "@/types";

interface CartState {
  items: CartItem[];
  add: (item: MenuItem, qty?: number) => void;
  remove: (item_id: string) => void;
  setQty: (item_id: string, qty: number) => void;
  setNote: (item_id: string, notes: string) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) => set((s) => {
        const existing = s.items.find((i) => i.item_id === item.id);
        if (existing) {
          return { items: s.items.map((i) => i.item_id === item.id ? { ...i, qty: i.qty + qty } : i) };
        }
        return { items: [...s.items, { item_id: item.id, name: item.name, price: item.price, qty, category: item.category }] };
      }),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.item_id !== id) })),
      setQty: (id, qty) => set((s) => ({
        items: qty <= 0 ? s.items.filter((i) => i.item_id !== id) : s.items.map((i) => i.item_id === id ? { ...i, qty } : i),
      })),
      setNote: (id, notes) => set((s) => ({
        items: s.items.map((i) => i.item_id === id ? { ...i, notes: notes || undefined } : i),
      })),
      clear: () => set({ items: [] }),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
    }),
    { name: "sd-cart" }
  )
);

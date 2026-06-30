"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, MenuItem } from "@/types";

interface CartState {
  items: CartItem[];
  isAi: boolean;
  restaurantSlug?: string | null;
  lastUpdatedBy: "local" | "remote";
  add: (item: MenuItem, qty?: number) => void;
  remove: (item_id: string) => void;
  setQty: (item_id: string, qty: number) => void;
  setCourse: (item_id: string, course: string) => void;
  setNote: (item_id: string, notes: string) => void;
  setItems: (items: CartItem[]) => void;
  setIsAi: (val: boolean) => void;
  setRestaurantSlug: (slug: string) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isAi: false,
      restaurantSlug: null,
      lastUpdatedBy: "local",
      add: (item, qty = 1) => set((s) => {
        const existing = s.items.find((i) => i.item_id === item.id && !i.notes && !i.course);
        if (existing) {
          return { items: s.items.map((i) => i.cart_item_id === existing.cart_item_id ? { ...i, qty: i.qty + qty } : i), lastUpdatedBy: "local" };
        }
        return { items: [...s.items, { cart_item_id: ((typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)), item_id: item.id, name: item.name, price: item.price, qty, category: item.category }], lastUpdatedBy: "local" };
      }),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => (i.cart_item_id || i.item_id) !== id), lastUpdatedBy: "local" })),
      setQty: (id, qty) => set((s) => ({
        items: qty <= 0 ? s.items.filter((i) => (i.cart_item_id || i.item_id) !== id) : s.items.map((i) => (i.cart_item_id || i.item_id) === id ? { ...i, qty } : i),
        lastUpdatedBy: "local"
      })),
      setCourse: (id, course) => set((s) => ({
        items: s.items.map((i) => (i.cart_item_id || i.item_id) === id ? { ...i, course } : i),
        lastUpdatedBy: "local"
      })),
      setNote: (id, notes) => set((s) => ({
        items: s.items.map((i) => (i.cart_item_id || i.item_id) === id ? { ...i, notes: notes || undefined } : i),
        lastUpdatedBy: "local"
      })),
      setItems: (items) => set({ items, lastUpdatedBy: "remote" }),
      setIsAi: (val) => set({ isAi: val }),
      setRestaurantSlug: (slug) => set({ restaurantSlug: slug }),
      clear: () => set({ items: [], isAi: false, lastUpdatedBy: "local" }),
      subtotal: () => (get().items || []).reduce((sum, i) => sum + (i.price || 0) * (i.qty || 0), 0),
      count: () => (get().items || []).reduce((n, i) => n + (i.qty || 0), 0),
    }),
    { name: "sd-cart" }
  )
);

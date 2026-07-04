"use client";
import { create } from "zustand";
import type { MenuItem } from "@/types";

interface MenuState {
  items: MenuItem[];
  restaurantId?: string | null;
  setMenu: (items: MenuItem[], restaurantId?: string | null) => void;
  findItem: (queryOrId: string) => MenuItem | undefined;
  getRecommendations: (categoryKeywords: string[], limit?: number) => MenuItem[];
}

export const useMenuStore = create<MenuState>()((set, get) => ({
  items: [],
  restaurantId: null,
  setMenu: (items, restaurantId = null) => set({ items: items || [], restaurantId }),
  findItem: (queryOrId) => {
    if (!queryOrId) return undefined;
    const q = queryOrId.toLowerCase().trim();
    const all = get().items || [];
    return all.find(
      (i) =>
        (i.id && i.id.toLowerCase() === q) ||
        (i.name && i.name.toLowerCase() === q) ||
        (i.name && i.name.toLowerCase().includes(q))
    );
  },
  getRecommendations: (categoryKeywords, limit = 3) => {
    const all = get().items || [];
    const available = all.filter((i) => i.available !== false);
    if (!categoryKeywords || categoryKeywords.length === 0) {
      return available.slice(0, limit);
    }
    const matches = available.filter((item) => {
      const cat = (item.category || "").toLowerCase();
      const name = (item.name || "").toLowerCase();
      const desc = (item.description || "").toLowerCase();
      const tags = (item.tags || []).join(" ").toLowerCase();
      const text = `${cat} ${name} ${desc} ${tags}`;
      return categoryKeywords.some((kw) => text.includes(kw.toLowerCase()));
    });
    return matches.slice(0, limit);
  },
}));

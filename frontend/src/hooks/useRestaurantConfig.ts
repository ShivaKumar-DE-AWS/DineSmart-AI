"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { RestaurantConfig } from "@/types";

/**
 * A non-marketing, non-addressable shell used only while a real tenant is loading.
 * Never put sample phone numbers, addresses, payment IDs, or business claims here:
 * fallback data can otherwise leak into any newly onboarded restaurant.
 */
export const EMPTY_RESTAURANT_CONFIG: RestaurantConfig = {
  id: "",
  name: "",
  slug: "",
  tagline: "",
  description: "",
  primary_color: "#8A1A2A",
  secondary_color: "#C9A348",
  hero_images: [],
  history: [],
  specialties: [],
  famous_dishes: [],
  why_us: [],
  contact: { phone: "", email: "", address: "" },
  social_links: {},
  hours: { lunch: "", dinner: "", open_days: "" },
  reviews: [],
  offers: [],
  menu_config: {
    category_order: [],
    show_best_sellers: true,
    show_chef_specials: true,
    show_recommendations: true,
  },
};

function validateRestaurantConfig(value: unknown, requestedSlug: string): RestaurantConfig {
  if (!value || typeof value !== "object") throw new Error("Restaurant configuration is unavailable");
  const config = value as Partial<RestaurantConfig>;
  if (!config.id || !config.name || !config.slug) throw new Error("Restaurant configuration is incomplete");
  if (config.slug !== requestedSlug) throw new Error("Restaurant configuration does not match this URL");

  return {
    ...EMPTY_RESTAURANT_CONFIG,
    ...config,
    contact: { ...EMPTY_RESTAURANT_CONFIG.contact, ...(config.contact || {}) },
    hours: { ...EMPTY_RESTAURANT_CONFIG.hours, ...(config.hours || {}) },
    social_links: { ...(config.social_links || {}) },
    menu_config: { ...EMPTY_RESTAURANT_CONFIG.menu_config, ...(config.menu_config || {}) },
  } as RestaurantConfig;
}

export function useRestaurantConfig() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const query = useQuery({
    queryKey: ["restaurant-config", slug],
    queryFn: async () => validateRestaurantConfig(await api(`/api/config/${encodeURIComponent(slug)}`), slug),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return {
    config: query.data || EMPTY_RESTAURANT_CONFIG,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    retry: query.refetch,
    slug,
  };
}

export function useAllRestaurantConfigs() {
  const query = useQuery({
    queryKey: ["restaurant-config-list"],
    queryFn: () => api<{ configs: Array<{ slug: string; name: string; email?: string }> }>("/api/config/list"),
    staleTime: 5 * 60 * 1000,
  });
  return query.data?.configs || [];
}

export function getRestaurantConfig(slug: string): RestaurantConfig {
  return { ...EMPTY_RESTAURANT_CONFIG, slug };
}

export function getAllRestaurantSlugs(): string[] {
  return [];
}

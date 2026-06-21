"use client";
import { createContext, useContext, useMemo, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { RestaurantConfig } from "@/types";

// Default fallback config
const DEFAULT_CONFIG: RestaurantConfig = {
  id: "default",
  name: "Restaurant",
  slug: "restaurant",
  tagline: "Welcome to our restaurant",
  description: "A great dining experience awaits you.",
  primary_color: "#8A1A2A",
  secondary_color: "#C9A348",
  hero_images: [],
  history: [],
  specialties: [],
  famous_dishes: [],
  why_us: [
    { icon: "Crown", title: "Quality Food", description: "We use only the freshest ingredients." },
    { icon: "Heart", title: "Made with Love", description: "Every dish is crafted with care." },
    { icon: "Users", title: "Family Friendly", description: "Bring the whole family." },
    { icon: "ChefHat", title: "Expert Chefs", description: "Our chefs are masters of their craft." },
    { icon: "Flame", title: "Fast Service", description: "Quick preparation without compromising quality." },
    { icon: "Sparkles", title: "AI Assistant", description: "Smart ordering at your fingertips." },
  ],
  contact: {
    phone: "+91 98765 43210",
    email: "hello@restaurant.com",
    address: "123 Main Street, City",
  },
  social_links: {},
  hours: {
    lunch: "12:00 PM to 3:00 PM",
    dinner: "6:00 PM to 11:00 PM",
    open_days: "Open all 7 days",
  },
  ai_waiter: {
    name: "AI Waiter",
    personality: "Friendly and helpful",
    greeting: "Namaste! Welcome to our restaurant. How can I help you today?",
    languages: ["en"],
    tones: ["friendly"],
  },
  reviews: [],
  offers: [],
  menu_config: {
    category_order: [],
    show_best_sellers: true,
    show_chef_specials: true,
    show_recommendations: true,
  },
};

interface RestaurantContextType {
  config: RestaurantConfig;
  isLoading: boolean;
  error: any;
}

const RestaurantContext = createContext<RestaurantContextType>({
  config: DEFAULT_CONFIG,
  isLoading: false,
  error: null,
});

export function useRestaurant() {
  return useContext(RestaurantContext);
}

interface RestaurantProviderProps {
  slug: string;
  children: ReactNode;
}

export function RestaurantProvider({ slug, children }: RestaurantProviderProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["restaurant-config", slug],
    queryFn: async () => {
      try {
        const data = await api<RestaurantConfig>(`/api/restaurants/${slug}`);
        return { ...DEFAULT_CONFIG, ...data };
      } catch {
        return DEFAULT_CONFIG;
      }
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const config = useMemo(() => data || DEFAULT_CONFIG, [data]);

  return (
    <RestaurantContext.Provider value={{ config, isLoading, error }}>
      {children}
    </RestaurantContext.Provider>
  );
}

// Helper function to generate restaurant config for new restaurants
export function generateRestaurantConfig(restaurantData: {
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  primary_color?: string;
  secondary_color?: string;
  phone?: string;
  email?: string;
  address?: string;
  history?: RestaurantConfig["history"];
  specialties?: string[];
  famous_dishes?: RestaurantConfig["famous_dishes"];
  ai_waiter_name?: string;
}): RestaurantConfig {
  return {
    id: `rest_${restaurantData.slug.replace(/-/g, "_")}`,
    name: restaurantData.name,
    slug: restaurantData.slug,
    tagline: restaurantData.tagline || `Welcome to ${restaurantData.name}`,
    description: restaurantData.description || `Experience the best at ${restaurantData.name}`,
    primary_color: restaurantData.primary_color || "#8A1A2A",
    secondary_color: restaurantData.secondary_color || "#C9A348",
    hero_images: [],
    history: restaurantData.history || [
      { year: "2020", title: "Founded", description: `We started our journey with a passion for great food.`, image_url: "" },
    ],
    specialties: restaurantData.specialties || ["Signature Dishes", "Fresh Ingredients", "Authentic Recipes"],
    famous_dishes: restaurantData.famous_dishes || [],
    why_us: [
      { icon: "Crown", title: "Quality Food", description: "We use only the freshest ingredients." },
      { icon: "Heart", title: "Made with Love", description: "Every dish is crafted with care." },
      { icon: "Users", title: "Family Friendly", description: "Bring the whole family." },
      { icon: "ChefHat", title: "Expert Chefs", description: "Our chefs are masters of their craft." },
      { icon: "Flame", title: "Fast Service", description: "Quick preparation without compromising quality." },
      { icon: "Sparkles", title: "AI Assistant", description: "Smart ordering at your fingertips." },
    ],
    contact: {
      phone: restaurantData.phone || "+91 98765 43210",
      email: restaurantData.email || "hello@restaurant.com",
      address: restaurantData.address || "123 Main Street, City",
    },
    social_links: {},
    hours: {
      lunch: "12:00 PM to 3:00 PM",
      dinner: "6:00 PM to 11:00 PM",
      open_days: "Open all 7 days",
    },
    ai_waiter: {
      name: restaurantData.ai_waiter_name || "AI Waiter",
      personality: "Friendly and helpful",
      greeting: `Namaste! Welcome to ${restaurantData.name}. How can I help you today?`,
      languages: ["en"],
      tones: ["friendly"],
    },
    reviews: [],
    offers: [],
    menu_config: {
      category_order: [],
      show_best_sellers: true,
      show_chef_specials: true,
      show_recommendations: true,
    },
  };
}

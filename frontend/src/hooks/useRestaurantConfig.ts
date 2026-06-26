"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

const DEFAULT_CONFIG = {
  id: "default",
  name: "Restaurant",
  slug: "restaurant",
  tagline: "Welcome to our restaurant",
  description: "A great dining experience awaits you.",
  primary_color: "#8A1A2A",
  secondary_color: "#C9A348",
  hero_images: [],
  hero_quote: "Where every meal tells a story.",
  history_intro: "Our journey began with a passion for great food.",
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

async function fetchBackendConfig(slug: string): Promise<any> {
  const res = await fetch(`/api/config/${slug}`);
  if (!res.ok) return null;
  return res.json();
}

export function useRestaurantConfig() {
  const params = useParams();
  const slug = params?.slug as string;

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-config", slug],
    queryFn: async () => {
      const backend = await fetchBackendConfig(slug);
      if (backend) return backend;
      return {
        ...DEFAULT_CONFIG,
        slug: slug || "restaurant",
        name: slug?.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || "Restaurant",
      };
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  return { config: data || DEFAULT_CONFIG, isLoading, slug };
}

export function useAllRestaurantConfigs() {
  const { data: backendData } = useQuery({
    queryKey: ["restaurant-config-list"],
    queryFn: async () => {
      const res = await fetch("/api/config/list");
      if (!res.ok) return { configs: [] };
      const json = await res.json();
      return json;
    },
    staleTime: 5 * 60 * 1000,
  });

  return backendData?.configs || [];
}

export function getRestaurantConfig(slug: string): any {
  // Fallback for SSR
  return { ...DEFAULT_CONFIG, slug, name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) };
}

export function getAllRestaurantSlugs(): string[] {
  // Provide empty for static generation, we will rely on dynamic or backend
  return [];
}

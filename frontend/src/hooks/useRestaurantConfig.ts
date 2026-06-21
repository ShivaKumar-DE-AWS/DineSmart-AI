"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

const configContext = (require as any).context(
  "@/data/restaurants",
  false,
  /\.json$/
);

function buildConfigMap(): Record<string, any> {
  const map: Record<string, any> = {};
  configContext.keys().forEach((key: string) => {
    const match = key.match(/\.\/(.+)\.json$/);
    if (match) {
      const slug = match[1];
      map[slug] = configContext(key);
    }
  });
  return map;
}

const LOCAL_CONFIGS: Record<string, any> = buildConfigMap();

const SLUG_ALIASES: Record<string, string> = {};
Object.keys(LOCAL_CONFIGS).forEach((configSlug) => {
  const parts = configSlug.split("-");
  if (parts.length > 1) {
    const alias = parts[0];
    if (!SLUG_ALIASES[alias]) {
      SLUG_ALIASES[alias] = configSlug;
    } else {
      delete SLUG_ALIASES[alias];
    }
  }
});

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

function resolveSlug(slug: string): string | undefined {
  if (LOCAL_CONFIGS[slug]) return slug;
  if (SLUG_ALIASES[slug]) return SLUG_ALIASES[slug];
  return undefined;
}

async function fetchBackendConfig(slug: string): Promise<any> {
  const res = await fetch(`/api/config/${slug}`);
  if (!res.ok) return null;
  return res.json();
}

export function useRestaurantConfig() {
  const params = useParams();
  const slug = params?.slug as string;
  const resolved = slug ? resolveSlug(slug) : undefined;
  const localConfig = resolved ? LOCAL_CONFIGS[resolved] : null;

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-config", slug],
    queryFn: async () => {
      if (localConfig) return localConfig;
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

export function getRestaurantConfig(slug: string): any {
  const resolved = resolveSlug(slug);
  if (resolved && LOCAL_CONFIGS[resolved]) return LOCAL_CONFIGS[resolved];
  return { ...DEFAULT_CONFIG, slug, name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) };
}

export function useAllRestaurantConfigs() {
  const local = Object.entries(LOCAL_CONFIGS).map(([slug, config]: [string, any]) => {
    const parts = slug.split("-");
    const shortSlug = parts.length > 1 ? parts[0] : slug;
    return { slug, name: config.name || slug, email: `${shortSlug}@smartdine.ai` };
  });

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

  const backend = (backendData?.configs || []).filter(
    (b: any) => !local.some((l) => l.slug === b.slug)
  );

  return [...local, ...backend];
}

export function getAllRestaurantSlugs(): string[] {
  return Object.keys(LOCAL_CONFIGS);
}

// Shared types across portals
export type Role = "customer" | "admin" | "kitchen" | "counter" | "superadmin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  restaurant_id?: string;
  restaurant_slug?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number; // in major currency units
  category: string;
  image_url: string;
  available: boolean;
  prep_time_min: number;
  tags?: string[];
}

export interface CartItem {
  item_id: string;
  name: string;
  price: number;
  qty: number;
  notes?: string;
  category?: string;
  course?: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";

export interface Order {
  id: string;
  token: string; // e.g. "A-042"
  customer_name: string;
  customer_phone?: string | null;
  customer_id?: string | null;
  customer_code?: string | null;
  table_number?: number | null;
  table_session_id?: string | null;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  estimated_ready_at?: string;
  payment_method: string;
  payment_status?: string;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  qty: number;
  reorder_level: number;
}

export interface Notification {
  id: string;
  user_id?: string;
  type: "order_update" | "system" | "promo";
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

// =====================================================
// Restaurant Config Types (Multi-Tenant SaaS)
// =====================================================

export interface RestaurantConfig {
  // Basic Info
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logo_url?: string;

  // Theme Colors (auto-derived from logo if not set)
  primary_color: string;
  secondary_color: string;
  accent_color?: string;

  // Hero Section
  hero_images: string[];
  hero_quote?: string;

  // Restaurant Story / History
  history: RestaurantHistoryItem[];
  history_intro?: string;

  // Specialties & Famous Dishes
  specialties: string[];
  famous_dishes: FamousDish[];

  // Why Us Section
  why_us: WhyUsItem[];

  // Contact Info
  contact: ContactInfo;

  // Social Links
  social_links: SocialLinks;

  // Business Hours
  hours: BusinessHours;

  // AI Waiter Settings
  ai_waiter: AIWaiterConfig;

  // Reviews / Testimonials
  reviews: Review[];

  // Special Offers
  offers: Offer[];

  // Menu Config
  menu_config: MenuConfig;
}

export interface RestaurantHistoryItem {
  year: string;
  title: string;
  description: string;
  image_url: string;
}

export interface FamousDish {
  name: string;
  description: string;
  image_url: string;
  rating: number;
  popularity_badge?: string; // "Bestseller", "Chef's Choice", etc.
}

export interface WhyUsItem {
  icon: string; // Lucide icon name
  title: string;
  description: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  google_map_url?: string;
  latitude?: number;
  longitude?: number;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  website?: string;
}

export interface BusinessHours {
  lunch: string;
  dinner: string;
  open_days: string;
}

export interface AIWaiterConfig {
  name: string;
  personality: string;
  greeting: string;
  languages: string[];
  tones: string[];
}

export interface Review {
  name: string;
  role: string;
  text: string;
  rating: number;
}

export interface Offer {
  tag: string;
  title: string;
  description: string;
  image_url: string;
}

export interface MenuConfig {
  category_order: string[];
  show_best_sellers: boolean;
  show_chef_specials: boolean;
  show_recommendations: boolean;
}

// Fun alias system for guest login
export interface GuestAlias {
  prefix: string;
  suffix: number;
}

export function generateFunAlias(): GuestAlias {
  const prefixes = [
    "BiryaniBoss", "SpiceKing", "CurryMaster", "NaanLover",
    "Foodie42", "DumKing", "MughlaiFan", "HyderabadiHero",
    "TandooriChef", "SaffronSoul", "RiceRoyale", "FlavorKing",
    "MasalaMaster", "GrillMaster", "FeastLord", "BiteBoss",
    "SpiceQueen", "CurryQueen", "Foodie99", "DumMaster",
    "BiryaniLover", "SpiceFan", "CurryLover", "NaanKing",
  ];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 900) + 100;
  return { prefix, suffix };
}

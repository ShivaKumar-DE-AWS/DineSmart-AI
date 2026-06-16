// Shared types across portals
export type Role = "customer" | "admin" | "kitchen" | "counter";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
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
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  estimated_ready_at?: string;
  payment_method: string;
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

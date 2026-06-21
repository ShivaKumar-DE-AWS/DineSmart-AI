"use client";
import { RestaurantGuard } from "@/components/shared/RestaurantGuard";

export default function SlugKitchenLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestaurantGuard allow={["kitchen", "admin"]}>
      {children}
    </RestaurantGuard>
  );
}

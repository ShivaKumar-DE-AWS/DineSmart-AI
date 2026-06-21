"use client";
import { RestaurantGuard } from "@/components/shared/RestaurantGuard";

export default function SlugCounterLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestaurantGuard allow={["counter", "admin"]}>
      {children}
    </RestaurantGuard>
  );
}
